import React, { useState } from "react";

export default function RFQCreateModal({ isOpen, onClose, onCreated, api }) {
  const [showCustomId, setShowCustomId] = useState(false);
  const [customReferenceId, setCustomReferenceId] = useState("");
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const now = new Date();
  const formatForDatetimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  const [bidStartTime, setBidStartTime] = useState(() =>
    formatForDatetimeLocal(now)
  );
  const [bidCloseTime, setBidCloseTime] = useState(() => {
    const close = new Date(now.getTime() + 15 * 60 * 1000);
    return formatForDatetimeLocal(close);
  });
  const [forcedBidCloseTime, setForcedBidCloseTime] = useState(() => {
    const forced = new Date(now.getTime() + 45 * 60 * 1000);
    return formatForDatetimeLocal(forced);
  });

  // British Auction Configuration
  const [isBritishAuction, setIsBritishAuction] = useState(true);
  const [triggerWindow, setTriggerWindow] = useState(10);
  const [extensionDuration, setExtensionDuration] = useState(5);
  const [triggerMode, setTriggerMode] = useState("L1_RANK_CHANGE");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Helper to preview 3-letter codes
  const getPreviewCode = (loc) => {
    if (!loc || !loc.trim()) return "LOC";
    const match = loc.match(/\(([A-Za-z]{3,5})\)/);
    if (match) return match[1].slice(-3).toUpperCase();
    const clean = loc.replace(/[^A-Za-z]/g, "").toUpperCase();
    return clean.slice(0, 3) || "LOC";
  };

  const currentYear = new Date().getFullYear();
  const previewId = `RFQ-${currentYear}-${getPreviewCode(origin)}-${getPreviewCode(destination)}-XXXX`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const start = new Date(bidStartTime);
    const close = new Date(bidCloseTime);
    const forced = new Date(forcedBidCloseTime);

    // Assignment Validation Rules
    if (start >= close) {
      setError("Bid Close Time must be strictly later than Bid Start Time.");
      return;
    }
    if (close >= forced) {
      setError(
        "Validation Rule: Forced Bid Close Time must always be strictly greater than Bid Close Time."
      );
      return;
    }
    if (triggerWindow <= 0 || extensionDuration <= 0) {
      setError("Trigger Window (X) and Extension Duration (Y) must be positive integers.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        reference_id:
          showCustomId && customReferenceId.trim()
            ? customReferenceId.trim()
            : null, // Backend auto-generates RFQ-YYYY-ORG-DST-XXXX
        title: title.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        pickup_date: new Date(pickupDate).toISOString(),
        bid_start_time: start.toISOString(),
        original_bid_close_time: close.toISOString(),
        forced_bid_close_time: forced.toISOString(),
        config: {
          is_british_auction: isBritishAuction,
          trigger_window_minutes: parseInt(triggerWindow),
          extension_duration_minutes: parseInt(extensionDuration),
          trigger_mode: triggerMode,
        },
      };

      const newRfq = await api.createRFQ(payload);
      if (onCreated) {
        onCreated(newRfq);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create RFQ.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillQuickSample = () => {
    setTitle("Ocean FCL (2x 40ft) - Automotive Parts Consignment");
    setOrigin("Chennai Port (INMAA)");
    setDestination("Mormugao Port, Goa (INMRM)");
    setTriggerWindow(10);
    setExtensionDuration(5);
    setTriggerMode("L1_RANK_CHANGE");
    setShowCustomId(false);
    setCustomReferenceId("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Create British Auction RFQ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracking ID is automatically generated following enterprise logistics nomenclature.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillQuickSample}
              className="text-xs text-indigo-700 hover:text-indigo-800 font-semibold px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg transition"
            >
              Fill Sample
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Auto-Generated Reference ID Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-sky-50/50 to-indigo-50/80 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                ⚡
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Auto-Generated Reference ID
                </span>
                <span className="font-mono font-black text-sm text-indigo-700">
                  {showCustomId && customReferenceId.trim()
                    ? customReferenceId.trim()
                    : previewId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCustomId(!showCustomId)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 transition"
            >
              {showCustomId ? "Use Auto-Generated ID" : "Custom PO / ID"}
            </button>
          </div>

          {/* Optional Custom Reference ID Input */}
          {showCustomId && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Reference ID / Internal ERP PO Number
              </label>
              <input
                type="text"
                placeholder="e.g. PO-2026-CHN-GOA-001"
                value={customReferenceId}
                onChange={(e) => setCustomReferenceId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          {/* Title & Pickup Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shipment Title / Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ocean Freight 40ft HC Container - Pharmaceutical Cargo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pickup / Service Date *
              </label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Origin & Destination (Updates auto-preview in real-time) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origin *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chennai Port (INMAA)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Code: <strong className="text-indigo-600 font-mono">{getPreviewCode(origin)}</strong>
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mormugao, Goa (INMRM)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Code: <strong className="text-indigo-600 font-mono">{getPreviewCode(destination)}</strong>
              </span>
            </div>
          </div>

          {/* Timeline Schedule Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Auction Schedule & Hard Ceiling
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bid Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bid Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-600 mb-1">
                  Forced Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={forcedBidCloseTime}
                  onChange={(e) => setForcedBidCloseTime(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-xl px-2.5 py-1.5 text-xs text-rose-700 font-mono font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              <strong className="text-rose-600">Rule:</strong> Forced Bid Close Time must always be greater than Bid Close Time. The auction can never extend beyond this ceiling.
            </p>
          </div>

          {/* British Auction Options */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                British Auction Configuration
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                Enable British Auction
              </label>
            </div>

            {isBritishAuction && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Trigger Window (X mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={triggerWindow}
                    onChange={(e) => setTriggerWindow(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">
                    Monitored in last X mins
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Extension Duration (Y mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">
                    Minutes added per trigger
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Extension Trigger Mode *
                  </label>
                  <select
                    value={triggerMode}
                    onChange={(e) => setTriggerMode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="L1_RANK_CHANGE">
                      Lowest Bidder (L1) Change
                    </option>
                    <option value="ANY_RANK_CHANGE">
                      Any Supplier Rank Change
                    </option>
                    <option value="ANY_BID">
                      Any Bid in Window
                    </option>
                  </select>
                  <span className="text-[10px] text-slate-400">
                    Condition to trigger extension
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 shadow-sm shadow-indigo-600/25 transition"
            >
              {loading ? "Creating RFQ..." : "Create RFQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
