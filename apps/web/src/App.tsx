import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Verify } from './pages/Verify';
import { Dashboard } from './pages/proofchain/Dashboard';
import { Register } from './pages/proofchain/Register';
import { Batches } from './pages/proofchain/Batches';
import { BatchDetail } from './pages/proofchain/BatchDetail';
import { Audit } from './pages/proofchain/Audit';
import { TamperLab } from './pages/proofchain/TamperLab';
import { CreatorHome } from './pages/creator/Home';
import { NewWork } from './pages/creator/NewWork';
import { WorkDetail } from './pages/creator/WorkDetail';
import { Certificate } from './pages/creator/Certificate';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink-deep text-silver flex flex-col font-sans selection:bg-cerulean selection:text-white">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Landing */}
            <Route path="/" element={<Landing />} />

            {/* Standalone Public Verifier */}
            <Route path="/verify" element={<Verify />} />

            {/* Side 1: ProofChain Issuer Routes */}
            <Route path="/proofchain" element={<Dashboard />} />
            <Route path="/proofchain/register" element={<Register />} />
            <Route path="/proofchain/batches" element={<Batches />} />
            <Route path="/proofchain/batches/:id" element={<BatchDetail />} />
            <Route path="/proofchain/audit" element={<Audit />} />
            <Route path="/proofchain/tamper-lab" element={<TamperLab />} />

            {/* Side 2: CreatorProof Creator Routes */}
            <Route path="/creator" element={<CreatorHome />} />
            <Route path="/creator/new" element={<NewWork />} />
            <Route path="/creator/works/:id" element={<WorkDetail />} />
            <Route path="/creator/certificate/:id" element={<Certificate />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
