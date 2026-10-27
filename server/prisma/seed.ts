import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding StayHaven database with realistic demo data...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.rentRecord.deleteMany();
  await prisma.bedOccupancy.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Owner User
  const owner = await prisma.user.create({
    data: {
      name: 'Vikramaditya (Hostel Owner)',
      email: 'owner@stayhaven.com',
      password: defaultPassword,
      role: 'OWNER',
      phone: '+91 98765 43210',
    },
  });

  // 2. Create Rooms & Beds
  const room101 = await prisma.room.create({
    data: {
      number: '101',
      floor: 1,
      type: 'DOUBLE',
      hasAc: true,
      baseRent: 8500,
      beds: {
        create: [{ name: 'Bed A' }, { name: 'Bed B' }],
      },
    },
    include: { beds: true },
  });

  const room102 = await prisma.room.create({
    data: {
      number: '102',
      floor: 1,
      type: 'SINGLE',
      hasAc: true,
      baseRent: 14000,
      beds: {
        create: [{ name: 'Bed A' }],
      },
    },
    include: { beds: true },
  });

  const room201 = await prisma.room.create({
    data: {
      number: '201',
      floor: 2,
      type: 'TRIPLE',
      hasAc: false,
      baseRent: 6500,
      beds: {
        create: [{ name: 'Bed A' }, { name: 'Bed B' }, { name: 'Bed C' }],
      },
    },
    include: { beds: true },
  });

  const room202 = await prisma.room.create({
    data: {
      number: '202',
      floor: 2,
      type: 'DOUBLE',
      hasAc: false,
      baseRent: 7000,
      beds: {
        create: [{ name: 'Bed A' }, { name: 'Bed B' }],
      },
    },
    include: { beds: true },
  });

  // 3. Create Tenant Users
  const rahulUser = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      password: defaultPassword,
      role: 'TENANT',
      phone: '+91 91234 56781',
      tenant: {
        create: {
          emergencyContact: '+91 98877 66554',
          idProofNumber: 'AADH-8472-9102',
        },
      },
    },
    include: { tenant: true },
  });

  const priyaUser = await prisma.user.create({
    data: {
      name: 'Priya Verma',
      email: 'priya@gmail.com',
      password: defaultPassword,
      role: 'TENANT',
      phone: '+91 92345 67892',
      tenant: {
        create: {
          emergencyContact: '+91 97766 55443',
          idProofNumber: 'PANC-7782-9901',
        },
      },
    },
    include: { tenant: true },
  });

  const amitUser = await prisma.user.create({
    data: {
      name: 'Amit Kumar',
      email: 'amit@gmail.com',
      password: defaultPassword,
      role: 'TENANT',
      phone: '+91 93456 78903',
      tenant: {
        create: {
          emergencyContact: '+91 96655 44332',
          idProofNumber: 'AADH-5521-8899',
        },
      },
    },
    include: { tenant: true },
  });

  const nehaUser = await prisma.user.create({
    data: {
      name: 'Neha Gupta',
      email: 'neha@gmail.com',
      password: defaultPassword,
      role: 'TENANT',
      phone: '+91 94567 89014',
      tenant: {
        create: {
          emergencyContact: '+91 95544 33221',
          idProofNumber: 'VOTE-9988-1122',
        },
      },
    },
    include: { tenant: true },
  });

  const vikramUser = await prisma.user.create({
    data: {
      name: 'Vikram Joshi',
      email: 'vikram@gmail.com',
      password: defaultPassword,
      role: 'TENANT',
      phone: '+91 95678 90125',
      tenant: {
        create: {
          emergencyContact: '+91 94433 22110',
          idProofNumber: 'PASS-K882201',
        },
      },
    },
    include: { tenant: true },
  });

  // 4. Assign Occupancies (Check-ins)

  // Rahul: Checked in Oct 1, 2026 into Room 101 Bed A
  const rahulBed = room101.beds[0];
  const rahulOcc = await prisma.bedOccupancy.create({
    data: {
      bedId: rahulBed.id,
      tenantId: rahulUser.tenant!.id,
      checkInDate: new Date('2026-10-01'),
      monthlyRent: 8500,
      securityDeposit: 15000,
      depositStatus: 'HELD',
      status: 'ACTIVE',
    },
  });
  await prisma.bed.update({
    where: { id: rahulBed.id },
    data: { status: 'OCCUPIED' },
  });

  // Priya: Checked in Sept 1, 2026 into Room 102 Bed A (Overdue tenant)
  const priyaBed = room102.beds[0];
  const priyaOcc = await prisma.bedOccupancy.create({
    data: {
      bedId: priyaBed.id,
      tenantId: priyaUser.tenant!.id,
      checkInDate: new Date('2026-09-01'),
      monthlyRent: 14000,
      securityDeposit: 25000,
      depositStatus: 'HELD',
      status: 'ACTIVE',
    },
  });
  await prisma.bed.update({
    where: { id: priyaBed.id },
    data: { status: 'OCCUPIED' },
  });

  // Amit: Checked in mid-month Oct 11, 2026 into Room 201 Bed A (Pro-rated rent test case!)
  // 31 - 11 + 1 = 21 active days
  // 6500 / 31 * 21 = 4403
  const amitBed = room201.beds[0];
  const amitOcc = await prisma.bedOccupancy.create({
    data: {
      bedId: amitBed.id,
      tenantId: amitUser.tenant!.id,
      checkInDate: new Date('2026-10-11'),
      monthlyRent: 6500,
      securityDeposit: 10000,
      depositStatus: 'HELD',
      status: 'ACTIVE',
    },
  });
  await prisma.bed.update({
    where: { id: amitBed.id },
    data: { status: 'OCCUPIED' },
  });

  // Vikram: Former tenant who checked in Aug 1 and checked out Oct 10 with security deposit deductions
  const vikramBed = room202.beds[0];
  await prisma.bedOccupancy.create({
    data: {
      bedId: vikramBed.id,
      tenantId: vikramUser.tenant!.id,
      checkInDate: new Date('2026-08-01'),
      checkOutDate: new Date('2026-10-10'),
      monthlyRent: 7000,
      securityDeposit: 14000,
      depositDeductions: 2500,
      depositRefundAmount: 11500,
      depositDeductionNotes: 'Bed frame repair (₹1500) and room deep cleaning (₹1000)',
      depositStatus: 'PARTIALLY_REFUNDED',
      status: 'CHECKED_OUT',
    },
  });
  // His bed is now AVAILABLE again
  await prisma.bed.update({
    where: { id: vikramBed.id },
    data: { status: 'AVAILABLE' },
  });

  // 5. Rent Records & Payments

  // Rahul: Paid full rent for Oct 2026
  const rahulRentOct = await prisma.rentRecord.create({
    data: {
      tenantId: rahulUser.tenant!.id,
      occupancyId: rahulOcc.id,
      month: 10,
      year: 2026,
      dueDate: new Date('2026-10-05'),
      baseAmount: 8500,
      amount: 8500,
      paidAmount: 8500,
      balance: 0,
      isProRated: false,
      proRatedDays: 31,
      totalDaysInMonth: 31,
      proRatedCalculationNotes: 'Full month rent (31 days)',
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      rentRecordId: rahulRentOct.id,
      amount: 8500,
      paymentDate: new Date('2026-10-04'),
      paymentMethod: 'UPI',
      transactionRef: 'UPI-RAHUL-449182',
      receiptNumber: 'REC-20261004-9102',
      notes: 'Full payment via Google Pay',
    },
  });

  // Priya: OVERDUE for Oct 2026 (Unpaid)
  await prisma.rentRecord.create({
    data: {
      tenantId: priyaUser.tenant!.id,
      occupancyId: priyaOcc.id,
      month: 10,
      year: 2026,
      dueDate: new Date('2026-10-05'), // in the past -> OVERDUE
      baseAmount: 14000,
      amount: 14000,
      paidAmount: 0,
      balance: 14000,
      isProRated: false,
      proRatedDays: 31,
      totalDaysInMonth: 31,
      proRatedCalculationNotes: 'Full month rent (31 days)',
      status: 'OVERDUE',
    },
  });

  // Amit: Mid-month check-in pro-rated rent (4403) with Part Payment of 2000 done!
  const amitRentOct = await prisma.rentRecord.create({
    data: {
      tenantId: amitUser.tenant!.id,
      occupancyId: amitOcc.id,
      month: 10,
      year: 2026,
      dueDate: new Date('2026-10-16'),
      baseAmount: 6500,
      amount: 4403,
      paidAmount: 2000,
      balance: 2403,
      isProRated: true,
      proRatedDays: 21,
      totalDaysInMonth: 31,
      proRatedCalculationNotes: 'Pro-rated for 21 days (Day 11 to 31 of 31 days in month)',
      status: 'DUE',
    },
  });

  await prisma.payment.create({
    data: {
      rentRecordId: amitRentOct.id,
      amount: 2000,
      paymentDate: new Date('2026-10-14'),
      paymentMethod: 'UPI',
      transactionRef: 'UPI-AMIT-882190',
      receiptNumber: 'REC-20261014-4198',
      notes: 'Part payment installment #1',
    },
  });

  // 6. Maintenance Complaints
  await prisma.complaint.create({
    data: {
      tenantId: priyaUser.tenant!.id,
      title: 'AC unit dripping water onto desk',
      description: 'The split AC unit in Room 102 has a slow continuous drip on the right panel after running for 2 hours.',
      category: 'ELECTRICAL',
      priority: 'HIGH',
      status: 'OPEN',
    },
  });

  await prisma.complaint.create({
    data: {
      tenantId: amitUser.tenant!.id,
      title: 'Geyser takes too long to heat water',
      description: 'The 2nd floor common bathroom geyser light is blinking and water gets barely warm.',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      resolutionNotes: 'Electrician scheduled for inspection on Thursday afternoon.',
    },
  });

  await prisma.complaint.create({
    data: {
      tenantId: rahulUser.tenant!.id,
      title: 'High-speed Wi-Fi router dropped connection',
      description: 'The 5GHz WiFi band on floor 1 was dropping connection every 10 minutes.',
      category: 'WIFI',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      resolutionNotes: 'Firmware updated and primary DNS replaced with Cloudflare 1.1.1.1.',
      resolvedAt: new Date('2026-10-06'),
    },
  });

  console.log('✅ StayHaven Database seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Logins:');
  console.log('👑 Owner:');
  console.log('   Email:    owner@stayhaven.com');
  console.log('   Password: password123');
  console.log('👤 Tenants:');
  console.log('   1. Rahul (Paid rent):       rahul@gmail.com / password123');
  console.log('   2. Priya (Overdue rent):    priya@gmail.com / password123');
  console.log('   3. Amit  (Part-paid rent):  amit@gmail.com  / password123');
  console.log('   4. Neha  (Unassigned):      neha@gmail.com  / password123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
