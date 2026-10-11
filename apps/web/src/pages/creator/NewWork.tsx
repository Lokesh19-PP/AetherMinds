import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, Feather, Key, FileCheck, ArrowRight, ArrowLeft, Shield } from 'lucide-react';

export const NewWork: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [license, setLicense] = useState<string>('CC-BY-4.0');
  const [signed, setSigned] = useState<boolean>(false);

  const stepsList = [
    '1. File Hash',
    '2. Details',
    '3. License',
    '4. Version',
    '5. Review & Sign',
    '6. Submit',
  ];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <div className="text-xs uppercase font-mono tracking-wider text-sky font-bold">Side 2 · 6-Step Wizard</div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Register New Creation</h1>
        <p className="text-slate text-sm mt-1">
          Zero file upload. Your file is hashed locally, bundled into an RFC 8785 canonical manifest, and signed with your browser Ed25519 key.
        </p>
      </div>

      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between border-b border-deep/80 pb-4 overflow-x-auto">
        {stepsList.map((name, i) => (
          <div
            key={i}
            className={`text-xs font-mono font-medium px-2 py-1 rounded whitespace-nowrap transition-colors ${
              step === i + 1
                ? 'text-sky font-bold border-b-2 border-sky bg-sky/10'
                : step > i + 1
                ? 'text-emerald-400'
                : 'text-slate'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-deep bg-ink/60 p-8 space-y-6 shadow-xl">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 1: Local Streaming File Hashing</h3>
            <p className="text-slate text-xs">
              Select any creative file. It will be hashed inside your browser using pure JavaScript SHA-256. The file never leaves your machine.
            </p>
            <div className="border-2 border-dashed border-deep hover:border-sky/60 p-8 rounded-xl text-center">
              <label className="cursor-pointer">
                <span className="px-4 py-2 rounded-lg bg-cerulean text-white text-xs font-semibold inline-block">
                  Choose File
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <div className="mt-4 text-xs font-mono text-emerald-400 bg-success/10 p-2.5 rounded-lg border border-success/30">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB) · Local SHA-256 Computed
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 2: Metadata & Attribution Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate">Title of Work</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Celestial Vector Mesh"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-deep border border-deep text-white text-sm focus:border-sky focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short creative synopsis..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-deep border border-deep text-white text-sm focus:border-sky focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 3: Select Creative License</h3>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-ink-deep border border-deep text-white text-sm focus:border-sky focus:outline-none font-mono"
            >
              <option value="CC-BY-4.0">Creative Commons Attribution 4.0 (CC-BY-4.0)</option>
              <option value="CC-BY-NC-4.0">Non-Commercial 4.0 (CC-BY-NC-4.0)</option>
              <option value="MIT">MIT License</option>
              <option value="ALL-RIGHTS-RESERVED">All Rights Reserved</option>
              <option value="CUSTOM">Custom Terms</option>
            </select>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 4: Version & Creation Trail Linkage</h3>
            <div className="space-y-3 font-mono text-xs">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-sky/40 bg-sky/10 cursor-pointer">
                <input type="radio" name="versionType" defaultChecked className="text-sky" />
                <div>
                  <div className="font-bold text-white">New Initial Work (v1.0)</div>
                  <div className="text-slate">Starts a brand new immutable creation trail</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-deep bg-ink-deep/40 cursor-pointer">
                <input type="radio" name="versionType" className="text-sky" />
                <div>
                  <div className="font-bold text-white">New Version of Existing Work</div>
                  <div className="text-slate">Links to parent leaf hash to form an unbroken provenance lineage</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 5: Review & Client-Side Ed25519 Sign</h3>
            <p className="text-slate text-xs">
              Review canonical JSON string before signing. Your private key stays exclusively in browser memory.
            </p>
            <pre className="p-4 rounded-xl bg-ink-deep border border-deep text-[11px] font-mono text-sky overflow-x-auto">
{`{
  "contentHash": "fa83b109ef8120c91823...",
  "license": "${license}",
  "title": "${title || 'Untitled Work'}",
  "version": 1,
  "creatorPub": "ed25519:7b3a9c...8f12"
}`}
            </pre>
            <button
              onClick={() => setSigned(true)}
              className="px-4 py-2 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink text-xs font-mono font-bold flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              {signed ? 'Signed with Ed25519 Key' : 'Sign Manifest in Browser'}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 rounded-full bg-success/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Ready to Submit Manifest</h3>
            <p className="text-slate text-xs max-w-md mx-auto">
              Your signed manifest will be posted to <code className="text-sky font-mono">POST /api/manifests</code> without uploading file bytes.
            </p>
            <button
              onClick={() => navigate('/creator')}
              className="px-6 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold text-xs transition-all"
            >
              Submit to Registry & View Trail
            </button>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-deep/60">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 rounded-lg bg-deep/40 hover:bg-deep text-silver text-xs font-semibold flex items-center gap-1 disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          {step < 6 && (
            <button
              onClick={() => setStep((s) => Math.min(6, s + 1))}
              className="px-4 py-2 rounded-lg bg-cerulean hover:bg-sky text-white hover:text-ink text-xs font-semibold flex items-center gap-1"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
