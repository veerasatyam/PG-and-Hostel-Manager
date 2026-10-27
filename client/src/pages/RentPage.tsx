import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { RentRecord } from '../types';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  Sparkles,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface RentPageProps {
  onOpenPayment: (rentRecord: any) => void;
  onOpenReceipt: (receiptNumber: string) => void;
  filterTenantId?: string | null;
}

export const RentPage: React.FC<RentPageProps> = ({
  onOpenPayment,
  onOpenReceipt,
  filterTenantId,
}) => {
  const [records, setRecords] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string | null>(null);

  // Month & year generation controls
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState<number>(now.getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(now.getFullYear());

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRentRecords({
        tenantId: filterTenantId || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setRecords(data.rentRecords);
    } catch (err: any) {
      setError(err.message || 'Failed to load rent records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, filterTenantId]);

  const handleGenerateMonthlyRent = async () => {
    setGenerating(true);
    setGenSuccessMsg(null);
    try {
      const res = await api.generateMonthlyRent(targetMonth, targetYear);
      setGenSuccessMsg(res.message);
      fetchRecords();
      setTimeout(() => setGenSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to generate monthly rent');
    } finally {
      setGenerating(false);
    }
  };

  const getMonthName = (m: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1] || `M${m}`;
  };

  const filteredRecords = records.filter((r) => {
    const nameMatch = r.tenant?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = r.tenant?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Rent & Payment Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track monthly rents (Due, Paid, Overdue), partial installments, pro-rated tenancies, and receipts.
          </p>
        </div>

        {/* Batch Generate Monthly Rent Tool */}
        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <select
            value={targetMonth}
            onChange={(e) => setTargetMonth(Number(e.target.value))}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
          <select
            value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value))}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <button
            onClick={handleGenerateMonthlyRent}
            disabled={generating}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {generating ? 'Generating...' : 'Generate Rent'}
          </button>
        </div>
      </div>

      {genSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{genSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Bills' },
            { id: 'DUE', label: 'Due' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'PAID', label: 'Paid' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === s.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rent Table */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading rent records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No rent records found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or click "Generate Rent".</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Tenant & Room</th>
                  <th className="py-3 px-6">Period</th>
                  <th className="py-3 px-6">Due Date</th>
                  <th className="py-3 px-6 text-right">Rent Assessed</th>
                  <th className="py-3 px-6 text-right">Paid</th>
                  <th className="py-3 px-6 text-right">Balance</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const isPaid = r.status === 'PAID';
                  const isOverdue = r.status === 'OVERDUE';
                  const isDue = r.status === 'DUE';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Tenant & Room */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 text-sm">{r.tenant.user.name}</p>
                        <p className="text-slate-500 text-[11px]">
                          {r.occupancy?.bed?.room
                            ? `Room ${r.occupancy.bed.room.number} - ${r.occupancy.bed.name}`
                            : 'Room N/A'}
                        </p>
                      </td>

                      {/* Period */}
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {getMonthName(r.month)} {r.year}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(r.dueDate).toLocaleDateString()}
                      </td>

                      {/* Amount with Pro-rated pill */}
                      <td className="py-4 px-6 text-right">
                        <div>
                          <span className="font-extrabold text-sm text-slate-800">
                            ₹{r.amount.toLocaleString('en-IN')}
                          </span>
                          {r.isProRated && (
                            <span
                              className="block text-[10px] font-semibold text-amber-600"
                              title={r.proRatedCalculationNotes}
                            >
                              ⚡ Pro-rated ({r.proRatedDays}d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Paid to Date */}
                      <td className="py-4 px-6 text-right font-medium text-emerald-600">
                        ₹{r.paidAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`font-extrabold text-sm ${
                            r.balance > 0 ? (isOverdue ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'
                          }`}
                        >
                          ₹{r.balance.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid && <CheckCircle className="w-3 h-3 mr-1" />}
                          {isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {isDue && <Clock className="w-3 h-3 mr-1" />}
                          {r.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {r.balance > 0 ? (
                          <button
                            onClick={() =>
                              onOpenPayment({
                                id: r.id,
                                tenantName: r.tenant.user.name,
                                month: r.month,
                                year: r.year,
                                amount: r.amount,
                                paidAmount: r.paidAmount,
                                balance: r.balance,
                                isProRated: r.isProRated,
                                proRatedCalculationNotes: r.proRatedCalculationNotes,
                              })
                            }
                            className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold transition-all shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Record Pay
                          </button>
                        ) : null}

                        {/* View receipts if any payment was made */}
                        {r.payments && r.payments.length > 0 ? (
                          <button
                            onClick={() => onOpenReceipt(r.payments[0].receiptNumber)}
                            className="inline-flex items-center px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl text-xs font-medium border border-slate-200"
                            title="View / Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Receipt
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
