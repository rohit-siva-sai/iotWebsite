"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { onValue, ref } from "firebase/database";
import {
  Activity,
  CalendarDays,
  CircleUserRound,
  Download,
  Fingerprint,
  Shield,
  TriangleAlert,
} from "lucide-react";
import AttendanceChart from "@/components/AttendanceChart";
import AttendanceFilters from "@/components/AttendanceFilters";
import AttendanceTable from "@/components/AttendanceTable";
import GlassCard from "@/components/GlassCard";
import LiveClock from "@/components/LiveClock";
import MetricCard from "@/components/MetricCard";
import { database, getFirebaseAnalytics } from "@/lib/firebase";
import {
  downloadAttendanceCsv,
  filterAttendanceRecords,
  formatDateKey,
  getAttendanceStats,
  getChartData,
  getPeriodOptions,
  normalizeAttendanceRecords,
} from "@/utils/attendanceLogic";

export default function Home() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [filters, setFilters] = useState({
    date: "",
    period: "",
    search: "",
  });

  useEffect(() => {
    getFirebaseAnalytics().catch(() => null);

    const attendanceRef = ref(database, "Attendance");
    const unsubscribe = onValue(
      attendanceRef,
      (snapshot) => {
        const data = snapshot.val();
        const nextRecords = normalizeAttendanceRecords(data);
        setRecords(nextRecords);
        setStatus("ready");
        setError("");
        setLastSync(new Date());
      },
      (firebaseError) => {
        setStatus("error");
        setError(firebaseError.message || "Unable to load attendance feed.");
      }
    );

    return () => unsubscribe();
  }, []);

  const periodOptions = useMemo(() => getPeriodOptions(records), [records]);
  const defaultDate = useMemo(
    () => (records[0]?.date ? formatDateKey(records[0].date) : ""),
    [records]
  );
  const effectiveFilters = useMemo(
    () => ({ ...filters, date: filters.date || defaultDate }),
    [filters, defaultDate]
  );

  const filteredRecords = useMemo(
    () => filterAttendanceRecords(records, effectiveFilters),
    [records, effectiveFilters]
  );

  const stats = useMemo(() => getAttendanceStats(filteredRecords), [filteredRecords]);
  const chartData = useMemo(() => getChartData(filteredRecords), [filteredRecords]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters({ date: "", period: "", search: "" });
  }

  function exportCsv() {
    downloadAttendanceCsv(filteredRecords, "fingerprint-attendance-report.csv");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="grid-glow absolute inset-0 opacity-40" />
      <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-32 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
        >
          <GlassCard className="overflow-hidden p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-300">
                  <Fingerprint className="h-4 w-4" />
                  Fingerprint Attendance System
                </div>
                <h1 className="neon-text mt-6 font-display text-3xl font-extrabold uppercase tracking-[0.18em] text-white sm:text-5xl">
                  Smart Classroom Attendance Command Center
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Watch fingerprint scans flow into Firebase in real time, validate attendance against class-period rules, and monitor student presence with a neon-lit analytics dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  Admin Login
                </Link>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:scale-[1.02]"
                >
                  <Download className="h-4 w-4" />
                  Export Attendance
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Realtime Feed</p>
                <p className="mt-3 font-display text-xl text-cyan-300">Firebase RTDB</p>
                <p className="mt-2 text-sm text-slate-400">Realtime listener is connected to the `Attendance` node.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attendance Logic</p>
                <p className="mt-3 font-display text-xl text-emerald-300">10 Min Grace</p>
                <p className="mt-2 text-sm text-slate-400">Entries inside the grace window are marked present automatically.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sync Status</p>
                <p className="mt-3 font-display text-xl text-white">
                  {status === "loading" ? "Connecting..." : status === "error" ? "Connection Issue" : "Live"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {lastSync ? `Last refresh: ${lastSync.toLocaleTimeString()}` : "Waiting for the first Firebase snapshot."}
                </p>
              </div>
            </div>
          </GlassCard>

          <LiveClock />
        </motion.header>

        {error ? (
          <GlassCard className="border-rose-400/20 p-5">
            <div className="flex items-start gap-3 text-rose-200">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-display text-lg text-white">Realtime connection error</p>
                <p className="mt-1 text-sm text-rose-100/90">{error}</p>
              </div>
            </div>
          </GlassCard>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Students"
            value={stats.totalStudents}
            detail="Visible after active filters"
            accent="#67e8f9"
            icon={CircleUserRound}
          />
          <MetricCard
            title="Present Count"
            value={stats.presentCount}
            detail="Fingerprint scans within grace window"
            accent="#4ade80"
            icon={Shield}
          />
          <MetricCard
            title="Absent Count"
            value={stats.absentCount}
            detail="Detected after the attendance cutoff"
            accent="#fb7185"
            icon={TriangleAlert}
          />
          <MetricCard
            title="Attendance %"
            value={`${stats.attendancePercentage}%`}
            detail={`${stats.lateCount} late entries flagged`}
            accent="#a855f7"
            icon={Activity}
          />
        </section>

        <GlassCard className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Filter Console</p>
              <h2 className="mt-2 font-display text-2xl text-white">Track by day, period, or student</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">
              <CalendarDays className="h-4 w-4 text-cyan-300" />
              {filteredRecords.length} records in current view
            </div>
          </div>
          <AttendanceFilters
            filters={{ ...filters, date: filters.date || defaultDate }}
            periods={periodOptions}
            onChange={updateFilter}
            onClear={clearFilters}
            onExport={exportCsv}
          />
        </GlassCard>

        <AttendanceChart data={chartData} percentage={stats.attendancePercentage} />

        <AttendanceTable records={filteredRecords} />
      </div>
    </main>
  );
}
