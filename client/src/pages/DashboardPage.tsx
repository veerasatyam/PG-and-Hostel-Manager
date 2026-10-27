import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenCheckIn: () => void;
  onOpenNewRoom: () => void;
  onOpenPayment: (rentRecord: any) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCheckIn,
  onOpenNewRoom,
  onOpenPayment,
  onNavigateTab,
}) => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compile dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
        <p className="mt-3 text-xs font-medium">Aggregating property metrics from MongoDB...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          {error || 'Unable to load dashboard data'}
        </div>
      </div>
    );
  }

  const { metrics, overdueTenants, recentPayments } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Property Operations Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time occupancy rates, monthly rent collections, and delinquent account alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenCheckIn}
            className="inline-flex items-center px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Assign Resident
          </button>
          <button
            onClick={onOpenNewRoom}
            className="inline-flex items-center px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Add Unit
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Occupancy Rate</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.occupancy.occupancyRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({metrics.occupancy.occupiedBeds} / {metrics.occupancy.totalBeds} beds)
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${metrics.occupancy.occupancyRate}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] text-slate-500">
            <span>{metrics.occupancy.availableBeds} beds vacant</span>
            <span>{metrics.occupancy.totalRooms} rooms total</span>
          </div>
        </div>

        {/* Rent Collected Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Collections (Month)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ₹{metrics.rent.rentCollectedThisMonth.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total Billed: <span className="font-semibold text-slate-800">₹{metrics.rent.totalBilledThisMonth.toLocaleString('en-IN')}</span>
          </p>
          <div className="mt-2 text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block border border-emerald-200">
            {metrics.rent.totalBilledThisMonth > 0
              ? `${Math.round((metrics.rent.rentCollectedThisMonth / metrics.rent.totalBilledThisMonth) * 100)}% realization rate`
              : 'Cycle initiated'}
          </div>
        </div>

        {/* Delinquent Overdue Rent Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Overdue Receivables</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-700">
              ₹{metrics.rent.totalOverdueAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Past due accounts: <span className="font-bold text-rose-700">{metrics.rent.overdueTenantsCount}</span> residents
          </p>
          <div className="mt-2 text-[10px] text-rose-800 font-semibold bg-rose-50 px-2 py-0.5 rounded inline-block border border-rose-200">
            Action required
          </div>
        </div>

        {/* Maintenance Work Orders Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Work Orders</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.complaints.open + metrics.complaints.inProgress}
            </span>
            <span className="text-xs text-slate-500 font-medium">pending</span>
          </div>
          <div className="mt-3 flex gap-1.5 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
              {metrics.complaints.open} Open
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-medium border border-blue-200">
              {metrics.complaints.inProgress} In Progress
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
              {metrics.complaints.resolved} Closed
            </span>
          </div>
        </div>
      </div>

      {/* Delinquent Overdue Residents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Delinquent Overdue Accounts</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Residents with balances that have exceeded the due date.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('rent')}
            className="text-xs font-semibold text-slate-900 hover:underline flex items-center cursor-pointer"
          >
            All invoices <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {overdueTenants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1.5" />
            <p className="font-semibold text-slate-700">All resident ledgers are settled.</p>
            <p className="text-slate-400 mt-0.5">No overdue rent accounts pending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5">Resident</th>
                  <th className="py-2.5 px-5">Unit Assigned</th>
                  <th className="py-2.5 px-5">Contact</th>
                  <th className="py-2.5 px-5 text-right">Overdue Balance</th>
                  <th className="py-2.5 px-5 text-center">Days Overdue</th>
                  <th className="py-2.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueTenants.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-slate-400 text-[10px]">{t.email}</p>
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-700">
                      Room {t.roomNumber} - {t.bedName}
                    </td>
                    <td className="py-3 px-5 text-slate-600 font-mono text-[11px]">
                      {t.phone || 'N/A'}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-rose-700">
                      ₹{t.totalOverdueBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        {t.maxDaysOverdue} days past
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => {
                          const primaryRecord = t.records[0];
                          onOpenPayment({
                            id: primaryRecord.id,
                            tenantName: t.name,
                            month: primaryRecord.month,
                            year: primaryRecord.year,
                            amount: primaryRecord.balance,
                            paidAmount: 0,
                            balance: primaryRecord.balance,
                            isProRated: false,
                          });
                        }}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Record Settlement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Ledger Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Payment Transactions</h2>
          </div>
          <button
            onClick={() => onNavigateTab('rent')}
            className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
          >
            Full ledger
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No payment transactions recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{p.tenantName}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.receiptNumber}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(p.paymentDate).toLocaleDateString()} • {p.paymentMethod}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700">
                    +₹{p.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
