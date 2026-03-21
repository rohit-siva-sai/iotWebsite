"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { BookOpenCheck, GraduationCap, ShieldCheck, UserPlus2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import HolidayPanel from "@/components/HolidayPanel";
import TimetableBoard from "@/components/TimetableBoard";
import { firestore } from "@/lib/firebase";
import { useSessionStore } from "@/lib/sessionStore";
import {
  normalizeFirestoreProfile,
  normalizeHoliday,
  normalizeIdentifier,
  toSessionProfile,
} from "@/utils/portalLogic";

const ROLE_COPY = {
  admin: {
    label: "Admin Login",
    icon: ShieldCheck,
    title: "Admin Access",
    description: "Login for full subject and class attendance.",
    collectionName: "admins",
    createHref: "/register/admin",
  },
  student: {
    label: "Student Login",
    icon: GraduationCap,
    title: "Student Access",
    description: "Login to view your own attendance.",
    collectionName: "users",
    createHref: "/register/student",
  },
};

export default function HomePage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [role, setRole] = useState("student");
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
  });
  const [holidays, setHolidays] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Login with your ID and password.");

  useEffect(() => {
    let mounted = true;

    getDocs(collection(firestore, "publicHolidays"))
      .then((snapshot) => {
        if (mounted) {
          setHolidays(snapshot.docs.map(normalizeHoliday));
        }
      })
      .catch(() => {
        if (mounted) {
          setHolidays([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentRole = ROLE_COPY[role];
  const CurrentIcon = currentRole.icon;

  function updateLoginForm(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();

    const normalizedValue = normalizeIdentifier(loginForm.identifier);

    if (!normalizedValue || !loginForm.password.trim()) {
      setStatus("error");
      setMessage("Enter your ID and password.");
      return;
    }

    setStatus("loading");
    setMessage("Checking your account...");

    try {
      const accountQuery = query(
        collection(firestore, currentRole.collectionName),
        where("searchTokens", "array-contains", normalizedValue),
        limit(5)
      );
      const snapshot = await getDocs(accountQuery);

      if (snapshot.empty) {
        setStatus("error");
        setMessage("Account not found.");
        return;
      }

      const matchedProfile = snapshot.docs
        .map(normalizeFirestoreProfile)
        .find((profile) => profile.password === loginForm.password.trim());

      if (!matchedProfile) {
        setStatus("error");
        setMessage("Wrong password.");
        return;
      }

      setSession(toSessionProfile(matchedProfile));
      setStatus("success");
      setMessage(`Welcome ${matchedProfile.name}. Redirecting...`);
      router.push(role === "admin" ? "/admin" : "/student");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to login.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="grid-glow absolute inset-0 opacity-25" />
      <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
        >
          <GlassCard className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-cyan-300">
              <BookOpenCheck className="h-4 w-4" />
              Attendance Portal
            </div>

            <h1 className="neon-text mt-6 max-w-3xl font-display text-4xl font-extrabold uppercase tracking-[0.14em] text-white sm:text-5xl">
              Student And Admin Portal
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Use separate login and signup pages for students and admins.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {Object.entries(ROLE_COPY).map(([entryRole, config]) => {
                const EntryIcon = config.icon;

                return (
                  <button
                    key={entryRole}
                    type="button"
                    onClick={() => setRole(entryRole)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      role === entryRole
                        ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.12)]"
                        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/20"
                    }`}
                  >
                    <EntryIcon className="h-6 w-6 text-cyan-300" />
                    <p className="mt-4 font-display text-lg text-white">{config.label}</p>
                    <p className="mt-2 text-sm text-slate-400">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  {currentRole.label}
                </p>
                <h2 className="mt-2 font-display text-3xl text-white">{currentRole.title}</h2>
              </div>
              <CurrentIcon className="h-8 w-8 text-cyan-300" />
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                  Roll Number or User ID
                </span>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(event) => updateLoginForm("identifier", event.target.value)}
                  placeholder="Enter your ID"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                  Password
                </span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => updateLoginForm("password", event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3.5 font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:scale-[1.01]"
              >
                Open {role === "admin" ? "Admin" : "Student"} Portal
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-8">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Create Account</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/register/student"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  <UserPlus2 className="h-4 w-4" />
                  Student Signup
                </Link>
                <Link
                  href="/register/admin"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  <UserPlus2 className="h-4 w-4" />
                  Admin Signup
                </Link>
              </div>
            </div>

            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                status === "error"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                  : status === "success"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {message}
            </div>
          </GlassCard>
        </motion.section>

        <section className="space-y-6">
          <TimetableBoard />
          <HolidayPanel holidays={holidays} />
        </section>
      </div>
    </main>
  );
}
