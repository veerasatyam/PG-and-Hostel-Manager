import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { ReceiptData } from '../types';
import { Printer, CheckCircle, Building2, Calendar, CreditCard, User } from 'lucide-react';

interface ReceiptModalProps {
  receiptNumber: string | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receiptNumber, onClose }) => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptNumber) {
      setReceipt(null);
      return;
    }
    const fetchReceipt = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getReceipt(receiptNumber);
        setReceipt(data.receipt);
      } catch (err: any) {
        setError(err.message || 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [receiptNumber]);

  const handlePrint = () => {
    window.print();
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1] || `Month ${monthNum}`;
  };

  return (
    <Modal isOpen={!!receiptNumber} onClose={onClose} title="Rent Payment Receipt" maxWidth="max-w-2xl">
      {loading && (
        <div className="py-12 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-sm">Generating receipt...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {receipt && (
        <div>
          {/* Printable Container */}
          <div id="printable-receipt" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm text-slate-800">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    SH
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">StayHaven PG & Hostel</h2>
                    <p className="text-xs text-slate-500">Premium Student & Working Professional Living</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> PAYMENT CONFIRMED
                </span>
                <p className="text-xs text-slate-500 mt-1">Receipt No: <span className="font-mono font-medium text-slate-800">{receipt.receiptNumber}</span></p>
                <p className="text-xs text-slate-500">Date: {new Date(receipt.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Bill To & Room Info */}
            <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Tenant Details</span>
                <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" /> {receipt.tenant.name}
                </p>
                <p className="text-slate-600 mt-0.5">{receipt.tenant.email}</p>
                {receipt.tenant.phone && <p className="text-slate-600">{receipt.tenant.phone}</p>}
              </div>
              <div>
                <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Accommodation</span>
                <p className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" /> Room {receipt.room.roomNumber} - {receipt.room.bedName}
                </p>
                <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> Period: {getMonthName(receipt.rentPeriod.month)} {receipt.rentPeriod.year}
                </p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3">
                      <p className="font-medium text-slate-900">
                        Monthly Rent - {getMonthName(receipt.rentPeriod.month)} {receipt.rentPeriod.year}
                      </p>
                      {receipt.rentPeriod.isProRated && (
                        <p className="text-amber-600 text-[11px] mt-0.5">
                          ⚡ {receipt.rentPeriod.proRatedNotes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-800">
                      ₹{receipt.rentPeriod.totalRentDue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Rent Assessed:</span>
                    <span className="font-medium">₹{receipt.rentPeriod.totalRentDue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                    <span>Amount Paid (This Txn):</span>
                    <span>₹{receipt.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Total Paid So Far:</span>
                    <span>₹{receipt.rentPeriod.totalPaidToDate.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1">
                    <span>Remaining Balance:</span>
                    <span className={receipt.rentPeriod.remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      ₹{receipt.rentPeriod.remainingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-3 rounded-lg text-xs">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Method: <strong>{receipt.paymentMethod}</strong></span>
                {receipt.transactionRef && receipt.transactionRef !== 'N/A' && (
                  <span className="text-slate-500">| Ref: <code className="font-mono">{receipt.transactionRef}</code></span>
                )}
              </div>
              <div className="text-slate-400 text-[11px] italic">
                Computer-generated receipt, valid without signature.
              </div>
            </div>
          </div>

          {/* Action buttons (hidden when printing) */}
          <div className="mt-6 flex justify-end gap-3 no-print">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Download PDF
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
