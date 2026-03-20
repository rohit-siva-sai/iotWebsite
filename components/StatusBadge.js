import clsx from "clsx";

const styles = {
  Present:
    "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_22px_rgba(74,222,128,0.24)]",
  Absent:
    "border-rose-400/30 bg-rose-500/15 text-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.22)]",
};

export default function StatusBadge({ status, isLate }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]",
          styles[status] || styles.Absent
        )}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
        {status}
      </span>
      {isLate ? (
        <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200">
          Late Entry
        </span>
      ) : null}
    </div>
  );
}
