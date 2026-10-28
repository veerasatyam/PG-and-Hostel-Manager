import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './db';
import { User } from './models/User';
import { Room } from './models/Room';
import { Tenant } from './models/Tenant';
import { BedOccupancy } from './models/BedOccupancy';
import { RentRecord } from './models/RentRecord';
import { Payment } from './models/Payment';
import { Complaint } from './models/Complaint';

export async function seedDatabase(shouldDisconnect = false) {
  console.log('🌱 Initializing StayHaven MongoDB database...');
  await connectDB();

  // Clean existing collections
  await Payment.deleteMany();
  await Complaint.deleteMany();
  await RentRecord.deleteMany();
  await BedOccupancy.deleteMany();
  await Room.deleteMany();
  await Tenant.deleteMany();
  await User.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Initial Property Manager Account
  const manager = await User.create({
    name: 'Property Admin',
    email: 'admin@stayhaven.com',
    password: defaultPassword,
    role: 'OWNER',
    phone: '+91 98765 43210',
  });

  // 2. Initial Sample Rooms
  const room101 = await Room.create({
    number: '101',
    floor: 1,
    type: 'DOUBLE',
    hasAc: true,
    baseRent: 8500,
    beds: [
      { _id: new mongoose.Types.ObjectId(), name: 'Bed A', status: 'OCCUPIED' },
      { _id: new mongoose.Types.ObjectId(), name: 'Bed B', status: 'AVAILABLE' },
    ],
  });

  const room102 = await Room.create({
    number: '102',
    floor: 1,
    type: 'SINGLE',
    hasAc: true,
    baseRent: 14000,
    beds: [
      { _id: new mongoose.Types.ObjectId(), name: 'Bed A', status: 'OCCUPIED' },
    ],
  });

  const room201 = await Room.create({
    number: '201',
    floor: 2,
    type: 'TRIPLE',
    hasAc: false,
    baseRent: 6500,
    beds: [
      { _id: new mongoose.Types.ObjectId(), name: 'Bed A', status: 'OCCUPIED' },
      { _id: new mongoose.Types.ObjectId(), name: 'Bed B', status: 'AVAILABLE' },
      { _id: new mongoose.Types.ObjectId(), name: 'Bed C', status: 'AVAILABLE' },
    ],
  });

  // 3. Resident Accounts
  const r1User = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul@gmail.com',
    password: defaultPassword,
    role: 'TENANT',
    phone: '+91 91234 56781',
  });
  const r1Tenant = await Tenant.create({
    userId: r1User._id,
    emergencyContact: '+91 98877 66554',
    idProofNumber: 'AADH-8472-9102',
  });

  const r2User = await User.create({
    name: 'Priya Verma',
    email: 'priya@gmail.com',
    password: defaultPassword,
    role: 'TENANT',
    phone: '+91 92345 67892',
  });
  const r2Tenant = await Tenant.create({
    userId: r2User._id,
    emergencyContact: '+91 97766 55443',
    idProofNumber: 'PANC-7782-9901',
  });

  const r3User = await User.create({
    name: 'Amit Kumar',
    email: 'amit@gmail.com',
    password: defaultPassword,
    role: 'TENANT',
    phone: '+91 93456 78903',
  });
  const r3Tenant = await Tenant.create({
    userId: r3User._id,
    emergencyContact: '+91 96655 44332',
    idProofNumber: 'AADH-5521-8899',
  });

  // 4. Assign Occupancies
  const rahulOcc = await BedOccupancy.create({
    bedId: room101.beds[0]._id,
    roomId: room101._id,
    tenantId: r1Tenant._id,
    checkInDate: new Date('2026-10-01'),
    monthlyRent: 8500,
    securityDeposit: 15000,
    depositStatus: 'HELD',
    status: 'ACTIVE',
  });

  const priyaOcc = await BedOccupancy.create({
    bedId: room102.beds[0]._id,
    roomId: room102._id,
    tenantId: r2Tenant._id,
    checkInDate: new Date('2026-09-01'),
    monthlyRent: 14000,
    securityDeposit: 25000,
    depositStatus: 'HELD',
    status: 'ACTIVE',
  });

  const amitOcc = await BedOccupancy.create({
    bedId: room201.beds[0]._id,
    roomId: room201._id,
    tenantId: r3Tenant._id,
    checkInDate: new Date('2026-10-11'),
    monthlyRent: 6500,
    securityDeposit: 10000,
    depositStatus: 'HELD',
    status: 'ACTIVE',
  });

  // 5. Billing & Payments
  // Rahul: Settled full rent
  const r1Rent = await RentRecord.create({
    tenantId: r1Tenant._id,
    occupancyId: rahulOcc._id,
    month: 10,
    year: 2026,
    dueDate: new Date('2026-10-05'),
    baseAmount: 8500,
    amount: 8500,
    paidAmount: 8500,
    balance: 0,
    isProRated: false,
    status: 'PAID',
  });
  await Payment.create({
    rentRecordId: r1Rent._id,
    amount: 8500,
    paymentDate: new Date('2026-10-04'),
    paymentMethod: 'UPI',
    transactionRef: 'UPI-RAHUL-449182',
    receiptNumber: 'REC-20261004-9102',
    notes: 'Settled via UPI',
  });

  // Priya: Overdue
  await RentRecord.create({
    tenantId: r2Tenant._id,
    occupancyId: priyaOcc._id,
    month: 10,
    year: 2026,
    dueDate: new Date('2026-10-05'),
    baseAmount: 14000,
    amount: 14000,
    paidAmount: 0,
    balance: 14000,
    isProRated: false,
    status: 'OVERDUE',
  });

  // Amit: Mid-month pro-rated with part payment
  const r3Rent = await RentRecord.create({
    tenantId: r3Tenant._id,
    occupancyId: amitOcc._id,
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
    proRatedCalculationNotes: 'Pro-rated for 21 days (Day 11 to 31)',
    status: 'DUE',
  });
  await Payment.create({
    rentRecordId: r3Rent._id,
    amount: 2000,
    paymentDate: new Date('2026-10-14'),
    paymentMethod: 'UPI',
    transactionRef: 'UPI-AMIT-882190',
    receiptNumber: 'REC-20261014-4198',
    notes: 'Part payment installment #1',
  });

  // 6. Maintenance Work Order
  await Complaint.create({
    tenantId: r2Tenant._id,
    title: 'AC unit condensation leak',
    description: 'The split AC unit in Room 102 has a slow drip from the right condensation outlet.',
    category: 'ELECTRICAL',
    priority: 'HIGH',
    status: 'OPEN',
  });

  await Complaint.create({
    tenantId: r1Tenant._id,
    title: 'WiFi connection latency on 1st floor',
    description: 'High packet loss on the 5GHz access point during peak hours.',
    category: 'WIFI',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    resolutionNotes: 'Access point channel reconfigured and firmware updated.',
    resolvedAt: new Date('2026-10-06'),
  });

  console.log('✅ Database initialization complete.');
  console.log('Manager credentials: admin@stayhaven.com / password123');
  if (shouldDisconnect) {
    await disconnectDB();
  }
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  seedDatabase(true).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
