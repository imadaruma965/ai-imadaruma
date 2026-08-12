"use strict";

// 内閣メンバー registry。主管境界の正本は 01_内閣府/ai_jurisdiction.md。
// ここでは呼び出しに必要な最小メタデータ(人格ファイル・Skillファイル・セッションログ・業務コンテキストmode)のみ持つ。
// 2026-08-12改訂: 統治手帳のタブ再編（スマラビ／憲法／人格／内政／外政／財政）に合わせて全面更新。
// 情報省（ダ・ヴィンチ・ルパン）は統治手帳のタブから除外（Claude Code単体のSkillとしては引き続き利用可）。
// 旧・教育省ヤマトは廃止・AI仁子（修身省）へ統合済みのため登録から外す。
const MEMBERS = [
  {
    id: "smart_rabbit",
    name: "賢いうさぎ",
    title: "執行官・内閣統括",
    ministry: "スマラビ",
    avatar: "🐇",
    personaFile: "01_内閣府/smart_rabbit.md",
    skillFile: ".claude/skills/smart_rabbit/SKILL.md",
    sessionLogFile: "01_内閣府/smart_rabbit_session_log.md",
    contextMode: "general",
  },
  {
    id: "kanpishi",
    name: "韓非子",
    title: "律政省・法/事前点検",
    ministry: "憲法",
    avatar: "⚖️",
    personaFile: "00_律令府/kanpishi.md",
    skillFile: ".claude/skills/kanpishi/SKILL.md",
    sessionLogFile: "00_律令府/strategy/kanpishi_session_log.md",
    contextMode: "general",
  },
  {
    id: "eiichi",
    name: "栄一",
    title: "律政省・独立監査（事後の義利監査）",
    ministry: "憲法",
    avatar: "💴",
    personaFile: "00_律令府/eiichi.md",
    skillFile: ".claude/skills/eiichi/SKILL.md",
    sessionLogFile: "00_律令府/strategy/eiichi_session_log.md",
    contextMode: "general",
  },
  {
    id: "jinshi",
    name: "仁子",
    title: "修身省・人格/七徳の教育と検証",
    ministry: "人格",
    avatar: "🌸",
    personaFile: "03_修身省/jinshi.md",
    skillFile: ".claude/skills/jinshi/SKILL.md",
    sessionLogFile: "03_修身省/daily_governance/jinshi_session_log.md",
    contextMode: "character",
  },
  {
    id: "sontoku",
    name: "尊徳",
    title: "修身省・身体資本管理（睡眠・食事・習慣）",
    ministry: "内政",
    avatar: "🌾",
    personaFile: "03_修身省/sontoku.md",
    skillFile: ".claude/skills/sontoku/SKILL.md",
    sessionLogFile: "03_修身省/daily_governance/sontoku_session_log.md",
    contextMode: "today",
  },
  {
    id: "sakamoto_ryoma",
    name: "坂本龍馬",
    title: "貿易省・統括（渉外/外交/受発注）",
    ministry: "外政",
    avatar: "⚔️",
    personaFile: "04_貿易省/sakamoto_ryoma.md",
    skillFile: ".claude/skills/sakamoto_ryoma/SKILL.md",
    sessionLogFile: "00_律令府/strategy/sakamoto_ryoma_session_log.md",
    contextMode: "sales",
  },
  {
    id: "ashoka",
    name: "アショーカ",
    title: "貿易省・研究部（思想研究）",
    ministry: "外政",
    avatar: "🦁",
    personaFile: "04_貿易省/研究部/ashoka.md",
    skillFile: ".claude/skills/ashoka/SKILL.md",
    sessionLogFile: "00_律令府/strategy/ashoka_session_log.md",
    contextMode: "research",
  },
  {
    id: "tesla",
    name: "テスラ",
    title: "貿易省・産業庁（技術/科学研究）",
    ministry: "外政",
    avatar: "⚡",
    personaFile: "04_貿易省/産業庁/tesla.md",
    skillFile: ".claude/skills/tesla/SKILL.md",
    sessionLogFile: "00_律令府/strategy/tesla_session_log.md",
    contextMode: "product",
  },
  {
    id: "hokusai",
    name: "北斎",
    title: "貿易省・文化庁（ビジュアル制作）",
    ministry: "外政",
    avatar: "🎨",
    personaFile: "04_貿易省/文化庁/hokusai.md",
    skillFile: ".claude/skills/hokusai/SKILL.md",
    sessionLogFile: "00_律令府/strategy/hokusai_session_log.md",
    contextMode: "instagram",
  },
  {
    id: "masahiro",
    name: "正篤",
    title: "貿易省・文化庁（文筆・発信原稿）",
    ministry: "外政",
    avatar: "🖋️",
    personaFile: "04_貿易省/文化庁/masahiro.md",
    skillFile: ".claude/skills/masahiro/SKILL.md",
    sessionLogFile: "00_律令府/strategy/masahiro_session_log.md",
    contextMode: "instagram",
  },
  {
    id: "luca",
    name: "ルカ",
    title: "理財省・収入/支出/漏れ検知",
    ministry: "財政",
    avatar: "🧮",
    personaFile: "05_理財省/luca.md",
    skillFile: ".claude/skills/luca/SKILL.md",
    sessionLogFile: "00_律令府/strategy/luca_session_log.md",
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
