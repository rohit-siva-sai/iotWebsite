"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { GraduationCap } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { firestore } from "@/lib/firebase";
import { useSessionStore } from "@/lib/sessionStore";
import {
  createProfilePayload,
  normalizeIdentifier,
  toSessionProfile,
} from "@/utils/portalLogic";

export default function StudentRegisterPage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [form, setForm] = useState({
    name: "",
    rollNo: "",
    userId: "",
    password: "",
  });
  const [message, setMessage] = useState("Create your student account.");
  const [status, setStatus] = useState("idle");

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.rollNo.trim() || !form.userId.trim() || !form.password.trim()) {
      setStatus("error");
      setMessage("Fill name, roll number, user ID, and password.");
      return;
    }

    const payload = createProfilePayload(form, "student");
    const primaryKey = normalizeIdentifier(form.userId || form.rollNo);

    setStatus("loading");
    setMessage("Creating account...");

    try {
      const existingQuery = query(
        collection(firestore, "users"),
        where("searchTokens", "array-contains", primaryKey),
        limit(1)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        setStatus("error");
        setMessage("Student account already exists.");
        return;
      }

      const profileRef = doc(firestore, "users", `student-${primaryKey}`);
      await setDoc(profileRef, {
        ...payload,
        studentKey: primaryKey,
        createdAt: serverTimestamp(),
      });

      setSession(
        toSessionProfile({
          ...payload,
          profileId: profileRef.id,
          studentKey: primaryKey,
        })
      );
      setStatus("success");
      setMessage("Student account created. Redirecting...");
      router.push("/student");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to create account.");
    }
  }

  return (
    <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-3xl">
        <GlassCard className="p-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-cyan-300">
            <GraduationCap className="h-4 w-4" />
            Student Signup
          </div>

          <h1 className="mt-6 font-display text-3xl text-white">Create Student Account</h1>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Name"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
            />
            <input
              type="text"
              value={form.rollNo}
              onChange={(event) => updateForm("rollNo", event.target.value)}
              placeholder="Roll Number"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
            />
            <input
              type="text"
              value={form.userId}
              onChange={(event) => updateForm("userId", event.target.value)}
              placeholder="User ID"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3.5 font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:scale-[1.01]"
            >
              Create Student Account
            </button>
          </form>

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

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
          >
            Back to Login
          </Link>
        </GlassCard>
      </div>
    </main>
  );
}
