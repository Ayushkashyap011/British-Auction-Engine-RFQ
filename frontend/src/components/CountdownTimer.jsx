import React, { useState, useEffect } from "react";
import { getTimeRemaining, formatTimeOnly } from "../utils/formatters";

export default function CountdownTimer({
  currentCloseTime,
  forcedCloseTime,
  triggerWindowMinutes = 10,
  status = "ACTIVE",
  onExpire,
}) {
  const [remaining, setRemaining] = useState(() =>
    getTimeRemaining(currentCloseTime)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = getTimeRemaining(currentCloseTime);
      setRemaining(rem);

      if (rem.isExpired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentCloseTime, onExpire]);

  const isClosed =
    status === "CLOSED" || status === "FORCE_CLOSED" || remaining.isExpired;

  // Check if remaining time is within the trigger window (X minutes)
  const isInsideTriggerWindow =
    !isClosed &&
    remaining.totalSeconds > 0 &&
    remaining.totalSeconds <= triggerWindowMinutes * 60;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div
          className={`font-mono text-2xl md:text-3xl font-extrabold tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
            isClosed
              ? "bg-slate-800/80 text-slate-400 border-slate-700"
              : isInsideTriggerWindow
              ? "bg-amber-950/40 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/20 animate-pulse"
              : "bg-sky-950/40 text-sky-300 border-sky-500/40"
          }`}
        >
          {isClosed ? "00:00:00" : remaining.text}
        </div>

        {isInsideTriggerWindow && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 rounded text-amber-300 text-xs font-bold uppercase tracking-wider animate-bounce">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Trigger Window Active ({triggerWindowMinutes}m)
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
        <span>
          Current Close:{" "}
          <strong className="text-slate-200">
            {formatTimeOnly(currentCloseTime)}
          </strong>
        </span>
        <span className="text-slate-600">•</span>
        <span>
          Forced Close Ceiling:{" "}
          <strong className="text-rose-300 font-mono">
            {formatTimeOnly(forcedCloseTime)}
          </strong>
        </span>
      </div>
    </div>
  );
}
