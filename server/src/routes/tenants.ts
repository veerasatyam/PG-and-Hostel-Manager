import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { BedOccupancy } from '../models/BedOccupancy';
import { RentRecord } from '../models/RentRecord';
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

// GET /api/tenants - List all tenants with active stays and balance ledger
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find().populate('userId', 'name email phone').sort({ createdAt: -1 }).lean();

    const tenantIds = tenants.map((t: any) => t._id);
    const activeOccupancies = await BedOccupancy.find({
      tenantId: { $in: tenantIds },
      status: 'ACTIVE',
    })
      .populate('roomId', 'number floor')
      .lean();

    const rentRecords = await RentRecord.find({
      tenantId: { $in: tenantIds },
    }).lean();

    const occupancyByTenant = new Map<string, any>();
    activeOccupancies.forEach((occ: any) => {
      occupancyByTenant.set(occ.tenantId.toString(), occ);
    });

    const rentByTenant = new Map<string, any[]>();
    rentRecords.forEach((r: any) => {
      const tId = r.tenantId.toString();
      if (!rentByTenant.has(tId)) rentByTenant.set(tId, []);
      rentByTenant.get(tId)!.push(r);
    });

    const formattedTenants = tenants.map((t: any) => {
      const activeOcc = occupancyByTenant.get(t._id.toString());
      const records = rentByTenant.get(t._id.toString()) || [];
      const totalBalance = records.reduce((sum: number, r: any) => sum + r.balance, 0);
      const overdueCount = records.filter((r: any) => r.status === 'OVERDUE').length;

      let stayDetails = null;
      if (activeOcc && activeOcc.roomId) {
        const room: any = activeOcc.roomId;
        stayDetails = {
          occupancyId: activeOcc._id.toString(),
          bedId: activeOcc.bedId.toString(),
          bedName: 'Bed',
          roomId: room._id.toString(),
          roomNumber: room.number,
          checkInDate: activeOcc.checkInDate,
          monthlyRent: activeOcc.monthlyRent,
          securityDeposit: activeOcc.securityDeposit,
          depositStatus: activeOcc.depositStatus,
        };
      }

      return {
        id: t._id.toString(),
        user: {
          id: t.userId?._id?.toString(),
          name: t.userId?.name || 'Unknown',
          email: t.userId?.email || '',
          phone: t.userId?.phone || '',
        },
        emergencyContact: t.emergencyContact,
        idProofNumber: t.idProofNumber,
        activeStay: stayDetails,
        totalBalance,
        overdueCount,
        hasOverdue: overdueCount > 0,
        rentHistoryCount: records.length,
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
    const activeOccs = await BedOccupancy.find({ status: 'ACTIVE' }).select('tenantId').lean();
    const assignedTenantIds = activeOccs.map((o: any) => o.tenantId);

    const tenants = await Tenant.find({
      _id: { $nin: assignedTenantIds },
    })
      .populate('userId', 'name email phone')
      .lean();

    return res.json({
      tenants: tenants.map((t: any) => ({
        id: t._id.toString(),
        user: {
          id: t.userId?._id?.toString(),
          name: t.userId?.name || 'Resident',
          email: t.userId?.email || '',
          phone: t.userId?.phone || '',
        },
      })),
    });
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
    const tenant = await Tenant.findById(tenantId).populate('userId');
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant record not found' });
    }

    // Check if tenant already has an active bed
    const existingActiveOcc = await BedOccupancy.findOne({ tenantId, status: 'ACTIVE' });
    if (existingActiveOcc) {
      const user: any = tenant.userId;
      return res.status(400).json({
        error: `Tenant ${user?.name || ''} already has an active room assigned. Check them out before assigning a new bed.`,
      });
    }

    // 2. Strict Server Check: A bed can't have two tenants at the same time
    const room = await Room.findOne({ 'beds._id': new mongoose.Types.ObjectId(bedId) });
    if (!room) {
      return res.status(404).json({ error: 'Selected bed does not exist' });
    }

    const activeBedOcc = await BedOccupancy.findOne({
      bedId: new mongoose.Types.ObjectId(bedId),
      status: 'ACTIVE',
    }).populate({
      path: 'tenantId',
      populate: { path: 'userId', select: 'name' },
    });

    if (activeBedOcc) {
      const currentOccupantName = (activeBedOcc.tenantId as any)?.userId?.name || 'another resident';
      const bedObj: any = room.beds.find((b: any) => b._id.toString() === bedId);
      return res.status(409).json({
        error: `Bed ${bedObj?.name || 'A'} in Room ${room.number} is already occupied by ${currentOccupantName}. A bed cannot have two tenants at the same time.`,
      });
    }

    // 3. Pro-rate initial month rent if checking in mid-month
    const checkInYear = getYear(checkInDate);
    const checkInMonth = getMonth(checkInDate) + 1; // 1-12
    const proRated = calculateRentForMonth(monthlyRent, checkInYear, checkInMonth, checkInDate, null);
    const dueDate = addDays(checkInDate, 5);

    // 4. Create occupancy & initial rent record
    const occupancy = await BedOccupancy.create({
      bedId: new mongoose.Types.ObjectId(bedId),
      roomId: room._id,
      tenantId: tenant._id,
      checkInDate,
      monthlyRent,
      securityDeposit,
      depositStatus: 'HELD',
      status: 'ACTIVE',
    });

    // Update bed status in room document
    await Room.updateOne(
      { 'beds._id': new mongoose.Types.ObjectId(bedId) },
      { $set: { 'beds.$.status': 'OCCUPIED' } }
    );

    // Create initial rent record
    const rentRecord = await RentRecord.create({
      tenantId: tenant._id,
      occupancyId: occupancy._id,
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
    });

    const user: any = tenant.userId;
    return res.status(201).json({
      message: `Tenant ${user?.name || ''} successfully checked in to Room ${room.number}`,
      occupancy: {
        id: occupancy._id.toString(),
        bedId: occupancy.bedId.toString(),
        roomId: occupancy.roomId.toString(),
        status: occupancy.status,
        monthlyRent: occupancy.monthlyRent,
        securityDeposit: occupancy.securityDeposit,
        checkInDate: occupancy.checkInDate,
      },
      rentRecord: {
        id: rentRecord._id.toString(),
        amount: rentRecord.amount,
        balance: rentRecord.balance,
        status: rentRecord.status,
        isProRated: rentRecord.isProRated,
        proRatedDays: rentRecord.proRatedDays,
        totalDaysInMonth: rentRecord.totalDaysInMonth,
      },
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: 'Conflict: This bed is already occupied by an active resident, or the resident already has an active stay.',
      });
    }
    console.error('Check-in error:', err);
    return res.status(500).json({ error: 'Server error during tenant check-in' });
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

    const occupancy = await BedOccupancy.findById(occupancyId).populate([
      { path: 'roomId' },
      { path: 'tenantId', populate: { path: 'userId' } },
    ]);

    if (!occupancy || occupancy.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Active stay not found for check-out' });
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

    // Adjust or create rent record for checkout month
    const existingRent = await RentRecord.findOne({
      tenantId: occupancy.tenantId,
      month: checkOutMonth,
      year: checkOutYear,
    });

    if (existingRent) {
      const newBalance = Math.max(0, proRatedCheckOut.amount - existingRent.paidAmount);
      const newStatus = newBalance === 0 ? 'PAID' : existingRent.status;

      existingRent.amount = proRatedCheckOut.amount;
      existingRent.balance = newBalance;
      existingRent.isProRated = proRatedCheckOut.isProRated;
      existingRent.proRatedDays = proRatedCheckOut.proRatedDays;
      existingRent.totalDaysInMonth = proRatedCheckOut.totalDaysInMonth;
      existingRent.proRatedCalculationNotes = `Check-out adjustment: ${proRatedCheckOut.calculationNotes}`;
      existingRent.status = newStatus;
      await existingRent.save();
    } else {
      await RentRecord.create({
        tenantId: occupancy.tenantId,
        occupancyId: occupancy._id,
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
      });
    }

    // Free the bed in room
    await Room.updateOne(
      { 'beds._id': occupancy.bedId },
      { $set: { 'beds.$.status': 'AVAILABLE' } }
    );

    // Update occupancy
    occupancy.checkOutDate = checkOutDate;
    occupancy.status = 'CHECKED_OUT';
    occupancy.depositDeductions = settlement.deductions;
    occupancy.depositRefundAmount = settlement.netRefund;
    occupancy.depositDeductionNotes = settlement.deductionNotes;
    occupancy.depositStatus = settlement.deductions === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await occupancy.save();

    const tenantUser: any = (occupancy.tenantId as any)?.userId;
    return res.json({
      message: `Tenant ${tenantUser?.name || ''} checked out successfully. Bed is now available.`,
      occupancy: {
        id: occupancy._id.toString(),
        status: occupancy.status,
        checkOutDate: occupancy.checkOutDate,
      },
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

    const tenant = await Tenant.findById(id).populate('userId', 'name email phone').lean();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const occupancies = await BedOccupancy.find({ tenantId: tenant._id })
      .populate('roomId', 'number floor')
      .sort({ checkInDate: -1 })
      .lean();

    const rentRecords = await RentRecord.find({ tenantId: tenant._id })
      .sort({ year: -1, month: -1 })
      .lean();

    return res.json({
      tenant: {
        ...tenant,
        id: tenant._id.toString(),
        occupancies,
        rentRecords,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve tenant details' });
  }
});

export default router;
