"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";

export default function MetricCard({ title, value, accent, detail, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <GlassCard className="h-full p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
            <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
            <p className="mt-2 text-sm text-slate-400">{detail}</p>
          </div>
          <div
            className="rounded-2xl border px-3 py-3"
            style={{
              borderColor: `${accent}4D`,
              background: `${accent}1A`,
              boxShadow: `0 0 28px ${accent}33`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
