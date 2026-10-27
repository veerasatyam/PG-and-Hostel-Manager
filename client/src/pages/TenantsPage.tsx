import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Tenant } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Building2,
  Calendar,
  CreditCard,
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
      setError(err.message || 'Failed to load residents');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resident Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage resident records, allocate beds, process move-out settlements, and audit rent balances.
          </p>
        </div>
        <button
          onClick={onOpenCheckIn}
          className="inline-flex items-center px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
          Assign Resident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resident name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Residents' },
            { id: 'ACTIVE', label: 'Active Stay' },
            { id: 'UNASSIGNED', label: 'Unassigned / Former' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterState(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterState === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
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
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading resident database...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No residents match this criteria</p>
          <p className="text-[11px] text-slate-400 mt-1">Adjust filters or create a new resident registration.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5">Resident</th>
                  <th className="py-2.5 px-5">Assigned Unit</th>
                  <th className="py-2.5 px-5">Move-In Date</th>
                  <th className="py-2.5 px-5">Monthly Tariff</th>
                  <th className="py-2.5 px-5">Security Deposit</th>
                  <th className="py-2.5 px-5 text-right">Rent Balance</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => {
                  const hasActive = !!tenant.activeStay;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-900">{tenant.user.name}</p>
                        <p className="text-slate-400 text-[10px]">{tenant.user.email}</p>
                        {tenant.user.phone && (
                          <p className="text-slate-500 text-[10px] mt-0.5">{tenant.user.phone}</p>
                        )}
                      </td>

                      {/* Unit & Bed */}
                      <td className="py-3 px-5">
                        {hasActive ? (
                          <div>
                            <span className="font-medium text-slate-900 text-xs flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              Room {tenant.activeStay!.roomNumber} - {tenant.activeStay!.bedName}
                            </span>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Active Resident
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Check-In Date */}
                      <td className="py-3 px-5 text-slate-600">
                        {hasActive ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(tenant.activeStay!.checkInDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Monthly Tariff */}
                      <td className="py-3 px-5">
                        {hasActive ? (
                          <span className="font-medium text-slate-800">
                            ₹{tenant.activeStay!.monthlyRent.toLocaleString('en-IN')}/mo
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Security Deposit */}
                      <td className="py-3 px-5">
                        {hasActive ? (
                          <div>
                            <span className="font-medium text-slate-800">
                              ₹{tenant.activeStay!.securityDeposit.toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-medium">
                              {tenant.activeStay!.depositStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Rent Balance */}
                      <td className="py-3 px-5 text-right">
                        <div>
                          <span
                            className={`font-bold ${
                              tenant.totalBalance > 0 ? 'text-rose-700' : 'text-slate-700'
                            }`}
                          >
                            ₹{tenant.totalBalance.toLocaleString('en-IN')}
                          </span>
                          {tenant.hasOverdue && (
                            <span className="block text-[10px] font-semibold text-rose-700">
                              {tenant.overdueCount} Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right space-x-1">
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
                            className="inline-flex items-center px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded text-xs font-medium border border-rose-200 transition-colors cursor-pointer"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Move-Out
                          </button>
                        ) : (
                          <button
                            onClick={onOpenCheckIn}
                            className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Assign
                          </button>
                        )}

                        <button
                          onClick={() => onViewRentHistory(tenant.id)}
                          className="inline-flex items-center px-2 py-1 text-slate-500 hover:text-slate-900 rounded text-xs cursor-pointer"
                          title="View Ledger"
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
