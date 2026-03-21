import GlassCard from "@/components/GlassCard";
import StatusBadge from "@/components/StatusBadge";
import {
  formatReadableDate,
  formatReadableTime,
  groupAttendanceBySubject,
} from "@/utils/portalLogic";

export default function AttendanceLedger({ records, mode = "admin" }) {
  const subjectGroups = Object.values(groupAttendanceBySubject(records));
  const mobileListClassName =
    mode === "student"
      ? "grid max-h-[36rem] gap-4 overflow-auto p-4 scrollbar-thin md:hidden"
      : "grid gap-4 p-4 md:hidden";
  const tableWrapperClassName =
    mode === "student"
      ? "hidden max-h-[36rem] overflow-auto scrollbar-thin md:block"
      : "hidden overflow-x-auto scrollbar-thin md:block";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Attendance Ledger</p>
        <h3 className="mt-2 font-display text-xl text-white">
          {mode === "admin" ? "Attendance By Subject" : "My Subjects"}
        </h3>
      </div>

      {subjectGroups.length > 0 ? (
        subjectGroups.map((group) => (
          <GlassCard key={group.subjectCode} className="overflow-hidden">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {group.subjectCode}
              </p>
              <h4 className="mt-2 font-display text-xl text-white">{group.subjectName}</h4>
              <p className="mt-2 text-sm text-slate-400">
                {group.facultyName} • {group.records.length} record
                {group.records.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className={mobileListClassName}>
              {group.records.map((record) => (
                <div
                  key={record.id || record.docId}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{record.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {record.rollNo || record.userId || "No ID"}
                      </p>
                    </div>
                    <StatusBadge status={record.status} isLate={record.status === "Absent"} />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p>
                      {formatReadableDate(record.scannedAt)} at {formatReadableTime(record.scannedAt)}
                    </p>
                    <p className="text-slate-400">
                      {record.periodLabel} • {record.periodStart} to {record.periodEnd}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className={tableWrapperClassName}>
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead
                  className={`text-xs uppercase tracking-[0.22em] text-slate-400 ${
                    mode === "student" ? "sticky top-0 z-10 bg-slate-950/95 backdrop-blur" : "bg-white/5"
                  }`}
                >
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((record) => (
                    <tr key={record.id || record.docId} className="border-t border-white/[0.06]">
                      <td className="px-6 py-5">
                        <p className="font-semibold text-white">{record.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {record.rollNo || record.userId || "No ID"}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        {formatReadableDate(record.scannedAt)}
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        {formatReadableTime(record.scannedAt)}
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        <p>{record.periodLabel}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {record.periodStart} to {record.periodEnd}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={record.status} isLate={record.status === "Absent"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))
      ) : (
        <GlassCard className="p-8 text-center text-slate-400">
          No attendance has been stored yet.
        </GlassCard>
      )}
    </div>
  );
}
