import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticate, requireOwner } from '../middleware/auth';
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const router = Router();

// GET /api/dashboard - PG / Hostel Overview Dashboard Stats
router.get('/', authenticate, requireOwner, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1. Bed & Occupancy metrics
    const totalRooms = await prisma.room.count();
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bedOccupancy.count({
      where: { status: 'ACTIVE' },
    });
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 2. Rent collected this month (sum of payments in this month)
    const monthPayments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });
    const rentCollectedThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Rent billed for current month
    const currentMonthRecords = await prisma.rentRecord.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
      },
    });
    const totalBilledThisMonth = currentMonthRecords.reduce((sum, r) => sum + r.amount, 0);

    // 3. Overdue tenants & overdue amount
    // Update any DUE records that passed due date
    await prisma.rentRecord.updateMany({
      where: {
        status: 'DUE',
        balance: { gt: 0 },
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    const overdueRecords = await prisma.rentRecord.findMany({
      where: {
        status: 'OVERDUE',
        balance: { gt: 0 },
      },
      include: {
        tenant: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            occupancies: {
              where: { status: 'ACTIVE' },
              include: { bed: { include: { room: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalOverdueAmount = overdueRecords.reduce((sum, r) => sum + r.balance, 0);

    const overdueTenantsMap = new Map<string, any>();
    overdueRecords.forEach((record) => {
      const activeStay = record.tenant.occupancies[0];
      const existing = overdueTenantsMap.get(record.tenantId);
      const daysOverdue = Math.max(0, differenceInDays(now, new Date(record.dueDate)));

      if (existing) {
        existing.totalOverdueBalance += record.balance;
        existing.records.push({
          id: record.id,
          month: record.month,
          year: record.year,
          dueDate: record.dueDate,
          balance: record.balance,
          daysOverdue,
        });
      } else {
        overdueTenantsMap.set(record.tenantId, {
          tenantId: record.tenantId,
          name: record.tenant.user.name,
          email: record.tenant.user.email,
          phone: record.tenant.user.phone,
          roomNumber: activeStay?.bed.room.number || 'N/A',
          bedName: activeStay?.bed.name || 'N/A',
          totalOverdueBalance: record.balance,
          maxDaysOverdue: daysOverdue,
          records: [
            {
              id: record.id,
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
    const openComplaints = await prisma.complaint.count({ where: { status: 'OPEN' } });
    const inProgressComplaints = await prisma.complaint.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedComplaints = await prisma.complaint.count({ where: { status: 'RESOLVED' } });

    // 5. Recent 5 payments
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' },
      include: {
        rentRecord: {
          include: {
            tenant: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    return res.json({
      metrics: {
        occupancy: {
          totalRooms,
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
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        tenantName: p.rentRecord.tenant.user.name,
      })),
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to compile dashboard metrics' });
  }
});

export default router;
