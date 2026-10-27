import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { RentRecord } from '../types';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Printer,
  Calendar,
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
      setTimeout(() => setGenSuccessMsg(null), 5000);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Billing & Invoicing Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automate monthly billing cycles, process partial installments, review pro-rated tenancies, and download receipts.
          </p>
        </div>

        {/* Batch Billing Trigger */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <select
            value={targetMonth}
            onChange={(e) => setTargetMonth(Number(e.target.value))}
            className="text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none"
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
            className="text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <button
            onClick={handleGenerateMonthlyRent}
            disabled={generating}
            className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {generating ? 'Generating...' : 'Run Billing'}
          </button>
        </div>
      </div>

      {genSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{genSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resident name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'DUE', label: 'Due' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'PAID', label: 'Settled' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === s.id
                  ? 'bg-slate-900 text-white font-semibold'
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
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading billing records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No invoices found for this selection</p>
          <p className="text-[11px] text-slate-400 mt-1">Adjust filters or run the billing cycle generator above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5">Resident & Unit</th>
                  <th className="py-2.5 px-5">Billing Cycle</th>
                  <th className="py-2.5 px-5">Due Date</th>
                  <th className="py-2.5 px-5 text-right">Assessed Rent</th>
                  <th className="py-2.5 px-5 text-right">Settled</th>
                  <th className="py-2.5 px-5 text-right">Balance</th>
                  <th className="py-2.5 px-5 text-center">Status</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const isPaid = r.status === 'PAID';
                  const isOverdue = r.status === 'OVERDUE';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Resident & Room */}
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-900">{r.tenant.user.name}</p>
                        <p className="text-slate-400 text-[10px]">
                          {r.occupancy?.bed?.room
                            ? `Room ${r.occupancy.bed.room.number} - ${r.occupancy.bed.name}`
                            : 'Room N/A'}
                        </p>
                      </td>

                      {/* Period */}
                      <td className="py-3 px-5 font-medium text-slate-800">
                        {getMonthName(r.month)} {r.year}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-5 text-slate-600">
                        {new Date(r.dueDate).toLocaleDateString()}
                      </td>

                      {/* Assessed rent */}
                      <td className="py-3 px-5 text-right">
                        <div>
                          <span className="font-medium text-slate-900">
                            ₹{r.amount.toLocaleString('en-IN')}
                          </span>
                          {r.isProRated && (
                            <span
                              className="block text-[10px] font-medium text-amber-700"
                              title={r.proRatedCalculationNotes}
                            >
                              Pro-rated ({r.proRatedDays}d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-5 text-right font-medium text-emerald-700">
                        ₹{r.paidAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-5 text-right">
                        <span
                          className={`font-bold ${
                            r.balance > 0 ? (isOverdue ? 'text-rose-700' : 'text-slate-900') : 'text-slate-400'
                          }`}
                        >
                          ₹{r.balance.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right space-x-1.5">
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
                            className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Record Pay
                          </button>
                        ) : null}

                        {r.payments && r.payments.length > 0 ? (
                          <button
                            onClick={() => onOpenReceipt(r.payments[0].receiptNumber)}
                            className="inline-flex items-center px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded text-xs font-medium border border-slate-300 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 mr-1" />
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
