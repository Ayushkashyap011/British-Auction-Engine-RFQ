import React from "react";
import { formatTimeOnly, formatDateTime } from "../utils/formatters";

export default function ActivityLogTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
        No auction activity recorded yet.
      </div>
    );
  }

  const getEventBadge = (type) => {
    switch (type) {
      case "AUCTION_EXTENDED":
        return {
          icon: "⏰",
          color: "border-amber-500/40 bg-amber-500/10 text-amber-300",
          title: "Auction Extended",
        };
      case "EXTENSION_CLAMPED":
        return {
          icon: "🛡️",
          color: "border-rose-500/40 bg-rose-500/10 text-rose-300",
          title: "Ceiling Clamped",
        };
      case "BID_SUBMITTED":
        return {
          icon: "💼",
          color: "border-sky-500/40 bg-sky-500/10 text-sky-300",
          title: "Bid Received",
        };
      case "RFQ_CREATED":
        return {
          icon: "🚀",
          color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
          title: "Auction Initialized",
        };
      case "AUCTION_CLOSED":
      case "AUCTION_FORCE_CLOSED":
        return {
          icon: "🏁",
          color: "border-slate-600/40 bg-slate-800 text-slate-300",
          title: "Auction Concluded",
        };
      default:
        return {
          icon: "ℹ️",
          color: "border-slate-700 bg-slate-800/40 text-slate-300",
          title: type,
        };
    }
  };

  return (
    <div className="flow-root max-h-[460px] overflow-y-auto pr-2 space-y-3">
      {logs.map((log, index) => {
        const badge = getEventBadge(log.event_type);
        const hasTimeExtension =
          log.previous_close_time &&
          log.new_close_time &&
          log.previous_close_time !== log.new_close_time;

        return (
          <div
            key={log.id || index}
            className={`p-3.5 rounded-xl border transition-all text-xs ${badge.color}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <span>{badge.icon}</span>
                <span>{badge.title}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatTimeOnly(log.created_at)}
              </span>
            </div>

            <p className="text-slate-200 leading-relaxed font-sans">
              {log.message}
            </p>

            {hasTimeExtension && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">
                  Prior Close:{" "}
                  <span className="line-through text-slate-400">
                    {formatTimeOnly(log.previous_close_time)}
                  </span>
                </span>
                <span className="text-emerald-400 font-bold">
                  ➔ New Close: {formatTimeOnly(log.new_close_time)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
