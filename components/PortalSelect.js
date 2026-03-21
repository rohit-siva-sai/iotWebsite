import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export default function PortalSelect({
  value,
  onChange,
  children,
  className,
  wrapperClassName,
  ...props
}) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(3,6,17,0.25)] transition duration-200 hover:border-cyan-300/25 focus-within:border-cyan-300/40 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_0_24px_rgba(34,211,238,0.1)]",
        wrapperClassName
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-linear-to-l from-cyan-400/10 via-transparent to-transparent opacity-70 transition duration-200 group-focus-within:from-cyan-400/18" />
      <select
        value={value}
        onChange={onChange}
        className={clsx(
          "relative z-10 w-full appearance-none bg-transparent px-4 py-3.5 pr-12 text-sm text-white outline-none",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-cyan-300 transition duration-200 group-focus-within:scale-110 group-focus-within:text-cyan-200" />
    </div>
  );
}
