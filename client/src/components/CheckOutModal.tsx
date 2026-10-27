import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { LogOut, AlertCircle, Shield } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Resident Move-Out & Deposit Settlement" maxWidth="max-w-lg">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resident info banner */}
      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Resident</span>
            <p className="font-bold text-slate-900">{occupancyData.tenantName}</p>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Unit</span>
            <p className="font-medium text-slate-700">Room {occupancyData.roomNumber} - {occupancyData.bedName}</p>
          </div>
        </div>
        <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 text-[11px]">
          <span>Checked In: {new Date(occupancyData.checkInDate).toLocaleDateString()}</span>
          <span>Monthly Tariff: ₹{occupancyData.monthlyRent.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Check-Out / Move-Out Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            * Rent for the checkout month will automatically be pro-rated to this date.
          </p>
        </div>

        {/* Deposit Settlement Section */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Security Deposit Settlement</span>
          </div>

          <div className="flex justify-between text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200">
            <span>Deposit Amount Held:</span>
            <span className="font-bold text-slate-900">₹{depositHeld.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deductions (Damages, Cleaning, Unpaid Utility Bills)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">₹</span>
              <input
                type="number"
                min="0"
                max={depositHeld}
                value={depositDeductions}
                onChange={(e) => setDepositDeductions(Number(e.target.value))}
                className="w-full pl-7 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {depositDeductions > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Itemized Reason for Deductions
              </label>
              <textarea
                rows={2}
                value={depositDeductionNotes}
                onChange={(e) => setDepositDeductionNotes(e.target.value)}
                placeholder="e.g. Wall painting repair (₹1500) and deep cleaning fee (₹1000)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          )}

          <div className="flex justify-between items-center bg-white p-3 rounded border border-slate-200 text-xs">
            <span className="font-semibold text-slate-800">
              Net Refund Due to Resident:
            </span>
            <span className="font-bold text-sm text-slate-900">
              ₹{netRefund.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

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
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? 'Processing...' : 'Complete Check-Out & Release Bed'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
