"use strict";

// 内閣メンバー registry。主管境界の正本は 01_内閣府/AI主管定義.md。
// ここでは呼び出しに必要な最小メタデータ(人格ファイル・Skillファイル・セッションログ・業務コンテキストmode)のみ持つ。
// 2026-08-12改訂: 統治手帳のタブ再編（執務室／法制局／修身院／内政局／海援隊／勘定所）に合わせて全面更新。
// 情報省（ダ・ヴィンチ・ルパン）は統治手帳のタブから除外（Claude Code単体のSkillとしては引き続き利用可）。
// 旧・教育省ヤマトは廃止・AI仁子（修身省）へ統合済みのため登録から外す。
const MEMBERS = [
  {
    id: "smart_rabbit",
    name: "賢いうさぎ",
    title: "執行官・内閣統括",
    ministry: "執務室",
    avatar: "🐇",
    personaFile: "01_内閣府/賢いうさぎ.md",
    skillFile: ".claude/skills/smart_rabbit/SKILL.md",
    sessionLogFile: "02_修身省/日次運用/対話ログ/賢いうさぎ.md",
    contextMode: "general",
  },
  {
    id: "kanpishi",
    name: "韓非子",
    title: "律政省・法/事前点検",
    ministry: "法制局",
    avatar: "⚖️",
    personaFile: "00_律令府/律政省/韓非子.md",
    skillFile: ".claude/skills/kanpishi/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/韓非子.md",
    contextMode: "general",
  },
  {
    id: "eiichi",
    name: "栄一",
    title: "律政省・独立監査（事後の義利監査）",
    ministry: "法制局",
    avatar: "💴",
    personaFile: "00_律令府/律政省/栄一.md",
    skillFile: ".claude/skills/eiichi/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/栄一.md",
    contextMode: "general",
  },
  {
    id: "jinshi",
    name: "仁子",
    title: "修身省・人格/七徳の教育と検証",
    ministry: "修身院",
    avatar: "🌸",
    personaFile: "02_修身省/人格正本/仁子.md",
    skillFile: ".claude/skills/jinshi/SKILL.md",
    sessionLogFile: "02_修身省/日次運用/対話ログ/仁子.md",
    contextMode: "character",
  },
  {
    id: "sontoku",
    name: "尊徳",
    title: "修身省・身体資本管理（睡眠・食事・習慣）",
    ministry: "内政局",
    avatar: "🌾",
    personaFile: "02_修身省/人格正本/尊徳.md",
    skillFile: ".claude/skills/sontoku/SKILL.md",
    sessionLogFile: "02_修身省/日次運用/対話ログ/尊徳.md",
    contextMode: "today",
  },
  {
    id: "sakamoto_ryoma",
    name: "坂本龍馬",
    title: "貿易省・統括（渉外/外交/受発注）",
    ministry: "海援隊",
    avatar: "⚔️",
    personaFile: "03_貿易省/坂本龍馬.md",
    skillFile: ".claude/skills/sakamoto_ryoma/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/坂本龍馬.md",
    contextMode: "sales",
  },
  {
    id: "ashoka",
    name: "アショーカ",
    title: "貿易省・研究部（思想研究）",
    ministry: "海援隊",
    avatar: "🦁",
    personaFile: "03_貿易省/研究部/アショーカ.md",
    skillFile: ".claude/skills/ashoka/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/アショーカ.md",
    contextMode: "research",
  },
  {
    id: "tesla",
    name: "テスラ",
    title: "貿易省・産業庁（技術/科学研究）",
    ministry: "海援隊",
    avatar: "⚡",
    personaFile: "03_貿易省/産業庁/テスラ.md",
    skillFile: ".claude/skills/tesla/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/テスラ.md",
    contextMode: "product",
  },
  {
    id: "hokusai",
    name: "北斎",
    title: "貿易省・文化庁（ビジュアル制作）",
    ministry: "海援隊",
    avatar: "🎨",
    personaFile: "03_貿易省/文化庁/北斎.md",
    skillFile: ".claude/skills/hokusai/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/北斎.md",
    contextMode: "instagram",
  },
  {
    id: "masahiro",
    name: "正篤",
    title: "貿易省・文化庁（文筆・発信原稿）",
    ministry: "海援隊",
    avatar: "🖋️",
    personaFile: "03_貿易省/文化庁/正篤.md",
    skillFile: ".claude/skills/masahiro/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/正篤.md",
    contextMode: "instagram",
  },
  {
    id: "luca",
    name: "ルカ",
    title: "理財省・収入/支出/漏れ検知",
    ministry: "勘定所",
    avatar: "🧮",
    personaFile: "04_理財省/ルカ.md",
    skillFile: ".claude/skills/luca/SKILL.md",
    sessionLogFile: "00_律令府/戦略/対話ログ/ルカ.md",
    contextMode: "finance",
  },
];

const BY_ID = new Map(MEMBERS.map((m) => [m.id, m]));
const DEFAULT_CONTEXT_MODE = "general";

function listMembers() {
  return MEMBERS.map(({ id, name, title, ministry, avatar }) => ({ id, name, title, ministry, avatar }));
}

function getMember(id) {
  return BY_ID.get(String(id || "")) || null;
}

function contextModeFor(id) {
  const member = getMember(id);
  return member ? member.contextMode : DEFAULT_CONTEXT_MODE;
}

module.exports = {
  MEMBERS,
  DEFAULT_CONTEXT_MODE,
  listMembers,
  getMember,
  contextModeFor,
};
