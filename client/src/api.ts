const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('stayhaven_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || (data.details && data.details.join(', ')) || 'An unexpected error occurred';
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async register(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse<{ user: any }>(res);
  },

  // Rooms & Beds
  async getRooms() {
    const res = await fetch(`${API_BASE}/rooms`, { headers: getHeaders() });
    return handleResponse<{ rooms: any[] }>(res);
  },

  async getAvailableBeds() {
    const res = await fetch(`${API_BASE}/rooms/available-beds`, { headers: getHeaders() });
    return handleResponse<{ beds: any[] }>(res);
  },

  async createRoom(data: any) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; room: any }>(res);
  },

  async addBed(roomId: string, name: string) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/beds`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse<{ message: string; bed: any }>(res);
  },

  // Tenants
  async getTenants() {
    const res = await fetch(`${API_BASE}/tenants`, { headers: getHeaders() });
    return handleResponse<{ tenants: any[] }>(res);
  },

  async getUnassignedTenants() {
    const res = await fetch(`${API_BASE}/tenants/unassigned`, { headers: getHeaders() });
    return handleResponse<{ tenants: any[] }>(res);
  },

  async checkInTenant(data: {
    tenantId: string;
    bedId: string;
    checkInDate: string;
    monthlyRent: number;
    securityDeposit: number;
  }) {
    const res = await fetch(`${API_BASE}/tenants/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; occupancy: any; rentRecord: any }>(res);
  },

  async checkOutTenant(data: {
    occupancyId: string;
    checkOutDate: string;
    depositDeductions: number;
    depositDeductionNotes?: string;
  }) {
    const res = await fetch(`${API_BASE}/tenants/check-out`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; occupancy: any; settlement: any }>(res);
  },

  // Rent Records
  async getRentRecords(params?: { status?: string; month?: number; year?: number; tenantId?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.month) query.set('month', params.month.toString());
    if (params?.year) query.set('year', params.year.toString());
    if (params?.tenantId) query.set('tenantId', params.tenantId);

    const res = await fetch(`${API_BASE}/rent?${query.toString()}`, { headers: getHeaders() });
    return handleResponse<{ rentRecords: any[] }>(res);
  },

  async generateMonthlyRent(month: number, year: number, dueDay = 5) {
    const res = await fetch(`${API_BASE}/rent/generate-monthly`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ month, year, dueDay }),
    });
    return handleResponse<{ message: string; createdCount: number; skippedCount: number }>(res);
  },

  // Payments
  async recordPayment(data: {
    rentRecordId: string;
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    notes?: string;
  }) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; payment: any; rentRecord: any }>(res);
  },

  async getReceipt(receiptNumber: string) {
    const res = await fetch(`${API_BASE}/payments/receipt/${receiptNumber}`, { headers: getHeaders() });
    return handleResponse<{ receipt: any }>(res);
  },

  // Complaints
  async getComplaints(params?: { status?: string; category?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);

    const res = await fetch(`${API_BASE}/complaints?${query.toString()}`, { headers: getHeaders() });
    return handleResponse<{ complaints: any[] }>(res);
  },

  async createComplaint(data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    tenantId?: string;
  }) {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; complaint: any }>(res);
  },

  async updateComplaintStatus(id: string, status: string, resolutionNotes?: string) {
    const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, resolutionNotes }),
    });
    return handleResponse<{ message: string; complaint: any }>(res);
  },

  // Dashboard
  async getDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`, { headers: getHeaders() });
    return handleResponse<any>(res);
  },
};
