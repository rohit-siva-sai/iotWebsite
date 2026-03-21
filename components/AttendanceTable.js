"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import StatusBadge from "@/components/StatusBadge";

export default function AttendanceTable({ records }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Attendance Feed</p>
        <h3 className="mt-2 font-display text-xl text-white">Student Detection Timeline</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Expanded spacing and a stacked mobile view make the stream easier to scan while new events arrive.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:hidden">
        {records.length > 0 ? (
          records.map((record, index) => (
            <motion.div
              key={record.recordKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.03 }}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{record.name}</p>
                  <p className="mt-1 text-sm text-slate-400">ID #{record.id}</p>
                </div>
                <StatusBadge status={record.status} isLate={record.isLate} />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Detected</p>
                  <p className="mt-1">{record.displayDate}</p>
                  <p className="text-slate-400">{record.timeDetected}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Class Period</p>
                  <p className="mt-1">{record.periodLabel}</p>
                  <p className="text-slate-400">Starts {record.classStartTime}</p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center text-slate-400">
            No attendance records matched the current filters.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-400">
            <tr>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Time Detected</th>
              <th className="px-6 py-4">Class Period</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record, index) => (
                <motion.tr
                  key={record.recordKey}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  className="border-t border-white/[0.06] transition hover:bg-cyan-400/[0.04]"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold text-white">{record.name}</p>
                      {record.isLate ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-300">
                          {record.minutesLate} min after class start
                        </p>
                      ) : (
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          Fingerprint authenticated
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-300">#{record.id}</td>
                  <td className="px-6 py-5 text-slate-300">{record.displayDate}</td>
                  <td className="px-6 py-5 text-slate-300">{record.timeDetected}</td>
                  <td className="px-6 py-5 text-slate-300">
                    <div>
                      <p>{record.periodLabel}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Starts {record.classStartTime}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={record.status} isLate={record.isLate} />
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center text-slate-400">
                  No attendance records matched the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
