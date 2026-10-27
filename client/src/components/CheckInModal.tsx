import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Calendar, UserCheck, AlertCircle } from 'lucide-react';

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
      setError(err.message || 'Failed to load beds or residents');
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

  const getProRatedPreview = () => {
    if (!checkInDate || !monthlyRent) return null;
    const date = new Date(checkInDate);
    if (isNaN(date.getTime())) return null;

    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.getMonth();
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
      setError('Please select a resident');
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
      setError(err.message || 'Failed to assign bed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Resident to Bed" maxWidth="max-w-lg">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-slate-500 text-xs">Loading available inventory...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Resident <span className="text-red-500">*</span>
            </label>
            {unassignedTenants.length === 0 ? (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                All residents currently have active bed allocations. Register a new resident first.
              </p>
            ) : (
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Available Bed <span className="text-red-500">*</span>
            </label>
            {availableBeds.length === 0 ? (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                All beds in inventory are currently 100% occupied.
              </p>
            ) : (
              <select
                value={bedId}
                onChange={(e) => handleBedChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Room {b.room.number} - {b.name} ({b.room.type.replace('_', ' ')}, {b.room.hasAc ? 'AC' : 'Non-AC'} — ₹{b.room.baseRent}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Check-In Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agreed Monthly Tariff (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="100"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Security Deposit Held (₹)
              </label>
              <input
                type="number"
                min="0"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Pro-rated Rent Notice */}
          {proRatedPreview && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-900 mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {proRatedPreview.isProRated ? 'Mid-Month Check-in Assessment' : 'Full Month Assessment'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                {proRatedPreview.isProRated ? (
                  <>
                    Resident active for <strong>{proRatedPreview.activeDays} of {proRatedPreview.totalDays} days</strong> this month. First invoice pro-rated to: <strong className="text-slate-900 font-bold">₹{proRatedPreview.amount.toLocaleString('en-IN')}</strong>.
                  </>
                ) : (
                  <>
                    First month invoice: <strong className="text-slate-900 font-bold">₹{proRatedPreview.amount.toLocaleString('en-IN')}</strong>.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableBeds.length === 0 || unassignedTenants.length === 0}
              className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
