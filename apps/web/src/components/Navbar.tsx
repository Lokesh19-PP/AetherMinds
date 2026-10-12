import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Layers,
  FileCheck,
  FlaskConical,
  Feather,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { HealthStrip } from './HealthStrip';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-sm'
        : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100'
    }`;

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top Health Telemetry Strip */}
      <HealthStrip />

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-none">
                Proof<span className="text-blue-600">Chain</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
                + CreatorProof
              </span>
            </div>
          </NavLink>

          {/* Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm">
            <NavLink to="/proofchain/register" className={navLinkClass}>
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Register Document</span>
            </NavLink>

            <NavLink to="/proofchain/batches" className={navLinkClass}>
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Batches & Records</span>
            </NavLink>

            <NavLink to="/creator" className={navLinkClass}>
              <Feather className="w-4 h-4 text-slate-500" />
              <span>Creator Protection</span>
            </NavLink>

            <NavLink to="/proofchain/tamper-lab" className={navLinkClass}>
              <FlaskConical className="w-4 h-4 text-amber-500" />
              <span>Tamper Lab</span>
            </NavLink>
          </nav>

          {/* Right Action Items: Verifier & User Identity */}
          <div className="flex items-center gap-2.5">
            {/* Standalone Public Verifier Button */}
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                `hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-400'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Verify</span>
            </NavLink>

            {/* User Identity Pill / Login Button */}
            {isAuthenticated && currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left shadow-2xs"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                      currentUser.role === 'creator'
                        ? 'bg-purple-600'
                        : currentUser.role === 'auditor'
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-none capitalize">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs text-slate-700">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="font-semibold text-slate-900">{currentUser.name}</div>
                      <div className="text-slate-500 truncate">{currentUser.email}</div>
                      {currentUser.organization && (
                        <div className="text-[10px] text-blue-600 font-medium mt-0.5">{currentUser.organization}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => { setShowDropdown(false); navigate('/login'); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Switch Profile / Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
