import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Building2, AlertCircle } from 'lucide-react';

interface NewRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewRoomModal: React.FC<NewRoomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState<number>(1);
  const [type, setType] = useState<'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'FOUR_SHARING'>('DOUBLE');
  const [hasAc, setHasAc] = useState(true);
  const [baseRent, setBaseRent] = useState<number>(8500);
  const [bedCount, setBedCount] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (newType: any) => {
    setType(newType);
    if (newType === 'SINGLE') setBedCount(1);
    else if (newType === 'DOUBLE') setBedCount(2);
    else if (newType === 'TRIPLE') setBedCount(3);
    else if (newType === 'FOUR_SHARING') setBedCount(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.createRoom({
        number,
        floor: Number(floor),
        type,
        hasAc,
        baseRent: Number(baseRent),
        bedCount: Number(bedCount),
      });

      setNumber('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New PG Room & Beds" maxWidth="max-w-md">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Room Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, 204B"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Floor
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Sharing Type
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="SINGLE">Single Room (Private)</option>
              <option value="DOUBLE">Double Sharing (2 Beds)</option>
              <option value="TRIPLE">Triple Sharing (3 Beds)</option>
              <option value="FOUR_SHARING">Four Sharing (4 Beds)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Bed Count
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={bedCount}
              onChange={(e) => setBedCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Monthly Base Rent (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1000"
              required
              value={baseRent}
              onChange={(e) => setBaseRent(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="pt-5">
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAc}
                onChange={(e) => setHasAc(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="font-medium text-xs">Air Conditioned (AC)</span>
            </label>
          </div>
        </div>

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
            className="inline-flex items-center px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-all"
          >
            <Building2 className="w-4 h-4 mr-1.5" />
            {submitting ? 'Creating...' : 'Create Room & Beds'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
