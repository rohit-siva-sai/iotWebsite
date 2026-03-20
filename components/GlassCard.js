import clsx from "clsx";

export default function GlassCard({ className, children }) {
  return (
    <div className={clsx("glass-panel glow-ring rounded-3xl", className)}>
      {children}
    </div>
  );
}
