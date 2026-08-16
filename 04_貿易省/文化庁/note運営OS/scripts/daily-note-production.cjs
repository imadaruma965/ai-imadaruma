#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../../..");
const OS_DIR = path.resolve(__dirname, "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(OS_DIR, "config.json"), "utf8"));
const RADAR = path.join(ROOT, "04_貿易省/産業庁/商品開発/note伸び記事レーダー/note-radar.cjs");
const RESEARCH_DIR = path.join(OS_DIR, "00_リサーチ");
const LATEST_RESEARCH = path.join(RESEARCH_DIR, "latest.json");
const DRAFT_DIR = path.join(OS_DIR, "02_下書き");
const REVIEW_DIR = path.join(OS_DIR, "03_確認待ち");
const LOG_DIR = path.join(OS_DIR, "90_実行ログ");
const PROMPT_FILE = path.join(OS_DIR, "prompts/daily-draft.md");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "/Users/imadatadahito/.local/bin/claude";

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((name) => name.endsWith(".md") && name !== "README.md");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} が終了コード${result.status}で失敗しました\n${result.stderr || result.stdout}`);
  }
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function ensureDirectories() {
  [RESEARCH_DIR, DRAFT_DIR, REVIEW_DIR, LOG_DIR].forEach((directory) => fs.mkdirSync(directory, { recursive: true }));
}

function nextPublishingDate() {
  const weekdayTargets = new Set([1, 3, 5]);
  const date = new Date();
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    if (weekdayTargets.has(candidate.getDay())) return localDate(candidate);
  }
  return localDate(date);
}

function main() {
  ensureDirectories();
  const dryRun = process.argv.includes("--dry-run");
  const skipResearch = process.argv.includes("--skip-research");
  const force = process.argv.includes("--force");
  const runLog = [];
  const log = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    runLog.push(line);
  };

  try {
    if (!skipResearch) {
      log("note市場リサーチを更新します");
      if (!dryRun) {
        runLog.push(run(process.execPath, [RADAR, "--output-json", LATEST_RESEARCH]));
      }
    }

    const inventory = markdownFiles(DRAFT_DIR).length + markdownFiles(REVIEW_DIR).length;
    log(`現在の原稿在庫: ${inventory}本 / 目標${CONFIG.inventoryTarget}本`);
    if (!force && inventory >= CONFIG.inventoryTarget) {
      log("在庫目標を満たしているため、本日の下書き生成は省略します");
      return;
    }
    if (dryRun) {
      log("dry-runのためClaude Codeによる下書き生成は省略します");
      return;
    }
    if (!fs.existsSync(LATEST_RESEARCH)) throw new Error(`リサーチJSONがありません: ${LATEST_RESEARCH}`);
    if (!fs.existsSync(CLAUDE_BIN)) throw new Error(`Claude Codeが見つかりません: ${CLAUDE_BIN}`);

    const staticPrompt = fs.readFileSync(PROMPT_FILE, "utf8");
    const before = markdownFiles(DRAFT_DIR).length;
    const runtimePrompt = `${staticPrompt}\n\n## 本日の実行情報\n- 実行日: ${localDate()}\n- 公開予定日の目安: ${nextPublishingDate()}\n- リサーチJSON: ${path.relative(ROOT, LATEST_RESEARCH)}\n- 出力先: ${path.relative(ROOT, DRAFT_DIR)}\n- 現在の原稿在庫: ${inventory}本\n\n必要なファイルを読み、下書きを1本だけ作成してください。`;
    log("Claude Codeで下書きを1本生成します");
    const claudeOutput = run(CLAUDE_BIN, [
      "--print",
      "--permission-mode", "acceptEdits",
      "--tools", "Read,Write,Edit,Glob,Grep",
      "--no-session-persistence",
      "--name", `note-draft-${localDate()}`,
      runtimePrompt,
    ]);
    runLog.push(claudeOutput);
    const after = markdownFiles(DRAFT_DIR).length;
    if (after <= before) throw new Error("Claude Codeは終了しましたが、新しい下書きファイルを確認できませんでした");
    log(`下書きを作成しました。在庫は${inventory + (after - before)}本です`);
  } catch (error) {
    log(`失敗: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (!dryRun) {
      fs.writeFileSync(path.join(LOG_DIR, `${timestamp()}.log`), `${runLog.join("\n")}\n`, "utf8");
    }
  }
}

main();
