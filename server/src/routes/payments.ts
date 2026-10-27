import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
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

// POST /api/payments - Record a payment (Full or Part payment)
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

    const rentRecord = await prisma.rentRecord.findUnique({
      where: { id: rentRecordId },
      include: {
        tenant: { include: { user: true } },
      },
    });

    if (!rentRecord) {
      return res.status(404).json({ error: 'Rent record not found' });
    }

    if (rentRecord.balance <= 0) {
      return res.status(400).json({ error: 'This rent record is already fully paid' });
    }

    if (amount > rentRecord.balance) {
      return res.status(400).json({
        error: `Payment amount (₹${amount}) exceeds outstanding balance (₹${rentRecord.balance})`,
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${dateStr}-${randomSuffix}`;

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

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          rentRecordId,
          amount,
          paymentDate: now,
          paymentMethod,
          transactionRef,
          notes,
          receiptNumber,
        },
      });

      const updatedRent = await tx.rentRecord.update({
        where: { id: rentRecordId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
        include: {
          tenant: { include: { user: true } },
          occupancy: { include: { bed: { include: { room: true } } } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });

      return { payment, updatedRent };
    });

    return res.status(201).json({
      message: `Payment of ₹${amount} recorded successfully. Receipt #${receiptNumber}`,
      payment: result.payment,
      rentRecord: result.updatedRent,
    });
  } catch (err: any) {
    console.error('Payment recording error:', err);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/payments/receipt/:receiptNumber - Downloadable / printable receipt data
router.get('/receipt/:receiptNumber', authenticate, async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { receiptNumber },
      include: {
        rentRecord: {
          include: {
            tenant: { include: { user: true } },
            occupancy: { include: { bed: { include: { room: true } } } },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Role check: Tenants can only view their own receipts
    if (req.user?.role === 'TENANT') {
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant || userTenant.id !== payment.rentRecord.tenantId) {
        return res.status(403).json({ error: 'Unauthorized to view this receipt' });
      }
    }

    const receipt = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef || 'N/A',
      notes: payment.notes || '',
      tenant: {
        name: payment.rentRecord.tenant.user.name,
        email: payment.rentRecord.tenant.user.email,
        phone: payment.rentRecord.tenant.user.phone,
        emergencyContact: payment.rentRecord.tenant.emergencyContact,
      },
      room: {
        roomNumber: payment.rentRecord.occupancy?.bed.room.number || 'N/A',
        bedName: payment.rentRecord.occupancy?.bed.name || 'N/A',
      },
      rentPeriod: {
        month: payment.rentRecord.month,
        year: payment.rentRecord.year,
        totalRentDue: payment.rentRecord.amount,
        totalPaidToDate: payment.rentRecord.paidAmount,
        remainingBalance: payment.rentRecord.balance,
        status: payment.rentRecord.status,
        isProRated: payment.rentRecord.isProRated,
        proRatedNotes: payment.rentRecord.proRatedCalculationNotes,
      },
    };

    return res.json({ receipt });
  } catch (err: any) {
    console.error('Error fetching receipt:', err);
    return res.status(500).json({ error: 'Failed to retrieve receipt' });
  }
});

export default router;
