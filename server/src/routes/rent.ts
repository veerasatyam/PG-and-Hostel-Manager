import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { RentRecord } from '../models/RentRecord';
import { BedOccupancy } from '../models/BedOccupancy';
import { Payment } from '../models/Payment';
import { Tenant } from '../models/Tenant';
import { Room } from '../models/Room';
import { authenticate, requireOwner } from '../middleware/auth';
import { calculateRentForMonth } from '../utils/rentCalculator';
import { isBefore, startOfDay } from 'date-fns';

const router = Router();

// GET /api/rent - List rent records
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, month, year, tenantId } = req.query;

    const query: any = {};
    if (status && ['DUE', 'PAID', 'OVERDUE'].includes(status as string)) {
      query.status = status;
    }
    if (month) query.month = parseInt(month as string, 10);
    if (year) query.year = parseInt(year as string, 10);

    // Scoping for tenants
    if (req.user?.role === 'TENANT') {
      const userTenant = await Tenant.findOne({ userId: req.user.id });
      if (!userTenant) {
        return res.json({ rentRecords: [] });
      }
      query.tenantId = userTenant._id;
    } else if (tenantId) {
      query.tenantId = new mongoose.Types.ObjectId(tenantId as string);
    }

    const rentRecords = await RentRecord.find(query)
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate({
        path: 'occupancyId',
        populate: { path: 'roomId', select: 'number beds' },
      })
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    const rentIds = rentRecords.map((r: any) => r._id);
    const payments = await Payment.find({ rentRecordId: { $in: rentIds } })
      .sort({ paymentDate: -1 })
      .lean();

    const paymentsByRent = new Map<string, any[]>();
    payments.forEach((p: any) => {
      const rId = p.rentRecordId.toString();
      if (!paymentsByRent.has(rId)) paymentsByRent.set(rId, []);
      paymentsByRent.get(rId)!.push(p);
    });

    const now = startOfDay(new Date());

    const formattedRecords = await Promise.all(
      rentRecords.map(async (record: any) => {
        let currentStatus = record.status;
        if (record.balance > 0 && record.status === 'DUE' && isBefore(new Date(record.dueDate), now)) {
          await RentRecord.updateOne({ _id: record._id }, { $set: { status: 'OVERDUE' } });
          currentStatus = 'OVERDUE';
        }

        const room = (record.occupancyId as any)?.roomId;
        const bedId = (record.occupancyId as any)?.bedId;
        const bed = room?.beds?.find((b: any) => b._id.toString() === bedId?.toString());

        return {
          id: record._id.toString(),
          tenantId: record.tenantId?._id?.toString(),
          tenant: {
            user: {
              name: (record.tenantId as any)?.userId?.name || 'Resident',
              email: (record.tenantId as any)?.userId?.email || '',
              phone: (record.tenantId as any)?.userId?.phone || '',
            },
          },
          occupancy: room
            ? {
                bed: {
                  name: bed?.name || 'Bed',
                  room: { number: room.number },
                },
              }
            : null,
          month: record.month,
          year: record.year,
          dueDate: record.dueDate,
          baseAmount: record.baseAmount,
          amount: record.amount,
          paidAmount: record.paidAmount,
          balance: record.balance,
          isProRated: record.isProRated,
          proRatedDays: record.proRatedDays,
          totalDaysInMonth: record.totalDaysInMonth,
          proRatedCalculationNotes: record.proRatedCalculationNotes,
          status: currentStatus,
          payments: paymentsByRent.get(record._id.toString()) || [],
        };
      })
    );

    return res.json({ rentRecords: formattedRecords });
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

    const activeOccupancies = await BedOccupancy.find({ status: 'ACTIVE' }).lean();

    let createdCount = 0;
    let skippedCount = 0;

    for (const occ of activeOccupancies) {
      const existing = await RentRecord.findOne({
        tenantId: occ.tenantId,
        month,
        year,
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const calculation = calculateRentForMonth(
        occ.monthlyRent,
        year,
        month,
        occ.checkInDate,
        occ.checkOutDate
      );

      if (calculation.amount === 0) {
        skippedCount++;
        continue;
      }

      await RentRecord.create({
        tenantId: occ.tenantId,
        occupancyId: occ._id,
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
      });

      createdCount++;
    }

    return res.status(201).json({
      message: `Rent generation complete: ${createdCount} created, ${skippedCount} skipped (already billed or inactive).`,
      createdCount,
      skippedCount,
    });
  } catch (err: any) {
    console.error('Error generating rent:', err);
    return res.status(500).json({ error: 'Failed to generate monthly rent records' });
  }
});

// GET /api/rent/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await RentRecord.findById(id)
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate({
        path: 'occupancyId',
        populate: { path: 'roomId', select: 'number' },
      })
      .lean();

    if (!record) {
      return res.status(404).json({ error: 'Rent record not found' });
    }

    const payments = await Payment.find({ rentRecordId: record._id }).sort({ paymentDate: -1 }).lean();

    return res.json({
      rentRecord: {
        ...record,
        id: record._id.toString(),
        payments,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve rent record' });
  }
});

export default router;
