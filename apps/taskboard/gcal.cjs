/**
 * Google Calendar 連携（OAuth・予定作成・衝突検知・リマインダ）
 * OAuth 本体は google-oauth.cjs（Calendar + Sheets 共通）
 */
const { google } = require("googleapis");
const oauth = require("./google-oauth.cjs");

const {
  configured,
  redirectUri,
  authUrl,
  exchangeCode,
  getAuthedClient,
  TOKEN_FILE,
  LEGACY_TOKEN_FILE,
} = oauth;

function reminderMinutes() {
  const raw = process.env.GCAL_REMINDERS_MINUTES || "1440,180,90";
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

async function status() {
  const base = await oauth.status();
  return {
    ...base,
    remindersMinutes: reminderMinutes(),
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function listEventsInRange(timeMin, timeMax) {
  const auth = await getAuthedClient();
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });
  return (res.data.items || []).map((ev) => ({
    id: ev.id,
    title: ev.summary || "(無題)",
    startAt: ev.start?.dateTime || ev.start?.date || null,
    endAt: ev.end?.dateTime || ev.end?.date || null,
    htmlLink: ev.htmlLink || null,
  }));
}

async function findConflicts(startAt, endAt, { excludeEventId } = {}) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!(start < end)) {
    const err = new Error("invalid_time_range");
    err.code = "invalid_time_range";
    throw err;
  }
  const padStart = new Date(start.getTime() - 60 * 1000);
  const padEnd = new Date(end.getTime() + 60 * 1000);
  const events = await listEventsInRange(padStart, padEnd);
  return events.filter((ev) => {
    if (excludeEventId && ev.id === excludeEventId) return false;
    if (!ev.startAt || !ev.endAt) return false;
    const bStart = new Date(ev.startAt);
    const bEnd = new Date(ev.endAt);
    return overlaps(start, end, bStart, bEnd);
  });
}

async function createEvent({ title, startAt, endAt, location, notes, recurrence, timeZone }) {
  const auth = await getAuthedClient();
  const calendar = google.calendar({ version: "v3", auth });
  const minutes = reminderMinutes();
  const tz = timeZone || "Asia/Tokyo";
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const body = {
    summary: title,
    location: location || undefined,
    description: notes || "キングダムOSから登録",
    start: { dateTime: startDate.toISOString(), timeZone: tz },
    end: { dateTime: endDate.toISOString(), timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: minutes.map((m) => ({ method: "popup", minutes: m })),
    },
  };
  if (Array.isArray(recurrence) && recurrence.length) {
    body.recurrence = recurrence;
  }
  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: body,
  });
  return {
    id: res.data.id,
    htmlLink: res.data.htmlLink,
    hangoutLink: res.data.hangoutLink || null,
    remindersMinutes: minutes,
  };
}

async function deleteEvent(eventId) {
  if (!eventId) return;
  const auth = await getAuthedClient();
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    eventId,
  });
}

async function upcoming(days = 2) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return listEventsInRange(now, end);
}

/** 東京カレンダー日（YYYY-MM-DD）の 00:00〜24:00 を返す */
function tokyoDayBounds(dayISO) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = dayISO || fmt.format(new Date());
  const start = new Date(`${day}T00:00:00+09:00`);
  const end = new Date(`${day}T24:00:00+09:00`);
  return { day, start, end };
}

async function todayEvents(dayISO) {
  const { day, start, end } = tokyoDayBounds(dayISO);
  const items = await listEventsInRange(start, end);
  return { day, items };
}

module.exports = {
  configured,
  redirectUri,
  reminderMinutes,
  authUrl,
  exchangeCode,
  status,
  findConflicts,
  createEvent,
  deleteEvent,
  listEventsInRange,
  upcoming,
  todayEvents,
  tokyoDayBounds,
  TOKEN_FILE,
  LEGACY_TOKEN_FILE,
  getAuthedClient,
};
