import React from "react";
import { formatCurrency, formatDateTime } from "../utils/formatters";

export default function LeaderboardTable({
  quotes = [],
  onOpenSubmitModal,
  isAuctionActive = true,
}) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
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
        <h4 className="text-base font-bold text-slate-900">
          No Quotes Received Yet
        </h4>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Suppliers have not submitted quotes yet. Be the first carrier to submit a quotation.
        </p>
        <button
          onClick={() => onOpenSubmitModal && onOpenSubmitModal()}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          Submit Initial Quote
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Rank</th>
              <th className="py-3.5 px-4">Carrier / Supplier</th>
              <th className="py-3.5 px-4">Total Quote</th>
              <th className="py-3.5 px-4">Breakdown (F / O / D)</th>
              <th className="py-3.5 px-4">Transit Time</th>
              <th className="py-3.5 px-4">Validity</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {quotes.map((quote) => {
              const isL1 = quote.calculated_rank === 1;

              return (
                <tr
                  key={quote.id}
                  className={`transition-colors ${
                    isL1
                      ? "bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {isL1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-400 text-slate-950 shadow-xs">
                         L1 (Leader)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                        L{quote.calculated_rank}
                      </span>
                    )}
                  </td>

                  {/* Carrier */}
                  <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {quote.carrier_name}
                  </td>

                  {/* Total Price */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-black text-base ${
                        isL1 ? "text-amber-700" : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(quote.total_price)}
                    </span>
                  </td>

                  {/* Cost Breakdown */}
                  <td className="py-4 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                    <span title="Freight Charges" className="text-slate-700">
                      {formatCurrency(quote.freight_charges)}
                    </span>
                    <span className="text-slate-400 mx-1">+</span>
                    <span title="Origin Charges" className="text-slate-700">
                      {formatCurrency(quote.origin_charges)}
                    </span>
                    <span className="text-slate-400 mx-1">+</span>
                    <span title="Destination Charges" className="text-slate-700">
                      {formatCurrency(quote.destination_charges)}
                    </span>
                  </td>

                  {/* Transit Time */}
                  <td className="py-4 px-4 text-slate-600 text-xs font-medium whitespace-nowrap">
                    {quote.transit_time}
                  </td>

                  {/* Validity Date */}
                  <td className="py-4 px-4 text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(quote.validity_date).split(",")[0]}
                  </td>

                  {/* Submitted At */}
                  <td className="py-4 px-4 text-slate-400 text-xs whitespace-nowrap">
                    {formatDateTime(quote.submitted_at)}
                  </td>

                  {/* Quick Counter / Re-bid Action */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() =>
                        onOpenSubmitModal && onOpenSubmitModal(quote.carrier_name)
                      }
                      disabled={!isAuctionActive}
                      title={`Submit revised counter-quote as ${quote.carrier_name}`}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Re-bid ➔
                    </button>
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
