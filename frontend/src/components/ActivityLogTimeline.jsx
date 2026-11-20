import React from "react";
import { formatTimeOnly } from "../utils/formatters";

export default function ActivityLogTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        No auction activity recorded yet.
      </div>
    );
  }

  const getEventBadge = (type) => {
    switch (type) {
      case "AUCTION_EXTENDED":
        return {
          icon: "⏰",
          color: "border-amber-200 bg-amber-50/70 text-amber-900",
          title: "Auction Extended",
        };
      case "EXTENSION_CLAMPED":
        return {
          icon: "🛡️",
          color: "border-rose-200 bg-rose-50/70 text-rose-900",
          title: "Ceiling Clamped",
        };
      case "BID_SUBMITTED":
        return {
          icon: "💼",
          color: "border-blue-200 bg-blue-50/70 text-blue-900",
          title: "Bid Received",
        };
      case "RFQ_CREATED":
        return {
          icon: "🚀",
          color: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
          title: "Auction Initialized",
        };
      case "AUCTION_CLOSED":
      case "AUCTION_FORCE_CLOSED":
        return {
          icon: "🏁",
          color: "border-slate-200 bg-slate-100 text-slate-700",
          title: "Auction Concluded",
        };
      default:
        return {
          icon: "ℹ️",
          color: "border-slate-200 bg-slate-50 text-slate-800",
          title: type,
        };
    }
  };

  return (
    <div className="flow-root max-h-[460px] overflow-y-auto pr-1 space-y-3">
      {logs.map((log, index) => {
        const badge = getEventBadge(log.event_type);
        const hasTimeExtension =
          log.previous_close_time &&
          log.new_close_time &&
          log.previous_close_time !== log.new_close_time;

        return (
          <div
            key={log.id || index}
            className={`p-3.5 rounded-xl border transition-all text-xs shadow-2xs ${badge.color}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span>{badge.icon}</span>
                <span>{badge.title}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono font-medium">
                {formatTimeOnly(log.created_at)}
              </span>
            </div>

            <p className="text-slate-700 leading-relaxed font-sans text-xs">
              {log.message}
            </p>

            {hasTimeExtension && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">
                  Prior Close:{" "}
                  <span className="line-through text-slate-400">
                    {formatTimeOnly(log.previous_close_time)}
                  </span>
                </span>
                <span className="text-emerald-700 font-bold">
                  ➔ New: {formatTimeOnly(log.new_close_time)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
