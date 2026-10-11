import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck, FileCheck, Layers, FileSearch, FlaskConical, Feather, PlusCircle, CheckCircle, Compass } from 'lucide-react';
import { HealthStrip } from './HealthStrip';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const isProofChain = location.pathname.startsWith('/proofchain');
  const isCreator = location.pathname.startsWith('/creator');

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-cerulean/20 text-sky border border-cerulean/40 shadow-sm shadow-sky/10'
        : 'text-silver/80 hover:text-white hover:bg-deep/40'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-deep/80 bg-ink-deep/90 backdrop-blur-xl">
      {/* Top Health Strip */}
      <HealthStrip />

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cerulean to-deep p-0.5 shadow-md shadow-cerulean/20 group-hover:shadow-sky/30 transition-all">
                <div className="w-full h-full bg-ink-deep rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-sky group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                  Proof<span className="text-sky font-semibold">Chain</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate -mt-1 font-semibold">
                  + CreatorProof
                </span>
              </div>
            </NavLink>

            {/* Scope Badge */}
            <div className="hidden md:flex items-center ml-2 px-2 py-0.5 rounded-md text-[11px] font-mono border border-deep/60 bg-deep/20 text-slate">
              {isProofChain && <span className="text-sky flex items-center gap-1"><Layers className="w-3 h-3" /> Side 1: Issuer Engine</span>}
              {isCreator && <span className="text-info flex items-center gap-1"><Feather className="w-3 h-3" /> Side 2: Creator Studio</span>}
              {!isProofChain && !isCreator && <span className="text-silver/60 flex items-center gap-1"><Compass className="w-3 h-3" /> Public Portal</span>}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {/* Side 1: ProofChain */}
            <div className="flex items-center gap-1 pr-3 border-r border-deep/60">
              <NavLink to="/proofchain" end className={navLinkClass}>
                <Layers className="w-3.5 h-3.5" />
                Dashboard
              </NavLink>
              <NavLink to="/proofchain/register" className={navLinkClass}>
                <FileCheck className="w-3.5 h-3.5" />
                Register
              </NavLink>
              <NavLink to="/proofchain/batches" className={navLinkClass}>
                <Layers className="w-3.5 h-3.5" />
                Batches
              </NavLink>
              <NavLink to="/proofchain/audit" className={navLinkClass}>
                <FileSearch className="w-3.5 h-3.5" />
                Audit
              </NavLink>
              <NavLink to="/proofchain/tamper-lab" className={navLinkClass}>
                <FlaskConical className="w-3.5 h-3.5 text-warn" />
                <span className="text-warn">Tamper Lab</span>
              </NavLink>
            </div>

            {/* Side 2: CreatorProof */}
            <div className="flex items-center gap-1 pl-3 pr-3 border-r border-deep/60">
              <NavLink to="/creator" end className={navLinkClass}>
                <Feather className="w-3.5 h-3.5" />
                Creator Home
              </NavLink>
              <NavLink to="/creator/new" className={navLinkClass}>
                <PlusCircle className="w-3.5 h-3.5 text-sky" />
                New Work
              </NavLink>
            </div>

            {/* Public Standalone Verifier */}
            <div className="pl-3">
              <NavLink
                to="/verify"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-cerulean text-white shadow-md shadow-cerulean/30'
                      : 'bg-cerulean/20 text-sky hover:bg-cerulean hover:text-white border border-cerulean/50'
                  }`
                }
              >
                <CheckCircle className="w-4 h-4" />
                Verify Proof
              </NavLink>
            </div>
          </nav>

          {/* Mobile shortcut */}
          <div className="flex lg:hidden items-center gap-2">
            <NavLink
              to="/verify"
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-cerulean text-white"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Verify
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};
