import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Verify } from './pages/Verify';
import { Dashboard } from './pages/proofchain/Dashboard';
import { Register } from './pages/proofchain/Register';
import { Batches } from './pages/proofchain/Batches';
import { BatchDetail } from './pages/proofchain/BatchDetail';
import { RecordDetail } from './pages/proofchain/RecordDetail';
import { Audit } from './pages/proofchain/Audit';
import { TamperLab } from './pages/proofchain/TamperLab';
import { CreatorHome } from './pages/creator/Home';
import { NewWork } from './pages/creator/NewWork';
import { WorkDetail } from './pages/creator/WorkDetail';
import { Certificate } from './pages/creator/Certificate';

const RootRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-mono text-sm">
        Loading ProofChain authentication...
      </div>
    );
  }
  return isAuthenticated ? <Landing /> : <Login />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-mono text-sm">
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-ink-deep text-silver flex flex-col font-sans selection:bg-cerulean selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Start of App: Login page if unauthenticated, Landing page if authenticated */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/home" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Standalone Public Verifier (Always accessible without login per Section 0 R-A) */}
          <Route path="/verify" element={<Verify />} />

          {/* Side 1: ProofChain Issuer Routes (Register requires login) */}
          <Route path="/proofchain" element={<Dashboard />} />
          <Route
            path="/proofchain/register"
            element={
              <ProtectedRoute>
                <Register />
              </ProtectedRoute>
            }
          />
          <Route path="/proofchain/batches" element={<Batches />} />
          <Route path="/proofchain/batches/:id" element={<BatchDetail />} />
          <Route path="/proofchain/records/:id" element={<RecordDetail />} />
          <Route path="/proofchain/audit" element={<Audit />} />
          <Route path="/proofchain/tamper-lab" element={<TamperLab />} />

          {/* Side 2: CreatorProof Creator Routes (New work requires login) */}
          <Route path="/creator" element={<CreatorHome />} />
          <Route
            path="/creator/new"
            element={
              <ProtectedRoute>
                <NewWork />
              </ProtectedRoute>
            }
          />
          <Route path="/creator/works/:id" element={<WorkDetail />} />
          <Route path="/creator/certificate/:id" element={<Certificate />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
