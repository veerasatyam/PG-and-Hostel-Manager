import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { ReceiptData } from '../types';
import { Printer, Check, Building2, Calendar, CreditCard, User } from 'lucide-react';

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
        setError(err.message || 'Failed to load receipt details');
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
        <div className="py-12 text-center text-slate-500 text-xs">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
          <p className="mt-2">Retrieving receipt records...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {receipt && (
        <div>
          {/* Printable Receipt Container */}
          <div id="printable-receipt" className="bg-white rounded-xl p-6 border border-slate-200 text-slate-900 text-xs">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    SH
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">StayHaven Living Solutions</h2>
                    <p className="text-[11px] text-slate-500">Official Rent Receipt & Payment Confirmation</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Check className="w-3 h-3 mr-1" /> PAID
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Receipt No: <span className="font-mono font-medium text-slate-900">{receipt.receiptNumber}</span></p>
                <p className="text-[11px] text-slate-500">Date: {new Date(receipt.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Resident & Room Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Resident Details</span>
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {receipt.tenant.name}
                </p>
                <p className="text-slate-600 mt-0.5">{receipt.tenant.email}</p>
                {receipt.tenant.phone && <p className="text-slate-600">{receipt.tenant.phone}</p>}
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Accommodation Unit</span>
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Room {receipt.room.roomNumber} - {receipt.room.bedName}
                </p>
                <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Period: {getMonthName(receipt.rentPeriod.month)} {receipt.rentPeriod.year}
                </p>
              </div>
            </div>

            {/* Billing Breakdown */}
            <div className="py-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3">
                      <p className="font-semibold text-slate-900">
                        Monthly Rent — {getMonthName(receipt.rentPeriod.month)} {receipt.rentPeriod.year}
                      </p>
                      {receipt.rentPeriod.isProRated && (
                        <p className="text-amber-700 text-[11px] mt-0.5">
                          Note: {receipt.rentPeriod.proRatedNotes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900">
                      ₹{receipt.rentPeriod.totalRentDue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Settlement Totals */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Assessed Rent:</span>
                    <span className="font-medium text-slate-800">₹{receipt.rentPeriod.totalRentDue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 bg-slate-100 p-2 rounded border border-slate-200">
                    <span>Amount Paid (This Transaction):</span>
                    <span>₹{receipt.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Total Paid to Date:</span>
                    <span>₹{receipt.rentPeriod.totalPaidToDate.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1">
                    <span>Remaining Balance:</span>
                    <span className={receipt.rentPeriod.remainingBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      ₹{receipt.rentPeriod.remainingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Meta */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-3 rounded-lg text-[11px]">
              <div className="flex items-center space-x-2 text-slate-700">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Mode: <strong>{receipt.paymentMethod}</strong></span>
                {receipt.transactionRef && receipt.transactionRef !== 'N/A' && (
                  <span>| Ref: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">{receipt.transactionRef}</code></span>
                )}
              </div>
              <div className="text-slate-400 text-[10px]">
                Valid without physical signature.
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex justify-end gap-2 no-print">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
