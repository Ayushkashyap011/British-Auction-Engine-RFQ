import React, { useState } from "react";
import { formatCurrency } from "../utils/formatters";

export default function QuoteSubmitModal({
  isOpen,
  onClose,
  rfq,
  onSubmitSuccess,
  api,
  initialCarrier = "",
}) {
  const [carrierName, setCarrierName] = useState(initialCarrier || "");
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

  React.useEffect(() => {
    if (isOpen) {
      if (initialCarrier) {
        setCarrierName(initialCarrier);
      }
      setError(null);
      setSubmissionResult(null);
    }
  }, [isOpen, initialCarrier]);

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Submit Supplier Quotation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              RFQ: <span className="font-mono text-indigo-600 font-semibold">{rfq.reference_id}</span>
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Leader Target */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
          <span className="text-slate-500 font-medium">Current L1 Target to Beat:</span>
          {currentL1 ? (
            <span className="font-black text-amber-700 font-mono text-sm">
              {formatCurrency(currentL1)} ({rfq.lowest_bidder})
            </span>
          ) : (
            <span className="text-emerald-700 font-bold">
              No bids yet (First bid gets L1)
            </span>
          )}
        </div>

        {/* Submission Result Alert */}
        {submissionResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs shadow-xs ${
              submissionResult.auction_extended
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
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
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={handleResetAndClose}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Quote Form */}
        {!submissionResult && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Carrier / Supplier Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Om Logistics, Maersk, DHL"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            {/* Price Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-mono transition"
                />
              </div>
            </div>

            {/* Total Price Calculation Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600">Total Calculated Price</span>
                <p className="text-[11px] text-slate-400">
                  Freight + Origin + Destination
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-mono font-black ${
                    isLowerThanL1 && totalPrice > 0
                      ? "text-emerald-600"
                      : "text-slate-900"
                  }`}
                >
                  {formatCurrency(totalPrice)}
                </span>
                {currentL1 && totalPrice > 0 && (
                  <p className="text-[11px] mt-0.5">
                    {isLowerThanL1 ? (
                      <span className="text-emerald-600 font-bold">
                        ★ Underbids current L1!
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Above current L1 ({formatCurrency(currentL1)})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Transit Time & Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Transit Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Days, 48 Hours"
                  value={transitTime}
                  onChange={(e) => setTransitTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Validity of Quote *
                </label>
                <input
                  type="date"
                  required
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || totalPrice <= 0}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 shadow-sm shadow-indigo-600/25 transition"
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
