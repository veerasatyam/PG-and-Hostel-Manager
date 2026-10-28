import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-chars-long';
process.env.NODE_ENV = 'test';

import app from '../src/index';
import { connectDB, disconnectDB } from '../src/db';
import { User } from '../src/models/User';
import { Tenant } from '../src/models/Tenant';
import { Room } from '../src/models/Room';
import { BedOccupancy } from '../src/models/BedOccupancy';
import { RentRecord } from '../src/models/RentRecord';
import { Payment } from '../src/models/Payment';
import { Complaint } from '../src/models/Complaint';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

describe('StayHaven MongoDB Backend Integration Tests', () => {
  let ownerToken: string;
  let tenant1Token: string;
  let tenant2Token: string;

  let tenant1Record: any;
  let tenant2Record: any;
  let testRoom: any;
  let testBed1: any;
  let testBed2: any;

  beforeAll(async () => {
    await connectDB();

    // Clean test database
    await Payment.deleteMany();
    await Complaint.deleteMany();
    await RentRecord.deleteMany();
    await BedOccupancy.deleteMany();
    await Room.deleteMany();
    await Tenant.deleteMany();
    await User.deleteMany();

    const hashedPassword = await bcrypt.hash('secret123', 10);

    // 1. Create Property Owner
    const ownerUser = await User.create({
      name: 'Property Owner',
      email: 'owner@stayhaven.test',
      password: hashedPassword,
      role: 'OWNER',
      phone: '9876543210',
    });

    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@stayhaven.test', password: 'secret123' });
    ownerToken = ownerLogin.body.token;

    // 2. Create Tenant 1
    const t1User = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@stayhaven.test',
      password: hashedPassword,
      role: 'TENANT',
      phone: '9123456780',
    });
    tenant1Record = await Tenant.create({
      userId: t1User._id,
      emergencyContact: '9123456789',
      idProofNumber: 'AADHAAR-1001',
    });

    const t1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rohan@stayhaven.test', password: 'secret123' });
    tenant1Token = t1Login.body.token;

    // 3. Create Tenant 2
    const t2User = await User.create({
      name: 'Karan Mehra',
      email: 'karan@stayhaven.test',
      password: hashedPassword,
      role: 'TENANT',
      phone: '9234567890',
    });
    tenant2Record = await Tenant.create({
      userId: t2User._id,
      emergencyContact: '9234567899',
      idProofNumber: 'AADHAAR-2002',
    });

    const t2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'karan@stayhaven.test', password: 'secret123' });
    tenant2Token = t2Login.body.token;

    // 4. Create Room 101 with 2 beds
    testRoom = await Room.create({
      number: '101',
      floor: 1,
      type: 'DOUBLE',
      hasAc: true,
      baseRent: 10000,
      beds: [
        { _id: new mongoose.Types.ObjectId(), name: 'Bed A', status: 'AVAILABLE' },
        { _id: new mongoose.Types.ObjectId(), name: 'Bed B', status: 'AVAILABLE' },
      ],
    });

    testBed1 = testRoom.beds[0];
    testBed2 = testRoom.beds[1];
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // TEST 1: Mid-month check-in assigns bed and generates pro-rated rent record
  it('1. Mid-month check-in assigns bed and generates accurate pro-rated rent', async () => {
    // Check in on October 11, 2026 (Month with 31 days)
    // Active days = 31 - 11 + 1 = 21 days
    // Rent: 9300 / 31 * 21 = 6300
    const res = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant1Record._id.toString(),
        bedId: testBed1._id.toString(),
        checkInDate: '2026-10-11',
        monthlyRent: 9300,
        securityDeposit: 15000,
      });

    expect(res.status).toBe(201);
    expect(res.body.occupancy).toBeDefined();
    expect(res.body.occupancy.status).toBe('ACTIVE');

    // Bed status in Room should now be OCCUPIED
    const room = await Room.findById(testRoom._id);
    const bed = room?.beds.find((b: any) => b._id.toString() === testBed1._id.toString());
    expect(bed?.status).toBe('OCCUPIED');

    // Pro-rated rent record
    const rentRecord = res.body.rentRecord;
    expect(rentRecord.isProRated).toBe(true);
    expect(rentRecord.proRatedDays).toBe(21);
    expect(rentRecord.totalDaysInMonth).toBe(31);
    expect(rentRecord.amount).toBe(6300);
    expect(rentRecord.balance).toBe(6300);
    expect(rentRecord.status).toBe('DUE');
  });

  // TEST 2: Prevents double-booking: rejects assigning an already occupied bed
  it('2. Prevents double-booking: server rejects assigning an occupied bed (409 Conflict)', async () => {
    // Attempt to assign Tenant 2 to testBed1 (which is already occupied by Tenant 1)
    const res = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant2Record._id.toString(),
        bedId: testBed1._id.toString(),
        checkInDate: '2026-10-15',
        monthlyRent: 9300,
        securityDeposit: 15000,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already occupied');
    expect(res.body.error).toContain('A bed cannot have two tenants at the same time');
  });

  // TEST 3: Partial payment and outstanding balance tracking
  it('3. Supports partial payment and accurately tracks outstanding balance', async () => {
    const rentRecord = await RentRecord.findOne({ tenantId: tenant1Record._id });
    expect(rentRecord).toBeDefined();

    // Rent is 6300. Pay 2500 installment.
    const partPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!._id.toString(),
        amount: 2500,
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TXN-998811',
        notes: 'First installment via UPI',
      });

    expect(partPayRes.status).toBe(201);
    expect(partPayRes.body.payment.amount).toBe(2500);
    expect(partPayRes.body.payment.receiptNumber).toMatch(/^REC-/);
    expect(partPayRes.body.rentRecord.paidAmount).toBe(2500);
    expect(partPayRes.body.rentRecord.balance).toBe(3800); // 6300 - 2500

    // Pay remaining balance of 3800
    const settlePayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!._id.toString(),
        amount: 3800,
        paymentMethod: 'BANK_TRANSFER',
      });

    expect(settlePayRes.status).toBe(201);
    expect(settlePayRes.body.rentRecord.balance).toBe(0);
    expect(settlePayRes.body.rentRecord.status).toBe('PAID');
  });

  // TEST 4: Prevent overpayment beyond outstanding balance
  it('4. Rejects payments exceeding outstanding balance', async () => {
    const rentRecord = await RentRecord.findOne({ tenantId: tenant1Record._id });

    const overpayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rentRecordId: rentRecord!._id.toString(),
        amount: 500,
        paymentMethod: 'CASH',
      });

    expect(overpayRes.status).toBe(400);
    expect(overpayRes.body.error).toContain('already fully settled');
  });

  // TEST 5: Maintenance work order creation & status updates
  it('5. Tenant can raise work order and owner can update status', async () => {
    const createRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        title: 'Geyser thermostat malfunctioning',
        description: 'Water does not heat properly in the 1st floor bathroom.',
        category: 'ELECTRICAL',
        priority: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.complaint.status).toBe('OPEN');
    const complaintId = createRes.body.complaint.id;

    const updateRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Thermostat replacement completed by electrician.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.complaint.status).toBe('RESOLVED');
  });

  // TEST 6: Check-out with security deposit deductions and bed release
  it('6. Check-out deducts security deposit, pro-rates final rent, and frees the bed', async () => {
    const occupancy = await BedOccupancy.findOne({
      tenantId: tenant1Record._id,
      status: 'ACTIVE',
    });
    expect(occupancy).toBeDefined();

    const checkoutRes = await request(app)
      .post('/api/tenants/check-out')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        occupancyId: occupancy!._id.toString(),
        checkOutDate: '2026-10-25',
        depositDeductions: 3000,
        depositDeductionNotes: 'Deep cleaning and wall touch-up fee',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.settlement.securityDeposit).toBe(15000);
    expect(checkoutRes.body.settlement.deductions).toBe(3000);
    expect(checkoutRes.body.settlement.netRefund).toBe(12000);

    // Bed in room should now be AVAILABLE
    const room = await Room.findById(testRoom._id);
    const freedBed = room?.beds.find((b: any) => b._id.toString() === testBed1._id.toString());
    expect(freedBed?.status).toBe('AVAILABLE');

    // Tenant 2 can now check in to the freed bed!
    const t2CheckinRes = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: tenant2Record._id.toString(),
        bedId: testBed1._id.toString(),
        checkInDate: '2026-10-26',
        monthlyRent: 9500,
        securityDeposit: 15000,
      });

    expect(t2CheckinRes.status).toBe(201);
  });

  // TEST 7: Check-in and check-out rent record creation and lifecycle path
  it('7. Verifies end-to-end check-in and check-out rent record creation, pro-rating, and adjustment', async () => {
    // 1. Create a fresh tenant and bed for clean lifecycle test
    const hashedPassword = await bcrypt.hash('secret123', 10);
    const lifecycleUser = await User.create({
      name: 'Sneha Rao',
      email: 'sneha.lifecycle@stayhaven.test',
      password: hashedPassword,
      role: 'TENANT',
      phone: '9988776655',
    });
    const lifecycleTenant = await Tenant.create({
      userId: lifecycleUser._id,
      emergencyContact: '9988776600',
      idProofNumber: 'AADHAAR-3003',
    });

    const lifecycleRoom = await Room.create({
      number: '202',
      floor: 2,
      type: 'SINGLE',
      hasAc: false,
      baseRent: 12000,
      beds: [{ _id: new mongoose.Types.ObjectId(), name: 'Bed A', status: 'AVAILABLE' }],
    });
    const targetBed = lifecycleRoom.beds[0];

    // 2. Check-in mid-month: November 16, 2026 (November has 30 days)
    // Active days = 30 - 16 + 1 = 15 days
    // Expected rent = 12000 / 30 * 15 = 6000
    const checkinRes = await request(app)
      .post('/api/tenants/check-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tenantId: lifecycleTenant._id.toString(),
        bedId: targetBed._id.toString(),
        checkInDate: '2026-11-16',
        monthlyRent: 12000,
        securityDeposit: 20000,
      });

    expect(checkinRes.status).toBe(201);
    const checkinRent = checkinRes.body.rentRecord;
    expect(checkinRent.isProRated).toBe(true);
    expect(checkinRent.proRatedDays).toBe(15);
    expect(checkinRent.totalDaysInMonth).toBe(30);
    expect(checkinRent.amount).toBe(6000);
    expect(checkinRent.balance).toBe(6000);
    expect(checkinRent.status).toBe('DUE');

    // Verify rent record exists in MongoDB
    const savedCheckinRecord = await RentRecord.findById(checkinRent.id);
    expect(savedCheckinRecord).not.toBeNull();
    expect(savedCheckinRecord!.tenantId.toString()).toBe(lifecycleTenant._id.toString());
    expect(savedCheckinRecord!.month).toBe(11);
    expect(savedCheckinRecord!.year).toBe(2026);

    const occupancyId = checkinRes.body.occupancy.id;

    // 3. Check-out mid-month in December: December 10, 2026 (December has 31 days)
    // Active days in checkout month = 1 to 10 = 10 days
    // Expected checkout month rent = 12000 / 31 * 10 = 3871
    const checkoutRes = await request(app)
      .post('/api/tenants/check-out')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        occupancyId,
        checkOutDate: '2026-12-10',
        depositDeductions: 1500,
        depositDeductionNotes: 'Minor wall painting touch-up',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.proRatedRent.isProRated).toBe(true);
    expect(checkoutRes.body.proRatedRent.proRatedDays).toBe(10);
    expect(checkoutRes.body.proRatedRent.totalDaysInMonth).toBe(31);
    expect(checkoutRes.body.proRatedRent.amount).toBe(3871);

    // Verify December rent record was created upon check-out
    const decRentRecord = await RentRecord.findOne({
      tenantId: lifecycleTenant._id,
      month: 12,
      year: 2026,
    });
    expect(decRentRecord).not.toBeNull();
    expect(decRentRecord!.amount).toBe(3871);
    expect(decRentRecord!.balance).toBe(3871);
    expect(decRentRecord!.isProRated).toBe(true);
    expect(decRentRecord!.proRatedDays).toBe(10);
    expect(decRentRecord!.proRatedCalculationNotes).toContain('Check-out');

    // 4. Verify bed is released and available again
    const updatedRoom = await Room.findById(lifecycleRoom._id);
    const freedBed = updatedRoom?.beds.find((b: any) => b._id.toString() === targetBed._id.toString());
    expect(freedBed?.status).toBe('AVAILABLE');
  });

  // TEST 8: Atomic single-occupancy enforcement at database index level
  it('8. Atomic partial unique index rejects simultaneous active occupancy on the same bed', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    const userA = await User.create({
      name: 'Tenant Alpha',
      email: 'alpha@stayhaven.test',
      password: hashedPassword,
      role: 'TENANT',
    });
    const tenantA = await Tenant.create({ userId: userA._id });

    const userB = await User.create({
      name: 'Tenant Beta',
      email: 'beta@stayhaven.test',
      password: hashedPassword,
      role: 'TENANT',
    });
    const tenantB = await Tenant.create({ userId: userB._id });

    // 1. Assign tenantA to testBed2
    const occ1 = await BedOccupancy.create({
      bedId: testBed2._id,
      roomId: testRoom._id,
      tenantId: tenantA._id,
      checkInDate: new Date('2026-10-01'),
      monthlyRent: 8000,
      securityDeposit: 8000,
      status: 'ACTIVE',
    });
    expect(occ1._id).toBeDefined();

    // 2. Directly attempting to insert another ACTIVE document for the same bedId must throw Mongo error (code 11000)
    let duplicateError: any = null;
    try {
      await BedOccupancy.create({
        bedId: testBed2._id,
        roomId: testRoom._id,
        tenantId: tenantB._id,
        checkInDate: new Date('2026-10-05'),
        monthlyRent: 8000,
        securityDeposit: 8000,
        status: 'ACTIVE',
      });
    } catch (err: any) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000);
  });
});
