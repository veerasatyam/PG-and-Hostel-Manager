import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Tenant } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Building2,
  AlertCircle,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

interface TenantsPageProps {
  onOpenCheckIn: () => void;
  onOpenCheckOut: (occupancyData: any) => void;
  onViewRentHistory: (tenantId: string) => void;
}

export const TenantsPage: React.FC<TenantsPageProps> = ({
  onOpenCheckIn,
  onOpenCheckOut,
  onViewRentHistory,
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'ALL' | 'ACTIVE' | 'UNASSIGNED'>('ALL');

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenants();
      setTenants(data.tenants);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterState === 'ACTIVE') return !!t.activeStay;
    if (filterState === 'UNASSIGNED') return !t.activeStay;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tenant Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active tenants, check-in new occupants, process move-outs with deposit settlement, and review balances.
          </p>
        </div>
        <button
          onClick={onOpenCheckIn}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <UserCheck className="w-4 h-4 mr-1.5" />
          Check-In Tenant
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Tenants' },
            { id: 'ACTIVE', label: 'Active Stays' },
            { id: 'UNASSIGNED', label: 'Unassigned / Past' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterState(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterState === tab.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading tenants roster...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No tenants found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Tenant</th>
                  <th className="py-3 px-6">Room & Bed</th>
                  <th className="py-3 px-6">Check-In Date</th>
                  <th className="py-3 px-6">Monthly Rent</th>
                  <th className="py-3 px-6">Security Deposit</th>
                  <th className="py-3 px-6 text-right">Rent Balance</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => {
                  const hasActive = !!tenant.activeStay;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 text-sm">{tenant.user.name}</p>
                        <p className="text-slate-400 text-[11px]">{tenant.user.email}</p>
                        {tenant.user.phone && (
                          <p className="text-slate-500 text-[10px] mt-0.5">{tenant.user.phone}</p>
                        )}
                      </td>

                      {/* Room & Bed */}
                      <td className="py-4 px-6">
                        {hasActive ? (
                          <div>
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                              Room {tenant.activeStay!.roomNumber} - {tenant.activeStay!.bedName}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Active Stay
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Check-In Date */}
                      <td className="py-4 px-6 text-slate-600">
                        {hasActive ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(tenant.activeStay!.checkInDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Monthly Rent */}
                      <td className="py-4 px-6">
                        {hasActive ? (
                          <span className="font-semibold text-slate-800">
                            ₹{tenant.activeStay!.monthlyRent.toLocaleString('en-IN')}/mo
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Security Deposit */}
                      <td className="py-4 px-6">
                        {hasActive ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              ₹{tenant.activeStay!.securityDeposit.toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] text-indigo-600 font-medium">
                              {tenant.activeStay!.depositStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Rent Balance */}
                      <td className="py-4 px-6 text-right">
                        <div>
                          <span
                            className={`font-bold text-sm ${
                              tenant.totalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            ₹{tenant.totalBalance.toLocaleString('en-IN')}
                          </span>
                          {tenant.hasOverdue && (
                            <span className="block text-[10px] font-bold text-rose-600">
                              ⚠️ {tenant.overdueCount} Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {hasActive ? (
                          <button
                            onClick={() =>
                              onOpenCheckOut({
                                occupancyId: tenant.activeStay!.occupancyId,
                                tenantName: tenant.user.name,
                                roomNumber: tenant.activeStay!.roomNumber,
                                bedName: tenant.activeStay!.bedName,
                                checkInDate: tenant.activeStay!.checkInDate,
                                monthlyRent: tenant.activeStay!.monthlyRent,
                                securityDeposit: tenant.activeStay!.securityDeposit,
                              })
                            }
                            className="inline-flex items-center px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-all"
                            title="Check out tenant"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Check-Out
                          </button>
                        ) : (
                          <button
                            onClick={onOpenCheckIn}
                            className="inline-flex items-center px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Assign Bed
                          </button>
                        )}

                        <button
                          onClick={() => onViewRentHistory(tenant.id)}
                          className="inline-flex items-center px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium"
                          title="View rent ledger"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
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
