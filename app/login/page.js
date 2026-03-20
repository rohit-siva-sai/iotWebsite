"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LockKeyhole, ScanFace, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/GlassCard";

const DEMO_CREDENTIALS = {
  email: "admin@biopulse.ai",
  password: "admin123",
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
  const [message, setMessage] = useState("Use the demo credentials to preview the admin portal.");
  const [status, setStatus] = useState("idle");

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const isValid =
      form.email === DEMO_CREDENTIALS.email && form.password === DEMO_CREDENTIALS.password;

    if (isValid) {
      setStatus("success");
      setMessage("Access granted. Dashboard access is ready for integration with a real auth provider.");
      return;
    }

    setStatus("error");
    setMessage("Credentials do not match the demo admin account.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-white">
      <div className="grid-glow absolute inset-0 opacity-40" />
      <div className="absolute left-[-5rem] top-[-4rem] h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-2rem] h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-300">
            Secure Admin Gateway
          </span>
          <h1 className="neon-text mt-6 max-w-2xl font-display text-4xl font-extrabold tracking-[0.14em] text-white sm:text-6xl">
            Command the smart classroom from a single biometric console.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Review live attendance streams, verify fingerprint scans, and monitor class health through a cyber-inspired control room.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[ScanFace, ShieldCheck, LockKeyhole].map((Icon, index) => (
              <GlassCard key={index} className="p-5">
                <Icon className="h-6 w-6 text-cyan-300" />
                <p className="mt-4 font-display text-sm uppercase tracking-[0.2em] text-white">
                  {index === 0 ? "Biometric Sync" : index === 1 ? "Realtime Audit" : "Protected Access"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {index === 0
                    ? "Fingerprint events stream directly into the dashboard."
                    : index === 1
                      ? "Status validation updates instantly as entries arrive."
                      : "Admin access flow is ready for Firebase Auth or custom auth."}
                </p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <GlassCard className="mx-auto max-w-lg p-8">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Admin Login</p>
            <h2 className="mt-3 font-display text-3xl text-white">Authenticate Access</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Demo credentials are prefilled so you can preview the complete flow quickly.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => handleChange("password", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:scale-[1.01]"
              >
                Enter Admin Console
              </button>
            </form>

            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                status === "error"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                  : status === "success"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {message}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-400">
              <span>Demo: admin@biopulse.ai / admin123</span>
              <Link href="/" className="text-cyan-300 transition hover:text-cyan-200">
                Back to dashboard
              </Link>
            </div>
          </GlassCard>
        </motion.section>
      </div>
    </main>
  );
}
