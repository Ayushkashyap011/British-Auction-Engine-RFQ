import React from "react";
import { formatCurrency, formatDateTime } from "../utils/formatters";

export default function LeaderboardTable({ quotes = [], onOpenSubmitModal }) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-slate-200">
          No Quotes Received Yet
        </h4>
        <p className="text-sm text-slate-400 max-w-sm mt-1">
          Suppliers have not submitted any quotes for this British Auction. Be
          the first carrier to submit a quotation.
        </p>
        <button
          onClick={onOpenSubmitModal}
          className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Submit Initial Quote
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Carrier / Supplier</th>
              <th className="py-3 px-4">Total Quote</th>
              <th className="py-3 px-4">Breakdown (F / O / D)</th>
              <th className="py-3 px-4">Transit Time</th>
              <th className="py-3 px-4">Validity</th>
              <th className="py-3 px-4">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {quotes.map((quote) => {
              const isL1 = quote.calculated_rank === 1;

              return (
                <tr
                  key={quote.id}
                  className={`transition-colors ${
                    isL1
                      ? "bg-amber-500/10 hover:bg-amber-500/15"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isL1 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20">
                        🏆 L1 (Leader)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-slate-400 bg-slate-800">
                        L{quote.calculated_rank}
                      </span>
                    )}
                  </td>

                  {/* Carrier */}
                  <td className="py-3.5 px-4 font-semibold text-slate-100 whitespace-nowrap">
                    {quote.carrier_name}
                  </td>

                  {/* Total Price */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-bold text-base ${
                        isL1 ? "text-amber-300" : "text-slate-200"
                      }`}
                    >
                      {formatCurrency(quote.total_price)}
                    </span>
                  </td>

                  {/* Cost Breakdown */}
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                    <span title="Freight Charges">
                      {formatCurrency(quote.freight_charges)}
                    </span>
                    <span className="text-slate-600 mx-1">+</span>
                    <span title="Origin Charges">
                      {formatCurrency(quote.origin_charges)}
                    </span>
                    <span className="text-slate-600 mx-1">+</span>
                    <span title="Destination Charges">
                      {formatCurrency(quote.destination_charges)}
                    </span>
                  </td>

                  {/* Transit Time */}
                  <td className="py-3.5 px-4 text-slate-300 text-xs whitespace-nowrap">
                    {quote.transit_time}
                  </td>

                  {/* Validity Date */}
                  <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                    {formatDateTime(quote.validity_date).split(",")[0]}
                  </td>

                  {/* Submitted At */}
                  <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(quote.submitted_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
