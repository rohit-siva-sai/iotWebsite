import {
  PERIODS,
  SUBJECTS,
  WEEKLY_TIMETABLE,
  formatDateKey,
  getWeekKey,
  getWeekdayName,
} from "@/utils/timetable";

export const TERM_START_DATE = "2026-01-05";
export const CLASSWORK_END_DATE = "2026-05-21";

export const ACADEMIC_HOLIDAYS = [
  { dateKey: "2026-01-14", name: "Pongal" },
  { dateKey: "2026-01-26", name: "Republic Day" },
  { dateKey: "2026-03-04", name: "Holi" },
  { dateKey: "2026-03-21", name: "Id-ul-Fitr" },
  { dateKey: "2026-04-03", name: "Good Friday" },
  { dateKey: "2026-05-01", name: "Budha Purnima" },
];

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTimeLabel(value) {
  return value.replace(":", "");
}

export function buildHolidayMap(holidays = []) {
  return holidays.reduce((lookup, holiday) => {
    lookup[holiday.dateKey] = holiday.name;
    return lookup;
  }, {});
}

export function generateBaseClassSessions(holidays = ACADEMIC_HOLIDAYS) {
  const sessions = [];
  const holidayMap = buildHolidayMap(holidays);
  const current = parseDateKey(TERM_START_DATE);
  const end = parseDateKey(CLASSWORK_END_DATE);

  while (current <= end) {
    const dateKey = formatDateKey(current);
    const weekday = getWeekdayName(current);
    const isWeekend = weekday === "Saturday" || weekday === "Sunday";

    if (!isWeekend && !holidayMap[dateKey]) {
      const daySchedule = WEEKLY_TIMETABLE[weekday] || {};

      PERIODS.forEach((period) => {
        const facultyCode = daySchedule[period.id];
        const subject = facultyCode ? SUBJECTS[facultyCode] : null;

        if (!subject) {
          return;
        }

        sessions.push({
          sessionId: `${dateKey}__${period.id}__${subject.courseCode}`,
          source: "timetable",
          dateKey,
          weekKey: getWeekKey(current),
          weekday,
          periodId: period.id,
          periodLabel: period.label,
          periodStart: period.startTime,
          periodEnd: period.endTime,
          startTime: period.startTime,
          endTime: period.endTime,
          subjectCode: subject.courseCode,
          subjectName: subject.subjectName,
          facultyCode: subject.facultyCode,
          facultyName: subject.facultyName,
        });
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return sessions;
}

export function normalizeExtraClass(docSnapshot) {
  const data = docSnapshot.data();

  return {
    sessionId: data.sessionId || docSnapshot.id,
    source: "extra",
    dateKey: data.dateKey,
    weekKey: data.weekKey,
    weekday: data.weekday,
    periodId: data.periodId || `extra-${formatTimeLabel(data.startTime)}`,
    periodLabel: data.periodLabel || "Extra Class",
    periodStart: data.startTime,
    periodEnd: data.endTime,
    startTime: data.startTime,
    endTime: data.endTime,
    subjectCode: data.subjectCode,
    subjectName: data.subjectName,
    facultyCode: data.facultyCode || "",
    facultyName: data.facultyName || "",
    title: data.title || "Extra Class",
  };
}

function toMinutes(timeValue) {
  const [hours = "0", minutes = "0"] = String(timeValue).split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function findMatchingSession(timestamp, sessions) {
  const dateKey = formatDateKey(timestamp);
  const minutes = timestamp.getHours() * 60 + timestamp.getMinutes();

  return (
    sessions.find((session) => {
      if (session.dateKey !== dateKey) {
        return false;
      }

      const start = toMinutes(session.startTime || session.periodStart);
      const end = toMinutes(session.endTime || session.periodEnd);
      return minutes >= start && minutes <= end;
    }) || null
  );
}
