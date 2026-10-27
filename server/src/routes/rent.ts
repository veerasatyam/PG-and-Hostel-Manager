import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, requireOwner } from '../middleware/auth';
import { calculateRentForMonth } from '../utils/rentCalculator';
import { isBefore, startOfDay } from 'date-fns';

const router = Router();

// GET /api/rent - List rent records with optional filters
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, month, year, tenantId } = req.query;

    const whereClause: any = {};

    if (status && ['DUE', 'PAID', 'OVERDUE'].includes(status as string)) {
      whereClause.status = status;
    }
    if (month) {
      whereClause.month = parseInt(month as string, 10);
    }
    if (year) {
      whereClause.year = parseInt(year as string, 10);
    }

    // Role-based scoping: Tenants can only see their own rent records
    if (req.user?.role === 'TENANT') {
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant) {
        return res.json({ rentRecords: [] });
      }
      whereClause.tenantId = userTenant.id;
    } else if (tenantId) {
      whereClause.tenantId = tenantId as string;
    }

    // Fetch records
    const rentRecords = await prisma.rentRecord.findMany({
      where: whereClause,
      include: {
        tenant: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        occupancy: {
          include: {
            bed: {
              include: {
                room: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    const now = startOfDay(new Date());

    // Update records that have turned OVERDUE
    const updatedRecords = await Promise.all(
      rentRecords.map(async (record) => {
        if (record.balance > 0 && record.status === 'DUE' && isBefore(new Date(record.dueDate), now)) {
          await prisma.rentRecord.update({
            where: { id: record.id },
            data: { status: 'OVERDUE' },
          });
          return { ...record, status: 'OVERDUE' as const };
        }
        return record;
      })
    );

    return res.json({ rentRecords: updatedRecords });
  } catch (err: any) {
    console.error('Error fetching rent records:', err);
    return res.status(500).json({ error: 'Failed to fetch rent records' });
  }
});

// POST /api/rent/generate-monthly - Generate rent for all active tenants for a specified month
router.post('/generate-monthly', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const generateSchema = z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020).max(2035),
      dueDay: z.number().int().min(1).max(28).default(5),
    });

    const parseResult = generateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { month, year, dueDay } = parseResult.data;
    const dueDate = new Date(year, month - 1, dueDay);

    // Fetch all active occupancies
    const activeOccupancies = await prisma.bedOccupancy.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tenant: { include: { user: true } },
        bed: { include: { room: true } },
      },
    });

    let createdCount = 0;
    let skippedCount = 0;
    const createdRecords = [];

    for (const occ of activeOccupancies) {
      // Check if rent already exists for this tenant in this month/year
      const existing = await prisma.rentRecord.findUnique({
        where: {
          tenantId_month_year: {
            tenantId: occ.tenantId,
            month,
            year,
          },
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Calculate pro-rated rent if check-in was in this month
      const calculation = calculateRentForMonth(
        occ.monthlyRent,
        year,
        month,
        occ.checkInDate,
        occ.checkOutDate
      );

      // Don't generate if tenant hasn't checked in yet in this month
      if (calculation.amount === 0) {
        skippedCount++;
        continue;
      }

      const record = await prisma.rentRecord.create({
        data: {
          tenantId: occ.tenantId,
          occupancyId: occ.id,
          month,
          year,
          dueDate,
          baseAmount: occ.monthlyRent,
          amount: calculation.amount,
          balance: calculation.amount,
          isProRated: calculation.isProRated,
          proRatedDays: calculation.proRatedDays,
          totalDaysInMonth: calculation.totalDaysInMonth,
          proRatedCalculationNotes: calculation.calculationNotes,
          status: 'DUE',
        },
      });

      createdRecords.push(record);
      createdCount++;
    }

    return res.status(201).json({
      message: `Rent generation complete: ${createdCount} created, ${skippedCount} skipped (already generated or not active).`,
      createdCount,
      skippedCount,
      createdRecords,
    });
  } catch (err: any) {
    console.error('Error generating rent:', err);
    return res.status(500).json({ error: 'Failed to generate monthly rent records' });
  }
});

// GET /api/rent/:id - Get specific rent record with receipts
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.rentRecord.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        occupancy: {
          include: {
            bed: {
              include: {
                room: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ error: 'Rent record not found' });
    }

    // Tenant authorization check
    if (req.user?.role === 'TENANT') {
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant || userTenant.id !== record.tenantId) {
        return res.status(403).json({ error: 'Unauthorized to view this rent record' });
      }
    }

    return res.json({ rentRecord: record });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve rent record' });
  }
});

export default router;
