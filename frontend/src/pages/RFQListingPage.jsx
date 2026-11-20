import React, { useState } from "react";
import StatusBadge from "../components/StatusBadge";
import CountdownTimer from "../components/CountdownTimer";
import { formatCurrency, formatDateTime } from "../utils/formatters";

export default function RFQListingPage({
  rfqs = [],
  loading = false,
  onSelectRFQ,
  onOpenCreateModal,
  onRefresh,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredRfqs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.reference_id.toLowerCase().includes(search.toLowerCase()) ||
      rfq.title.toLowerCase().includes(search.toLowerCase()) ||
      rfq.origin.toLowerCase().includes(search.toLowerCase()) ||
      rfq.destination.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      rfq.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const activeCount = rfqs.filter((r) =>
    ["ACTIVE", "EXTENDED"].includes(r.status.toUpperCase())
  ).length;
  const extendedCount = rfqs.filter(
    (r) => r.status.toUpperCase() === "EXTENDED"
  ).length;
  const totalBids = rfqs.reduce((acc, r) => acc + (r.total_quotes_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total RFQs</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {rfqs.length}
          </div>
          <span className="text-[11px] text-slate-500">
            Procurement auctions in system
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            Active / Live Bidding
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
            {activeCount}
            {activeCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Open for carrier quote submissions
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            Extended Auctions
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {extendedCount}
          </div>
          <span className="text-[11px] text-slate-500">
            Soft extensions triggered via anti-sniping
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            Total Supplier Quotes
          </span>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            {totalBids}
          </div>
          <span className="text-[11px] text-slate-500">
            Quotes evaluated across all RFQs
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Reference ID, Route, or Cargo title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXTENDED">Extended</option>
            <option value="CLOSED">Closed</option>
            <option value="FORCE_CLOSED">Force Closed</option>
          </select>

          <button
            onClick={onRefresh}
            title="Refresh List"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs transition"
          >
            ↻
          </button>
        </div>
      </div>

      {/* RFQ Listing Table */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
          Loading British Auction RFQs...
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <p className="text-slate-400 text-sm">No matching RFQs found.</p>
          <button
            onClick={onOpenCreateModal}
            className="mt-3 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Create First RFQ
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">RFQ Name / ID</th>
                  <th className="py-3 px-4">Route & Service Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Lowest Bid (L1)</th>
                  <th className="py-3 px-4">Current Close Time</th>
                  <th className="py-3 px-4">Forced Close Ceiling</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredRfqs.map((rfq) => {
                  return (
                    <tr
                      key={rfq.id}
                      onClick={() => onSelectRFQ(rfq.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* RFQ Reference ID & Title */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-sky-400 group-hover:text-sky-300">
                          {rfq.reference_id}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                          {rfq.title}
                        </div>
                      </td>

                      {/* Route & Pickup */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs text-slate-200 font-medium">
                          {rfq.origin} ➔ {rfq.destination}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Pickup: {formatDateTime(rfq.pickup_date).split(",")[0]}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={rfq.status}
                          extensionCount={rfq.extension_count}
                        />
                      </td>

                      {/* Current Lowest Bid */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rfq.lowest_bid ? (
                          <div>
                            <span className="font-mono font-extrabold text-amber-300">
                              {formatCurrency(rfq.lowest_bid)}
                            </span>
                            <div className="text-[11px] text-slate-400">
                              by {rfq.lowest_bidder}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            No bids yet
                          </span>
                        )}
                      </td>

                      {/* Current Close Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-200">
                          {formatDateTime(rfq.current_bid_close_time)}
                        </div>
                        {rfq.extension_count > 0 && (
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                            Extended +{rfq.extension_count * (rfq.config?.extension_duration_minutes || 5)}m
                          </div>
                        )}
                      </td>

                      {/* Forced Close Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-rose-300">
                          {formatDateTime(rfq.forced_bid_close_time)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Hard limit
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRFQ(rfq.id);
                          }}
                          className="px-3 py-1.5 bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          View Cockpit ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
