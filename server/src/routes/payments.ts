import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Payment } from '../models/Payment';
import { RentRecord } from '../models/RentRecord';
import { BedOccupancy } from '../models/BedOccupancy';
import { Tenant } from '../models/Tenant';
import { Room } from '../models/Room';
import { authenticate, requireOwner } from '../middleware/auth';
import { isBefore, startOfDay } from 'date-fns';

const router = Router();

const createPaymentSchema = z.object({
  rentRecordId: z.string().min(1, 'Rent record ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['UPI', 'CASH', 'BANK_TRANSFER', 'CARD']).default('UPI'),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/payments - Record a payment
router.post('/', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const parseResult = createPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { rentRecordId, amount, paymentMethod, transactionRef, notes } = parseResult.data;

    const rentRecord = await RentRecord.findById(rentRecordId);
    if (!rentRecord) {
      return res.status(404).json({ error: 'Rent invoice not found' });
    }

    if (rentRecord.balance <= 0) {
      return res.status(400).json({ error: 'This rent record is already fully settled' });
    }

    if (amount > rentRecord.balance) {
      return res.status(400).json({
        error: `Payment amount (₹${amount}) exceeds remaining balance (₹${rentRecord.balance})`,
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const uuidSuffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const receiptNumber = `REC-${dateStr}-${uuidSuffix}`;

    const newPaidAmount = rentRecord.paidAmount + amount;
    const newBalance = Math.max(0, rentRecord.amount - newPaidAmount);

    let newStatus = rentRecord.status;
    if (newBalance === 0) {
      newStatus = 'PAID';
    } else if (isBefore(new Date(rentRecord.dueDate), startOfDay(now))) {
      newStatus = 'OVERDUE';
    } else {
      newStatus = 'DUE';
    }

    const payment = await Payment.create({
      rentRecordId: rentRecord._id,
      amount,
      paymentDate: now,
      paymentMethod,
      transactionRef,
      notes,
      receiptNumber,
    });

    rentRecord.paidAmount = newPaidAmount;
    rentRecord.balance = newBalance;
    rentRecord.status = newStatus;
    await rentRecord.save();

    return res.status(201).json({
      message: `Payment of ₹${amount} recorded successfully. Receipt #${receiptNumber}`,
      payment: {
        id: payment._id.toString(),
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      },
      rentRecord: {
        id: rentRecord._id.toString(),
        paidAmount: rentRecord.paidAmount,
        balance: rentRecord.balance,
        status: rentRecord.status,
      },
    });
  } catch (err: any) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/payments/receipt/:receiptNumber - Downloadable / printable receipt data
router.get('/receipt/:receiptNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;

    const payment = await Payment.findOne({ receiptNumber }).lean();
    if (!payment) {
      return res.status(404).json({ error: 'Receipt record not found' });
    }

    const rentRecord = await RentRecord.findById(payment.rentRecordId)
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate({
        path: 'occupancyId',
        populate: { path: 'roomId', select: 'number beds' },
      })
      .lean();

    if (!rentRecord) {
      return res.status(404).json({ error: 'Associated billing record not found' });
    }

    const room = (rentRecord.occupancyId as any)?.roomId;
    const bedId = (rentRecord.occupancyId as any)?.bedId;
    const bed = room?.beds?.find((b: any) => b._id.toString() === bedId?.toString());

    const receipt = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef || 'N/A',
      notes: payment.notes || '',
      tenant: {
        name: (rentRecord.tenantId as any)?.userId?.name || 'Resident',
        email: (rentRecord.tenantId as any)?.userId?.email || '',
        phone: (rentRecord.tenantId as any)?.userId?.phone || '',
        emergencyContact: (rentRecord.tenantId as any)?.emergencyContact,
      },
      room: {
        roomNumber: room?.number || 'N/A',
        bedName: bed?.name || 'Bed',
      },
      rentPeriod: {
        month: rentRecord.month,
        year: rentRecord.year,
        totalRentDue: rentRecord.amount,
        totalPaidToDate: rentRecord.paidAmount,
        remainingBalance: rentRecord.balance,
        status: rentRecord.status,
        isProRated: rentRecord.isProRated,
        proRatedNotes: rentRecord.proRatedCalculationNotes,
      },
    };

    return res.json({ receipt });
  } catch (err: any) {
    console.error('Error fetching receipt:', err);
    return res.status(500).json({ error: 'Failed to retrieve receipt' });
  }
});

export default router;
