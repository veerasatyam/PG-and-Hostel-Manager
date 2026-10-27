import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/db';
import bcrypt from 'bcryptjs';

describe('Hostel Management Backend API Integration Tests', () => {
  let ownerToken: string;
  let tenant1Token: string;
  let tenant2Token: string;

  let ownerUser: any;
  let tenant1User: any;
  let tenant2User: any;

  let testRoom: any;
  let testBed1: any;
  let testBed2: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.payment.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.rentRecord.deleteMany();
    await prisma.bedOccupancy.deleteMany();
    await prisma.bed.deleteMany();
    await prisma.room.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.user.deleteMany();

    // 1. Create Owner
    const passwordHash = await bcrypt.hash('secret123', 10);
    ownerUser = await prisma.user.create({
      data: {
        name: 'Hostel Owner',
        email: 'owner@stayhaven.test',
        password: passwordHash,
        role: 'OWNER',
        phone: '9876543210',
      },
    });

    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@stayhaven.test', password: 'secret123' });
    ownerToken = ownerLoginRes.body.token;

    // 2. Create Tenant 1
    tenant1User = await prisma.user.create({
      data: {
        name: 'Rahul Sharma',
        email: 'rahul@stayhaven.test',
        password: passwordHash,
        role: 'TENANT',
        phone: '9123456780',
        tenant: {
          create: {
            emergencyContact: '9123456789',
            idProofNumber: 'AADHAAR-1234',
          },
        },
      },
      include: { tenant: true },
    });

    const t1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@stayhaven.test', password: 'secret123' });
    tenant1Token = t1LoginRes.body.token;

    // 3. Create Tenant 2
    tenant2User = await prisma.user.create({
      data: {
        name: 'Amit Patel',
        email: 'amit@stayhaven.test',
        password: passwordHash,
        role: 'TENANT',
        phone: '9234567890',
        tenant: {
          create: {
            emergencyContact: '9234567899',
            idProofNumber: 'AADHAAR-5678',
          },
        },
      },
      include: { tenant: true },
    });

    const t2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'amit@stayhaven.test', password: 'secret123' });
    tenant2Token = t2LoginRes.body.token;

    // 4. Create Room 101 with 2 beds
    testRoom = await prisma.room.create({
      data: {
        number: '101',
        floor: 1,
        type: 'DOUBLE',
        hasAc: true,
        baseRent: 10000,
        beds: {
          create: [{ name: 'Bed A' }, { name: 'Bed B' }],
        },
      },
      include: { beds: true },
    });

    testBed1 = testRoom.beds[0];
    testBed2 = testRoom.beds[1];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: Check-in tenant & Pro-rated rent calculation on check-in
  it('1. Mid-month check-in assigns bed and generates pro-rated rent record', async () => {
    // Check in on October 11, 2026 (Month with 31 days)
    // 31 - 11 + 1 = 21 active days
    // Monthly rent 9300 / 31 * 21 = 6300
    const res = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant1User.tenant.id,
        bedId: testBed1.id,
        checkInDate: '2026-10-11',
        monthlyRent: 9300,
        securityDeposit: 15000,
      });

    expect(res.status).toBe(201);
    expect(res.body.occupancy).toBeDefined();
    expect(res.body.occupancy.status).toBe('ACTIVE');

    // Bed status should now be OCCUPIED
    const bed = await prisma.bed.findUnique({ where: { id: testBed1.id } });
    expect(bed?.status).toBe('OCCUPIED');

    // Check generated pro-rated rent record
    const rentRecord = res.body.rentRecord;
    expect(rentRecord.isProRated).toBe(true);
    expect(rentRecord.proRatedDays).toBe(21);
    expect(rentRecord.totalDaysInMonth).toBe(31);
    expect(rentRecord.amount).toBe(6300);
    expect(rentRecord.balance).toBe(6300);
    expect(rentRecord.status).toBe('DUE');
  });

  // TEST 2: Bed double-booking prevention on server
  it('2. Prevents double-booking: rejects assigning an already occupied bed', async () => {
    // Try to assign Tenant 2 to testBed1 (which is already occupied by Tenant 1)
    const res = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant2User.tenant.id,
        bedId: testBed1.id, // already occupied!
        checkInDate: '2026-10-15',
        monthlyRent: 9300,
        securityDeposit: 15000,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already occupied');
    expect(res.body.error).toContain('A bed cannot have two tenants at the same time');
  });

  // TEST 3: Partial payment and outstanding balance tracking
  it('3. Supports partial payments and tracks outstanding balance accurately', async () => {
    // Tenant 1 has rent of 6300. Pay 2500 as part payment.
    const rentRecord = await prisma.rentRecord.findFirst({
      where: { tenantId: tenant1User.tenant.id },
    });

    expect(rentRecord).toBeDefined();

    const paymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!.id,
        amount: 2500,
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TXN-12345678',
        notes: 'First installment paid via Google Pay',
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.payment.amount).toBe(2500);
    expect(paymentRes.body.payment.receiptNumber).toMatch(/^REC-/);
    expect(paymentRes.body.rentRecord.paidAmount).toBe(2500);
    expect(paymentRes.body.rentRecord.balance).toBe(3800); // 6300 - 2500

    // Now pay remaining balance of 3800
    const finalPaymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!.id,
        amount: 3800,
        paymentMethod: 'BANK_TRANSFER',
        transactionRef: 'NEFT-889900',
      });

    expect(finalPaymentRes.status).toBe(201);
    expect(finalPaymentRes.body.rentRecord.balance).toBe(0);
    expect(finalPaymentRes.body.rentRecord.status).toBe('PAID');
  });

  // TEST 4: Prevent overpayment beyond outstanding balance
  it('4. Rejects payments exceeding outstanding balance', async () => {
    const rentRecord = await prisma.rentRecord.findFirst({
      where: { tenantId: tenant1User.tenant.id },
    });

    const overpaymentRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!.id,
        amount: 500, // Balance is 0
        paymentMethod: 'CASH',
      });

    expect(overpaymentRes.status).toBe(400);
    expect(overpaymentRes.body.error).toContain('already fully paid');
  });

  // TEST 5: Maintenance complaints creation & status updates
  it('5. Tenant can raise complaint and owner can update status', async () => {
    // Tenant 1 raises a complaint
    const createRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        title: 'Geyser not heating water',
        description: 'The bathroom geyser takes over 45 minutes and water remains lukewarm.',
        category: 'ELECTRICAL',
        priority: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.complaint.status).toBe('OPEN');
    const complaintId = createRes.body.complaint.id;

    // Owner updates status to IN_PROGRESS and then RESOLVED
    const updateRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Heating element replaced by electrician on Oct 12.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.complaint.status).toBe('RESOLVED');
    expect(updateRes.body.complaint.resolutionNotes).toContain('Heating element replaced');
  });

  // TEST 6: Check-out with security deposit deductions and bed release
  it('6. Check-out deducts security deposit, pro-rates final rent, and frees the bed', async () => {
    const occupancy = await prisma.bedOccupancy.findFirst({
      where: { tenantId: tenant1User.tenant.id, status: 'ACTIVE' },
    });

    expect(occupancy).toBeDefined();

    const checkoutRes = await request(app)
      .post('/api/tenants/check-out')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        occupancyId: occupancy!.id,
        checkOutDate: '2026-10-25',
        depositDeductions: 3000,
        depositDeductionNotes: 'Room repaint and deep cleaning deduction',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.settlement.securityDeposit).toBe(15000);
    expect(checkoutRes.body.settlement.deductions).toBe(3000);
    expect(checkoutRes.body.settlement.netRefund).toBe(12000);

    // Bed must now be AVAILABLE again
    const freedBed = await prisma.bed.findUnique({ where: { id: testBed1.id } });
    expect(freedBed?.status).toBe('AVAILABLE');

    // Tenant 2 can now safely check in to testBed1 since it is freed!
    const t2CheckinRes = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant2User.tenant.id,
        bedId: testBed1.id,
        checkInDate: '2026-10-26',
        monthlyRent: 9500,
        securityDeposit: 15000,
      });

    expect(t2CheckinRes.status).toBe(201);
  });
});
