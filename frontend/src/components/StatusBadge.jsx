import React from "react";

export default function StatusBadge({ status, extensionCount = 0 }) {
  const normalized = (status || "ACTIVE").toUpperCase();

  const configs = {
    ACTIVE: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      label: "Active Auction",
    },
    EXTENDED: {
      bg: "bg-amber-50 text-amber-800 border-amber-300 shadow-xs",
      dot: "bg-amber-500 animate-ping",
      label: `Extended (${extensionCount}x)`,
    },
    SCHEDULED: {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
      label: "Scheduled",
    },
    CLOSED: {
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
      label: "Closed",
    },
    FORCE_CLOSED: {
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
      label: "Force Closed",
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
            normalized === "EXTENDED" ? "bg-amber-500" : current.dot
          }`}
        ></span>
      </span>
      {current.label}
    </span>
  );
}
