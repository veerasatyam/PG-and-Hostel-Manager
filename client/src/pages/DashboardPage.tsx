import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import {
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  CreditCard,
  CheckCircle,
  Clock,
  Sparkles,
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
      setError(err.message || 'Failed to load dashboard data');
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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-sm">Aggregating hostel metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm">
          {error || 'Unable to load dashboard'}
        </div>
      </div>
    );
  }

  const { metrics, overdueTenants, recentPayments } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Hostel Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time occupancy, monthly billing collections, and overdue tenant alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onOpenCheckIn}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Check-In Tenant
          </button>
          <button
            onClick={onOpenNewRoom}
            className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
          >
            <Building2 className="w-4 h-4 mr-1.5 text-slate-500" />
            Add Room
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bed Occupancy</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.occupancy.occupancyRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({metrics.occupancy.occupiedBeds}/{metrics.occupancy.totalBeds} beds)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.occupancy.occupancyRate}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] text-slate-500">
            <span>{metrics.occupancy.availableBeds} beds available</span>
            <span>{metrics.occupancy.totalRooms} rooms total</span>
          </div>
        </div>

        {/* Rent Collected Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rent Collected</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">
              ₹{metrics.rent.rentCollectedThisMonth.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 flex items-center">
            Total billed this month: <strong className="ml-1 text-slate-700">₹{metrics.rent.totalBilledThisMonth.toLocaleString('en-IN')}</strong>
          </p>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">
            {metrics.rent.totalBilledThisMonth > 0
              ? `${Math.round((metrics.rent.rentCollectedThisMonth / metrics.rent.totalBilledThisMonth) * 100)}% collected`
              : 'No bills active'}
          </div>
        </div>

        {/* Overdue Rent Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Rent</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-rose-600">
              ₹{metrics.rent.totalOverdueAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 flex items-center">
            Across <strong className="mx-1 text-rose-700 font-bold">{metrics.rent.overdueTenantsCount}</strong> tenant(s) past due
          </p>
          <div className="mt-2 text-[11px] text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-lg inline-block">
            Action required
          </div>
        </div>

        {/* Maintenance Complaints Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Complaints</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.complaints.open + metrics.complaints.inProgress}
            </span>
            <span className="text-xs text-slate-500 font-medium">pending</span>
          </div>
          <div className="mt-3 flex gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium">
              {metrics.complaints.open} Open
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-medium">
              {metrics.complaints.inProgress} In Progress
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium">
              {metrics.complaints.resolved} Fixed
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Tenants Priority List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/20">
          <div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-slate-900">Overdue Tenants (Action Required)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tenants who have past-due unpaid balances for one or more months.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('rent')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            View all rent records <ArrowUpRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {overdueTenants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-700">All rents are up to date!</p>
            <p className="text-xs text-slate-400 mt-0.5">No tenants currently have overdue payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Tenant Name</th>
                  <th className="py-3 px-6">Room / Bed</th>
                  <th className="py-3 px-6">Phone / Contact</th>
                  <th className="py-3 px-6 text-right">Overdue Amount</th>
                  <th className="py-3 px-6 text-center">Days Overdue</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueTenants.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                      <p className="text-slate-400 text-[11px]">{t.email}</p>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-700">
                      Room {t.roomNumber} - {t.bedName}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono">
                      {t.phone || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-extrabold text-sm text-rose-600">
                        ₹{t.totalOverdueBalance.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        {t.maxDaysOverdue} days
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
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
                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
          </div>
          <button
            onClick={() => onNavigateTab('rent')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all payments
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 text-xs">{p.tenantName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.receiptNumber}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(p.paymentDate).toLocaleDateString()} via {p.paymentMethod}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-600">
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
