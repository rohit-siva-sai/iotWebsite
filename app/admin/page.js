"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { CalendarPlus2, LogOut, ShieldCheck, Users, Zap } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import HolidayPanel from "@/components/HolidayPanel";
import LiveClock from "@/components/LiveClock";
import MetricCard from "@/components/MetricCard";
import PortalSelect from "@/components/PortalSelect";
import ProfessorAttendanceBoard from "@/components/ProfessorAttendanceBoard";
import TimetableBoard from "@/components/TimetableBoard";
import { database, firestore } from "@/lib/firebase";
import { useSessionStore } from "@/lib/sessionStore";
import {
  buildAttendanceSummaryDocId,
  buildAdminRoster,
  buildLatestDayAttendance,
  buildProfessorSummaryFromStoredSummaries,
  mergeAttendanceRecordIntoSummary,
  mergeAttendanceRecords,
  normalizeAttendanceSummary,
  normalizeFirestoreProfile,
  normalizeHoliday,
  processRealtimeAttendance,
} from "@/utils/portalLogic";
import { formatDateKey, getWeekKey, getWeekdayName, SUBJECTS } from "@/utils/timetable";
import {
  ACADEMIC_HOLIDAYS,
  generateBaseClassSessions,
  hasSessionStarted,
  normalizeExtraClass,
} from "@/utils/academicCalendar";

export default function AdminPage() {
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [rawAttendance, setRawAttendance] = useState(null);
  const [realtimeUsers, setRealtimeUsers] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [latestRecordsState, setLatestRecordsState] = useState({ dateKey: "", records: [] });
  const [summaryRecords, setSummaryRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [extraClasses, setExtraClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [scanState, setScanState] = useState("Waiting for scans...");
  const [extraClassForm, setExtraClassForm] = useState({
    dateKey: "",
    startTime: "14:30",
    endTime: "15:20",
    subjectCode: "",
    title: "Extra Class",
  });
  const [extraClassStatus, setExtraClassStatus] = useState({
    tone: "idle",
    message: "Add a date, time, and subject to publish an extra class.",
  });
  const subjectScopedCode = session?.subjectCode || "";

  useEffect(() => {
    if (!hasHydrated) {
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

    const summarySource = subjectScopedCode
      ? query(collection(firestore, "attendanceSummaries"), where("subjectCode", "==", subjectScopedCode))
      : collection(firestore, "attendanceSummaries");

    const unsubscribeSummaries = onSnapshot(summarySource, (snapshot) => {
      setSummaryRecords(snapshot.docs.map(normalizeAttendanceSummary));
    });

    const unsubscribeRealtime = onValue(ref(database), (snapshot) => {
      const data = snapshot.val() || {};
      setRawAttendance(data.attendance || data.Attendance || null);
      setRealtimeUsers(data.users || data.Users || {});
      setScanState("Scans received.");
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeHolidays();
      unsubscribeExtraClasses();
      unsubscribeSummaries();
      unsubscribeRealtime();
    };
  }, [hasHydrated, subjectScopedCode]);

  const subjectOptions = useMemo(
    () => Array.from(new Set(Object.values(SUBJECTS).map((subject) => subject.courseCode))),
    []
  );

  const todayDateKey = hasHydrated ? formatDateKey(new Date()) : "";
  const classSessions = useMemo(
    () =>
      [...generateBaseClassSessions([...ACADEMIC_HOLIDAYS, ...holidays]), ...extraClasses].sort(
        (a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime)
      ),
    [holidays, extraClasses]
  );
  const liveRecords = useMemo(() => {
    if (!rawAttendance || !profiles.length || !classSessions.length) {
      return [];
    }

    const nextRecords = processRealtimeAttendance({
      rawAttendance,
      realtimeUsers,
      profiles,
      holidays,
      sessions: classSessions,
    });

    return subjectScopedCode
      ? nextRecords.filter((record) => record.subjectCode === subjectScopedCode)
      : nextRecords;
  }, [rawAttendance, realtimeUsers, profiles, holidays, classSessions, subjectScopedCode]);
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
      console.error("Unable to sync live admin attendance.", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [liveRecords]);

  const effectiveSubject = session?.subjectCode || selectedSubject;
  const syncState = useMemo(() => {
    if (!hasHydrated) {
      return "Loading attendance status...";
    }

    if (liveRecords.length) {
      return "Live attendance connected.";
    }

    return summaryRecords.length ? "Showing saved attendance summaries." : scanState;
  }, [hasHydrated, liveRecords, summaryRecords, scanState]);
  const filteredSessions = useMemo(() => {
    const now = hasHydrated ? new Date() : null;
    const sessionsUntilNow = classSessions.filter(
      (entry) => !now || hasSessionStarted(entry, now)
    );

    if (effectiveSubject === "all") {
      return sessionsUntilNow;
    }

    return sessionsUntilNow.filter((entry) => entry.subjectCode === effectiveSubject);
  }, [classSessions, effectiveSubject, hasHydrated]);
  const latestDateKey = useMemo(() => filteredSessions.map((session) => session.dateKey).sort().at(-1) || "", [
    filteredSessions,
  ]);
  const filteredLatestRecords = useMemo(() => {
    const scopedLatestRecords =
      latestDateKey && latestRecordsState.dateKey === latestDateKey
        ? latestRecordsState.records
        : [];

    if (effectiveSubject === "all") {
      return scopedLatestRecords;
    }

    return scopedLatestRecords.filter((entry) => entry.subjectCode === effectiveSubject);
  }, [latestDateKey, latestRecordsState, effectiveSubject]);
  const professorSubjectName = useMemo(() => {
    if (effectiveSubject === "all") {
      return "All Subjects";
    }

    return (
      Object.values(SUBJECTS).find((subject) => subject.courseCode === effectiveSubject)?.subjectName ||
      effectiveSubject
    );
  }, [effectiveSubject]);
  const adminRoster = useMemo(() => buildAdminRoster(profiles, 33), [profiles]);
  const studentSummary = useMemo(
    () => buildProfessorSummaryFromStoredSummaries({
      roster: adminRoster,
      sessions: filteredSessions,
      summaries: summaryRecords,
      subjectCode: effectiveSubject,
    }),
    [adminRoster, filteredSessions, summaryRecords, effectiveSubject]
  );
  const latestDayAttendance = useMemo(
    () =>
      buildLatestDayAttendance({
        roster: adminRoster,
        sessions: filteredSessions,
        attendanceRecords: filteredLatestRecords,
      }),
    [adminRoster, filteredSessions, filteredLatestRecords]
  );
  const presentStudents = useMemo(
    () => studentSummary.filter((student) => student.present > 0).length,
    [studentSummary]
  );
  const averageAttendance = useMemo(() => {
    if (!studentSummary.length) {
      return 0;
    }

    return Math.round(
      studentSummary.reduce((total, student) => total + student.attendanceRate, 0) /
        studentSummary.length
    );
  }, [studentSummary]);

  useEffect(() => {
    if (!hasHydrated || !latestDateKey) {
      return;
    }

    const latestDayQuery = query(
      collection(firestore, "userAttendance"),
      where("dateKey", "==", latestDateKey)
    );

    const unsubscribeLatestDay = onSnapshot(latestDayQuery, (snapshot) => {
      const nextRecords = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
      setLatestRecordsState({ dateKey: latestDateKey, records: nextRecords });
    });

    return () => {
      unsubscribeLatestDay();
    };
  }, [hasHydrated, latestDateKey]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  function updateExtraClassForm(field, value) {
    setExtraClassForm((current) => ({ ...current, [field]: value }));
  }

  async function handleExtraClassSubmit(event) {
    event.preventDefault();

    const chosenSubject =
      session?.subjectCode ||
      extraClassForm.subjectCode;

    if (!extraClassForm.dateKey || !extraClassForm.startTime || !extraClassForm.endTime || !chosenSubject) {
      setExtraClassStatus({
        tone: "error",
        message: "Choose the class date, time range, and subject first.",
      });
      return;
    }

    const subject =
      Object.values(SUBJECTS).find((entry) => entry.courseCode === chosenSubject) || null;

    if (!subject) {
      setExtraClassStatus({
        tone: "error",
        message: "Select a valid subject before saving the extra class.",
      });
      return;
    }

    const date = new Date(`${extraClassForm.dateKey}T00:00:00`);
    const sessionId = `${extraClassForm.dateKey}__extra-${extraClassForm.startTime.replace(":", "")}__${subject.courseCode}`;

    try {
      await setDoc(doc(firestore, "extraClasses", sessionId), {
        sessionId,
        dateKey: extraClassForm.dateKey,
        weekKey: getWeekKey(date),
        weekday: getWeekdayName(date),
        periodId: `extra-${extraClassForm.startTime.replace(":", "")}`,
        periodLabel: extraClassForm.title || "Extra Class",
        startTime: extraClassForm.startTime,
        endTime: extraClassForm.endTime,
        subjectCode: subject.courseCode,
        subjectName: subject.subjectName,
        facultyCode: subject.facultyCode,
        facultyName: subject.facultyName,
        title: extraClassForm.title || "Extra Class",
        createdAt: serverTimestamp(),
      });

      setExtraClassForm((current) => ({
        ...current,
        dateKey: "",
        title: "Extra Class",
      }));
      setExtraClassStatus({
        tone: "success",
        message: `${subject.courseCode} extra class added for ${extraClassForm.dateKey}.`,
      });
    } catch (error) {
      setExtraClassStatus({
        tone: "error",
        message: error.message || "Unable to add the extra class right now.",
      });
    }
  }

  if (!hasHydrated) {
    return (
      <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <GlassCard className="p-8 text-center text-slate-300">
            Loading admin portal...
          </GlassCard>
        </div>
      </main>
    );
  }

  if (!session || session.role !== "admin") {
    return (
      <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <GlassCard className="p-8 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Admin Access</p>
            <h1 className="mt-3 font-display text-3xl text-white">Admin login required</h1>
            <p className="mt-4 text-sm leading-7 text-slate-400">Sign in from the home page first.</p>
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
                  <ShieldCheck className="h-4 w-4" />
                  Professor Dashboard
                </div>
                <h1 className="neon-text mt-6 font-display text-4xl font-extrabold uppercase tracking-[0.14em] text-white">
                  {effectiveSubject === "all" ? "Attendance Control Room" : professorSubjectName}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                  Welcome, {session.name}. This view tracks scheduled classes, latest attendance, and
                  student-wise performance for your subject.
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

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sync Status</p>
              <p className="mt-3 font-display text-xl text-cyan-300">{syncState}</p>
              <p className="mt-2 text-sm text-slate-400">
                Calendar-based sessions are saved to `classSessions` and scans to `userAttendance`.
              </p>
            </div>
          </GlassCard>

          <div className="space-y-6">
            <LiveClock />
            <GlassCard className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Subject</p>
              <h2 className="mt-2 font-display text-2xl text-white">
                {effectiveSubject === "all" ? "All Subjects" : `${effectiveSubject} • ${professorSubjectName}`}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                {session.subjectCode
                  ? "Your dashboard is locked to your assigned subject."
                  : "Choose one subject or keep the full overview."}
              </p>

              {!session.subjectCode ? (
                <div className="mt-5">
                  <PortalSelect
                    value={selectedSubject}
                    onChange={(event) => setSelectedSubject(event.target.value)}
                  >
                    <option value="all">All Subjects</option>
                    {subjectOptions.map((subjectCode) => (
                      <option key={subjectCode} value={subjectCode}>
                        {subjectCode}
                      </option>
                    ))}
                  </PortalSelect>
                </div>
              ) : null}

              <form className="mt-5 space-y-3" onSubmit={handleExtraClassSubmit}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Add Extra Class</p>
                <input
                  type="date"
                  value={extraClassForm.dateKey}
                  onChange={(event) => updateExtraClassForm("dateKey", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="time"
                    value={extraClassForm.startTime}
                    onChange={(event) => updateExtraClassForm("startTime", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  />
                  <input
                    type="time"
                    value={extraClassForm.endTime}
                    onChange={(event) => updateExtraClassForm("endTime", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  />
                </div>
                {!session.subjectCode ? (
                  <PortalSelect
                    value={extraClassForm.subjectCode}
                    onChange={(event) => updateExtraClassForm("subjectCode", event.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjectOptions.map((subjectCode) => (
                      <option key={subjectCode} value={subjectCode}>
                        {subjectCode}
                      </option>
                    ))}
                  </PortalSelect>
                ) : null}
                <input
                  type="text"
                  value={extraClassForm.title}
                  onChange={(event) => updateExtraClassForm("title", event.target.value)}
                  placeholder="Extra Class"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  <CalendarPlus2 className="h-4 w-4" />
                  Add Extra Class
                </button>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    extraClassStatus.tone === "success"
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                      : extraClassStatus.tone === "error"
                        ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {extraClassStatus.message}
                </div>
              </form>
            </GlassCard>
          </div>
        </motion.header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Students"
            value={studentSummary.length}
            detail="Students in this subject"
            accent="#67e8f9"
            icon={Users}
          />
          <MetricCard
            title="Total Classes"
            value={filteredSessions.length}
            detail={todayDateKey ? `Scheduled until ${todayDateKey}` : "Scheduled classes so far"}
            accent="#4ade80"
            icon={Zap}
          />
          <MetricCard
            title="Present Today"
            value={latestDayAttendance.rows.filter((row) => row.status === "Present").length}
            detail={latestDayAttendance.latestDateKey || "No latest class"}
            accent="#22c55e"
            icon={ShieldCheck}
          />
          <MetricCard
            title="Average %"
            value={`${averageAttendance}%`}
            detail="Across all students"
            accent="#a855f7"
            icon={ShieldCheck}
          />
        </section>

        <ProfessorAttendanceBoard
          students={studentSummary}
          subjectCode={effectiveSubject === "all" ? "ALL" : effectiveSubject}
          subjectName={professorSubjectName}
          latestDateKey={latestDayAttendance.latestDateKey}
          latestRows={latestDayAttendance.rows}
        />

        <section className="space-y-6">
          <TimetableBoard />
          <HolidayPanel holidays={[...ACADEMIC_HOLIDAYS, ...holidays]} />
        </section>
      </div>
    </main>
  );
}
