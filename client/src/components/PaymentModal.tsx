import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { AlertCircle, Check } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptNumber: string) => void;
  rentRecord: {
    id: string;
    tenantName: string;
    month: number;
    year: number;
    amount: number;
    paidAmount: number;
    balance: number;
    isProRated: boolean;
    proRatedCalculationNotes?: string;
  } | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rentRecord,
}) => {
  const [amount, setAmount] = useState<number>(rentRecord?.balance || 0);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CARD'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (rentRecord) {
      setAmount(rentRecord.balance);
      setTransactionRef('');
      setNotes('');
      setError(null);
    }
  }, [rentRecord]);

  if (!rentRecord) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }
    if (amount > rentRecord.balance) {
      setError(`Payment cannot exceed outstanding balance of ₹${rentRecord.balance}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.recordPayment({
        rentRecordId: rentRecord.id,
        amount: Number(amount),
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess(res.payment.receiptNumber);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (m: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1] || `M${m}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Rent Settlement" maxWidth="max-w-md">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bill summary */}
      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs mb-4 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-400 font-medium text-[10px] uppercase">Resident</span>
            <p className="font-bold text-slate-900">{rentRecord.tenantName}</p>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-medium text-[10px] uppercase">Billing Cycle</span>
            <p className="font-semibold text-slate-800">{getMonthName(rentRecord.month)} {rentRecord.year}</p>
          </div>
        </div>

        {rentRecord.isProRated && (
          <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
            {rentRecord.proRatedCalculationNotes}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-center">
          <div>
            <span className="text-slate-400 text-[10px] block">Assessed Rent</span>
            <span className="font-semibold text-slate-800">₹{rentRecord.amount.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Paid to date</span>
            <span className="font-semibold text-emerald-700">₹{rentRecord.paidAmount.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Current Balance</span>
            <span className="font-bold text-slate-900">₹{rentRecord.balance.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Payment Amount (INR) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setAmount(rentRecord.balance)}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
            >
              Full Balance (₹{rentRecord.balance})
            </button>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-semibold">₹</span>
            <input
              type="number"
              min="1"
              max={rentRecord.balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full pl-7 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              required
            />
          </div>

          {amount > 0 && amount < rentRecord.balance && (
            <p className="text-[11px] text-amber-700 mt-1">
              Part payment: ₹{(rentRecord.balance - amount).toLocaleString('en-IN')} will remain outstanding.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Payment Mode
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['UPI', 'CASH', 'BANK_TRANSFER', 'CARD'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-1 text-center rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  paymentMethod === method
                    ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {method.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Transaction UTR / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. UPI-99881122 or Cheque #102"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Internal Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Received via GPay from resident brother"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
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
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? 'Recording...' : `Record ₹${amount}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
