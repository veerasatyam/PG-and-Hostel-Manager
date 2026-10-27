import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Complaint } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Plus,
  CheckCircle2,
} from 'lucide-react';

interface ComplaintsPageProps {
  onOpenNewComplaint: () => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ onOpenNewComplaint }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTicketForUpdate, setSelectedTicketForUpdate] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComplaints({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setComplaints(data.complaints);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleUpdateStatus = async (complaintId: string) => {
    setUpdating(true);
    try {
      await api.updateComplaintStatus(complaintId, newStatus, resolutionNotes.trim() || undefined);
      setSelectedTicketForUpdate(null);
      setResolutionNotes('');
      fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to update work order');
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Maintenance Work Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isOwner
              ? 'Dispatch staff for repair tickets, monitor resolution SLA, and log work order notes.'
              : 'Submit repair or service requests for your unit and follow up on progress.'}
          </p>
        </div>
        <button
          onClick={onOpenNewComplaint}
          className="inline-flex items-center px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Log Work Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        {[
          { id: 'ALL', label: 'All Orders' },
          { id: 'OPEN', label: 'Open' },
          { id: 'IN_PROGRESS', label: 'In Progress' },
          { id: 'RESOLVED', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading work order tickets...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No active maintenance work orders</p>
          <p className="text-[11px] text-slate-400 mt-1">All facilities are operating normally.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 transition-all hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border ${getPriorityBadge(c.priority)}`}>
                    {c.priority} Priority
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {c.category}
                  </span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${getStatusBadge(c.status)}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-1">{c.title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {c.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 gap-2">
                <div>
                  Submitted by: <strong className="text-slate-800">{c.tenant.name}</strong> (Room {c.tenant.roomNumber} - {c.tenant.bedName})
                </div>

                {isOwner && c.status !== 'RESOLVED' && (
                  <button
                    onClick={() => {
                      setSelectedTicketForUpdate(c.id);
                      setNewStatus(c.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED');
                      setResolutionNotes(c.resolutionNotes || '');
                    }}
                    className="text-slate-900 font-medium hover:underline text-xs cursor-pointer"
                  >
                    Update Status & Notes
                  </button>
                )}
              </div>

              {c.resolutionNotes && (
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-900 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resolution Log:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-5">{c.resolutionNotes}</p>
                </div>
              )}

              {/* Status Update Drawer */}
              {selectedTicketForUpdate === c.id && (
                <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 p-3.5 rounded-lg space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Update Work Order Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Resolution Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Electrician visited and repaired element."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketForUpdate(null)}
                      className="px-3 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdateStatus(c.id)}
                      className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      {updating ? 'Saving...' : 'Save Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
