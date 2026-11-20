import React, { useState } from "react";
import StatusBadge from "../components/StatusBadge";
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
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <span className="text-xs text-slate-500 font-medium">Total RFQs</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {rfqs.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Procurement auctions in system
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <span className="text-xs text-slate-500 font-medium">
            Active / Live Bidding
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
            {activeCount}
            {activeCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Open for carrier quote submissions
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          <span className="text-xs text-slate-500 font-medium">
            Extended Auctions
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {extendedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Soft extensions triggered via anti-sniping
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
          <span className="text-xs text-slate-500 font-medium">
            Total Competing Carriers
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {totalBids}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Unique quotes across all RFQs
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Reference ID, Route, or Cargo title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXTENDED">Extended</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CLOSED">Closed</option>
            <option value="FORCE_CLOSED">Force Closed</option>
          </select>

          <button
            onClick={onRefresh}
            title="Refresh List"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs transition"
          >
            ↻
          </button>
        </div>
      </div>

      {/* RFQ Listing Table */}
      {loading ? (
        <div className="p-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
          Loading British Auction RFQs...
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <p className="text-slate-500 text-sm">No matching RFQs found.</p>
          <button
            onClick={onOpenCreateModal}
            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Create First RFQ
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">RFQ Reference ID</th>
                  <th className="py-3 px-4">Route & Service Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Lowest Bid (L1)</th>
                  <th className="py-3 px-4">Current Close Time</th>
                  <th className="py-3 px-4">Forced Ceiling</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRfqs.map((rfq) => {
                  return (
                    <tr
                      key={rfq.id}
                      onClick={() => onSelectRFQ(rfq.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* RFQ Reference ID & Title */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-indigo-600 group-hover:text-indigo-700">
                          {rfq.reference_id}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                          {rfq.title}
                        </div>
                      </td>

                      {/* Route & Pickup */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                          <span>{rfq.origin}</span>
                          <span className="text-indigo-400 font-bold">➔</span>
                          <span>{rfq.destination}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Pickup: {formatDateTime(rfq.pickup_date).split(",")[0]}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={rfq.status}
                          extensionCount={rfq.extension_count}
                        />
                      </td>

                      {/* Current Lowest Bid */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {rfq.lowest_bid ? (
                          <div>
                            <span className="font-mono font-black text-slate-900 text-base">
                              {formatCurrency(rfq.lowest_bid)}
                            </span>
                            <div className="text-[11px] text-slate-500 font-medium">
                              by {rfq.lowest_bidder}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No bids yet
                          </span>
                        )}
                      </td>

                      {/* Current Close Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-700 font-semibold">
                          {formatDateTime(rfq.current_bid_close_time)}
                        </div>
                        {rfq.extension_count > 0 && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            Extended +{rfq.extension_count * (rfq.config?.extension_duration_minutes || 5)}m
                          </div>
                        )}
                      </td>

                      {/* Forced Close Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-rose-600 font-medium">
                          {formatDateTime(rfq.forced_bid_close_time)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Hard limit
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRFQ(rfq.id);
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white rounded-xl text-xs font-semibold transition shadow-xs"
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
