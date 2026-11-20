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
    const interval = setInterval(fetchRFQs, 6000); // Background refresh
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onNavigateHome={handleBackToList}
      />

      {/* Backend Connectivity Notice (if disconnected) */}
      {!backendHealthy && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-center text-xs text-rose-300 font-semibold">
          ⚠️ Cannot connect to FastAPI backend at http://localhost:8000. Please ensure the backend server is running.
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
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>
          British Auction Engine in RFQ System • Full Stack Engineering Assessment (GoComet)
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-600">
          Tech Stack: React.js • FastAPI • SQLAlchemy • MySQL
        </p>
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
