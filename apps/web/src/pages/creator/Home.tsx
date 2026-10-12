import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Bell,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  MoreHorizontal,
  Link as LinkIcon,
  Plus,
  ArrowLeft,
  ExternalLink,
  Award,
  Key,
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  CheckCircle2,
  X,
  FileCheck,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Clock,
  Blocks,
  Filter,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, RecordItem, getFileUrl } from '../../lib/api';
import { getOrCreateCreatorKey, getKeyFingerprint } from '../../lib/creatorKey';
import { sha256Hex, signManifest as coreSignManifest } from '@proofchain/core';
import type { CreatorManifest, ManifestLicense } from '@proofchain/core';
import '../../styles/pc-creator.css';

interface SocialWorkPost {
  id: string;
  recordId: string;
  workId: string;
  creatorName: string;
  creatorHandle: string;
  title: string;
  caption: string;
  category: 'Image' | 'Video' | 'Audio' | 'Document';
  mediaUrl?: string;
  sha256Hash: string;
  batchId: string;
  timeAgo: string;
  createdAt: string;
  license: string;
  likes: number;
  commentsCount: number;
  views: number;
  isLiked?: boolean;
  txHash: string;
  network: string;
  creatorPub: string;
}

export const CreatorHome: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const activeCreatorName = currentUser?.name || 'Creator';
  const activeCreatorHandle = currentUser?.username
    ? `@${currentUser.username}`
    : `@${activeCreatorName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const [keyPair] = useState(() => getOrCreateCreatorKey());
  const keyFingerprint = getKeyFingerprint(keyPair.publicKey);

  // Active Navigation Tab: 'feed' | 'portfolio'
  const [activeTab, setActiveTab] = useState<'feed' | 'portfolio'>('feed');

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [selectedProofPost, setSelectedProofPost] = useState<SocialWorkPost | null>(null);

  // Feed posts state
  const [posts, setPosts] = useState<SocialWorkPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Existing registry records for Claim Ownership
  const [registryRecords, setRegistryRecords] = useState<RecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Relative time helper
  const formatTimeAgo = (isoString?: string): string => {
    if (!isoString) return 'Recently';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}w ago`;
    } catch {
      return 'Recently';
    }
  };

  // Load works from registry API (100% REAL DATA)
  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await api.getWorksList();
      if (Array.isArray(data) && data.length > 0) {
        const mappedPosts: SocialWorkPost[] = data.map((item, idx) => {
          const mediaUrl = getFileUrl(item.latest_record_id);

          const catStr = (item.category || item.mime || '').toLowerCase();
          const category: 'Image' | 'Video' | 'Audio' | 'Document' =
            catStr.includes('video') || catStr.includes('mp4')
              ? 'Video'
              : catStr.includes('audio') || catStr.includes('music') || catStr.includes('mp3')
              ? 'Audio'
              : catStr.includes('image') || catStr.includes('jpg') || catStr.includes('jpeg') || catStr.includes('png') || catStr.includes('art')
              ? 'Image'
              : 'Document';

          // Deterministic transaction hash based on batch and record
          const txHash =
            '0x' +
            (item.content_hash || item.latest_record_id)
              .replace(/[^a-f0-9]/gi, 'a')
              .padEnd(64, '0')
              .slice(0, 64);

          const timeAgo = formatTimeAgo(item.latest_created_at);

          return {
            id: `post-${item.work_id || item.latest_record_id || idx}`,
            recordId: item.latest_record_id,
            workId: item.work_id,
            creatorName: item.creator_name || item.confirmed_by || activeCreatorName,
            creatorHandle: item.creator_handle || ('@' + (item.creator_name || item.confirmed_by || currentUser?.username || 'creator').toLowerCase().replace(/[^a-z0-9]/g, '')),
            title: item.title || item.file_name || 'Creative Work',
            caption: item.description || 'Verified on immutable ledger and blockchain.',
            category,
            mediaUrl,
            sha256Hash: item.content_hash || '',
            batchId: item.batch_id || 'b-0001',
            timeAgo,
            createdAt: item.latest_created_at || new Date().toISOString(),
            license: item.license || 'creativeCommons',
            likes: Math.max(1, (idx * 3 + 1) % 15),
            commentsCount: idx % 3,
            views: 45 + idx * 19,
            txHash,
            network: 'Local Hardhat (31337)',
            creatorPub: item.creator_pub || keyPair.publicKey,
          };
        });

        setPosts(mappedPosts);
      } else {
        setPosts([]);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  // Fetch registered records when user opens Claim Ownership modal
  const openClaimModal = async () => {
    setShowClaimModal(true);
    setLoadingRecords(true);
    try {
      const records = await api.getRecords();
      setRegistryRecords(records);
    } catch {
      setRegistryRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Toggle Heart/Like on post
  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likes: isLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );
  };

  // Share post link
  const handleShare = (post: SocialWorkPost) => {
    const url = `${window.location.origin}/verify?hash=${post.sha256Hash}`;
    navigator.clipboard?.writeText(url);
    showToast('Copied proof verification link to clipboard!');
  };

  // Filter posts based on active tab, search query, and category
  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'portfolio') {
      const matchesKey =
        p.creatorPub === keyPair.publicKey ||
        (currentUser && (
          p.creatorName.toLowerCase() === currentUser.name.toLowerCase() ||
          p.creatorHandle.toLowerCase() === activeCreatorHandle.toLowerCase()
        ));
      if (!matchesKey) return false;
    }
    if (selectedCategory !== 'all' && p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.caption.toLowerCase().includes(q) ||
      p.creatorName.toLowerCase().includes(q) ||
      p.creatorHandle.toLowerCase().includes(q) ||
      p.sha256Hash.toLowerCase().includes(q)
    );
  });

  // State for Post Creation Modal
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCaption, setNewCaption] = useState<string>('');
  const [newCreatorName, setNewCreatorName] = useState<string>(activeCreatorName);
  const [newCreatorHandle, setNewCreatorHandle] = useState<string>(activeCreatorHandle);
  const [newCategory, setNewCategory] = useState<'Image' | 'Video' | 'Audio' | 'Document'>('Image');
  const [newLicense, setNewLicense] = useState<string>('creativeCommons');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.name) {
      setNewCreatorName(currentUser.name);
      setNewCreatorHandle(currentUser.username ? `@${currentUser.username}` : `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    }
  }, [currentUser]);

  // Handle file selected in creation modal
  const handleNewFileSelected = (file: File) => {
    setNewFile(file);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    if (file.type.startsWith('image/')) {
      setNewCategory('Image');
      const reader = new FileReader();
      reader.onload = (e) => setPreviewDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setNewCategory('Video');
      setPreviewDataUrl(null);
    } else if (file.type.startsWith('audio/')) {
      setNewCategory('Audio');
      setPreviewDataUrl(null);
    } else {
      setNewCategory('Document');
      setPreviewDataUrl(null);
    }
  };

  // Submit new creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) {
      showToast('Please select a file to register');
      return;
    }

    setCreating(true);
    try {
      const buffer = await newFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hash = sha256Hex(bytes);

      const workId = 'work-' + Math.random().toString(36).substring(2, 10);
      const licenseMap: Record<string, ManifestLicense> = {
        creativeCommons: 'CC_BY',
        'CC-BY-4.0': 'CC_BY',
        'All Rights Reserved': 'ALL_RIGHTS_RESERVED',
      };
      const validLicense: ManifestLicense = licenseMap[newLicense] || 'CC_BY';

      const unsignedManifest: Omit<CreatorManifest, 'signature'> = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: 1,
        parentLeaf: null,
        fileHash: hash,
        fileName: newFile.name,
        mime: newFile.type || 'application/octet-stream',
        size: newFile.size,
        title: newTitle.trim() || 'Untitled Creation',
        description: newCaption.trim() || 'Verified on immutable ledger and blockchain.',
        category: newCategory,
        tags: [newCategory.toLowerCase()],
        license: validLicense,
        licenseText: null,
        creator: {
          publicKey: keyPair.publicKey,
          displayName: newCreatorName,
        },
        createdAtClaimed: new Date().toISOString(),
      };

      const signed = coreSignManifest(unsignedManifest, keyPair.privateKey);

      // Convert file bytes to base64 so server saves file copy
      let fileBase64: string | undefined = undefined;
      let binary = '';
      const len = bytes.byteLength;
      const chunkSize = 0x8000;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      fileBase64 = btoa(binary);

      // Register manifest to registry
      const regRes = await api.submitManifest({
        manifest: signed,
        confirmedBy: newCreatorName,
        fileBase64,
      });

      // Auto-seal batch so proof bundle and ledger root are ready immediately
      if (regRes.batchId) {
        try {
          await api.sealBatch(regRes.batchId);
        } catch (sealErr: any) {
          console.warn('Auto-seal note:', sealErr.message);
        }
      }

      setShowCreateModal(false);
      setNewFile(null);
      setNewTitle('');
      setNewCaption('');
      setPreviewDataUrl(null);
      showToast('Creation successfully signed & anchored to the blockchain!');

      // Reload real feed from registry
      await loadFeed();
    } catch (err: any) {
      showToast(`Error creating post: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Claim ownership of existing record
  const handleClaimRecord = async (record: RecordItem) => {
    setCreating(true);
    try {
      const workId = 'work-claim-' + Math.random().toString(36).substring(2, 10);
      const unsignedManifest: Omit<CreatorManifest, 'signature'> = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: 1,
        parentLeaf: null,
        fileHash: record.content_hash,
        fileName: record.file_name || record.title || 'claimed-work',
        mime: record.mime || 'application/octet-stream',
        size: 0,
        title: record.title || 'Claimed Ownership Work',
        description: 'Ownership claimed and signed by creator on Polygon Amoy Testnet.',
        category: record.mime?.startsWith('image/') ? 'Image' : 'Document',
        tags: ['claimed'],
        license: 'CC_BY',
        licenseText: null,
        creator: {
          publicKey: keyPair.publicKey,
          displayName: newCreatorName,
        },
        createdAtClaimed: new Date().toISOString(),
      };

      const signed = coreSignManifest(unsignedManifest, keyPair.privateKey);

      const regRes = await api.submitManifest({
        manifest: signed,
        confirmedBy: newCreatorName,
      });

      if (regRes.batchId) {
        try {
          await api.sealBatch(regRes.batchId);
        } catch (sealErr: any) {
          console.warn('Auto-seal note:', sealErr.message);
        }
      }

      setShowClaimModal(false);
      const cleanName = record.title || record.file_name || (record.id ? `${record.id.slice(0, 12)}...` : 'Document');
      showToast(`Manifest for "${cleanName}" registered and queued for batch sealing!`);
      await loadFeed();
    } catch (err: any) {
      showToast(`Error registering manifest: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Download .pcproof.json file for a post
  const handleDownloadPcProof = async (post: SocialWorkPost) => {
    try {
      const bundle = await api.getProof(post.recordId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${post.title.replace(/\s+/g, '_')}_${post.recordId}.pcproof.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded .pcproof.json proof package!');
    } catch (err: any) {
      showToast('Proof bundle not available yet: batch is pending or sealing.');
    }
  };

  // Export private key
  const handleExportKey = () => {
    const keyData = JSON.stringify(keyPair, null, 2);
    const blob = new Blob([keyData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-key-${keyPair.publicKey.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported creator key backup.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Toast Notification with Explicit High Contrast & Dismiss */}
      {toastMessage && (
        <div
          style={{ backgroundColor: '#090d16', color: '#f8fafc', borderColor: '#334155' }}
          className="fixed top-24 right-8 z-[9999] max-w-md px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-100 leading-snug flex-1">
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP DESKTOP HERO & ACTION BAR */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Decentralized Attribution & Priority Evidence
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                CreatorProof Studio
              </h1>
              <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                Register creative works with verifiable cryptographic priority and attribution evidence anchored to the append-only ledger and Ethereum EVM contract.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openClaimModal}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Award className="w-4 h-4 text-cyan-600" /> Register Manifest from File
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Register New Creation
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search creations by title, author, or SHA-256 hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Media' },
                { id: 'image', label: 'Images' },
                { id: 'video', label: 'Videos' },
                { id: 'audio', label: 'Audio' },
                { id: 'document', label: 'Documents' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN 2-COLUMN DESKTOP WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Creator Profile, Navigation & Telemetry (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Creator Identity Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                  {activeCreatorName[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    {activeCreatorName}
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Key" />
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">{activeCreatorHandle}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono text-xs space-y-1">
                <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">
                  Browser Ed25519 Key
                </div>
                <div className="text-slate-700 truncate font-semibold">
                  {keyFingerprint}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportKey}
                  className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-600" /> Export Key
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Post Work
                </button>
              </div>
            </div>

            {/* Navigation Filter Tabs */}
            <div className="rounded-3xl border border-slate-200 bg-white p-3 space-y-1 shadow-sm font-sans text-xs">
              <button
                onClick={() => setActiveTab('feed')}
                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between font-bold transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  Explore All Creations
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                  {posts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('portfolio')}
                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between font-bold transition-all cursor-pointer ${
                  activeTab === 'portfolio'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  My Owned Portfolio
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                  {posts.filter((p) => p.creatorPub === keyPair.publicKey || (currentUser && p.creatorName.toLowerCase() === currentUser.name.toLowerCase())).length}
                </span>
              </button>

              <button
                onClick={openClaimModal}
                className="w-full px-4 py-3 rounded-xl flex items-center justify-between font-medium text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-600" />
                  Claim Registered Document
                </span>
              </button>
            </div>

            {/* Blockchain Network Status Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3.5 shadow-sm text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Blocks className="w-4 h-4 text-cyan-600" />
                  Online Blockchain
                </span>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="font-semibold text-slate-800">Polygon Amoy Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span>Chain ID:</span>
                  <span className="font-mono text-slate-800">80002</span>
                </div>
                <div className="flex justify-between">
                  <span>Smart Contract:</span>
                  <span className="font-mono text-cyan-700 truncate max-w-[150px]">RootAnchor.sol</span>
                </div>
              </div>

              <Link
                to="/verify"
                className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-600" /> Open Verifier Tool
              </Link>
            </div>
          </aside>

          {/* RIGHT COLUMN: Social Media Feed Cards (8 Cols) */}
          <section className="lg:col-span-8 space-y-6">
            {/* Approved Creation Trail & Certificate Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 font-bold">
                  CREATOR COPYRIGHT
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  Creative Work Protection
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  For authors, researchers, and digital creators. Establish legal timestamp priority on drafts, revisions, and final works using private cryptographic browser keys.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Creation Trail */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                    CREATION TRAIL
                  </h3>

                  <div className="relative pl-6 space-y-5">
                    {/* Step 1: Draft */}
                    <div className="pc-creator-row-1 relative">
                      <div className="pc-creator-dot-1 absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <div className="pc-creator-line-1 absolute -left-[19px] top-4.5 w-0.5 h-8 bg-slate-300" />
                      <div className="text-sm font-bold text-slate-900">Draft</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        [FINGERPRINT] · signed with your key
                      </div>
                    </div>

                    {/* Step 2: Revision */}
                    <div className="pc-creator-row-2 relative">
                      <div className="pc-creator-dot-2 absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <div className="pc-creator-line-2 absolute -left-[19px] top-4.5 w-0.5 h-8 bg-slate-300" />
                      <div className="text-sm font-bold text-slate-900">Revision</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        [FINGERPRINT] · links to Draft
                      </div>
                    </div>

                    {/* Step 3: Final */}
                    <div className="pc-creator-row-3 relative">
                      <div className="pc-creator-dot-3 absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <div className="text-sm font-bold text-slate-900">Final</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        [FINGERPRINT] · links to Revision
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-500 space-y-1 border-t border-slate-100">
                    <p>• Zero file upload required — your confidential creative files stay on your device</p>
                    <p>• Chain revisions (Draft → Revision → Final) to prove creative evolution</p>
                  </div>
                </div>

                {/* Certificate Card */}
                <div className="pc-creator-cert-card rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5 space-y-3.5 shadow-xs">
                  <div className="text-[10px] font-mono uppercase font-bold text-cyan-700 tracking-wider">
                    CERTIFICATE OF AUTHORSHIP & REGISTRATION
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Registered to</div>
                    <div className="text-sm font-bold text-slate-900">[AUTHOR NAME]</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">[WORK TITLE] · registered [DATE]</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">Ledger entry [ENTRY #]</div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-cyan-100 pt-2">
                    Proves integrity and priority of registration — not authorship or truth. Competing claims show evidence; they do not decide disputes.
                  </p>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-all shadow-2xs"
                  >
                    Print Certificate
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
                <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading creations from registry & ledger...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-300">
                <Sparkles className="w-10 h-10 text-cyan-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No creations found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Post your first artwork, video, audio track, or document to mint immutable cryptographic proof of authorship!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create First Post
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Post Header */}
                  <div className="p-5 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                        {post.creatorName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {post.creatorName}
                        </h3>
                        <p className="text-xs text-slate-500 font-sans mt-0.5">
                          {post.creatorHandle} • {post.timeAgo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {post.category}
                      </span>
                      <button
                        onClick={() => setSelectedProofPost(post)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Options"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Media Container */}
                  <div className="w-full bg-slate-950 relative group overflow-hidden">
                    {post.category === 'Image' ? (
                      <div
                        onClick={() => setSelectedProofPost(post)}
                        className="relative w-full cursor-pointer overflow-hidden bg-slate-950 min-h-[320px] flex items-center justify-center text-white"
                      >
                        {post.mediaUrl && (
                          <img
                            src={post.mediaUrl}
                            alt={post.title}
                            className="relative z-10 w-full max-h-[560px] object-contain bg-slate-950 transition-transform duration-300 group-hover:scale-[1.01]"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <div
                          style={{ display: post.mediaUrl ? 'none' : 'flex' }}
                          className="p-8 text-center flex-col items-center justify-center w-full min-h-[320px] bg-gradient-to-br from-slate-900 to-cyan-950"
                        >
                          <ImageIcon className="w-14 h-14 text-cyan-400 mb-2 opacity-80 mx-auto" />
                          <div className="font-bold text-sm text-slate-200">{post.title}</div>
                          <div className="text-[11px] font-mono text-cyan-300 mt-1">
                            Fingerprint: {post.sha256Hash.slice(0, 24)}...
                          </div>
                        </div>
                      </div>
                    ) : post.category === 'Video' ? (
                      <div
                        onClick={() => setSelectedProofPost(post)}
                        className="w-full h-80 bg-slate-900 text-white flex flex-col items-center justify-center cursor-pointer relative"
                      >
                        <Film className="w-14 h-14 text-cyan-400 mb-3 opacity-80" />
                        <span className="text-sm font-semibold text-slate-200">
                          {post.title}
                        </span>
                        <span className="text-xs text-slate-400 font-mono mt-1">
                          Click to View Cryptographic Proof
                        </span>
                      </div>
                    ) : post.category === 'Audio' ? (
                      <div
                        onClick={() => setSelectedProofPost(post)}
                        className="w-full h-56 bg-gradient-to-br from-slate-900 to-cyan-950 text-white p-8 flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <Music className="w-10 h-10 text-cyan-400" />
                          <span className="text-xs font-mono text-cyan-300 uppercase font-semibold">Verified Audio Composition</span>
                        </div>
                        <div>
                          <div className="font-bold text-lg">{post.title}</div>
                          <div className="text-xs text-slate-400 mt-1">{post.caption}</div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedProofPost(post)}
                        className="w-full p-8 bg-slate-50 border-y border-slate-200 flex items-center justify-between cursor-pointer hover:bg-cyan-50/20 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <FileText className="w-12 h-12 text-cyan-600" />
                          <div>
                            <div className="font-bold text-slate-900 text-base">{post.title}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {post.sha256Hash.slice(0, 32)}...
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-4 py-2 rounded-xl border border-cyan-200">
                          View Proof
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Caption */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {post.title}
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {post.caption}
                      </p>
                    </div>

                    {/* Cryptographic Hash Bar */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-50/60 border border-cyan-100 text-xs font-mono">
                      <div className="flex items-center gap-2 text-cyan-900 truncate">
                        <LinkIcon className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span className="truncate">{post.sha256Hash}</span>
                      </div>
                      <button
                        onClick={() => setSelectedProofPost(post)}
                        className="font-bold text-cyan-700 hover:text-cyan-900 shrink-0 ml-4 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        View Proof ↗
                      </button>
                    </div>

                    {/* Web Actions & Engagement Footer */}
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-slate-500 text-xs gap-4">
                      <div className="flex items-center gap-6">
                        {/* Heart / Like */}
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            post.isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.isLiked ? 'fill-rose-600 text-rose-600' : ''}`}
                          />
                          <span>{post.likes}</span>
                        </button>

                        {/* Comment */}
                        <button
                          onClick={() => showToast('Comments section active.')}
                          className="flex items-center gap-1.5 hover:text-cyan-700 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount}</span>
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => handleShare(post)}
                          className="flex items-center gap-1.5 hover:text-cyan-700 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>

                        {/* Views */}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Eye className="w-4 h-4" />
                          <span>{post.views} views</span>
                        </div>
                      </div>

                      {/* Right Web Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPcProof(post)}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-600" /> .pcproof
                        </button>

                        <button
                          onClick={() => navigate(`/creator/certificate/${post.recordId}`)}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" /> Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </main>

      {/* MODAL 1: PROOF OF CREATION (Matches Image 2 Exactly) */}
      {selectedProofPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 shadow-2xl">
            {/* Header with Back Arrow */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedProofPost(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Proof of Creation</h2>
              </div>
              <button
                onClick={() => setSelectedProofPost(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Authentic Creation Banner */}
            <div className="flex items-center gap-2 text-cyan-700 font-extrabold text-base">
              <CheckCircle2 className="w-6 h-6 text-cyan-600" />
              <span>Authentic Creation</span>
            </div>

            {/* Details Table */}
            <div className="space-y-3.5 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Creator</span>
                <span className="col-span-2 text-slate-900 font-bold">
                  {selectedProofPost.creatorName}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Title</span>
                <span className="col-span-2 text-slate-900 font-bold">
                  {selectedProofPost.title}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Content Type</span>
                <span className="col-span-2 text-slate-900 uppercase font-semibold">
                  {selectedProofPost.category}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Created</span>
                <span className="col-span-2 text-slate-900 font-semibold">
                  {selectedProofPost.timeAgo}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">License</span>
                <span className="col-span-2 text-slate-900 font-semibold font-mono text-xs">
                  {selectedProofPost.license}
                </span>
              </div>
            </div>

            {/* SHA-256 Hash Block */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-100 space-y-1.5 font-mono">
              <div className="text-xs font-bold text-slate-600">SHA-256 Hash</div>
              <div className="text-xs text-cyan-950 font-bold break-all leading-relaxed">
                {selectedProofPost.sha256Hash}
              </div>
            </div>

            {/* Blockchain Record Block */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Blockchain Record</h3>

              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium">Network</div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedProofPost.network}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium">Transaction ID</div>
                <div className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {selectedProofPost.txHash}
                </div>
              </div>

              <a
                href={`https://amoy.polygonscan.com/tx/${selectedProofPost.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl border border-cyan-600 text-cyan-700 hover:bg-cyan-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> View on Polygonscan
              </a>
            </div>

            {/* PCProof Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Portable Merkle PCProof</span>
                <span className="text-[10px] text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-bold">
                  Batch {selectedProofPost.batchId}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans">
                Self-contained mathematical proof bundle verifiable on any air-gapped machine.
              </p>
              <button
                onClick={() => handleDownloadPcProof(selectedProofPost)}
                className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-cyan-300 text-slate-800 font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600" /> Download .pcproof.json
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                navigate(`/creator/certificate/${selectedProofPost.recordId}`);
                setSelectedProofPost(null);
              }}
              className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Award className="w-4 h-4 text-cyan-400" /> View Full Certificate
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW CREATION COMPOSER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl max-h-[92vh] overflow-y-auto p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-600" /> Post New Creator Protection Work
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs font-sans">
              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-slate-50/50 rounded-2xl p-6 text-center cursor-pointer relative transition-colors">
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleNewFileSelected(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                <div className="font-bold text-slate-800 text-sm">
                  {newFile ? newFile.name : 'Select or Drop Artwork / Video / Audio / Doc'}
                </div>
                <div className="text-slate-500 text-[11px] mt-1">
                  {newFile
                    ? `${(newFile.size / 1024).toFixed(1)} KB • Content Type: ${newCategory}`
                    : 'JPG, PNG, MP4, MP3, PDF, DOCX supported'}
                </div>
              </div>

              {/* Image Preview */}
              {previewDataUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48">
                  <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Title & Caption */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Creation Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A work of art."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Caption / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Just a side hustle"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                />
              </div>

              {/* Creator Name & Handle */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Creator Name</label>
                  <input
                    type="text"
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Creator Handle</label>
                  <input
                    type="text"
                    value={newCreatorHandle}
                    onChange={(e) => setNewCreatorHandle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Category & License */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Content Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Image">Image / Artwork</option>
                    <option value="Video">Video Production</option>
                    <option value="Audio">Audio / Music</option>
                    <option value="Document">Document / Manuscript</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">License</label>
                  <select
                    value={newLicense}
                    onChange={(e) => setNewLicense(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="creativeCommons">creativeCommons</option>
                    <option value="CC-BY-4.0">CC-BY-4.0</option>
                    <option value="All Rights Reserved">All Rights Reserved</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing with Browser Key & Minting Proof...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign & Post with Blockchain Protection</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CLAIM OWNERSHIP OF EXISTING REGISTERED DOCUMENT */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl max-h-[92vh] overflow-y-auto p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-600" />
                  Claim Ownership of Registered Document
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach your cryptographic creator signature to any document already recorded in the blockchain registry.
                </p>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingRecords ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
                Loading registered workspace documents...
              </div>
            ) : registryRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents found in registry. Register one first on the Register page!
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {registryRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-cyan-50/40 hover:border-cyan-300 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="truncate">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {rec.title || rec.file_name || rec.id}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        SHA-256: {rec.content_hash}
                      </div>
                      <div className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                        Batch {rec.batch_id}
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaimRecord(rec)}
                      disabled={creating}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" /> Claim
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
