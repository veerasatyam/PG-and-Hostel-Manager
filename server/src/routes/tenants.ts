import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, requireOwner } from '../middleware/auth';
import { calculateRentForMonth, calculateDepositSettlement } from '../utils/rentCalculator';
import { getMonth, getYear, addDays } from 'date-fns';

const router = Router();

const checkInSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  bedId: z.string().min(1, 'Bed is required'),
  checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid check-in date format',
  }),
  monthlyRent: z.number().positive('Monthly rent must be greater than 0'),
  securityDeposit: z.number().min(0, 'Security deposit must be >= 0').default(0),
});

const checkOutSchema = z.object({
  occupancyId: z.string().min(1, 'Occupancy ID is required'),
  checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid check-out date format',
  }),
  depositDeductions: z.number().min(0).default(0),
  depositDeductionNotes: z.string().optional(),
});

// GET /api/tenants - List tenants with their room, bed, stay details, and rent summary
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        occupancies: {
          include: {
            bed: {
              include: {
                room: true,
              },
            },
          },
          orderBy: { checkInDate: 'desc' },
        },
        rentRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTenants = tenants.map((t) => {
      const activeOccupancy = t.occupancies.find((o) => o.status === 'ACTIVE');
      const totalBalance = t.rentRecords.reduce((sum, r) => sum + r.balance, 0);
      const overdueCount = t.rentRecords.filter((r) => r.status === 'OVERDUE').length;

      return {
        id: t.id,
        user: t.user,
        emergencyContact: t.emergencyContact,
        idProofNumber: t.idProofNumber,
        activeStay: activeOccupancy
          ? {
              occupancyId: activeOccupancy.id,
              bedId: activeOccupancy.bedId,
              bedName: activeOccupancy.bed.name,
              roomId: activeOccupancy.bed.roomId,
              roomNumber: activeOccupancy.bed.room.number,
              checkInDate: activeOccupancy.checkInDate,
              monthlyRent: activeOccupancy.monthlyRent,
              securityDeposit: activeOccupancy.securityDeposit,
              depositStatus: activeOccupancy.depositStatus,
            }
          : null,
        totalBalance,
        overdueCount,
        hasOverdue: overdueCount > 0,
        rentHistoryCount: t.rentRecords.length,
      };
    });

    return res.json({ tenants: formattedTenants });
  } catch (err: any) {
    console.error('Error fetching tenants:', err);
    return res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// GET /api/tenants/unassigned - List tenants currently without an active bed stay
router.get('/unassigned', authenticate, requireOwner, async (_req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        occupancies: {
          none: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return res.json({ tenants });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch unassigned tenants' });
  }
});

// POST /api/tenants/check-in - Assign tenant to a bed and record check-in
router.post('/check-in', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const parseResult = checkInSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { tenantId, bedId, checkInDate: checkInDateStr, monthlyRent, securityDeposit } = parseResult.data;
    const checkInDate = new Date(checkInDateStr);

    // 1. Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        user: true,
        occupancies: { where: { status: 'ACTIVE' } },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check if tenant already has an active bed
    if (tenant.occupancies.length > 0) {
      return res.status(400).json({
        error: `Tenant ${tenant.user.name} already has an active bed assigned. Please check them out before reassigning.`,
      });
    }

    // 2. Strict Server Check: A bed can't have two tenants at the same time
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        room: true,
        occupancies: {
          where: { status: 'ACTIVE' },
          include: { tenant: { include: { user: true } } },
        },
      },
    });

    if (!bed) {
      return res.status(404).json({ error: 'Selected bed does not exist' });
    }

    if (bed.occupancies.length > 0) {
      const currentOccupant = bed.occupancies[0].tenant.user.name;
      return res.status(409).json({
        error: `Bed ${bed.name} in Room ${bed.room.number} is already occupied by ${currentOccupant}. A bed cannot have two tenants at the same time.`,
      });
    }

    // 3. Pro-rate first month rent if checking in mid-month
    const checkInYear = getYear(checkInDate);
    const checkInMonth = getMonth(checkInDate) + 1; // 1-12
    const proRated = calculateRentForMonth(monthlyRent, checkInYear, checkInMonth, checkInDate, null);

    // Set due date to 5 days after check-in or 5th of current month
    const dueDate = addDays(checkInDate, 5);

    // 4. Perform check-in atomically within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create occupancy
      const occupancy = await tx.bedOccupancy.create({
        data: {
          bedId,
          tenantId,
          checkInDate,
          monthlyRent,
          securityDeposit,
          depositStatus: 'HELD',
          status: 'ACTIVE',
        },
      });

      // Mark bed as OCCUPIED
      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' },
      });

      // Automatically create initial month rent record with pro-rating
      const rentRecord = await tx.rentRecord.create({
        data: {
          tenantId,
          occupancyId: occupancy.id,
          month: checkInMonth,
          year: checkInYear,
          dueDate,
          baseAmount: monthlyRent,
          amount: proRated.amount,
          balance: proRated.amount,
          isProRated: proRated.isProRated,
          proRatedDays: proRated.proRatedDays,
          totalDaysInMonth: proRated.totalDaysInMonth,
          proRatedCalculationNotes: proRated.calculationNotes,
          status: 'DUE',
        },
      });

      return { occupancy, rentRecord };
    });

    return res.status(201).json({
      message: `Tenant ${tenant.user.name} checked in successfully to Bed ${bed.name} (Room ${bed.room.number})`,
      occupancy: result.occupancy,
      rentRecord: result.rentRecord,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return res.status(500).json({ error: 'Server error during check-in process' });
  }
});

// POST /api/tenants/check-out - Process tenant check-out, pro-rate final rent, settle deposit
router.post('/check-out', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const parseResult = checkOutSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { occupancyId, checkOutDate: checkOutDateStr, depositDeductions, depositDeductionNotes } = parseResult.data;
    const checkOutDate = new Date(checkOutDateStr);

    const occupancy = await prisma.bedOccupancy.findUnique({
      where: { id: occupancyId },
      include: {
        bed: { include: { room: true } },
        tenant: { include: { user: true } },
      },
    });

    if (!occupancy || occupancy.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Active occupancy record not found for check-out' });
    }

    if (checkOutDate < occupancy.checkInDate) {
      return res.status(400).json({ error: 'Check-out date cannot be earlier than check-in date' });
    }

    // Calculate security deposit deductions and net refund
    const settlement = calculateDepositSettlement(
      occupancy.securityDeposit,
      depositDeductions,
      depositDeductionNotes
    );

    // Calculate checkout month pro-rated rent
    const checkOutYear = getYear(checkOutDate);
    const checkOutMonth = getMonth(checkOutDate) + 1;

    const proRatedCheckOut = calculateRentForMonth(
      occupancy.monthlyRent,
      checkOutYear,
      checkOutMonth,
      occupancy.checkInDate,
      checkOutDate
    );

    // Perform check-out atomically in transaction
    const updatedOccupancy = await prisma.$transaction(async (tx) => {
      // Check if a rent record already exists for the checkout month
      const existingRent = await tx.rentRecord.findUnique({
        where: {
          tenantId_month_year: {
            tenantId: occupancy.tenantId,
            month: checkOutMonth,
            year: checkOutYear,
          },
        },
      });

      if (existingRent) {
        // Adjust existing rent record to reflect pro-rated move-out amount
        const newBalance = Math.max(0, proRatedCheckOut.amount - existingRent.paidAmount);
        const newStatus = newBalance === 0 ? 'PAID' : existingRent.status;

        await tx.rentRecord.update({
          where: { id: existingRent.id },
          data: {
            amount: proRatedCheckOut.amount,
            balance: newBalance,
            isProRated: proRatedCheckOut.isProRated,
            proRatedDays: proRatedCheckOut.proRatedDays,
            totalDaysInMonth: proRatedCheckOut.totalDaysInMonth,
            proRatedCalculationNotes: `Check-out adjustment: ${proRatedCheckOut.calculationNotes}`,
            status: newStatus,
          },
        });
      } else {
        // Create the pro-rated checkout rent record if it didn't exist yet
        await tx.rentRecord.create({
          data: {
            tenantId: occupancy.tenantId,
            occupancyId: occupancy.id,
            month: checkOutMonth,
            year: checkOutYear,
            dueDate: checkOutDate,
            baseAmount: occupancy.monthlyRent,
            amount: proRatedCheckOut.amount,
            balance: proRatedCheckOut.amount,
            isProRated: proRatedCheckOut.isProRated,
            proRatedDays: proRatedCheckOut.proRatedDays,
            totalDaysInMonth: proRatedCheckOut.totalDaysInMonth,
            proRatedCalculationNotes: `Check-out rent: ${proRatedCheckOut.calculationNotes}`,
            status: 'DUE',
          },
        });
      }

      // Free up the bed
      await tx.bed.update({
        where: { id: occupancy.bedId },
        data: { status: 'AVAILABLE' },
      });

      // Update occupancy record
      return await tx.bedOccupancy.update({
        where: { id: occupancyId },
        data: {
          checkOutDate,
          status: 'CHECKED_OUT',
          depositDeductions: settlement.deductions,
          depositRefundAmount: settlement.netRefund,
          depositDeductionNotes: settlement.deductionNotes,
          depositStatus: settlement.deductions === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
    });

    return res.json({
      message: `Tenant ${occupancy.tenant.user.name} checked out successfully. Bed ${occupancy.bed.name} is now available.`,
      occupancy: updatedOccupancy,
      settlement,
      proRatedRent: proRatedCheckOut,
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return res.status(500).json({ error: 'Server error during check-out process' });
  }
});

// GET /api/tenants/:id - Detailed tenant info
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Non-owners can only view their own tenant profile
    if (req.user?.role === 'TENANT') {
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant || userTenant.id !== id) {
        return res.status(403).json({ error: 'Unauthorized to view this profile' });
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        occupancies: {
          include: {
            bed: {
              include: {
                room: true,
              },
            },
          },
          orderBy: { checkInDate: 'desc' },
        },
        rentRecords: {
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.json({ tenant });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve tenant details' });
  }
});

export default router;
