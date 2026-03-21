export const PERIODS = [
  { id: "period-1", label: "Period 1", startTime: "08:30", endTime: "09:20" },
  { id: "period-2", label: "Period 2", startTime: "09:20", endTime: "10:10" },
  { id: "period-3", label: "Period 3", startTime: "10:30", endTime: "11:20" },
  { id: "period-4", label: "Period 4", startTime: "11:20", endTime: "12:10" },
  { id: "period-5", label: "Period 5", startTime: "14:30", endTime: "15:20" },
  { id: "period-6", label: "Period 6", startTime: "15:20", endTime: "16:10" },
  { id: "period-7", label: "Period 7", startTime: "16:20", endTime: "17:10" },
];

export const SUBJECTS = {
  A: {
    facultyCode: "A",
    courseCode: "CS602",
    subjectName: "Service Oriented Architecture & Web Security",
    facultyName: "Dr. C. Mala",
  },
  B: {
    facultyCode: "B",
    courseCode: "CS604",
    subjectName: "Advances in Operating Systems",
    facultyName: "Dr. S. Mary Saira Bhanu",
  },
  P: {
    facultyCode: "P",
    courseCode: "CS606",
    subjectName: "Data Science and AI Lab",
    facultyName: "Dr. C. Oswald",
  },
  Q: {
    facultyCode: "Q",
    courseCode: "CS608",
    subjectName: "Web Development Lab",
    facultyName: "Mr. Abhijith Balan & Ms. Thamizharsi N",
  },
  C: {
    facultyCode: "C",
    courseCode: "CS618",
    subjectName: "Internet of Things",
    facultyName: "Dr. B. Nithya",
  },
  D: {
    facultyCode: "D",
    courseCode: "CS641",
    subjectName: "Big Data Analytics and Mining",
    facultyName: "Dr. S. Jaya Nirmala",
  },
  F: {
    facultyCode: "F",
    courseCode: "CS651",
    subjectName: "Advanced Digital Design",
    facultyName: "Dr. N. Ramasubramanian",
  },
  E: {
    facultyCode: "E",
    courseCode: "CS656",
    subjectName: "Reinforcement Learning",
    facultyName: "Dr. S. Usha Kiruthika",
  },
};

export const WEEKLY_TIMETABLE = {
  Monday: {
    "period-1": null,
    "period-2": "C",
    "period-3": "B",
    "period-4": "B",
    "period-5": "P",
    "period-6": null,
    "period-7": null,
  },
  Tuesday: {
    "period-1": null,
    "period-2": "D",
    "period-3": "C",
    "period-4": "B",
    "period-5": "E",
    "period-6": "F",
    "period-7": null,
  },
  Wednesday: {
    "period-1": null,
    "period-2": "E",
    "period-3": "D",
    "period-4": "A",
    "period-5": "C",
    "period-6": null,
    "period-7": "P",
  },
  Thursday: {
    "period-1": null,
    "period-2": "A",
    "period-3": "D",
    "period-4": "B",
    "period-5": null,
    "period-6": "Q",
    "period-7": null,
  },
  Friday: {
    "period-1": null,
    "period-2": "F",
    "period-3": "A",
    "period-4": "C",
    "period-5": "E",
    "period-6": null,
    "period-7": null,
  },
  Saturday: {},
  Sunday: {},
};

function toMinutes(timeValue) {
  const [hours = "0", minutes = "0"] = String(timeValue).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getWeekdayName(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

export function getWeekKey(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getPeriodByTime(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return PERIODS.find((period) => {
    const start = toMinutes(period.startTime);
    const end = toMinutes(period.endTime);
    return minutes >= start && minutes <= end;
  }) || null;
}

export function getScheduleForDay(dayName) {
  return WEEKLY_TIMETABLE[dayName] || {};
}

export function getSubjectForSession(dayName, periodId) {
  const facultyCode = getScheduleForDay(dayName)[periodId];

  if (!facultyCode) {
    return null;
  }

  return SUBJECTS[facultyCode] || null;
}

export function getSessionForTimestamp(date) {
  const weekday = getWeekdayName(date);
  const period = getPeriodByTime(date);

  if (!period) {
    return null;
  }

  const subject = getSubjectForSession(weekday, period.id);

  if (!subject) {
    return null;
  }

  return {
    weekday,
    period,
    subject,
  };
}

export function getMinutesAfterPeriodStart(date, period) {
  return date.getHours() * 60 + date.getMinutes() - toMinutes(period.startTime);
}
