import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Wrench, AlertCircle } from 'lucide-react';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId?: string;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'WIFI' | 'FURNITURE' | 'OTHER'>('ELECTRICAL');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createComplaint({
        title,
        description,
        category,
        priority,
        tenantId,
      });

      setTitle('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to raise complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Maintenance Complaint" maxWidth="max-w-md">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Issue Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Geyser not working, Fan regulator broken"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ELECTRICAL">⚡ Electrical</option>
              <option value="PLUMBING">🚰 Plumbing</option>
              <option value="WIFI">📶 Wi-Fi / Internet</option>
              <option value="CLEANING">🧹 Cleaning / Housekeeping</option>
              <option value="FURNITURE">🪑 Furniture / Bed</option>
              <option value="OTHER">📦 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="LOW">Low (Minor annoyance)</option>
              <option value="MEDIUM">Medium (Normal)</option>
              <option value="HIGH">High (Needs fast fix)</option>
              <option value="URGENT">🚨 Urgent (Critical issue)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Please explain the problem clearly (e.g. how long it has been happening, exact room/area location)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
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
            <Wrench className="w-4 h-4 mr-1.5" />
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
