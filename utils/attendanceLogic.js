export const DEFAULT_PERIODS = [
  { id: "period-1", label: "Period 1", startTime: "10:00", presentWindowMinutes: 10 },
  { id: "period-2", label: "Period 2", startTime: "11:30", presentWindowMinutes: 10 },
  { id: "period-3", label: "Period 3", startTime: "14:00", presentWindowMinutes: 10 },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDisplayTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function parseTimestamp(value) {
  if (!value) {
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

function buildTimestamp(record) {
  const directValue =
    record.time ||
    record.timestamp ||
    record.detectedAt ||
    record.scannedAt ||
    record.createdAt;

  if (directValue) {
    return directValue;
  }

  if (record.date && record.time) {
    return `${record.date} ${record.time}`;
  }

  return null;
}

function minutesFromTimeString(time) {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function resolvePeriod(periodId) {
  return (
    DEFAULT_PERIODS.find((period) => period.id === periodId) || DEFAULT_PERIODS[0]
  );
}

export function deriveStatus(timestamp, periodId) {
  const date = parseTimestamp(timestamp);
  const period = resolvePeriod(periodId);

  if (!date) {
    return {
      status: "Absent",
      isLate: false,
      minutesLate: null,
      period,
    };
  }

  const classStartMinutes = minutesFromTimeString(period.startTime);
  const graceCutoff = classStartMinutes + period.presentWindowMinutes;
  const scanMinutes = date.getHours() * 60 + date.getMinutes();
  const minutesLate = Math.max(scanMinutes - classStartMinutes, 0);
  const isLate = scanMinutes > graceCutoff;

  return {
    status: isLate ? "Absent" : "Present",
    isLate,
    minutesLate,
    period,
  };
}

function flattenAttendanceTree(node, path = [], records = []) {
  if (!node || typeof node !== "object") {
    return records;
  }

  const looksLikeRecord =
    Object.prototype.hasOwnProperty.call(node, "status") ||
    Object.prototype.hasOwnProperty.call(node, "time") ||
    Object.prototype.hasOwnProperty.call(node, "timestamp") ||
    Object.prototype.hasOwnProperty.call(node, "userID") ||
    Object.prototype.hasOwnProperty.call(node, "userId") ||
    Object.prototype.hasOwnProperty.call(node, "uid");

  if (looksLikeRecord) {
    records.push({ ...node, __path: path });
    return records;
  }

  Object.entries(node).forEach(([key, value]) => {
    flattenAttendanceTree(value, [...path, key], records);
  });

  return records;
}

function normalizeLookupKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildUserLookup(users) {
  if (!users || typeof users !== "object") {
    return {};
  }

  return Object.entries(users).reduce((lookup, [key, value]) => {
    if (value && typeof value === "object") {
      lookup[normalizeLookupKey(key)] = value;
    }
    return lookup;
  }, {});
}

function inferPeriodId(rawRecord) {
  const directValue =
    rawRecord.periodId || rawRecord.period || rawRecord.classPeriod || rawRecord.class;

  if (directValue) {
    const matched = DEFAULT_PERIODS.find(
      (period) =>
        period.id.toLowerCase() === String(directValue).toLowerCase() ||
        period.label.toLowerCase() === String(directValue).toLowerCase()
    );

    if (matched) {
      return matched.id;
    }
  }

  const pathText = rawRecord.__path?.join(" ").toLowerCase() || "";
  const pathMatch = DEFAULT_PERIODS.find((period) =>
    pathText.includes(period.id.toLowerCase()) ||
    pathText.includes(period.label.toLowerCase())
  );

  return pathMatch?.id || DEFAULT_PERIODS[0].id;
}

export function normalizeAttendanceRecords(rawData, users = null) {
  if (!rawData || typeof rawData !== "object") {
    return [];
  }

  const userLookup = buildUserLookup(users);

  return flattenAttendanceTree(rawData)
    .map((record, index) => {
      const timestamp = buildTimestamp(record);
      const date = parseTimestamp(timestamp);
      const periodId = inferPeriodId(record);
      const statusData = deriveStatus(timestamp, periodId);
      const recordId = String(record.id ?? record.userID ?? record.userId ?? record.uid ?? index + 1);
      const userPathKey = record.__path?.find((segment) => /^user[_-]?\d+/i.test(segment));
      const userRecord =
        userLookup[normalizeLookupKey(userPathKey || "")] ||
        userLookup[normalizeLookupKey(`user${recordId}`)] ||
        userLookup[normalizeLookupKey(`user_${recordId}`)] ||
        userLookup[normalizeLookupKey(recordId)];
      const fallbackName = userPathKey || record.__path?.[record.__path.length - 2] || `Student ${index + 1}`;
      const isSuccess =
        !record.status || String(record.status).toUpperCase() === "SUCCESS";

      return {
        recordKey: record.__path?.join("/") || `record-${index + 1}`,
        name: record.name || userRecord?.name || fallbackName,
        id: recordId,
        timestamp,
        date,
        dateKey: date ? formatDateKey(date) : "unknown",
        timeDetected: date ? formatDisplayTime(date) : "Not available",
        displayDate: date ? formatDisplayDate(date) : "Unknown date",
        status: isSuccess ? statusData.status : "Absent",
        isLate: isSuccess ? statusData.isLate : false,
        minutesLate: statusData.minutesLate,
        periodId,
        periodLabel: statusData.period.label,
        classStartTime: statusData.period.startTime,
        rawStatus: record.status || "UNKNOWN",
      };
    })
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

export function getPeriodOptions(records) {
  const dynamicPeriods = records
    .map((record) => ({ id: record.periodId, label: record.periodLabel }))
    .filter(
      (period, index, array) =>
        array.findIndex((item) => item.id === period.id) === index
    );

  return DEFAULT_PERIODS.map((period) => {
    const matched = dynamicPeriods.find((item) => item.id === period.id);
    return matched || period;
  });
}

export function filterAttendanceRecords(records, filters) {
  const searchTerm = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    const matchesDate = !filters.date || record.dateKey === filters.date;
    const matchesPeriod = !filters.period || record.periodId === filters.period;
    const matchesSearch =
      !searchTerm ||
      record.name.toLowerCase().includes(searchTerm) ||
      record.id.toLowerCase().includes(searchTerm);

    return matchesDate && matchesPeriod && matchesSearch;
  });
}

export function getAttendanceStats(records) {
  const totalStudents = records.length;
  const presentCount = records.filter((record) => record.status === "Present").length;
  const absentCount = totalStudents - presentCount;
  const lateCount = records.filter((record) => record.isLate).length;
  const attendancePercentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    presentCount,
    absentCount,
    lateCount,
    attendancePercentage,
  };
}

export function getChartData(records) {
  const stats = getAttendanceStats(records);
  const periodBreakdown = getPeriodOptions(records).map((period) => {
    const periodRecords = records.filter((record) => record.periodId === period.id);
    const periodStats = getAttendanceStats(periodRecords);

    return {
      name: period.label,
      Present: periodStats.presentCount,
      Absent: periodStats.absentCount,
    };
  });

  return {
    summary: [
      { name: "Present", value: stats.presentCount, fill: "#4ade80" },
      { name: "Absent", value: stats.absentCount, fill: "#fb7185" },
    ],
    periods: periodBreakdown,
  };
}

export function downloadAttendanceCsv(records, filename = "attendance-report.csv") {
  const header = [
    "Student Name",
    "Student ID",
    "Date",
    "Time Detected",
    "Class Period",
    "Class Start",
    "Status",
    "Late Entry",
    "Minutes Late",
  ];

  const rows = records.map((record) => [
    record.name,
    record.id,
    record.displayDate,
    record.timeDetected,
    record.periodLabel,
    record.classStartTime,
    record.status,
    record.isLate ? "Yes" : "No",
    record.minutesLate ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
