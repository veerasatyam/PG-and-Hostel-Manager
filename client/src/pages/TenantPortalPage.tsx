import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { RentRecord, Complaint } from '../types';
import {
  Building2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Wrench,
} from 'lucide-react';

interface TenantPortalPageProps {
  onOpenNewComplaint: () => void;
  onOpenReceipt: (receiptNumber: string) => void;
}

export const TenantPortalPage: React.FC<TenantPortalPageProps> = ({
  onOpenNewComplaint,
  onOpenReceipt,
}) => {
  const { user } = useAuth();
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      setLoading(true);
      try {
        const [rentRes, compRes] = await Promise.all([
          api.getRentRecords(),
          api.getComplaints(),
        ]);
        setRentRecords(rentRes.rentRecords);
        setComplaints(compRes.complaints);
      } catch (err: any) {
        console.error('Failed to load resident data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortalData();
  }, []);

  const stay = user?.activeStay;
  const totalOutstanding = rentRecords.reduce((sum, r) => sum + r.balance, 0);

  const getMonthName = (m: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1] || `M${m}`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
        <p className="mt-2 text-xs">Loading resident profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Resident Portal
          </span>
          <h1 className="text-xl font-bold mt-0.5">Welcome, {user?.name}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Access your accommodation details, view monthly billing records, and submit service requests.
          </p>
        </div>

        <button
          onClick={onOpenNewComplaint}
          className="inline-flex items-center px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Request Service
        </button>
      </div>

      {/* Accommodation & Outstanding Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Unit Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Your Accommodation Unit</h2>
            </div>
            {stay && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Resident
              </span>
            )}
          </div>

          {stay ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit & Bed</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  Room {stay.roomNumber} - {stay.bedName}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Move-In Date</span>
                <p className="font-medium text-slate-800 mt-0.5">
                  {new Date(stay.checkInDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Tariff</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  ₹{stay.monthlyRent.toLocaleString('en-IN')}/mo
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Deposit Held</span>
                <p className="font-medium text-slate-800 mt-0.5">
                  ₹{stay.securityDeposit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3">
              You do not have an active bed assignment. Please contact management.
            </p>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Outstanding Balance
              </span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <span
                className={`text-2xl font-bold ${
                  totalOutstanding > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {totalOutstanding > 0 ? (
              <p className="text-[11px] text-rose-700 font-medium flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                Please pay at reception or via UPI to clear pending dues.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-700 font-medium flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                All rent dues are cleared.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rent Ledger & Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Billing History & Receipts</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Historical rent assessments, pro-rated calculations, and payment receipts.
            </p>
          </div>
        </div>

        {rentRecords.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center">No billing history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5">Billing Period</th>
                  <th className="py-2.5 px-5">Due Date</th>
                  <th className="py-2.5 px-5 text-right">Assessed Rent</th>
                  <th className="py-2.5 px-5 text-right">Settled</th>
                  <th className="py-2.5 px-5 text-right">Balance</th>
                  <th className="py-2.5 px-5 text-center">Status</th>
                  <th className="py-2.5 px-5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentRecords.map((r) => {
                  const isPaid = r.status === 'PAID';
                  const isOverdue = r.status === 'OVERDUE';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        {getMonthName(r.month)} {r.year}
                        {r.isProRated && (
                          <span className="block text-[10px] font-normal text-amber-700">
                            Pro-rated: {r.proRatedCalculationNotes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-slate-600">
                        {new Date(r.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-right font-medium text-slate-900">
                        ₹{r.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-5 text-right font-medium text-emerald-700">
                        ₹{r.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-slate-900">
                        ₹{r.balance.toLocaleString('en-IN')}
                      </td>
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
                      <td className="py-3 px-5 text-right">
                        {r.payments && r.payments.length > 0 ? (
                          <button
                            onClick={() => onOpenReceipt(r.payments[0].receiptNumber)}
                            className="inline-flex items-center px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded text-xs font-medium border border-slate-300 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Receipt
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Unpaid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resident Service Requests Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Your Maintenance Work Orders</h2>
          </div>
          <button
            onClick={onOpenNewComplaint}
            className="text-xs font-medium text-slate-900 hover:underline flex items-center cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Request
          </button>
        </div>

        {complaints.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No service requests logged.</p>
        ) : (
          <div className="space-y-2.5">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900">{c.title}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{c.description}</p>
                  {c.resolutionNotes && (
                    <p className="text-xs text-slate-700 mt-1.5 bg-white p-2 rounded border border-slate-200">
                      <strong>Resolution:</strong> {c.resolutionNotes}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border self-start ${
                    c.status === 'RESOLVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : c.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {c.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
