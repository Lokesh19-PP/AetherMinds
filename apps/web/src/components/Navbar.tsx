import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck, Layers, FileCheck, FlaskConical, Feather, CheckCircle2, ChevronRight } from 'lucide-react';
import { HealthStrip } from './HealthStrip';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-sm'
        : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100'
    }`;

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

          {/* Primary Call-To-Action: Public Verifier */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-blue-600/30 ring-2 ring-blue-500 ring-offset-2'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                }`
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify Document</span>
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};
