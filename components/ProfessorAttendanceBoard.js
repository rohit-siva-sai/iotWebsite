import GlassCard from "@/components/GlassCard";

export default function ProfessorAttendanceBoard({
  students,
  subjectName,
  subjectCode,
  latestDateKey,
  latestRows,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Professor View</p>
          <h3 className="mt-2 font-display text-xl text-white">
            {subjectCode} {subjectName ? `• ${subjectName}` : ""}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Student-wise total attendance for this subject.
          </p>
        </div>

        <div className="hidden max-h-[42rem] overflow-auto scrollbar-thin md:block">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="sticky top-0 z-10 bg-slate-950/95 text-xs uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Classes</th>
                <th className="px-6 py-4">Present</th>
                <th className="px-6 py-4">Absent</th>
                <th className="px-6 py-4">Late</th>
                <th className="px-6 py-4">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.studentKey} className="border-t border-white/[0.06]">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-white">{student.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {student.rollNo || student.userId || "No ID"}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-display text-base text-slate-100 [text-shadow:0_0_12px_rgba(255,255,255,0.18)]">
                      {student.totalClasses}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-display text-base text-emerald-300 [text-shadow:0_0_12px_rgba(52,211,153,0.34)]">
                      {student.present}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-display text-base text-rose-300 [text-shadow:0_0_12px_rgba(251,113,133,0.34)]">
                      {student.absent}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-display text-base text-amber-300 [text-shadow:0_0_12px_rgba(252,211,77,0.34)]">
                      {student.late}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-display text-sm text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.18)]">
                      {student.attendanceRate}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid max-h-[42rem] gap-4 overflow-auto p-4 scrollbar-thin md:hidden">
          {students.map((student) => (
            <div
              key={student.studentKey}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {student.rollNo || student.userId || "No ID"}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-right">
                  <p className="font-display text-lg text-cyan-300">{student.attendanceRate}%</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Attendance</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Classes</span>
                  <p className="mt-1 font-display text-base text-slate-100 [text-shadow:0_0_12px_rgba(255,255,255,0.18)]">
                    {student.totalClasses}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Present</span>
                  <p className="mt-1 font-display text-base text-emerald-300 [text-shadow:0_0_12px_rgba(52,211,153,0.34)]">
                    {student.present}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Absent</span>
                  <p className="mt-1 font-display text-base text-rose-300 [text-shadow:0_0_12px_rgba(251,113,133,0.34)]">
                    {student.absent}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Late</span>
                  <p className="mt-1 font-display text-base text-amber-300 [text-shadow:0_0_12px_rgba(252,211,77,0.34)]">
                    {student.late}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Latest Attendance</p>
          <h3 className="mt-2 font-display text-xl text-white">
            {latestDateKey || "No Class Date"}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Latest day attendance for all students in this subject.
          </p>
        </div>

        <div className="max-h-[46rem] overflow-auto scrollbar-thin">
          <div className="grid gap-3 p-4">
            {latestRows.length > 0 ? (
              latestRows.map((row) => (
                <div
                  key={row.studentKey}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.rollNo || row.userId || "No ID"}
                      </p>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        row.status === "Present"
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-400/25 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {row.status}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>{row.periodLabel || "No Session"}</span>
                    {row.late ? <span className="text-amber-300">Late</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center text-slate-400">
                No attendance found for the latest class day.
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
