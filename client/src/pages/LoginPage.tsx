import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Sparkles, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, quickSwitch } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'OWNER' | 'TENANT'>('OWNER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        await register({ name, email, password, role, phone });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const demoAccounts = [
    {
      role: 'Hostel Owner',
      name: 'Vikramaditya',
      badge: 'Admin Access',
      email: 'owner@stayhaven.com',
      note: 'Dashboard, room allocation, batch billing',
      color: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/40',
      tagColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      role: 'Tenant (Paid)',
      name: 'Rahul Sharma',
      badge: 'Room 101 - Bed A',
      email: 'rahul@gmail.com',
      note: 'Fully paid rent, view downloadable receipts',
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40',
      tagColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      role: 'Tenant (Overdue)',
      name: 'Priya Verma',
      badge: 'Room 102 - Bed A',
      email: 'priya@gmail.com',
      note: 'Past due balance & open AC repair ticket',
      color: 'border-rose-200 hover:border-rose-400 bg-rose-50/40',
      tagColor: 'bg-rose-100 text-rose-800',
    },
    {
      role: 'Tenant (Part-paid)',
      name: 'Amit Kumar',
      badge: 'Room 201 - Bed A',
      email: 'amit@gmail.com',
      note: 'Pro-rated mid-month stay & partial payment',
      color: 'border-amber-200 hover:border-amber-400 bg-amber-50/40',
      tagColor: 'bg-amber-100 text-amber-800',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white items-center justify-center font-bold text-2xl shadow-md mb-3">
          SH
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">StayHaven</h2>
        <p className="mt-1 text-xs text-slate-500">
          Smart PG & Hostel Management • Room Beds, Pro-rated Rent & Maintenance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200/80 sm:px-10">
          {/* Header tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => {
                setIsRegistering(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
                !isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
                isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('OWNER')}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        role === 'OWNER'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Hostel Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('TENANT')}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        role === 'TENANT'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Tenant / Resident
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm disabled:opacity-50 transition-all flex items-center justify-center"
            >
              {submitting
                ? 'Processing...'
                : isRegistering
                ? 'Create StayHaven Account'
                : 'Sign In to StayHaven'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>

          {/* 1-Click Quick Demo Login Box */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1-Click Quick Demo Logins
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Click any profile below to try the app immediately without typing:
            </p>

            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickSwitch(acc.email)}
                  className={`w-full text-left p-2.5 rounded-2xl border text-xs transition-all flex justify-between items-center ${acc.color}`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900">{acc.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${acc.tagColor}`}>
                        {acc.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{acc.note}</span>
                  </div>
                  <span className="text-indigo-600 font-bold text-[11px] hover:underline">
                    Login →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
