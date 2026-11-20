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
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className={`font-mono text-2xl md:text-3xl font-black tracking-wider px-3.5 py-1.5 rounded-xl border transition-all ${
            isClosed
              ? "bg-slate-100 text-slate-400 border-slate-200"
              : isInsideTriggerWindow
              ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm shadow-amber-500/20"
              : "bg-white text-slate-900 border-slate-200 shadow-xs"
          }`}
        >
          {isClosed ? "00:00:00" : remaining.text}
        </div>

        {isInsideTriggerWindow && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/80 border border-amber-300/80 rounded-lg text-amber-800 text-[11px] font-bold uppercase tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Trigger Window Active ({triggerWindowMinutes}m)
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
        <span>
          Current Close:{" "}
          <strong className="text-slate-800 font-semibold font-mono">
            {formatTimeOnly(currentCloseTime)}
          </strong>
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Forced Ceiling:{" "}
          <strong className="text-rose-600 font-semibold font-mono">
            {formatTimeOnly(forcedCloseTime)}
          </strong>
        </span>
      </div>
    </div>
  );
}
