import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { RentRecord, Complaint } from '../types';
import {
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  PlusCircle,
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
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message || 'Failed to load your tenant data');
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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-2 text-xs">Loading your stay details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-200">
            Tenant Self-Service Portal
          </span>
          <h1 className="text-2xl font-extrabold mt-0.5">Welcome back, {user?.name}!</h1>
          <p className="text-xs text-indigo-100 mt-1">
            View your room information, rent invoices, payment receipts, and maintenance requests.
          </p>
        </div>

        <button
          onClick={onOpenNewComplaint}
          className="inline-flex items-center px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Wrench className="w-4 h-4 mr-1.5" />
          Raise Complaint
        </button>
      </div>

      {/* Accommodation & Outstanding Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accommodation Details */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Your Current Accommodation</h2>
            </div>
            {stay && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Active Resident
              </span>
            )}
          </div>

          {stay ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Room & Bed</span>
                <p className="font-extrabold text-sm text-slate-900 mt-0.5">
                  Room {stay.roomNumber} - {stay.bedName}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Check-In Date</span>
                <p className="font-bold text-sm text-slate-800 mt-0.5">
                  {new Date(stay.checkInDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Rent</span>
                <p className="font-bold text-sm text-indigo-600 mt-0.5">
                  ₹{stay.monthlyRent.toLocaleString('en-IN')}/mo
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Security Deposit</span>
                <p className="font-bold text-sm text-slate-800 mt-0.5">
                  ₹{stay.securityDeposit.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">
              You do not have an active bed allocation. Please contact the PG manager to assign a room.
            </p>
          )}
        </div>

        {/* Total Outstanding Rent Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outstanding Balance
              </span>
              <CreditCard className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-extrabold ${
                  totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {totalOutstanding > 0 ? (
              <p className="text-xs text-rose-600 font-medium flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
                Please pay at reception or via UPI to clear pending dues.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                All rent dues are cleared!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rent History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Rent Ledger & Receipts</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical rent records, pro-rated calculations, and downloadable receipts.
            </p>
          </div>
        </div>

        {rentRecords.length === 0 ? (
          <p className="text-xs text-slate-400 p-8 text-center">No rent history found for your account.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Period</th>
                  <th className="py-3 px-6">Due Date</th>
                  <th className="py-3 px-6 text-right">Rent Assessed</th>
                  <th className="py-3 px-6 text-right">Paid</th>
                  <th className="py-3 px-6 text-right">Balance</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentRecords.map((r) => {
                  const isPaid = r.status === 'PAID';
                  const isOverdue = r.status === 'OVERDUE';
                  const isDue = r.status === 'DUE';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                        {getMonthName(r.month)} {r.year}
                        {r.isProRated && (
                          <span className="block text-[10px] font-normal text-amber-600">
                            ⚡ {r.proRatedCalculationNotes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(r.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-800">
                        ₹{r.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-emerald-600">
                        ₹{r.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`font-extrabold text-sm ${
                            r.balance > 0 ? (isOverdue ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'
                          }`}
                        >
                          ₹{r.balance.toLocaleString('en-IN')}
                        </span>
                      </td>
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
                      <td className="py-4 px-6 text-right">
                        {r.payments && r.payments.length > 0 ? (
                          <button
                            onClick={() => onOpenReceipt(r.payments[0].receiptNumber)}
                            className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition-all"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
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

      {/* Tenant's Complaints Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Your Maintenance Tickets</h2>
          </div>
          <button
            onClick={onOpenNewComplaint}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            Raise New Issue
          </button>
        </div>

        {complaints.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No complaints raised yet.</p>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-2"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{c.title}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{c.description}</p>
                  {c.resolutionNotes && (
                    <p className="text-xs text-emerald-700 font-medium mt-2 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                      Resolution: {c.resolutionNotes}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full self-start ${
                    c.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
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
