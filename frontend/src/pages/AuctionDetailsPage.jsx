import React, { useState, useEffect } from "react";
import StatusBadge from "../components/StatusBadge";
import CountdownTimer from "../components/CountdownTimer";
import LeaderboardTable from "../components/LeaderboardTable";
import ActivityLogTimeline from "../components/ActivityLogTimeline";
import QuoteSubmitModal from "../components/QuoteSubmitModal";
import {
  formatCurrency,
  formatDateTime,
  getTriggerModeLabel,
} from "../utils/formatters";

export default function AuctionDetailsPage({
  rfqId,
  onBack,
  api,
}) {
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Auto-refresh interval (polling for live auction updates)
  const fetchDetails = async () => {
    try {
      const data = await api.getRFQById(rfqId);
      setRfq(data);
    } catch (err) {
      setError(err.message || "Failed to load RFQ details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 4000); // Poll every 4 seconds for live room updates
    return () => clearInterval(interval);
  }, [rfqId]);

  if (loading && !rfq) {
    return (
      <div className="p-16 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800">
        Loading Auction Cockpit...
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/30 rounded-2xl">
        <p className="text-rose-400 font-semibold">{error || "RFQ not found."}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg"
        >
          Back to RFQs
        </button>
      </div>
    );
  }

  const config = rfq.config || {};
  const isAuctionActive = ["ACTIVE", "EXTENDED"].includes(
    rfq.status.toUpperCase()
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition"
        >
          ← Back to All RFQs
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge
            status={rfq.status}
            extensionCount={rfq.extension_count}
          />
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            disabled={!isAuctionActive}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-sky-600/30 transition active:scale-95"
          >
            + Submit Supplier Quote
          </button>
        </div>
      </div>

      {/* Hero Header & Countdown Cockpit */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">
            <span>{rfq.reference_id}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Pickup: {formatDateTime(rfq.pickup_date).split(",")[0]}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            {rfq.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-300">
            <span className="font-semibold">{rfq.origin}</span>
            <span className="text-sky-400 font-bold">➔</span>
            <span className="font-semibold">{rfq.destination}</span>
          </div>
        </div>

        {/* Real-time Countdown Box */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 min-w-[320px]">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Auction Closing In:
          </span>
          <CountdownTimer
            currentCloseTime={rfq.current_bid_close_time}
            forcedCloseTime={rfq.forced_bid_close_time}
            triggerWindowMinutes={config.trigger_window_minutes || 10}
            status={rfq.status}
            onExpire={fetchDetails}
          />
        </div>
      </div>

      {/* British Auction Configuration Bar */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">Trigger Window (X):</span>
          <strong className="text-slate-200 text-sm font-mono">
            Last {config.trigger_window_minutes || 10} Minutes
          </strong>
        </div>

        <div>
          <span className="text-slate-500 block">Extension Duration (Y):</span>
          <strong className="text-amber-300 text-sm font-mono">
            +{config.extension_duration_minutes || 5} Minutes
          </strong>
        </div>

        <div>
          <span className="text-slate-500 block">Extension Trigger Mode:</span>
          <strong className="text-sky-300 text-sm">
            {getTriggerModeLabel(config.trigger_mode)}
          </strong>
        </div>

        <div>
          <span className="text-slate-500 block">Forced Close Limit:</span>
          <strong className="text-rose-400 text-sm font-mono">
            {formatDateTime(rfq.forced_bid_close_time)}
          </strong>
        </div>
      </div>

      {/* Dual Pane Main Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leaderboard & Quotes (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <span>Competitive Leaderboard</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {rfq.quotes ? rfq.quotes.length : 0} quotes
              </span>
            </h3>

            {rfq.lowest_bid && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 mr-2">
                  Winning Bid (L1):
                </span>
                <span className="font-mono font-black text-amber-300 text-base">
                  {formatCurrency(rfq.lowest_bid)}
                </span>
              </div>
            )}
          </div>

          <LeaderboardTable
            quotes={rfq.quotes}
            onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          />
        </div>

        {/* Right Column: Real-time Activity Log (1/3 width) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200">
              Auction Audit Trail
            </h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-lg">
            <ActivityLogTimeline logs={rfq.activity_logs} />
          </div>
        </div>
      </div>

      {/* Quote Submission Modal */}
      <QuoteSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        rfq={rfq}
        api={api}
        onSubmitSuccess={() => {
          fetchDetails();
        }}
      />
    </div>
  );
}
