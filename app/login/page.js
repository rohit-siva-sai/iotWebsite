import Link from "next/link";
import GlassCard from "@/components/GlassCard";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-3xl">
        <GlassCard className="p-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Portal Updated</p>
          <h1 className="mt-3 font-display text-3xl text-white">
            Login now starts from the home page
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Student and admin login have been moved to the landing page so new users can create their
            Firestore profile before entering the portal.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
          >
            Go to Home Login
          </Link>
        </GlassCard>
      </div>
    </main>
  );
}
