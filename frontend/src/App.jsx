import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import RFQListingPage from "./pages/RFQListingPage";
import AuctionDetailsPage from "./pages/AuctionDetailsPage";
import RFQCreateModal from "./components/RFQCreateModal";
import { api } from "./api/client";

export default function App() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRFQId, setSelectedRFQId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const data = await api.getRFQs();
      setRfqs(data);
      setBackendHealthy(true);
    } catch (err) {
      console.error("Failed to load RFQs:", err);
      setBackendHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
    const interval = setInterval(fetchRFQs, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRFQ = (id) => {
    setSelectedRFQId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setSelectedRFQId(null);
    fetchRFQs();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      {/* Decorative background subtle gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-indigo-100/60 via-sky-50/40 to-transparent pointer-events-none -z-10 blur-3xl"></div>

      {/* Top Navbar */}
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onNavigateHome={handleBackToList}
      />

      {/* Backend Connectivity Notice (if disconnected) */}
      {!backendHealthy && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs text-amber-800 font-medium shadow-sm">
          ⚠️ Cannot connect to FastAPI backend at <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">http://localhost:8000</code>. Please ensure the backend server is running.
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedRFQId ? (
          <AuctionDetailsPage
            rfqId={selectedRFQId}
            onBack={handleBackToList}
            api={api}
          />
        ) : (
          <RFQListingPage
            rfqs={rfqs}
            loading={loading}
            onSelectRFQ={handleSelectRFQ}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onRefresh={fetchRFQs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-600">
            British Auction Engine in RFQ System • Full Stack Engineering Assessment
          </p>
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <span>React.js</span>
            <span>•</span>
            <span>FastAPI</span>
            <span>•</span>
            <span>MySQL</span>
          </div>
        </div>
      </footer>

      {/* Create RFQ Modal */}
      <RFQCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        api={api}
        onCreated={(newRfq) => {
          fetchRFQs();
          setSelectedRFQId(newRfq.id);
        }}
      />
    </div>
  );
}
