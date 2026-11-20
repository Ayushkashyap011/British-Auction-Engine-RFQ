import React, { useState } from "react";

export default function RFQCreateModal({ isOpen, onClose, onCreated, api }) {
  const [referenceId, setReferenceId] = useState("");
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Default times: Start (now), Close (+15 mins), Forced Close (+45 mins)
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
        reference_id: referenceId.trim(),
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
    const rand = Math.floor(100 + Math.random() * 900);
    setReferenceId(`RFQ-2026-SEA-ROT-${rand}`);
    setTitle("Ocean FCL (2x 40ft) - Automotive Parts Consignment");
    setOrigin("Nhava Sheva Port, Mumbai (INNSA)");
    setDestination("Rotterdam Gateway (NLRTM)");
    setTriggerWindow(10);
    setExtensionDuration(5);
    setTriggerMode("L1_RANK_CHANGE");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Create New British Auction RFQ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure procurement parameters, anti-sniping window, and hard ceiling.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillQuickSample}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 rounded-lg transition"
            >
              Fill Sample
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Reference ID & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                RFQ Reference ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RFQ-2026-DEL-BOM-01"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pickup / Service Date *
              </label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Shipment Title / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ocean Freight 40ft HC Container - Pharmaceutical Cargo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Origin *
              </label>
              <input
                type="text"
                required
                placeholder="Origin Port or City"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Destination *
              </label>
              <input
                type="text"
                required
                placeholder="Destination Port or City"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Timeline Fields (Hierarchy: Start < Close < Forced Close) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Auction Schedule & Hard Ceiling
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Bid Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Bid Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-300 mb-1">
                  Forced Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={forcedBidCloseTime}
                  onChange={(e) => setForcedBidCloseTime(e.target.value)}
                  className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-2.5 py-1.5 text-xs text-rose-200 focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              <strong className="text-rose-400">Rule:</strong> Forced Bid Close Time must always be greater than Bid Close Time. The auction can never extend beyond this ceiling.
            </p>
          </div>

          {/* British Auction Options */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                British Auction Configuration
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                Enable British Auction
              </label>
            </div>

            {isBritishAuction && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Trigger Window (X mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={triggerWindow}
                    onChange={(e) => setTriggerWindow(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Activity monitored in last X mins
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Extension Duration (Y mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Minutes added per trigger
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Extension Trigger Mode *
                  </label>
                  <select
                    value={triggerMode}
                    onChange={(e) => setTriggerMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
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
                  <span className="text-[10px] text-slate-500">
                    Condition to trigger extension
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 shadow-md shadow-sky-600/30 transition"
            >
              {loading ? "Creating RFQ..." : "Create RFQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
