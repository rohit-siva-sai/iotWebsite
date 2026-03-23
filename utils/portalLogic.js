import {
  SUBJECTS,
  formatDateKey,
  getWeekKey,
  getWeekdayName,
  isWeekend,
} from "@/utils/timetable";
import { findMatchingSession } from "@/utils/academicCalendar";

export function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseTimestamp(value) {
  if (!value || value === "No Time") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalizedValue = String(value).trim().replace(" ", "T");
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildSearchTokens({ userId, rollNo, name }) {
  return Array.from(
    new Set(
      [userId, rollNo, name]
        .map((value) => normalizeIdentifier(value))
        .filter(Boolean)
    )
  );
}

export function createProfilePayload(form, role) {
  const userId = String(form.userId || "").trim();
  const rollNo = String(form.rollNo || "").trim();
  const name = String(form.name || "").trim();
  const password = String(form.password || "").trim();
  const subjectKey = String(form.subjectCode || "").trim();
  const subject = SUBJECTS[subjectKey] || null;

  return {
    role,
    userId,
    rollNo,
    name,
    password,
    subjectCode: subject?.courseCode || "",
    subjectName: subject?.subjectName || "",
    facultyCode: subject?.facultyCode || "",
    searchTokens: buildSearchTokens({ userId, rollNo, name }),
    createdAt: new Date().toISOString(),
  };
}

export function toSessionProfile(profile) {
  return {
    profileId: profile.profileId,
    role: profile.role,
    name: profile.name,
    userId: profile.userId,
    rollNo: profile.rollNo,
    subjectCode: profile.subjectCode || "",
    subjectName: profile.subjectName || "",
    studentKey: profile.studentKey || normalizeIdentifier(profile.userId || profile.rollNo || profile.profileId),
  };
}

export function normalizeFirestoreProfile(docSnapshot) {
  const data = docSnapshot.data();
  return {
    profileId: docSnapshot.id,
    role: data.role || "student",
    name: data.name || "Unknown user",
    userId: data.userId || "",
    rollNo: data.rollNo || "",
    password: data.password || "",
    subjectCode: data.subjectCode || "",
    subjectName: data.subjectName || "",
    facultyCode: data.facultyCode || "",
    searchTokens: data.searchTokens || [],
    studentKey:
      data.studentKey ||
      normalizeIdentifier(data.userId || data.rollNo || docSnapshot.id),
  };
}

export function normalizeHoliday(docSnapshot) {
  const data = docSnapshot.data();
  const dateKey = data.dateKey || docSnapshot.id;

  return {
    id: docSnapshot.id,
    dateKey,
    name: data.name || "Public Holiday",
  };
}

export function flattenRealtimeAttendance(node, path = [], records = []) {
  if (!node || typeof node !== "object") {
    return records;
  }

  const looksLikeRecord =
    Object.prototype.hasOwnProperty.call(node, "status") ||
    Object.prototype.hasOwnProperty.call(node, "timestamp") ||
    Object.prototype.hasOwnProperty.call(node, "time") ||
    Object.prototype.hasOwnProperty.call(node, "userID") ||
    Object.prototype.hasOwnProperty.call(node, "userId");

  if (looksLikeRecord) {
    records.push({ ...node, __path: path });
    return records;
  }

  Object.entries(node).forEach(([key, value]) => {
    flattenRealtimeAttendance(value, [...path, key], records);
  });

  return records;
}

export function buildProfileLookup(profiles) {
  return profiles.reduce((lookup, profile) => {
    const keys = [
      normalizeIdentifier(profile.userId),
      normalizeIdentifier(profile.rollNo),
      normalizeIdentifier(profile.profileId),
      normalizeIdentifier(profile.studentKey),
    ].filter(Boolean);

    keys.forEach((key) => {
      lookup[key] = profile;
    });

    return lookup;
  }, {});
}

function resolveNameFromRealtimeUsers(scan, realtimeUsers) {
  const scanUserId = String(scan.userID ?? scan.userId ?? scan.uid ?? "").trim();
  const userPathKey = scan.__path?.find((segment) => segment.toLowerCase().startsWith("user"));
  const candidates = [
    userPathKey,
    `user${scanUserId}`,
    `user_${scanUserId}`,
    scanUserId,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const matchedUser = realtimeUsers?.[candidate];
    if (matchedUser?.name) {
      return matchedUser.name;
    }
  }

  return null;
}

export function processRealtimeAttendance({
  rawAttendance,
  realtimeUsers,
  profiles,
  holidays,
  sessions = [],
}) {
  const profileLookup = buildProfileLookup(profiles);
  const holidayMap = holidays.reduce((lookup, holiday) => {
    lookup[holiday.dateKey] = holiday.name;
    return lookup;
  }, {});

  return flattenRealtimeAttendance(rawAttendance)
    .map((scan, index) => {
      const timestamp = parseTimestamp(scan.timestamp || scan.time);

      if (!timestamp) {
        return null;
      }

      const dateKey = formatDateKey(timestamp);
      const weekKey = getWeekKey(timestamp);

      if (isWeekend(timestamp) || holidayMap[dateKey]) {
        return null;
      }

      const session = findMatchingSession(timestamp, sessions);

      if (!session) {
        return null;
      }

      const identifier = normalizeIdentifier(
        scan.userID ?? scan.userId ?? scan.uid ?? scan.id ?? scan.__path?.[0] ?? ""
      );
      const profile = profileLookup[identifier];
      const fallbackName = resolveNameFromRealtimeUsers(scan, realtimeUsers);
      const studentKey = profile?.studentKey || identifier || `guest-${index + 1}`;
      const profileId = profile?.profileId || `unregistered-${studentKey}`;
      const sessionStart = session.startTime || session.periodStart;
      const sessionEnd = session.endTime || session.periodEnd;
      const minutesAfterStart =
        timestamp.getHours() * 60 + timestamp.getMinutes() -
        Number(sessionStart.split(":")[0]) * 60 -
        Number(sessionStart.split(":")[1]);
      const status = minutesAfterStart <= 5 ? "Present" : "Absent";

      return {
        docId: `${session.sessionId}__${studentKey}`,
        sessionId: session.sessionId,
        profileId,
        studentKey,
        name: profile?.name || fallbackName || `Student ${index + 1}`,
        userId: profile?.userId || String(scan.userID ?? scan.userId ?? scan.uid ?? ""),
        rollNo: profile?.rollNo || "",
        role: profile?.role || "student",
        dateKey,
        weekKey,
        weekday: getWeekdayName(timestamp),
        scannedAt: timestamp.toISOString(),
        minutesAfterStart,
        status,
        isWithinGraceWindow: minutesAfterStart <= 5,
        subjectCode: session.subjectCode,
        subjectName: session.subjectName,
        facultyCode: session.facultyCode,
        facultyName: session.facultyName,
        periodId: session.periodId,
        periodLabel: session.periodLabel,
        periodStart: sessionStart,
        periodEnd: sessionEnd,
        sessionKey: session.sessionId,
        rawRecordKey: scan.__path?.join("/") || `scan-${index + 1}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
}

export function summarizeAttendance(records) {
  const present = records.filter((record) => record.status === "Present").length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const uniqueStudents = new Set(records.map((record) => record.studentKey)).size;
  const uniqueSubjects = new Set(records.map((record) => record.subjectCode)).size;
  const attendanceRate = records.length
    ? Math.round((present / records.length) * 100)
    : 0;

  return {
    totalRecords: records.length,
    present,
    absent,
    uniqueStudents,
    uniqueSubjects,
    attendanceRate,
  };
}

export function groupStudentAttendance(records) {
  return records.reduce((groups, record) => {
    const existing = groups[record.subjectCode] || {
      subjectCode: record.subjectCode,
      subjectName: record.subjectName,
      facultyName: record.facultyName,
      total: 0,
      present: 0,
      absent: 0,
    };

    existing.total += 1;
    existing.present += record.status === "Present" ? 1 : 0;
    existing.absent += record.status === "Absent" ? 1 : 0;
    groups[record.subjectCode] = existing;
    return groups;
  }, {});
}

export function buildStudentSubjectSummary({ sessions = [], attendanceRecords = [] }) {
  const subjectMap = sessions.reduce((groups, session) => {
    const existing = groups[session.subjectCode] || {
      subjectCode: session.subjectCode,
      subjectName: session.subjectName || "Unknown Subject",
      facultyName: session.facultyName || "",
      total: 0,
      present: 0,
      absent: 0,
    };

    existing.total += 1;
    groups[session.subjectCode] = existing;
    return groups;
  }, {});

  const presentBySubject = attendanceRecords.reduce((groups, record) => {
    if (record.status !== "Present" || !record.subjectCode) {
      return groups;
    }

    const key = record.subjectCode;

    if (!groups[key]) {
      groups[key] = new Set();
    }

    groups[key].add(record.sessionId || record.docId || record.id || record.scannedAt || `${key}-${groups[key].size}`);
    return groups;
  }, {});

  Object.entries(presentBySubject).forEach(([subjectCode, presentSessions]) => {
    const existing = subjectMap[subjectCode] || {
      subjectCode,
      subjectName:
        attendanceRecords.find((record) => record.subjectCode === subjectCode)?.subjectName ||
        "Unknown Subject",
      facultyName:
        attendanceRecords.find((record) => record.subjectCode === subjectCode)?.facultyName || "",
      total: 0,
      present: 0,
      absent: 0,
    };

    existing.present = Math.min(existing.total, presentSessions.size);
    subjectMap[subjectCode] = existing;
  });

  Object.values(subjectMap).forEach((subject) => {
    subject.absent = Math.max(subject.total - subject.present, 0);
  });

  return subjectMap;
}

export function groupAttendanceBySubject(records) {
  return records.reduce((groups, record) => {
    const key = record.subjectCode || "UNKNOWN";

    if (!groups[key]) {
      groups[key] = {
        subjectCode: record.subjectCode || "UNKNOWN",
        subjectName: record.subjectName || "Unknown Subject",
        facultyName: record.facultyName || "",
        records: [],
      };
    }

    groups[key].records.push(record);
    return groups;
  }, {});
}

function isPlaceholderStudentName(value) {
  return /^student\s+\d+$/i.test(String(value || "").trim());
}

function getStudentLedgerRecordKey(record) {
  if (record.sessionId) {
    return record.sessionId;
  }

  return [
    record.subjectCode || "",
    record.dateKey || "",
    record.periodStart || "",
    record.periodEnd || "",
    record.periodLabel || "",
  ].join("__");
}

function getAttendanceRecordScore(record) {
  let score = 0;

  if (record.sessionId) {
    score += 5;
  }

  if (record.rollNo) {
    score += 4;
  }

  if (record.userId && String(record.userId).trim().length > 3) {
    score += 3;
  }

  if (record.name && !isPlaceholderStudentName(record.name)) {
    score += 2;
  }

  if (record.studentKey && !String(record.studentKey).startsWith("guest-")) {
    score += 1;
  }

  return score;
}

export function dedupeStudentLedgerRecords(records) {
  const deduped = records.reduce((groups, record) => {
    const key = getStudentLedgerRecordKey(record);
    const existing = groups[key];

    if (!existing) {
      groups[key] = record;
      return groups;
    }

    const existingScore = getAttendanceRecordScore(existing);
    const nextScore = getAttendanceRecordScore(record);

    if (nextScore > existingScore) {
      groups[key] = record;
      return groups;
    }

    if (nextScore === existingScore && (record.scannedAt || "") >= (existing.scannedAt || "")) {
      groups[key] = record;
    }

    return groups;
  }, {});

  return Object.values(deduped).sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
}

export function mergeAttendanceRecords(...recordSets) {
  const merged = {};

  function getAttendanceRecordKey(record) {
    if (record.rawRecordKey) {
      return record.rawRecordKey;
    }

    if (record.sessionId && record.studentKey) {
      return `${record.sessionId}__${record.studentKey}`;
    }

    return record.docId || record.id || "";
  }

  function isPreferredAttendanceRecord(nextRecord, currentRecord) {
    if (!currentRecord) {
      return true;
    }

    const currentPresent = currentRecord.status === "Present";
    const nextPresent = nextRecord.status === "Present";

    if (nextPresent !== currentPresent) {
      return nextPresent;
    }

    const currentGrace = Boolean(currentRecord.isWithinGraceWindow);
    const nextGrace = Boolean(nextRecord.isWithinGraceWindow);

    if (nextGrace !== currentGrace) {
      return nextGrace;
    }

    const currentScore = getAttendanceRecordScore(currentRecord);
    const nextScore = getAttendanceRecordScore(nextRecord);

    if (nextScore !== currentScore) {
      return nextScore > currentScore;
    }

    return (nextRecord.scannedAt || "") >= (currentRecord.scannedAt || "");
  }

  recordSets
    .flat()
    .filter(Boolean)
    .forEach((record) => {
      const key = getAttendanceRecordKey(record);
      if (!key) {
        return;
      }

      const existing = merged[key];

      if (isPreferredAttendanceRecord(record, existing)) {
        merged[key] = record;
      }
    });

  return Object.values(merged).sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
}

export function summarizeStudentAttendance(records) {
  const grouped = records.reduce((groups, record) => {
    const key = record.studentKey || record.userId || record.rollNo || record.name;

    if (!groups[key]) {
      groups[key] = {
        studentKey: key,
        name: record.name,
        rollNo: record.rollNo || "",
        userId: record.userId || "",
        totalClasses: 0,
        present: 0,
        absent: 0,
        late: 0,
      };
    }

    groups[key].totalClasses += 1;
    groups[key].present += record.status === "Present" ? 1 : 0;
    groups[key].absent += record.status === "Absent" ? 1 : 0;
    groups[key].late += record.minutesAfterStart > 5 ? 1 : 0;
    return groups;
  }, {});

  return Object.values(grouped)
    .map((student) => ({
      ...student,
      attendanceRate: student.totalClasses
        ? Math.round((student.present / student.totalClasses) * 100)
        : 0,
    }))
    .sort((a, b) => {
      const aRoll = a.rollNo || a.userId || "";
      const bRoll = b.rollNo || b.userId || "";
      return aRoll.localeCompare(bRoll, undefined, { numeric: true, sensitivity: "base" });
    });
}

export function buildAdminRoster(profiles, count = 33) {
  const studentProfiles = profiles.filter((profile) => profile.role === "student");
  const profileLookup = studentProfiles.reduce((lookup, profile) => {
    const keys = [
      normalizeIdentifier(profile.userId),
      normalizeIdentifier(profile.rollNo),
      normalizeIdentifier(profile.studentKey),
    ].filter(Boolean);

    keys.forEach((key) => {
      lookup[key] = profile;
    });

    return lookup;
  }, {});

  return Array.from({ length: count }, (_, index) => {
    const studentId = String(index + 1);
    const lookupKey = normalizeIdentifier(studentId);
    const profile = profileLookup[lookupKey];

    return {
      studentKey: profile?.studentKey || lookupKey,
      name: profile?.name || `Student ID ${studentId}`,
      rollNo: profile?.rollNo || "",
      userId: profile?.userId || studentId,
      role: "student",
    };
  });
}

export function buildProfessorSubjectSummary({ roster, sessions, attendanceRecords }) {
  const recordLookup = attendanceRecords.reduce((lookup, record) => {
    lookup[`${record.sessionId}__${record.studentKey}`] = record;
    return lookup;
  }, {});

  return roster
    .map((profile) => {
      const totalClasses = sessions.length;
      let present = 0;
      let late = 0;

      sessions.forEach((session) => {
        const record = recordLookup[`${session.sessionId}__${profile.studentKey}`];

        if (record?.status === "Present") {
          present += 1;
        }

        if (record?.minutesAfterStart > 5) {
          late += 1;
        }
      });

      const absent = Math.max(totalClasses - present, 0);

      return {
        studentKey: profile.studentKey,
        name: profile.name,
        rollNo: profile.rollNo || "",
        userId: profile.userId || "",
        totalClasses,
        present,
        absent,
        late,
        attendanceRate: totalClasses ? Math.round((present / totalClasses) * 100) : 0,
      };
    })
    .sort((a, b) =>
      (a.rollNo || a.userId || "").localeCompare(b.rollNo || b.userId || "", undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
}

export function buildLatestDayAttendance({ roster, sessions, attendanceRecords }) {
  if (!sessions.length) {
    return { latestDateKey: "", rows: [] };
  }

  const latestDateKey = sessions
    .map((session) => session.dateKey)
    .sort()
    .at(-1);

  const latestSessions = sessions.filter((session) => session.dateKey === latestDateKey);
  const sessionIds = new Set(latestSessions.map((session) => session.sessionId));
  const recordLookup = attendanceRecords.reduce((lookup, record) => {
    if (sessionIds.has(record.sessionId)) {
      lookup[`${record.sessionId}__${record.studentKey}`] = record;
    }
    return lookup;
  }, {});

  const rows = roster
    .map((profile) => {
      const latestRecord = latestSessions
        .map((session) => recordLookup[`${session.sessionId}__${profile.studentKey}`])
        .find(Boolean);

      return {
        studentKey: profile.studentKey,
        name: profile.name,
        rollNo: profile.rollNo || "",
        userId: profile.userId || "",
        status: latestRecord?.status || "Absent",
        late: Boolean(latestRecord && latestRecord.minutesAfterStart > 5),
        scannedAt: latestRecord?.scannedAt || null,
        periodLabel: latestRecord?.periodLabel || latestSessions[0]?.periodLabel || "",
      };
    })
    .sort((a, b) =>
      (a.rollNo || a.userId || "").localeCompare(b.rollNo || b.userId || "", undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  return { latestDateKey, rows };
}

export function formatReadableDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatReadableTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
