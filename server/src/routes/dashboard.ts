import { Router, Request, Response } from 'express';
import { Room } from '../models/Room';
import { BedOccupancy } from '../models/BedOccupancy';
import { RentRecord } from '../models/RentRecord';
import { Payment } from '../models/Payment';
import { Complaint } from '../models/Complaint';
import { authenticate, requireOwner } from '../middleware/auth';
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const router = Router();

// GET /api/dashboard - Operations Overview Metrics
router.get('/', authenticate, requireOwner, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1. Bed & Occupancy
    const rooms = await Room.find().lean();
    let totalBeds = 0;
    rooms.forEach((r: any) => {
      totalBeds += (r.beds || []).length;
    });

    const occupiedBeds = await BedOccupancy.countDocuments({ status: 'ACTIVE' });
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 2. Collections & Billing
    const monthPayments = await Payment.find({
      paymentDate: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    const rentCollectedThisMonth = monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

    const currentMonthRecords = await RentRecord.find({
      month: currentMonth,
      year: currentYear,
    }).lean();
    const totalBilledThisMonth = currentMonthRecords.reduce((sum: number, r: any) => sum + r.amount, 0);

    // 3. Update overdue records & fetch
    await RentRecord.updateMany(
      {
        status: 'DUE',
        balance: { $gt: 0 },
        dueDate: { $lt: now },
      },
      {
        $set: { status: 'OVERDUE' },
      }
    );

    const overdueRecords = await RentRecord.find({
      status: 'OVERDUE',
      balance: { $gt: 0 },
    })
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .sort({ dueDate: 1 })
      .lean();

    const totalOverdueAmount = overdueRecords.reduce((sum: number, r: any) => sum + r.balance, 0);

    // Fetch active stay room numbers for overdue tenants
    const overdueTenantIds = overdueRecords.map((r: any) => r.tenantId?._id).filter(Boolean);
    const activeOccs = await BedOccupancy.find({
      tenantId: { $in: overdueTenantIds },
      status: 'ACTIVE',
    })
      .populate('roomId', 'number beds')
      .lean();

    const stayMap = new Map<string, any>();
    activeOccs.forEach((occ: any) => {
      const room = occ.roomId as any;
      const bed = room?.beds?.find((b: any) => b._id.toString() === occ.bedId.toString());
      stayMap.set(occ.tenantId.toString(), {
        roomNumber: room?.number || 'N/A',
        bedName: bed?.name || 'Bed',
      });
    });

    const overdueTenantsMap = new Map<string, any>();
    overdueRecords.forEach((record: any) => {
      const tenantIdStr = record.tenantId?._id?.toString() || 'unknown';
      const stay = stayMap.get(tenantIdStr) || { roomNumber: 'N/A', bedName: 'N/A' };
      const daysOverdue = Math.max(0, differenceInDays(now, new Date(record.dueDate)));

      if (overdueTenantsMap.has(tenantIdStr)) {
        const item = overdueTenantsMap.get(tenantIdStr);
        item.totalOverdueBalance += record.balance;
        item.records.push({
          id: record._id.toString(),
          month: record.month,
          year: record.year,
          dueDate: record.dueDate,
          balance: record.balance,
          daysOverdue,
        });
      } else {
        overdueTenantsMap.set(tenantIdStr, {
          tenantId: tenantIdStr,
          name: record.tenantId?.userId?.name || 'Resident',
          email: record.tenantId?.userId?.email || '',
          phone: record.tenantId?.userId?.phone || '',
          roomNumber: stay.roomNumber,
          bedName: stay.bedName,
          totalOverdueBalance: record.balance,
          maxDaysOverdue: daysOverdue,
          records: [
            {
              id: record._id.toString(),
              month: record.month,
              year: record.year,
              dueDate: record.dueDate,
              balance: record.balance,
              daysOverdue,
            },
          ],
        });
      }
    });

    const overdueTenants = Array.from(overdueTenantsMap.values());

    // 4. Complaints breakdown
    const openComplaints = await Complaint.countDocuments({ status: 'OPEN' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'IN_PROGRESS' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'RESOLVED' });

    // 5. Recent 5 payments
    const recentPayments = await Payment.find()
      .populate({
        path: 'rentRecordId',
        populate: {
          path: 'tenantId',
          populate: { path: 'userId', select: 'name' },
        },
      })
      .sort({ paymentDate: -1 })
      .limit(5)
      .lean();

    return res.json({
      metrics: {
        occupancy: {
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate,
        },
        rent: {
          currentMonth,
          currentYear,
          rentCollectedThisMonth,
          totalBilledThisMonth,
          totalOverdueAmount,
          overdueTenantsCount: overdueTenants.length,
        },
        complaints: {
          open: openComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          total: openComplaints + inProgressComplaints + resolvedComplaints,
        },
      },
      overdueTenants,
      recentPayments: recentPayments.map((p: any) => ({
        id: p._id.toString(),
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        tenantName: (p.rentRecordId as any)?.tenantId?.userId?.name || 'Resident',
      })),
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to compile dashboard metrics' });
  }
});

export default router;
