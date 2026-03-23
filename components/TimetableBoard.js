import GlassCard from "@/components/GlassCard";
import { PERIODS, SUBJECTS, WEEKLY_TIMETABLE } from "@/utils/timetable";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TIMETABLE_SLOTS = [
  ...PERIODS.slice(0, 2).map((period) => ({ type: "period", ...period })),
  { type: "break",  id: "short-break", label: "Break",  startTime: "10:10", endTime: "10:30" },
  ...PERIODS.slice(2, 4).map((period) => ({ type: "period", ...period })),
  { type: "break",  id: "lunch-break", label: "Lunch Break", startTime: "12:10", endTime: "14:30" },
  ...PERIODS.slice(4).map((period) => ({ type: "period", ...period })),
];


export default function TimetableBoard() {
  return (
    <GlassCard className="mx-auto w-full max-w-6xl overflow-hidden">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Class Timetable</p>
        <h3 className="mt-2 font-display text-xl text-white">Time Table</h3>
        <p className="mt-2 text-sm text-slate-400">
          Scan within 5 minutes of class start for attendance.
        </p>
      </div>

      <div className="max-h-[34rem] overflow-auto scrollbar-thin">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.22em] text-slate-400">
            <tr>
              <th className="px-5 py-4">Day</th>
              {TIMETABLE_SLOTS.map((slot) => (
                <th key={slot.id} className="min-w-[140px] px-5 py-4">
                  <div>
                    <p>{slot.label}</p>
                    <p className="mt-1 text-[10px] tracking-[0.18em] text-slate-500">
                      {slot.startTime} to {slot.endTime}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="border-t border-white/[0.06] align-top">
                <td className="px-5 py-4 font-display text-base text-white">{day}</td>
                {TIMETABLE_SLOTS.map((slot) => {
                  if (slot.type !== "period") {
                    return (
                      <td key={`${day}-${slot.id}`} className="px-5 py-4">
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 px-3 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {slot.label}
                        </div>
                      </td>
                    );
                  }

                  const facultyCode = WEEKLY_TIMETABLE[day]?.[slot.id];
                  const subject = facultyCode ? SUBJECTS[facultyCode] : null;

                  return (
                    <td key={`${day}-${slot.id}`} className="px-5 py-4">
                      {subject ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                          <p className="font-display text-base text-cyan-300">{subject.facultyCode}</p>
                          <p className="mt-1 text-sm text-white">{subject.subjectName}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {subject.courseCode}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/8 bg-slate-950/20 px-3 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                          No class
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
