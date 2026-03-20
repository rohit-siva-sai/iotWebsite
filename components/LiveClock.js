"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    <div className="rounded-2xl border border-cyan-400/20 bg-white/5 px-4 py-3 text-right shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-xl">
      <p className="font-display text-lg font-bold tracking-[0.28em] text-cyan-300">
        {timeLabel}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">
        {dateLabel}
      </p>
    </div>
  );
}
