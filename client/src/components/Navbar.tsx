import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout, quickSwitch } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  if (!user) return null;

  const isOwner = user.role === 'OWNER';

  const ownerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms & Beds', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'rent', label: 'Rent & Payments', icon: CreditCard },
    { id: 'complaints', label: 'Complaints', icon: Wrench },
  ];

  const tenantTabs = [
    { id: 'portal', label: 'My Stay & Rent', icon: LayoutDashboard },
    { id: 'complaints', label: 'Maintenance Requests', icon: Wrench },
  ];

  const tabs = isOwner ? ownerTabs : tenantTabs;

  const demoAccounts = [
    { label: '👑 Owner (Admin)', email: 'owner@stayhaven.com', desc: 'Full PG management' },
    { label: '👤 Rahul (Tenant)', email: 'rahul@gmail.com', desc: 'Room 101 - Paid Rent' },
    { label: '👤 Priya (Tenant)', email: 'priya@gmail.com', desc: 'Room 102 - Overdue' },
    { label: '👤 Amit (Tenant)', email: 'amit@gmail.com', desc: 'Room 201 - Part-paid' },
    { label: '👤 Neha (Tenant)', email: 'neha@gmail.com', desc: 'Unassigned (New)' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              SH
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">StayHaven</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isOwner ? 'Owner Admin' : 'Tenant Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">PG & Hostel Management</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Header Section: Quick Demo Switcher + Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl hover:bg-amber-100 transition-all shadow-xs"
                title="Switch demo account to test different roles"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Switch Demo User</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
              </button>

              {demoMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 ring-1 ring-black/5 z-50 text-xs"
                  onClick={() => setDemoMenuOpen(false)}
                >
                  <div className="px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-1">
                    Instant Demo Logins
                  </div>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => quickSwitch(acc.email)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors flex flex-col ${
                        user.email === acc.email ? 'bg-indigo-50/80 border border-indigo-200' : ''
                      }`}
                    >
                      <span className="font-semibold text-slate-800">{acc.label}</span>
                      <span className="text-[11px] text-slate-500">{acc.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Info & Logout */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight">{user.name}</span>
              <span className="text-[11px] text-slate-500">{user.email}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium ${
                  active ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
