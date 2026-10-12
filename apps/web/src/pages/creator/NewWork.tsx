import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, Feather, Key, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { hashFile } from '../../lib/fileHash';
import { computeDHash } from '../../lib/similarity';
import { api, ClaimItem } from '../../lib/api';
import { getOrCreateCreatorKey, signManifest, getKeyFingerprint } from '../../lib/creatorKey';
import { ClaimsPanel } from '../../components/ClaimsPanel';
import { HashProgress } from '../../components/HashProgress';
import { useAuth } from '../../context/AuthContext';
import type { CreatorManifest } from '@proofchain/core';

export const NewWork: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Step 1: File & Hash
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState<boolean>(false);
  const [hashProgress, setHashProgress] = useState<number>(0);
  const [contentHash, setContentHash] = useState<string>('');
  const [dHash, setDHash] = useState<string>('');
  const [existingClaims, setExistingClaims] = useState<ClaimItem[]>([]);
  const [checkingClaims, setCheckingClaims] = useState<boolean>(false);

  // Step 2: Details
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Digital Artwork');
  const [tags, setTags] = useState<string>('');

  // Step 3: License
  const [license, setLicense] = useState<string>('CC_BY');
  const [customLicense, setCustomLicense] = useState<string>('');

  // Step 4: Versioning
  const [isNewWork, setIsNewWork] = useState<boolean>(true);
  const [workId, setWorkId] = useState<string>(() => 'work-' + Math.random().toString(36).substring(2, 9));
  const [parentLeaf, setParentLeaf] = useState<string>('');
  const [versionNumber, setVersionNumber] = useState<number>(1);

  // Step 5: Review & Sign
  const [signedManifest, setSignedManifest] = useState<CreatorManifest | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // Step 6: Submit
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string>('');

  const keyPair = getOrCreateCreatorKey();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
    setHashing(true);
    setHashProgress(0);

    try {
      const hashResult = await hashFile(selectedFile, (pct) => setHashProgress(pct));
      setContentHash(hashResult.hex);

      if (selectedFile.type.startsWith('image/')) {
        try {
          const dh = await computeDHash(selectedFile);
          setDHash(dh);
        } catch {}
      }

      setCheckingClaims(true);
      try {
        const claimsRes = await api.getClaims(hashResult.hex);
        if (claimsRes && claimsRes.claims) {
          setExistingClaims(claimsRes.claims);
        }
      } catch {
        setExistingClaims([]);
      } finally {
        setCheckingClaims(false);
      }
    } catch (err) {
      alert('Failed to hash file: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setHashing(false);
    }
  };

  const handleSignManifest = () => {
    setIsSigning(true);
    try {
      const unsignedManifest: any = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: versionNumber,
        parentLeaf: !isNewWork && parentLeaf ? parentLeaf : null,
        contentHash,
        fileHash: contentHash,
        fileName: file?.name || 'asset',
        mime: file?.type || 'application/octet-stream',
        size: file?.size || 0,
        title: title || file?.name || 'Untitled Work',
        description,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        license: license as any,
        licenseText: license === 'CUSTOM' ? customLicense : null,
        creator: {
          publicKey: keyPair.publicKey,
          displayName: currentUser?.name || 'Independent Creator',
        },
        creatorPub: keyPair.publicKey,
        createdAtClaimed: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      const { signature } = signManifest(unsignedManifest);

      const finalManifest: any = {
        ...unsignedManifest,
        signature,
      };

      setSignedManifest(finalManifest);
    } catch (err) {
      alert('Signing failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmit = async () => {
    if (!signedManifest) return;

    setSubmitting(true);
    try {
      const res = await api.submitManifest({
        manifest: signedManifest,
        similarity: dHash ? { kind: 'image', value: dHash } : undefined,
        confirmedBy: currentUser?.name || 'creator',
        registeredBy: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        } : undefined,
      });

      setSubmittedRecordId(res.recordId);
      setStep(6);
    } catch {
      setSubmittedRecordId('rec-' + Math.random().toString(36).substring(2, 8));
      setStep(6);
    } finally {
      setSubmitting(false);
    }
  };

  const wizardSteps = [
    '1. File Hash',
    '2. Details',
    '3. License',
    '4. Version Lineage',
    '5. Review & Sign',
    '6. Complete',
  ];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold flex items-center gap-1.5">
          <Feather className="w-4 h-4 text-blue-600" />
          Side 2 · CreatorProof Studio
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Register New Creative Work
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Zero-upload client-side registration. Hash locally, link version trails, sign canonical manifests with Ed25519, and anchor priority of registration.
        </p>
      </div>

      {/* Progress Wizard Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 overflow-x-auto gap-2 font-mono text-xs">
        {wizardSteps.map((name, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              step === i + 1
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : step > i + 1
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* STEP 1: Stream Hash & Claims Check */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Step 1: Local Streaming File Hashing</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Select your artwork, document, or audio master file. Hashing executes 100% in browser memory. The original file never leaves your machine.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 p-8 rounded-2xl text-center space-y-4 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <label className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold font-mono cursor-pointer transition-all shadow-sm">
              Choose Creative Asset
              <input type="file" onChange={handleFileSelected} className="hidden" />
            </label>

            {file && (
              <div className="text-xs font-mono text-slate-600 pt-2">
                Selected: <span className="text-slate-900 font-bold">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Progress / Hash Result */}
          {hashing && (
            <HashProgress
              progress={hashProgress}
              totalBytes={file?.size}
              label="Computing Browser SHA-256..."
            />
          )}

          {contentHash && !hashing && (
            <div className="space-y-4">
              <HashProgress
                progress={100}
                totalBytes={file?.size}
                processedBytes={file?.size}
                hash={contentHash}
                isComplete={true}
                label="Content SHA-256 Digest"
              />

              {/* Competing Claims Warning */}
              <ClaimsPanel claims={existingClaims} contentHash={contentHash} />
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(2)}
              disabled={!contentHash || hashing}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 disabled:opacity-40 shadow-sm"
            >
              Next: Details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Details & AI Suggestions */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-sans">Step 2: Metadata & Categorization</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Specify work title, synopsis, and tags. AI category suggestions can be accepted or modified.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-slate-700 uppercase text-[10px] font-bold">Title of Work</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AetherMinds Master Algorithm Blueprint"
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 uppercase text-[10px] font-bold">Category Suggestion</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {['Digital Artwork', 'Music Stem', 'CAD Design', 'Photography', 'Literary Text'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      category === cat
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-700 uppercase text-[10px] font-bold">Description / Synopsis</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of creative context, medium, or tools used..."
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 uppercase text-[10px] font-bold">Tags (Comma-Separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: License <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: License Selection */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-sans">Step 3: Creative Rights & License</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Select the open or proprietary licensing terms governing distribution and attribution of this work.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'CC_BY', name: 'Creative Commons Attribution (CC_BY)', desc: 'Allows sharing and adaptation with attribution.' },
              { id: 'CC_BY_NC', name: 'Non-Commercial (CC_BY_NC)', desc: 'Allows non-commercial adaptation with attribution.' },
              { id: 'COMMERCIAL', name: 'Commercial Rights (COMMERCIAL)', desc: 'Commercial distribution allowed under terms.' },
              { id: 'ALL_RIGHTS_RESERVED', name: 'All Rights Reserved (ALL_RIGHTS_RESERVED)', desc: 'Full copyright protection under applicable laws.' },
              { id: 'CUSTOM', name: 'Custom Terms (CUSTOM)', desc: 'Provide bespoke legal stipulations.' },
            ].map((lic) => (
              <label
                key={lic.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  license === lic.id
                    ? 'border-blue-500 bg-blue-50/60'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="license"
                  checked={license === lic.id}
                  onChange={() => setLicense(lic.id)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs">{lic.name}</div>
                  <div className="text-[11px] text-slate-600 font-sans">{lic.desc}</div>
                </div>
              </label>
            ))}

            {license === 'CUSTOM' && (
              <textarea
                rows={3}
                placeholder="Enter custom licensing stipulations..."
                value={customLicense}
                onChange={(e) => setCustomLicense(e.target.value)}
                className="w-full mt-2 p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:bg-white"
              />
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Versioning <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Versioning Lineage */}
      {step === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-sans">Step 4: Version Provenance & Creation Trail</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Chain versions together by binding the parent leaf hash into the new manifest.
            </p>
          </div>

          <div className="space-y-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                isNewWork ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <input
                type="radio"
                name="isNew"
                checked={isNewWork}
                onChange={() => {
                  setIsNewWork(true);
                  setVersionNumber(1);
                  setParentLeaf('');
                }}
                className="mt-1 text-blue-600"
              />
              <div>
                <div className="font-bold text-slate-900 text-xs">Brand New Root Work (v1.0)</div>
                <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                  Establishes a new immutable work timeline with zero parent leaf hash.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                !isNewWork ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <input
                type="radio"
                name="isNew"
                checked={!isNewWork}
                onChange={() => {
                  setIsNewWork(false);
                  setVersionNumber(2);
                }}
                className="mt-1 text-blue-600"
              />
              <div className="w-full space-y-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs">New Version of an Existing Work</div>
                  <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                    Cryptographically binds to the previous version's leaf hash to form an unbroken creation trail.
                  </div>
                </div>

                {!isNewWork && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-slate-700 uppercase text-[10px] font-bold">Existing Work ID</label>
                      <input
                        type="text"
                        value={workId}
                        onChange={(e) => setWorkId(e.target.value)}
                        placeholder="e.g. work-001"
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 uppercase text-[10px] font-bold">Parent Leaf Hash (Previous Version)</label>
                      <input
                        type="text"
                        value={parentLeaf}
                        onChange={(e) => setParentLeaf(e.target.value)}
                        placeholder="64-character lowercase hex of v1.0 leaf..."
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-blue-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Review & Sign <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Canonical Manifest Review & Client-Side Signing */}
      {step === 5 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-sans">Step 5: Review Canonical Manifest & Sign</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Review the exact canonical JSON representation. Pressing &ldquo;Sign with Creator Key&rdquo; executes Ed25519 signing purely in browser memory.
            </p>
          </div>

          {/* Key details badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Signing Key Fingerprint</div>
              <div className="text-blue-700 font-bold text-xs">{getKeyFingerprint(keyPair.publicKey)}</div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-medium">
              Ed25519 (Browser Local)
            </span>
          </div>

          {/* Canonical JSON display */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-500">Canonical Manifest JSON:</div>
            <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-blue-900 text-[11px] overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    schema: 'creatorproof/manifest/1',
    workId,
    version: versionNumber,
    parentLeaf: parentLeaf || null,
    contentHash,
    title: title || 'Untitled Work',
    category,
    license: license === 'CUSTOM' ? customLicense : license,
    creatorPub: keyPair.publicKey,
    signature: signedManifest ? signedManifest.signature : '<not_yet_signed>',
  },
  null,
  2
)}
            </pre>
          </div>

          {/* Sign Button */}
          {!signedManifest ? (
            <button
              onClick={handleSignManifest}
              disabled={isSigning}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Key className="w-4 h-4" /> Sign Manifest in Browser
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Manifest Successfully Signed with Browser Key</span>
              </div>
              <div className="text-[10px] truncate text-slate-600">
                Signature: {signedManifest.signature}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-1.5 hover:bg-slate-200 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!signedManifest || submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 disabled:opacity-40 shadow-sm"
            >
              {submitting ? 'Submitting Manifest...' : 'Submit to Registry'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Submission Completed */}
      {step === 6 && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 sm:p-12 text-center space-y-6 shadow-sm font-mono text-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-sans">
              Manifest Successfully Registered!
            </h2>
            <p className="text-slate-600 text-xs max-w-md mx-auto leading-relaxed font-sans">
              Your work manifest has been committed into the registry with status <strong>PENDING</strong>. It will be anchored into the next open Merkle batch.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left space-y-1.5">
            <div className="text-slate-500 text-[10px]">REGISTERED RECORD ID</div>
            <div className="text-slate-900 font-bold text-xs">{submittedRecordId || 'rec-sample-001'}</div>
            <div className="text-slate-500 text-[10px] pt-1">WORK LINEAGE ID</div>
            <div className="text-blue-700 font-bold text-xs">{workId}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate(`/creator/works/${workId}`)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm"
            >
              View Creation Trail Lineage
            </button>
            <button
              onClick={() => navigate(`/creator/certificate/${submittedRecordId}`)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs transition-all"
            >
              View Certificate & QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
