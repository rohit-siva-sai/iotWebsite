"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { BookMarked, GraduationCap, LogOut, UserRoundCheck } from "lucide-react";
import AttendanceLedger from "@/components/AttendanceLedger";
import GlassCard from "@/components/GlassCard";
import HolidayPanel from "@/components/HolidayPanel";
import LiveClock from "@/components/LiveClock";
import MetricCard from "@/components/MetricCard";
import PortalSelect from "@/components/PortalSelect";
import TimetableBoard from "@/components/TimetableBoard";
import { database, firestore } from "@/lib/firebase";
import { useSessionStore } from "@/lib/sessionStore";
import { formatDateKey } from "@/utils/timetable";
import {
  ACADEMIC_HOLIDAYS,
  generateBaseClassSessions,
  hasSessionStarted,
  normalizeExtraClass,
} from "@/utils/academicCalendar";
import {
  buildAttendanceSummaryDocId,
  buildStudentSubjectSummary,
  dedupeStudentLedgerRecords,
  mergeAttendanceRecordIntoSummary,
  mergeAttendanceRecords,
  normalizeFirestoreProfile,
  normalizeHoliday,
  processRealtimeAttendance,
  summarizeAttendance,
} from "@/utils/portalLogic";

export default function StudentPage() {
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [rawAttendance, setRawAttendance] = useState(null);
  const [realtimeUsers, setRealtimeUsers] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [extraClasses, setExtraClasses] = useState([]);
  const [scanState, setScanState] = useState("Waiting for scans...");
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (!hasHydrated || !session || session.role !== "student") {
      return;
    }

    const unsubscribeProfiles = onSnapshot(collection(firestore, "users"), (snapshot) => {
      setProfiles(snapshot.docs.map(normalizeFirestoreProfile));
    });

    const unsubscribeHolidays = onSnapshot(collection(firestore, "publicHolidays"), (snapshot) => {
      setHolidays(snapshot.docs.map(normalizeHoliday));
    });

    const unsubscribeExtraClasses = onSnapshot(collection(firestore, "extraClasses"), (snapshot) => {
      setExtraClasses(snapshot.docs.map(normalizeExtraClass));
    });

    const recordsQuery = query(
      collection(firestore, "userAttendance"),
      where("studentKey", "==", session.studentKey)
    );
    const unsubscribeRecords = onSnapshot(recordsQuery, (snapshot) => {
      const nextRecords = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
      setRecords(nextRecords);
    });

    const unsubscribeRealtime = onValue(ref(database), (snapshot) => {
      const data = snapshot.val() || {};
      setRawAttendance(data.attendance || data.Attendance || null);
      setRealtimeUsers(data.users || data.Users || {});
      setScanState("Checking your scans...");
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeHolidays();
      unsubscribeExtraClasses();
      unsubscribeRecords();
      unsubscribeRealtime();
    };
  }, [hasHydrated, session]);
  const classSessions = useMemo(
    () =>
      [...generateBaseClassSessions([...ACADEMIC_HOLIDAYS, ...holidays]), ...extraClasses].sort(
        (a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime)
      ),
    [holidays, extraClasses]
  );
  const liveRecords = useMemo(() => {
    if (!session || !rawAttendance || !classSessions.length) {
      return [];
    }

    const scopedProfiles = profiles.length
      ? profiles
      : [
          {
            profileId: session.profileId,
            role: session.role,
            name: session.name,
            userId: session.userId,
            rollNo: session.rollNo,
            studentKey: session.studentKey,
          },
        ];

    return processRealtimeAttendance({
      rawAttendance,
      realtimeUsers,
      profiles: scopedProfiles,
      holidays,
      sessions: classSessions,
    }).filter((record) => record.studentKey === session.studentKey);
  }, [session, rawAttendance, realtimeUsers, profiles, holidays, classSessions]);
  const mergedRecords = useMemo(() => mergeAttendanceRecords(records, liveRecords), [records, liveRecords]);
  const resolvedRecords = useMemo(
    () => dedupeStudentLedgerRecords(mergedRecords),
    [mergedRecords]
  );

  useEffect(() => {
    if (!liveRecords.length) {
      return;
    }

    let isCancelled = false;

    async function syncLiveRecords() {
      await Promise.all(
        liveRecords.map(async (record) => {
          if (!record.docId) {
            return;
          }

          const docRef = doc(firestore, "userAttendance", record.docId);
          const existingSnapshot = await getDoc(docRef);
          const existingRecord = existingSnapshot.exists() ? existingSnapshot.data() : null;

          if (
            existingRecord?.scannedAt &&
            record.scannedAt &&
            existingRecord.scannedAt <= record.scannedAt
          ) {
            return;
          }

          if (isCancelled) {
            return;
          }

          await setDoc(
            docRef,
            {
              ...record,
              updatedAt: serverTimestamp(),
              createdAt: existingRecord?.createdAt || serverTimestamp(),
              source: existingRecord?.source || "realtime",
            },
            { merge: true }
          );

          const summaryRef = doc(
            firestore,
            "attendanceSummaries",
            buildAttendanceSummaryDocId(record)
          );
          const existingSummarySnapshot = await getDoc(summaryRef);
          const existingSummary = existingSummarySnapshot.exists() ? existingSummarySnapshot.data() : null;
          const nextSummary = mergeAttendanceRecordIntoSummary(record, existingSummary);

          if (!nextSummary) {
            return;
          }

          await setDoc(
            summaryRef,
            {
              ...nextSummary,
              updatedAt: serverTimestamp(),
              source: "realtime",
            },
            { merge: true }
          );
        })
      );
    }

    syncLiveRecords().catch((error) => {
      console.error("Unable to sync live student attendance.", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [liveRecords]);

  const todayDateKey = hasHydrated ? formatDateKey(new Date()) : "";
  const completedSessions = useMemo(
    () => {
      const now = hasHydrated ? new Date() : null;
      return classSessions.filter(
        (sessionEntry) => !now || hasSessionStarted(sessionEntry, now)
      );
    },
    [classSessions, hasHydrated]
  );
  const subjectSummary = useMemo(
    () =>
      Object.values(
        buildStudentSubjectSummary({
          sessions: completedSessions,
          attendanceRecords: resolvedRecords,
        })
      ).sort((a, b) =>
        (a.subjectCode || "").localeCompare(b.subjectCode || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [completedSessions, resolvedRecords]
  );
  const subjectOptions = useMemo(
    () => subjectSummary.map((subject) => subject.subjectCode),
    [subjectSummary]
  );
  const effectiveSubject = useMemo(() => {
    if (!subjectOptions.length) {
      return "";
    }

    return subjectOptions.includes(selectedSubject) ? selectedSubject : subjectOptions[0];
  }, [selectedSubject, subjectOptions]);
  const completedSubjectSessions = useMemo(() => {
    if (!effectiveSubject) {
      return [];
    }

    return completedSessions.filter((sessionEntry) => sessionEntry.subjectCode === effectiveSubject);
  }, [completedSessions, effectiveSubject]);
  const filteredRecords = useMemo(() => {
    if (!effectiveSubject) {
      return resolvedRecords;
    }

    return resolvedRecords.filter((record) => record.subjectCode === effectiveSubject);
  }, [resolvedRecords, effectiveSubject]);
  const selectedSubjectSummary = useMemo(
    () => {
      const subject = subjectSummary.find((entry) => entry.subjectCode === effectiveSubject);

      if (!subject) {
        return null;
      }
      return {
        ...subject,
        total: subject.total || 0,
        absent: Math.max((subject.total || 0) - subject.present, 0),
      };
    },
    [subjectSummary, effectiveSubject]
  );
  const stats = useMemo(() => {
    const baseStats = summarizeAttendance(filteredRecords);
    const present = selectedSubjectSummary?.present || 0;
    const totalClasses = selectedSubjectSummary?.total || completedSubjectSessions.length;
    const absent = Math.max(totalClasses - present, 0);

    return {
      ...baseStats,
      totalRecords: totalClasses,
      present,
      absent,
      attendanceRate: totalClasses ? Math.round((present / totalClasses) * 100) : 0,
    };
  }, [completedSubjectSessions.length, filteredRecords, selectedSubjectSummary]);
  const syncState = useMemo(() => {
    if (!hasHydrated) {
      return "Loading attendance status...";
    }

    if (liveRecords.length) {
      return "Live attendance connected.";
    }

    return records.length ? "Showing saved attendance records." : scanState;
  }, [hasHydrated, liveRecords, records, scanState]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  if (!hasHydrated) {
    return (
      <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <GlassCard className="p-8 text-center text-slate-300">
            Loading student portal...
          </GlassCard>
        </div>
      </main>
    );
  }

  if (!session || session.role !== "student") {
    return (
      <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <GlassCard className="p-8 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Student Access</p>
            <h1 className="mt-3 font-display text-3xl text-white">Student login required</h1>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Sign in from the home page first.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
            >
              Return Home
            </Link>
          </GlassCard>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="grid-glow absolute inset-0 opacity-25" />
      <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <GlassCard className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-cyan-300">
                  <GraduationCap className="h-4 w-4" />
                  Student Dashboard
                </div>
                <h1 className="neon-text mt-6 font-display text-4xl font-extrabold uppercase tracking-[0.14em] text-white">
                  My Attendance
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                  Welcome, {session.name}. This page shows only your attendance.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Student Identity</p>
                <p className="mt-3 font-display text-xl text-cyan-300">{session.name}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Roll No: {session.rollNo || "Not provided"} | User ID: {session.userId || "Not provided"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sync Status</p>
                <p className="mt-3 font-display text-xl text-cyan-300">{syncState}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Only your records are shown here.
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6">
            <LiveClock />
            <GlassCard className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Attendance Rule</p>
              <h2 className="mt-2 font-display text-2xl text-white">5-minute rule</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Scan within 5 minutes of class start to get attendance.
              </p>
            </GlassCard>
          </div>
        </motion.header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Subject Records"
            value={stats.totalRecords}
            detail={selectedSubjectSummary?.subjectName || "Select a subject"}
            accent="#67e8f9"
            icon={UserRoundCheck}
          />
          <MetricCard
            title="Present"
            value={stats.present}
            detail={effectiveSubject || "No subject selected"}
            accent="#22c55e"
            icon={GraduationCap}
          />
          <MetricCard
            title="Absent"
            value={stats.absent}
            detail={effectiveSubject || "No subject selected"}
            accent="#fb7185"
            icon={BookMarked}
          />
          <MetricCard
            title="Attendance %"
            value={`${stats.attendanceRate}%`}
            detail={
              selectedSubjectSummary
                ? `${selectedSubjectSummary.present}/${selectedSubjectSummary.total} classes attended`
                : "No subject selected"
            }
            accent="#a855f7"
            icon={BookMarked}
          />
        </section>

        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Subject Filter</p>
              <h3 className="mt-2 font-display text-2xl text-white">Choose Subject</h3>
              <p className="mt-2 text-sm text-slate-400">
                Stats and the ledger below follow this subject.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                  Subject
                </span>
                <PortalSelect
                  value={effectiveSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  {subjectOptions.map((subjectCode) => {
                    const subject = subjectSummary.find((entry) => entry.subjectCode === subjectCode);

                    return (
                      <option key={subjectCode} value={subjectCode}>
                        {subjectCode} - {subject?.subjectName || ""}
                      </option>
                    );
                  })}
                </PortalSelect>
              </label>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Subject Summary</p>
          <h3 className="mt-2 font-display text-2xl text-white">By Subject</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {subjectSummary.length > 0 ? (
              subjectSummary.map((subject) => (
                <div
                  key={subject.subjectCode}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className="font-display text-lg text-cyan-300">{subject.subjectCode}</p>
                  <p className="mt-2 text-sm text-white">{subject.subjectName}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {subject.facultyName}
                  </p>
                  <p className="mt-4 text-sm text-slate-300">
                    Present {subject.present} / {subject.total}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-6 text-sm text-slate-400 md:col-span-2 xl:col-span-4">
                No subject records yet.
              </div>
            )}
          </div>
        </GlassCard>

        <AttendanceLedger records={filteredRecords} mode="student" />

        <section className="space-y-6">
          <TimetableBoard />
          <HolidayPanel holidays={holidays} />
        </section>
      </div>
    </main>
  );
}
