import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Calendar, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBedId?: string;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBedId,
}) => {
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [unassignedTenants, setUnassignedTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [tenantId, setTenantId] = useState('');
  const [bedId, setBedId] = useState(defaultBedId || '');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyRent, setMonthlyRent] = useState<number>(8000);
  const [securityDeposit, setSecurityDeposit] = useState<number>(15000);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchData();
      if (defaultBedId) setBedId(defaultBedId);
    }
  }, [isOpen, defaultBedId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bedsRes, tenantsRes] = await Promise.all([
        api.getAvailableBeds(),
        api.getUnassignedTenants(),
      ]);
      setAvailableBeds(bedsRes.beds);
      setUnassignedTenants(tenantsRes.tenants);

      if (bedsRes.beds.length > 0 && !bedId) {
        setBedId(bedsRes.beds[0].id);
        setMonthlyRent(bedsRes.beds[0].room.baseRent);
      }
      if (tenantsRes.tenants.length > 0 && !tenantId) {
        setTenantId(tenantsRes.tenants[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load beds or tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleBedChange = (selectedBedId: string) => {
    setBedId(selectedBedId);
    const chosen = availableBeds.find((b) => b.id === selectedBedId);
    if (chosen) {
      setMonthlyRent(chosen.room.baseRent);
    }
  };

  // Live calculation of pro-rated preview
  const getProRatedPreview = () => {
    if (!checkInDate || !monthlyRent) return null;
    const date = new Date(checkInDate);
    if (isNaN(date.getTime())) return null;

    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (day === 1) {
      return {
        isProRated: false,
        activeDays: daysInMonth,
        totalDays: daysInMonth,
        amount: monthlyRent,
      };
    }

    const activeDays = daysInMonth - day + 1;
    const amount = Math.round((monthlyRent / daysInMonth) * activeDays);

    return {
      isProRated: true,
      activeDays,
      totalDays: daysInMonth,
      amount,
    };
  };

  const proRatedPreview = getProRatedPreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setError('Please select a tenant');
      return;
    }
    if (!bedId) {
      setError('Please select a bed');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.checkInTenant({
        tenantId,
        bedId,
        checkInDate,
        monthlyRent: Number(monthlyRent),
        securityDeposit: Number(securityDeposit),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to check in tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Check-In Tenant to Bed" maxWidth="max-w-lg">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-slate-500 text-sm">Loading free beds and tenants...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Tenant <span className="text-red-500">*</span>
            </label>
            {unassignedTenants.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                All registered tenants currently have an active bed assigned. Register a new tenant first or check one out.
              </p>
            ) : (
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                {unassignedTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name} ({t.user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bed Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Available Bed <span className="text-red-500">*</span>
            </label>
            {availableBeds.length === 0 ? (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                No beds are currently available. All beds are 100% occupied or in maintenance!
              </p>
            ) : (
              <select
                value={bedId}
                onChange={(e) => handleBedChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Room {b.room.number} - {b.name} ({b.room.type}, {b.room.hasAc ? 'AC' : 'Non-AC'} - ₹{b.room.baseRent}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Check-In Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Check-In Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Monthly Rent (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="100"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Live Pro-rated rent preview banner */}
          {proRatedPreview && (
            <div className={`p-3.5 rounded-xl border text-xs ${
              proRatedPreview.isProRated
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center space-x-2 font-semibold">
                {proRatedPreview.isProRated ? (
                  <>
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Mid-Month Check-in Detected (Pro-rated Rent)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Full Month Check-in (Day 1)</span>
                  </>
                )}
              </div>
              <p className="mt-1">
                {proRatedPreview.isProRated ? (
                  <>
                    Active for <strong>{proRatedPreview.activeDays} days</strong> of {proRatedPreview.totalDays} days in month.{' '}
                    Initial rent due: <strong className="text-base font-bold text-amber-800">₹{proRatedPreview.amount.toLocaleString('en-IN')}</strong>{' '}
                    (Standard rate: ₹{monthlyRent})
                  </>
                ) : (
                  <>
                    Initial rent due: <strong className="text-base font-bold text-emerald-800">₹{proRatedPreview.amount.toLocaleString('en-IN')}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableBeds.length === 0 || unassignedTenants.length === 0}
              className="inline-flex items-center px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-all"
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              {submitting ? 'Checking In...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
