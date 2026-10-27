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
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isOwner = user.role === 'OWNER';

  const ownerTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms & Beds', icon: Building2 },
    { id: 'tenants', label: 'Residents', icon: Users },
    { id: 'rent', label: 'Billing & Invoicing', icon: CreditCard },
    { id: 'complaints', label: 'Work Orders', icon: Wrench },
  ];

  const tenantTabs = [
    { id: 'portal', label: 'My Accommodation', icon: LayoutDashboard },
    { id: 'complaints', label: 'Service Requests', icon: Wrench },
  ];

  const tabs = isOwner ? ownerTabs : tenantTabs;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-sm text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-white text-slate-900 flex items-center justify-center font-black text-sm tracking-tight shadow-xs">
              SH
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white tracking-tight text-base">StayHaven</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {isOwner ? 'Property Manager' : 'Resident Portal'}
                </span>
              </div>
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
                  className={`flex items-center px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mr-2 ${active ? 'text-white' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Header Section: User Profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2.5 bg-slate-800/80 border border-slate-700/60 py-1 px-2.5 rounded-lg">
              <div className="h-6 w-6 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] font-bold">
                {initials || <UserIcon className="w-3 h-3" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-100 leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400">{user.email}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
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
                className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium ${
                  active ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
