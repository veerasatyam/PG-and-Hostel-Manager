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
      setError(err.message || 'Failed to create room unit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Accommodation Unit" maxWidth="max-w-md">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Room Identifier / Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, 204B"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Floor
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Occupancy Type
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="SINGLE">Single Room (1 Bed)</option>
              <option value="DOUBLE">Double Sharing (2 Beds)</option>
              <option value="TRIPLE">Triple Sharing (3 Beds)</option>
              <option value="FOUR_SHARING">Four Sharing (4 Beds)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bed Capacity
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={bedCount}
              onChange={(e) => setBedCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monthly Base Tariff (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1000"
              required
              value={baseRent}
              onChange={(e) => setBaseRent(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="pt-4">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAc}
                onChange={(e) => setHasAc(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
              />
              <span className="font-medium">Air Conditioned (AC)</span>
            </label>
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
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? 'Creating...' : 'Create Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
