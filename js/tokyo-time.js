export function parseTimeRange(value) {
  const match = /^(\d{1,2}):(\d{2})-(?:(\d{1,2}):(\d{2}))?$/.exec(value || "");
  if (!match) return null;

  const start = Number(match[1]) * 60 + Number(match[2]);
  const hasEnd = match[3] !== undefined;
  const end = hasEnd ? Number(match[3]) * 60 + Number(match[4]) : null;

  if (start < 0 || start >= 24 * 60) return null;
  if (end !== null && (end < 0 || end > 24 * 60 || end <= start)) return null;

  return { start, end, openEnded: end === null };
}

export function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
    clock: `${parts.hour}:${parts.minute}`,
  };
}

export function getDefaultDay(dates, nowParts) {
  if (dates.includes(nowParts.date)) return nowParts.date;
  const nextDate = dates.find((date) => date > nowParts.date);
  return nextDate || dates.at(-1);
}

export function getProgramStatus(schedule, now = new Date()) {
  const dates = schedule.event.dates;
  const timeZone = schedule.event.timezone;
  const nowParts = getZonedParts(now, timeZone);
  const sessions = schedule.sessions
    .map((session) => ({ ...session, range: parseTimeRange(session.time) }))
    .filter((session) => session.range);

  if (dates.includes(nowParts.date)) {
    const current = sessions.filter((session) => {
      if (session.day !== nowParts.date) return false;
      const end = session.range.end ?? 24 * 60;
      return nowParts.minuteOfDay >= session.range.start && nowParts.minuteOfDay < end;
    });

    if (current.length) {
      return { type: "current", sessions: current, nowParts };
    }

    return { type: "idle", sessions: [], nowParts };
  }

  if (nowParts.date < dates[0]) {
    return { type: "next", sessions: earliestSessions(sessions), nowParts };
  }

  const nextDate = dates.find((date) => date > nowParts.date);
  if (nextDate) {
    return {
      type: "next",
      sessions: earliestSessions(sessions.filter((session) => session.day === nextDate)),
      nowParts,
    };
  }

  return { type: "ended", sessions: [], nowParts };
}

function earliestSessions(sessions) {
  if (!sessions.length) return [];
  const sorted = [...sessions].sort((a, b) => {
    const dayOrder = a.day.localeCompare(b.day);
    return dayOrder || a.range.start - b.range.start;
  });
  const first = sorted[0];
  return sorted.filter(
    (session) => session.day === first.day && session.range.start === first.range.start,
  );
}

export function formatDateRange(dates) {
  if (!dates.length) return "";
  const first = dateFromIso(dates[0]);
  const last = dateFromIso(dates.at(-1));
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(first);
  const firstDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(first);
  const lastDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(last);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }).format(last);

  if (dates[0] === dates.at(-1)) return `${month} ${firstDay}, ${year}`;
  return `${month} ${firstDay}–${lastDay}, ${year}`;
}

export function formatDayTab(date, index) {
  const parsed = dateFromIso(date);
  const detail = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return { label: `Day ${index + 1}`, detail };
}

export function formatLongDay(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateFromIso(date));
}

export function formatTimeLabel(value) {
  const range = parseTimeRange(value);
  if (!range) return value;
  const start = minutesToClock(range.start);
  const end = range.end === null ? "" : minutesToClock(range.end);
  return end ? `${start}–${end}` : `From ${start}`;
}

function minutesToClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function dateFromIso(value) {
  return new Date(`${value}T12:00:00Z`);
}
