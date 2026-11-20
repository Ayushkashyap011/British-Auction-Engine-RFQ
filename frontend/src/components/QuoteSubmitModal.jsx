import React, { useState } from "react";
import { formatCurrency } from "../utils/formatters";

export default function QuoteSubmitModal({
  isOpen,
  onClose,
  rfq,
  onSubmitSuccess,
  api,
}) {
  const [carrierName, setCarrierName] = useState("");
  const [freightCharges, setFreightCharges] = useState("");
  const [originCharges, setOriginCharges] = useState("");
  const [destinationCharges, setDestinationCharges] = useState("");
  const [transitTime, setTransitTime] = useState("4 Days");
  const [validityDate, setValidityDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  if (!isOpen || !rfq) return null;

  const fCharge = parseFloat(freightCharges) || 0;
  const oCharge = parseFloat(originCharges) || 0;
  const dCharge = parseFloat(destinationCharges) || 0;
  const totalPrice = fCharge + oCharge + dCharge;

  const currentL1 = rfq.lowest_bid;
  const isLowerThanL1 = currentL1 ? totalPrice < currentL1 : true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!carrierName.trim()) {
      setError("Please provide a carrier / supplier name.");
      return;
    }
    if (totalPrice <= 0) {
      setError("Total quote price must be strictly greater than $0.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSubmissionResult(null);

      const payload = {
        carrier_name: carrierName.trim(),
        freight_charges: fCharge,
        origin_charges: oCharge,
        destination_charges: dCharge,
        transit_time: transitTime.trim(),
        validity_date: new Date(validityDate).toISOString(),
      };

      const result = await api.submitQuote(rfq.id, payload);
      setSubmissionResult(result);

      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err) {
      setError(err.message || "Failed to submit quote.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmissionResult(null);
    setError(null);
    setCarrierName("");
    setFreightCharges("");
    setOriginCharges("");
    setDestinationCharges("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Submit Supplier Quotation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              RFQ: <span className="font-mono text-sky-400">{rfq.reference_id}</span>
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Leader Notice */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">Current L1 Target:</span>
          {currentL1 ? (
            <span className="font-bold text-amber-300 font-mono">
              {formatCurrency(currentL1)} ({rfq.lowest_bidder})
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">
              No bids yet (First bid gets L1)
            </span>
          )}
        </div>

        {/* Submission Result Banner */}
        {submissionResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs ${
              submissionResult.auction_extended
                ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {submissionResult.auction_extended ? (
                <>
                  <span>⏰</span>
                  <span>Auction Extended!</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Quote Recorded Successfully!</span>
                </>
              )}
            </div>
            <p className="leading-relaxed">
              {submissionResult.extension_reason ||
                "Quote submitted successfully without triggering an auction time extension."}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={handleResetAndClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Quote Form */}
        {!submissionResult && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Carrier / Supplier Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maersk Logistics, DHL Freight, Kuehne+Nagel"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Price Component Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Freight ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={freightCharges}
                  onChange={(e) => setFreightCharges(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Origin ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={originCharges}
                  onChange={(e) => setOriginCharges(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Destination ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={destinationCharges}
                  onChange={(e) => setDestinationCharges(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Computed Total Price Preview */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Total Calculated Price</span>
                <p className="text-[11px] text-slate-500">
                  Freight + Origin + Destination
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-mono font-extrabold ${
                    isLowerThanL1 && totalPrice > 0
                      ? "text-emerald-400"
                      : "text-slate-100"
                  }`}
                >
                  {formatCurrency(totalPrice)}
                </span>
                {currentL1 && totalPrice > 0 && (
                  <p className="text-[11px] mt-0.5">
                    {isLowerThanL1 ? (
                      <span className="text-emerald-400 font-semibold">
                        ★ Underbids current L1!
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Higher than current L1 ({formatCurrency(currentL1)})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Transit Time & Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Transit Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 48 Hours, 18 Days"
                  value={transitTime}
                  onChange={(e) => setTransitTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Validity of Quote *
                </label>
                <input
                  type="date"
                  required
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || totalPrice <= 0}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 shadow-md shadow-sky-600/30 transition"
              >
                {loading ? "Submitting..." : "Submit Quote & Evaluate"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
