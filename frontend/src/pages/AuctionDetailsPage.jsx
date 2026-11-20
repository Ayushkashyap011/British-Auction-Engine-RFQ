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
  const [prefilledCarrier, setPrefilledCarrier] = useState("");

  const handleOpenSubmit = (carrier = "") => {
    setPrefilledCarrier(carrier);
    setIsSubmitModalOpen(true);
  };

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
    const interval = setInterval(fetchDetails, 4000);
    return () => clearInterval(interval);
  }, [rfqId]);

  if (loading && !rfq) {
    return (
      <div className="p-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
        Loading Auction Cockpit...
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl shadow-xs">
        <p className="text-rose-700 font-semibold">{error || "RFQ not found."}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          ← Back to All RFQs
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge
            status={rfq.status}
            extensionCount={rfq.extension_count}
          />
          <button
            onClick={() => handleOpenSubmit("")}
            disabled={!isAuctionActive}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-600/25 transition active:scale-95"
          >
            + Submit Supplier Quote
          </button>
        </div>
      </div>

      {/* Hero Header & Countdown Cockpit */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>

        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1.5">
            <span>{rfq.reference_id}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-sans">
              Pickup Date: {formatDateTime(rfq.pickup_date).split(",")[0]}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {rfq.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-medium text-slate-600">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
              Origin: {rfq.origin}
            </span>
            <span className="text-indigo-500 font-bold">➔</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
              Destination: {rfq.destination}
            </span>
          </div>
        </div>

        {/* Real-time Countdown Box */}
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 min-w-[320px] shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-medium block">
            Trigger Window (X):
          </span>
          <strong className="text-slate-900 text-sm font-mono mt-0.5 block">
            Last {config.trigger_window_minutes || 10} Minutes
          </strong>
          <span className="text-[10px] text-slate-400">Activity monitored before close</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-medium block">
            Extension Duration (Y):
          </span>
          <strong className="text-amber-700 text-sm font-mono mt-0.5 block">
            +{config.extension_duration_minutes || 5} Minutes Added
          </strong>
          <span className="text-[10px] text-slate-400">Time added per trigger</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-medium block">
            Extension Trigger Mode:
          </span>
          <strong className="text-indigo-700 text-sm mt-0.5 block">
            {getTriggerModeLabel(config.trigger_mode)}
          </strong>
          <span className="text-[10px] text-slate-400">Extension activation rule</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-medium block">
            Forced Close Hard Ceiling:
          </span>
          <strong className="text-rose-600 text-sm font-mono mt-0.5 block">
            {formatDateTime(rfq.forced_bid_close_time)}
          </strong>
          <span className="text-[10px] text-slate-400">Unbreachable hard deadline</span>
        </div>
      </div>

      {/* Dual Pane Main Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leaderboard & Quotes (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Competitive Leaderboard</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                {rfq.quotes ? rfq.quotes.length : 0} competing suppliers
              </span>
            </h3>

            {rfq.lowest_bid && (
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">
                  Winning Bid (L1):
                </span>
                <span className="font-mono font-black text-emerald-700 text-lg">
                  {formatCurrency(rfq.lowest_bid)}
                </span>
              </div>
            )}
          </div>

          <LeaderboardTable
            quotes={rfq.quotes}
            onOpenSubmitModal={handleOpenSubmit}
            isAuctionActive={isAuctionActive}
          />
        </div>

        {/* Right Column: Real-time Activity Log (1/3 width) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Auction Audit Trail
            </h3>
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
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
        initialCarrier={prefilledCarrier}
        onSubmitSuccess={() => {
          fetchDetails();
        }}
      />
    </div>
  );
}
