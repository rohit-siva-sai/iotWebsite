"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <div className="rounded-[28px] border border-cyan-400/20 bg-white/5 px-5 py-5 text-left shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Control Room Clock</p>
        <p className="mt-3 font-display text-3xl font-bold tracking-[0.18em] text-cyan-300">
          --:--:--
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">
          Syncing local time
        </p>
      </div>
    );
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return (
    <div className="rounded-[28px] border border-cyan-400/20 bg-white/5 px-5 py-5 text-left shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Control Room Clock</p>
      <p className="mt-3 font-display text-3xl font-bold tracking-[0.18em] text-cyan-300">
        {timeLabel}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">
        {dateLabel}
      </p>
    </div>
  );
}
