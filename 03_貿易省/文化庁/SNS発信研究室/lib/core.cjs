// SNS発信研究室：データ正規化・集計（純粋関数のみ、Sheets/CSVに依存しない）
const MULTI_SEP = "；";
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

const METRIC_FIELDS = [
  "インプレッション", "いいね", "リポスト", "リプライ", "ブックマーク",
  "詳細クリック", "プロフィールアクセス", "フォロー獲得数", "リンククリック",
];

const X_WINDOWS = ["24h", "72h"];

const X_STATIC_COLUMNS = [
  "投稿日", "曜日", "投稿時刻", "投稿URL", "冒頭3行のフック", "投稿全文", "文字数",
  "発信ジャンル", "投稿テーマ", "損失の種類", "投稿形式", "フックの種類", "複眼設計の種類",
  "実体験の有無", "画像の有無", "外部リンクの有無", "投稿の目的",
];

const X_METRIC_COLUMNS = X_WINDOWS.flatMap((w) => METRIC_FIELDS.map((m) => `${m}_${w}`));
const X_COLUMNS = [...X_STATIC_COLUMNS, ...X_METRIC_COLUMNS];

const NOTE_COLUMNS = [
  "記事タイトル", "記事URL", "公開日", "更新日", "ジャンル", "無料・有料区分", "販売価格",
  "インプレッション", "PV", "スキ", "コメント", "流入元", "販売数", "売上", "購入導線",
];

const HYPOTHESIS_COLUMNS = ["日付", "対象", "仮説", "検証方法", "結果", "次回の改善案"];

const MULTI_VALUE_FIELDS = new Set(["発信ジャンル", "損失の種類", "複眼設計の種類"]);

function splitMulti(value) {
  const s = String(value || "").trim();
  if (!s) return [];
  return s.split(MULTI_SEP).map((v) => v.trim()).filter(Boolean);
}

function joinMulti(values) {
  if (!Array.isArray(values)) return String(values || "");
  return values.map((v) => String(v).trim()).filter(Boolean).join(MULTI_SEP);
}

function toAmount(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToRecord(columns, row) {
  const record = {};
  columns.forEach((col, i) => {
    const raw = row[i];
    record[col] = MULTI_VALUE_FIELDS.has(col) ? splitMulti(raw) : (raw ?? "");
  });
  return record;
}

function recordToRow(columns, record) {
  return columns.map((col) => {
    const v = record[col];
    if (MULTI_VALUE_FIELDS.has(col)) return joinMulti(v);
    return v == null ? "" : v;
  });
}

function deriveWeekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_JA[d.getDay()];
}

function deriveCharCount(text) {
  return String(text || "").length;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseXExportDate(value) {
  // X公式エクスポートの日付形式 "Thu, Nov 19, 2026" -> "2026-11-19"
  const m = String(value || "").match(/([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return "";
  const monthIndex = EN_MONTHS.indexOf(m[1]);
  if (monthIndex === -1) return "";
  return `${m[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

function deriveHook(text, maxLines = 3, maxChars = 80) {
  const s = String(text || "");
  const lines = s.split(/\n+/).filter(Boolean);
  if (lines.length > 1) return lines.slice(0, maxLines).join("\n");
  return s.slice(0, maxChars);
}

function normalizeXRecord(input) {
  const record = { ...input };
  record["文字数"] = toAmount(record["文字数"]) ?? deriveCharCount(record["投稿全文"]);
  if (!record["曜日"] && record["投稿日"]) record["曜日"] = deriveWeekday(record["投稿日"]);
  METRIC_FIELDS.forEach((m) => {
    X_WINDOWS.forEach((w) => {
      const key = `${m}_${w}`;
      const amount = toAmount(record[key]);
      record[key] = amount == null ? "" : amount;
    });
  });
  return record;
}

function xRowFromRecord(record) {
  return recordToRow(X_COLUMNS, normalizeXRecord(record));
}

function xRecordFromRow(row) {
  const record = rowToRecord(X_STATIC_COLUMNS.concat(X_METRIC_COLUMNS), row);
  X_METRIC_COLUMNS.forEach((key) => {
    record[key] = toAmount(record[key]);
  });
  return record;
}

function rate(numerator, denominator) {
  const n = toAmount(numerator);
  const d = toAmount(denominator);
  if (n == null || d == null || d === 0) return null;
  return n / d;
}

function computeXRates(record, window) {
  const imp = record[`インプレッション_${window}`];
  const profileAccess = record[`プロフィールアクセス_${window}`];
  return {
    window,
    empathyRate: rate(record[`いいね_${window}`], imp),
    saveRate: rate(record[`ブックマーク_${window}`], imp),
    spreadRate: rate(record[`リポスト_${window}`], imp),
    profileAccessRate: rate(profileAccess, imp),
    followRate: rate(record[`フォロー獲得数_${window}`], imp),
    followConversionRate: rate(record[`フォロー獲得数_${window}`], profileAccess),
    clickRate: rate(record[`リンククリック_${window}`], imp),
  };
}

function mean(values) {
  const nums = values.map(toAmount).filter((v) => v != null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(values) {
  const nums = values.map(toAmount).filter((v) => v != null).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function groupBy(records, field, { multi = false } = {}) {
  const groups = new Map();
  for (const record of records) {
    const raw = record[field];
    const keys = multi ? (Array.isArray(raw) ? raw : splitMulti(raw)) : [String(raw || "(未設定)")];
    for (const key of keys.length ? keys : ["(未設定)"]) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
  }
  return groups;
}

function summarizeGroups(groups, metricPicker, minSampleSize = 5) {
  const rows = [];
  for (const [key, records] of groups.entries()) {
    const values = records.map(metricPicker).filter((v) => v != null);
    rows.push({
      key,
      count: records.length,
      mean: mean(values),
      median: median(values),
      lowSample: records.length < minSampleSize,
    });
  }
  return rows.sort((a, b) => (b.mean ?? -Infinity) - (a.mean ?? -Infinity));
}

function bucketLabel(charCount, buckets) {
  const n = toAmount(charCount) ?? 0;
  for (const b of buckets) {
    if (b.max == null || n <= b.max) return b.label;
  }
  return buckets[buckets.length - 1]?.label || "不明";
}

function isoWeekKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return "不明";
  const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (temp.getUTCDay() + 6) % 7;
  temp.setUTCDate(temp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(temp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((temp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${temp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(dateStr) {
  const s = String(dateStr || "");
  return s.length >= 7 ? s.slice(0, 7) : "不明";
}

function trend(records, dateField, keyFn, valuePicker) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFn(record[dateField]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups.entries()]
    .map(([key, recs]) => ({
      key,
      count: recs.length,
      total: recs.reduce((sum, r) => sum + (toAmount(valuePicker(r)) || 0), 0),
      mean: mean(recs.map(valuePicker)),
    }))
    .sort((a, b) => (a.key > b.key ? 1 : -1));
}

function topBottom(records, metricPicker, n = 5) {
  const scored = records
    .map((r) => ({ record: r, value: metricPicker(r) }))
    .filter((x) => x.value != null)
    .sort((a, b) => b.value - a.value);
  return { top: scored.slice(0, n), bottom: scored.slice(-n).reverse() };
}

function normalizeNoteRecord(input) {
  const record = { ...input };
  ["販売価格", "インプレッション", "PV", "スキ", "コメント", "販売数", "売上"].forEach((f) => {
    const amount = toAmount(record[f]);
    record[f] = amount == null ? "" : amount;
  });
  return record;
}

function noteRowFromRecord(record) {
  return recordToRow(NOTE_COLUMNS, normalizeNoteRecord(record));
}

function noteRecordFromRow(row) {
  const record = rowToRecord(NOTE_COLUMNS, row);
  ["販売価格", "インプレッション", "PV", "スキ", "コメント", "販売数", "売上"].forEach((f) => {
    record[f] = toAmount(record[f]);
  });
  return record;
}

module.exports = {
  MULTI_SEP,
  METRIC_FIELDS,
  X_WINDOWS,
  X_STATIC_COLUMNS,
  X_METRIC_COLUMNS,
  X_COLUMNS,
  NOTE_COLUMNS,
  HYPOTHESIS_COLUMNS,
  MULTI_VALUE_FIELDS,
  splitMulti,
  joinMulti,
  toAmount,
  deriveWeekday,
  deriveCharCount,
  parseXExportDate,
  deriveHook,
  normalizeXRecord,
  xRowFromRecord,
  xRecordFromRow,
  computeXRates,
  rate,
  mean,
  median,
  groupBy,
  summarizeGroups,
  bucketLabel,
  isoWeekKey,
  monthKey,
  trend,
  topBottom,
  normalizeNoteRecord,
  noteRowFromRecord,
  noteRecordFromRow,
};
