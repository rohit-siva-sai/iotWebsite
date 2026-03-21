"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlassCard from "@/components/GlassCard";

export default function AttendanceChart({ data, percentage }) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <GlassCard className="min-w-0 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Attendance Share</p>
            <h3 className="mt-2 font-display text-xl text-white">Live Presence Split</h3>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-right">
            <p className="font-display text-2xl font-bold text-cyan-300">{percentage}%</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Presence</p>
          </div>
        </div>
        <div className="mt-6 h-80 rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-2">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.summary}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={106}
                  paddingAngle={6}
                >
                  {data.summary.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(8, 14, 30, 0.92)",
                    border: "1px solid rgba(103, 232, 249, 0.16)",
                    borderRadius: "18px",
                    color: "#e5f7ff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm uppercase tracking-[0.24em] text-slate-400">
              Loading chart data...
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="min-w-0 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Period Analytics</p>
          <h3 className="mt-2 font-display text-xl text-white">Present vs Absent By Period</h3>
        </div>
        <div className="mt-6 h-80 rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-2">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.periods}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(8, 14, 30, 0.92)",
                    border: "1px solid rgba(103, 232, 249, 0.16)",
                    borderRadius: "18px",
                    color: "#e5f7ff",
                  }}
                />
                <Bar dataKey="Present" fill="#4ade80" radius={[12, 12, 0, 0]} />
                <Bar dataKey="Absent" fill="#fb7185" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm uppercase tracking-[0.24em] text-slate-400">
              Loading chart data...
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
