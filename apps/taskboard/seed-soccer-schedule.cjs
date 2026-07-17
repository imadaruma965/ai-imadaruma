#!/usr/bin/env node
/**
 * サッカー指導の毎週予定を Googleカレンダーへ登録（1回実行）
 *
 * 使い方:
 *   node apps/taskboard/seed-soccer-schedule.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = __dirname;
const ENV_FILE = path.join(APP_DIR, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(ENV_FILE)) return;
  const text = fs.readFileSync(ENV_FILE, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] == null || process.env[m[1]] === "") process.env[m[1]] = v;
  });
}

async function main() {
  loadEnvLocal();
  // アラーム: 1日前 / 180分前 / 90分前（このシードでは強制）
  process.env.GCAL_REMINDERS_MINUTES = "1440,180,90";

  const gcal = require("./gcal.cjs");
  const st = await gcal.status();
  if (!st.connected) {
    console.error("Googleカレンダー未接続です。統治手帳で接続してから再実行してください。");
    process.exit(1);
  }

  const series = [
    { byday: "TU", weekday: 2, startH: 19, startM: 0, endH: 21, endM: 0, label: "火" },
    { byday: "WE", weekday: 3, startH: 17, startM: 0, endH: 19, endM: 0, label: "水" },
    { byday: "TH", weekday: 4, startH: 17, startM: 0, endH: 21, endM: 0, label: "木" },
    { byday: "FR", weekday: 5, startH: 19, startM: 0, endH: 21, endM: 0, label: "金" },
  ];

  console.log("サッカー指導の毎週予定を登録します…");
  console.log(`通知: ${gcal.reminderMinutes().join(", ")} 分前`);

  for (const s of series) {
    const { day } = (() => {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      });
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      for (let add = 0; add < 8; add += 1) {
        const probe = new Date(Date.now() + add * 24 * 60 * 60 * 1000);
        const parts = Object.fromEntries(fmt.formatToParts(probe).map((p) => [p.type, p.value]));
        if (map[parts.weekday] !== s.weekday) continue;
        const dayStr = `${parts.year}-${parts.month}-${parts.day}`;
        const start = new Date(
          `${dayStr}T${String(s.startH).padStart(2, "0")}:${String(s.startM).padStart(2, "0")}:00+09:00`
        );
        if (start.getTime() > Date.now() - 60 * 1000) return { day: dayStr };
      }
      throw new Error(`next_occurrence_not_found:${s.label}`);
    })();

    const startAt = new Date(
      `${day}T${String(s.startH).padStart(2, "0")}:${String(s.startM).padStart(2, "0")}:00+09:00`
    );
    const endAt = new Date(
      `${day}T${String(s.endH).padStart(2, "0")}:${String(s.endM).padStart(2, "0")}:00+09:00`
    );

    const created = await gcal.createEvent({
      title: "サッカー指導",
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      notes: `統治手帳シード: 毎週${s.label}曜日の定期指導`,
      timeZone: "Asia/Tokyo",
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${s.byday}`],
    });
    console.log(
      `  OK ${s.label} ${String(s.startH).padStart(2, "0")}:${String(s.startM).padStart(2, "0")}-${String(s.endH).padStart(2, "0")}:${String(s.endM).padStart(2, "0")} （初回 ${day}） → ${created.htmlLink || created.id}`
    );
  }
  console.log("完了。Googleカレンダーでシリーズを確認してください。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
