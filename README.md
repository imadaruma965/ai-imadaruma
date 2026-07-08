# ai-imadaruma

ai-imadarumaは、いまだ唯仁という個人国家を統治するAI内閣である。

これはAI秘書ではない。
国王であるいまだ唯仁の理念・目標・判断を、現実の実行計画へ落とし込むAI統治システムである。

## 日本語名

**イマダルマAI統治内閣**

---

## 正本と実装版の関係

本プロジェクトには、**DOCX正本**と**Markdown実装版**の2層がある。

| 層 | 場所 | 役割 |
|----|------|------|
| **DOCX正本** | `sources/originals/` | 国王が制定した原文。改訂・典拠・全文の唯一の正本 |
| **Markdown実装版** | `philosophy/` `constitution/` 等 | 日次運用しやすい要約・実装版。AIが毎回読む対象 |

**ルール:**

- 内容が矛盾する場合、**DOCX正本を優先**する
- Markdown実装版は正本の要約であり、全文・逸話・改訂履歴は正本DOCXを参照する
- 正本を改訂した場合は、対応するMarkdown実装版も同期する
- Markdownだけを改訂して正本を更新しない（正本が先、実装版が後）

### DOCX正本一覧

| 正本ファイル | Markdown実装版 |
|------------|---------------|
| `sources/originals/imada_life_philosophy_v02.docx` | `philosophy/imada_life_philosophy.md` |
| `sources/originals/imada_constitution_v2.docx` | `constitution/jibun_constitution.md` |
| `sources/originals/imadaruma_四柱統治フレームワーク_v1.docx` | `constitution/four_pillars.md` |
| `sources/originals/imadaruma_明君七徳_v02.docx` | `constitution/meikun_shichitoku.md` |

---

## 国家階層（最新版）

```
いまだライフ理念体系（Purpose / Vision / Mission / Values）
  ↓
いまだ唯仁国家憲法／じぶん憲法
  ↓
四柱統治フレームワーク（人格・内政・外交・財政）
  ↓  人格の詳細 → 明君七徳（仁子哲学）
実行レイヤー: 君主 / AI孫子 / AI蕭何
  ↓
日次運用・戦略・記録
```

---

## 第一国家目標

**2026年11月末日まで**に、サッカー以外の事業で**月間総合売上50万円以上**を樹立する。

### 50万円目標に含める

- imadaruma.sound
- Daily Statecraft
- Kindle / Publishing
- SNS経由の商品・サービス売上
- その他サッカー以外の事業売上

### 50万円目標に含めない

- サッカー事業売上
- 投資運用益（imadaruma.capital は財政の柱に残すが、売上計算からは除外）

---

## 統治の目的（旧記述・移行中）

> 以下は旧モデルの記述。Phase 2以降で更新予定。

2026年12月9日までに、会社の看板に頼らず**月50万円の新規売上**を作りながら、今田唯仁の事業・発信・出版・サッカー運営・投資・内政を統治する。

## 役割分担

| 役割 | 担当 | 責務 |
|------|------|------|
| 国王 | 今田唯仁 | 理念、国家目標、最終意思決定、美学 |
| 統治総理AI | Chief Statecraft Minister | 実行計画、優先順位、日次統治、省庁統括 |
| 省庁AI | （今後追加） | 各専門領域の実務提案と実行支援 |

## 統治対象の6領域

| # | 領域名 | 英名 |
|---|--------|------|
| 1 | Kindle執筆業 | Publishing |
| 2 | sound事業・音ブランディング | Commerce |
| 3 | SNS発信事業 | Communications & Culture |
| 4 | サッカー運営事業 | Education & Field Operations |
| 5 | 投資事業 | Treasury & Markets |
| 6 | 内政 | Internal Affairs |

## ディレクトリ構成

```
ai-imadaruma/
├── README.md                              # このファイル
├── sources/
│   └── originals/                         # DOCX正本（改訂の起点）
│       ├── imada_life_philosophy_v02.docx
│       ├── imada_constitution_v2.docx
│       ├── imadaruma_四柱統治フレームワーク_v1.docx
│       └── imadaruma_明君七徳_v02.docx
├── philosophy/                            # 最上位規範（実装版）
│   └── imada_life_philosophy.md           # いまだライフ理念体系
├── constitution/                          # 統治法・実行構造（実装版）
│   ├── jibun_constitution.md              # じぶん憲法 ★新
│   ├── four_pillars.md                    # 四柱統治フレームワーク ★新
│   ├── meikun_shichitoku.md               # 明君七徳 ★新
│   ├── doctrine.md                        # 旧：統治思想（移行予定）
│   ├── mission.md                         # 国家目標（更新予定）
│   ├── principles.md                      # 旧：統治原則（移行予定）
│   └── rules_of_governance.md             # 統治ルール（更新予定）
├── cabinet/                               # 内閣
│   └── chief_statecraft_minister.md       # 旧：統治総理AI（移行予定）
├── daily_governance/                      # 日次統治（毎日使う）
│   ├── morning_cabinet.md
│   ├── today.md
│   ├── impulse_protocol.md
│   ├── parking_lot.md
│   └── evening_review.md
└── archives/
    ├── daily_logs/
    ├── weekly_reviews/
    └── decisions/
```

★新 = Phase 1で作成済み。旧ファイルは Phase 2以降で移行・アーカイブ予定。

## 毎日の運用フロー

```
朝 → morning_cabinet.md で閣議
  ↓
日中 → today.md で統治実行
  ↓ 衝動・脱線時 → impulse_protocol.md
  ↓ 後回し → parking_lot.md
  ↓
夕 → evening_review.md で振り返り
  ↓
完了 → archives/daily_logs/ にコピー保存
```

## 統治総理AIの起動方法

統治総理AIに依頼するときは、以下を渡す。

1. `constitution/` の4ファイル（思想・目標・原則・ルール）
2. `cabinet/chief_statecraft_minister.md`（役割定義）
3. 当日の `daily_governance/` ファイル（状況）

**起動プロンプト例：**

> あなたは ai-imadaruma の統治総理AI（Chief Statecraft Minister）です。
> constitution/ と cabinet/chief_statecraft_minister.md を読み、国王の理念に基づいて今日の統治計画を立案してください。

## 現段階のスコープ

- Markdownベースの最小構成
- Webアプリ、API連携、ログイン、データベース、npm、Next.js は**まだ不要**
