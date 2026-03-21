import GlassCard from "@/components/GlassCard";

export default function HolidayPanel({ holidays }) {
  return (
    <GlassCard className="mx-auto w-full max-w-6xl p-6">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Holidays</p>
      <h3 className="mt-2 font-display text-xl text-white">Holiday Rules</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Saturday and Sunday are holidays. Add `publicHolidays` in Firestore for special dates.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          Saturday Holiday
        </span>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          Sunday Holiday
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {holidays.length > 0 ? (
          holidays.map((holiday, index) => (
            <div
              key={holiday.id || `${holiday.dateKey}-${holiday.name}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <p className="font-display text-base text-white">{holiday.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                {holiday.dateKey}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
            No public holidays added yet.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
