"use strict";

// 内閣メンバー registry。主管境界の正本は 01_首相官邸/ai_jurisdiction.md。
// ここでは呼び出しに必要な最小メタデータ(人格ファイル・Skillファイル・セッションログ・業務コンテキストmode)のみ持つ。
const MEMBERS = [
  {
    id: "smart_rabbit",
    name: "スマートラビット",
    title: "総理・内閣統括",
    ministry: "首相官邸",
    avatar: "🐇",
    personaFile: "01_首相官邸/smart_rabbit.md",
    skillFile: ".claude/skills/smart_rabbit/SKILL.md",
    sessionLogFile: "03_内務省/daily_governance/smart_rabbit_session_log.md",
    contextMode: "general",
  },
  {
    id: "eiichi",
    name: "栄一",
    title: "経産省・戦略メンター",
    ministry: "経産省",
    avatar: "💴",
    personaFile: "02_経産省/eiichi.md",
    skillFile: ".claude/skills/eiichi/SKILL.md",
    sessionLogFile: "02_経産省/strategy/eiichi_session_log.md",
    contextMode: "general",
  },
  {
    id: "sontoku",
    name: "尊徳",
    title: "内務省・実行マネージャー",
    ministry: "内務省",
    avatar: "🌾",
    personaFile: "03_内務省/sontoku.md",
    skillFile: ".claude/skills/sontoku/SKILL.md",
    sessionLogFile: "03_内務省/daily_governance/sontoku_session_log.md",
    contextMode: "today",
  },
  {
    id: "yamato",
    name: "ヤマト",
    title: "教育省・教育/精神性",
    ministry: "教育省",
    avatar: "⛩️",
    personaFile: "04_教育省/yamato.md",
    skillFile: ".claude/skills/yamato/SKILL.md",
    sessionLogFile: "02_経産省/strategy/yamato_session_log.md",
    contextMode: "general",
  },
  {
    id: "sakamoto_ryoma",
    name: "坂本龍馬",
    title: "外務省・渉外/外交",
    ministry: "外務省",
    avatar: "⚔️",
    personaFile: "05_外務省/sakamoto_ryoma.md",
    skillFile: ".claude/skills/sakamoto_ryoma/SKILL.md",
    sessionLogFile: "02_経産省/strategy/sakamoto_ryoma_session_log.md",
    contextMode: "sales",
  },
  {
    id: "kanpishi",
    name: "韓非子",
    title: "法務省・法/規律/リスク管理",
    ministry: "法務省",
    avatar: "⚖️",
    personaFile: "06_法務省/kanpishi.md",
    skillFile: ".claude/skills/kanpishi/SKILL.md",
    sessionLogFile: "02_経産省/strategy/kanpishi_session_log.md",
    contextMode: "general",
  },
  {
    id: "tesla",
    name: "テスラ",
    title: "科学省・技術/科学研究",
    ministry: "科学省",
    avatar: "⚡",
    personaFile: "07_科学省/tesla.md",
    skillFile: ".claude/skills/tesla/SKILL.md",
    sessionLogFile: "02_経産省/strategy/tesla_session_log.md",
    contextMode: "product",
  },
  {
    id: "davinci",
    name: "ダ・ヴィンチ",
    title: "情報省・館長/編集長",
    ministry: "情報省",
    avatar: "📖",
    personaFile: "08_情報省/davinci.md",
    skillFile: ".claude/skills/davinci/SKILL.md",
    sessionLogFile: "02_経産省/strategy/davinci_session_log.md",
    contextMode: "research",
  },
  {
    id: "lupin",
    name: "ルパン",
    title: "情報省・諜報部/情報収集",
    ministry: "情報省(諜報部)",
    avatar: "🗝️",
    personaFile: "08_情報省/諜報部/lupin.md",
    skillFile: ".claude/skills/lupin/SKILL.md",
    sessionLogFile: "02_経産省/strategy/lupin_session_log.md",
    contextMode: "sales",
  },
  {
    id: "ashoka",
    name: "アショーカ",
    title: "情報省・研究部/思想研究",
    ministry: "情報省(研究部)",
    avatar: "🦁",
    personaFile: "08_情報省/研究部/ashoka.md",
    skillFile: ".claude/skills/ashoka/SKILL.md",
    sessionLogFile: "02_経産省/strategy/ashoka_session_log.md",
    contextMode: "research",
  },
  {
    id: "hokusai",
    name: "北斎",
    title: "文化省・ビジュアル制作",
    ministry: "文化省",
    avatar: "🎨",
    personaFile: "09_文化省/hokusai.md",
    skillFile: ".claude/skills/hokusai/SKILL.md",
    sessionLogFile: "02_経産省/strategy/hokusai_session_log.md",
    contextMode: "instagram",
  },
  {
    id: "masahiro",
    name: "正篤",
    title: "文化省・文筆",
    ministry: "文化省",
    avatar: "🖋️",
    personaFile: "09_文化省/masahiro.md",
    skillFile: ".claude/skills/masahiro/SKILL.md",
    sessionLogFile: "02_経産省/strategy/masahiro_session_log.md",
    contextMode: "instagram",
  },
  {
    id: "luca",
    name: "ルカ",
    title: "財務省・収入/支出/漏れ検知",
    ministry: "財務省",
    avatar: "🧮",
    personaFile: "10_財務省/luca.md",
    skillFile: ".claude/skills/luca/SKILL.md",
    sessionLogFile: "02_経産省/strategy/luca_session_log.md",
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
