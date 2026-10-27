export type Role = 'OWNER' | 'TENANT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  tenantId?: string;
  activeStay?: {
    occupancyId: string;
    roomNumber: string;
    bedName: string;
    monthlyRent: number;
    checkInDate: string;
    securityDeposit: number;
  } | null;
}

export interface Bed {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  currentOccupant?: {
    occupancyId: string;
    tenantId: string;
    name: string;
    email: string;
    phone?: string;
    checkInDate: string;
    monthlyRent: number;
  } | null;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'FOUR_SHARING';
  hasAc: boolean;
  baseRent: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  beds: Bed[];
}

export interface Tenant {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  emergencyContact?: string;
  idProofNumber?: string;
  activeStay?: {
    occupancyId: string;
    bedId: string;
    bedName: string;
    roomId: string;
    roomNumber: string;
    checkInDate: string;
    monthlyRent: number;
    securityDeposit: number;
    depositStatus: string;
  } | null;
  totalBalance: number;
  overdueCount: number;
  hasOverdue: boolean;
  rentHistoryCount: number;
}

export interface Payment {
  id: string;
  rentRecordId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CARD';
  transactionRef?: string;
  receiptNumber: string;
  notes?: string;
}

export interface RentRecord {
  id: string;
  tenantId: string;
  tenant: {
    user: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  occupancy?: {
    bed: {
      name: string;
      room: {
        number: string;
      };
    };
  };
  month: number;
  year: number;
  dueDate: string;
  baseAmount: number;
  amount: number;
  paidAmount: number;
  balance: number;
  isProRated: boolean;
  proRatedDays?: number;
  totalDaysInMonth?: number;
  proRatedCalculationNotes?: string;
  status: 'DUE' | 'PAID' | 'OVERDUE';
  payments: Payment[];
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'WIFI' | 'FURNITURE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    roomNumber: string;
    bedName: string;
  };
}

export interface DashboardMetrics {
  metrics: {
    occupancy: {
      totalRooms: number;
      totalBeds: number;
      occupiedBeds: number;
      availableBeds: number;
      occupancyRate: number;
    };
    rent: {
      currentMonth: number;
      currentYear: number;
      rentCollectedThisMonth: number;
      totalBilledThisMonth: number;
      totalOverdueAmount: number;
      overdueTenantsCount: number;
    };
    complaints: {
      open: number;
      inProgress: number;
      resolved: number;
      total: number;
    };
  };
  overdueTenants: Array<{
    tenantId: string;
    name: string;
    email: string;
    phone?: string;
    roomNumber: string;
    bedName: string;
    totalOverdueBalance: number;
    maxDaysOverdue: number;
    records: Array<{
      id: string;
      month: number;
      year: number;
      dueDate: string;
      balance: number;
      daysOverdue: number;
    }>;
  }>;
  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    tenantName: string;
  }>;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  notes: string;
  tenant: {
    name: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
  };
  room: {
    roomNumber: string;
    bedName: string;
  };
  rentPeriod: {
    month: number;
    year: number;
    totalRentDue: number;
    totalPaidToDate: number;
    remainingBalance: number;
    status: string;
    isProRated: boolean;
    proRatedNotes?: string;
  };
}
