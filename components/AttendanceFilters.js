import PortalSelect from "@/components/PortalSelect";

export default function AttendanceFilters({
  filters,
  periods,
  onChange,
  onClear,
  onExport,
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr_0.85fr_auto_auto]">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
          Search Student
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Name or ID"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.08]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
          Filter By Date
        </span>
        <input
          type="date"
          value={filters.date}
          onChange={(event) => onChange("date", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/[0.08]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
          Class Period
        </span>
        <PortalSelect
          value={filters.period}
          onChange={(event) => onChange("period", event.target.value)}
        >
          <option value="">All Periods</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </PortalSelect>
      </label>

      <button
        type="button"
        onClick={onClear}
        className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/10"
      >
        Reset Filters
      </button>

      <button
        type="button"
        onClick={onExport}
        className="mt-auto rounded-2xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition hover:scale-[1.02]"
      >
        Export CSV
      </button>
    </div>
  );
}
