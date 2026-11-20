import React from "react";

export default function StatusBadge({ status, extensionCount = 0 }) {
  const normalized = (status || "ACTIVE").toUpperCase();

  const configs = {
    ACTIVE: {
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400",
      label: "Active Auction",
    },
    EXTENDED: {
      bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400 animate-ping",
      label: `Extended (${extensionCount}x)`,
    },
    SCHEDULED: {
      bg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      dot: "bg-sky-400",
      label: "Scheduled",
    },
    CLOSED: {
      bg: "bg-slate-700/50 text-slate-300 border-slate-600/50",
      dot: "bg-slate-500",
      label: "Closed",
    },
    FORCE_CLOSED: {
      bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      dot: "bg-rose-500",
      label: "Force Closed (Ceiling Reached)",
    },
  };

  const current = configs[normalized] || configs.ACTIVE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg}`}
    >
      <span className="relative flex h-2 w-2">
        {normalized === "EXTENDED" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          ></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            normalized === "EXTENDED" ? "bg-amber-400" : current.dot
          }`}
        ></span>
      </span>
      {current.label}
    </span>
  );
}
