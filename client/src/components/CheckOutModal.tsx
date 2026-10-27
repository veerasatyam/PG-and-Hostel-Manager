import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { LogOut, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  occupancyData: {
    occupancyId: string;
    tenantName: string;
    roomNumber: string;
    bedName: string;
    checkInDate: string;
    monthlyRent: number;
    securityDeposit: number;
  } | null;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  occupancyData,
}) => {
  const [checkOutDate, setCheckOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositDeductions, setDepositDeductions] = useState<number>(0);
  const [depositDeductionNotes, setDepositDeductionNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!occupancyData) return null;

  const depositHeld = occupancyData.securityDeposit || 0;
  const netRefund = Math.max(0, depositHeld - Number(depositDeductions || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.checkOutTenant({
        occupancyId: occupancyData.occupancyId,
        checkOutDate,
        depositDeductions: Number(depositDeductions),
        depositDeductionNotes: depositDeductionNotes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete check-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tenant Check-Out & Deposit Settlement" maxWidth="max-w-lg">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tenant summary banner */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px]">Tenant</span>
            <p className="font-bold text-sm text-slate-900">{occupancyData.tenantName}</p>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px]">Bed Location</span>
            <p className="font-semibold text-slate-800">Room {occupancyData.roomNumber} - {occupancyData.bedName}</p>
          </div>
        </div>
        <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 text-[11px]">
          <span>Check-In Date: {new Date(occupancyData.checkInDate).toLocaleDateString()}</span>
          <span>Monthly Rent: ₹{occupancyData.monthlyRent.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Check-Out Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Check-Out Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            * Rent for the check-out month will automatically be pro-rated to this date.
          </p>
        </div>

        {/* Security Deposit Settlement Box */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-900 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Security Deposit Settlement (Stretch Feature)</span>
          </div>

          <div className="flex justify-between text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-indigo-100">
            <span>Deposit Amount Held:</span>
            <span className="font-bold text-slate-900">₹{depositHeld.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Deductions (Damages, Cleaning, Utility dues)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
              <input
                type="number"
                min="0"
                max={depositHeld}
                value={depositDeductions}
                onChange={(e) => setDepositDeductions(Number(e.target.value))}
                className="w-full pl-7 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {depositDeductions > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Reason / Itemized Deductions
              </label>
              <textarea
                rows={2}
                value={depositDeductionNotes}
                onChange={(e) => setDepositDeductionNotes(e.target.value)}
                placeholder="e.g. Wall repainting (₹1500) + Deep cleaning (₹1000)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Refund summary */}
          <div className="flex justify-between items-center bg-emerald-100/70 p-3 rounded-lg border border-emerald-300 text-xs">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" /> Net Refund Due to Tenant:
            </span>
            <span className="font-extrabold text-sm text-emerald-900">
              ₹{netRefund.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

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
            disabled={submitting}
            className="inline-flex items-center px-5 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 shadow-sm disabled:opacity-50 transition-all"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            {submitting ? 'Processing Check-Out...' : 'Confirm Check-Out & Free Bed'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
