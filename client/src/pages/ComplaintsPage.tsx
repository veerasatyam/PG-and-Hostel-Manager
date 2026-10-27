import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Complaint } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check,
  Send,
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
      setError(err.message || 'Failed to load complaints');
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
      alert(err.message || 'Failed to update complaint status');
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance & Complaints</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isOwner
              ? 'Review tenant reported repairs, dispatch technicians, and communicate resolution progress.'
              : 'Log plumbing, electrical, WiFi or furniture issues and follow up on repair status.'}
          </p>
        </div>
        <button
          onClick={onOpenNewComplaint}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Raise Complaint
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'ALL', label: 'All Tickets' },
          { id: 'OPEN', label: 'Open' },
          { id: 'IN_PROGRESS', label: 'In Progress' },
          { id: 'RESOLVED', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading maintenance tickets...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Wrench className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No complaints reported</p>
          <p className="text-xs text-slate-400 mt-1">Everything is running smoothly!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 transition-all hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getPriorityBadge(c.priority)}`}>
                    {c.priority} Priority
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {c.category}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusBadge(c.status)}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-900 mt-1">{c.title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {c.description}
              </p>

              {/* Tenant info & room */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 gap-2">
                <div>
                  Reported by: <strong className="text-slate-800">{c.tenant.name}</strong> (Room {c.tenant.roomNumber} - {c.tenant.bedName})
                </div>

                {/* Owner status change trigger */}
                {isOwner && c.status !== 'RESOLVED' && (
                  <button
                    onClick={() => {
                      setSelectedTicketForUpdate(c.id);
                      setNewStatus(c.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED');
                      setResolutionNotes(c.resolutionNotes || '');
                    }}
                    className="text-indigo-600 font-semibold hover:text-indigo-800 underline text-xs"
                  >
                    Update Ticket Status
                  </button>
                )}
              </div>

              {/* Resolution Notes display */}
              {c.resolutionNotes && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Resolution Log:</span>
                  </div>
                  <p className="pl-5">{c.resolutionNotes}</p>
                </div>
              )}

              {/* Owner Update Form Drawer */}
              {selectedTicketForUpdate === c.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Update Ticket Resolution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketForUpdate(null)}
                      className="px-3 py-1 text-slate-500 hover:text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdateStatus(c.id)}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {updating ? 'Updating...' : 'Save Status'}
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
