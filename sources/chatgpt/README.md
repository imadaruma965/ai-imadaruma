# ChatGPT壁打ちパイプライン（DEPRECATED）

> **状態**: deprecated（KG-2 / 2026-07-28）  
> **即削除しない**。移行期間後に削除を検討する。  
> **知識・原本会話の唯一の正本**: `/Users/imadatadahito/Documents/imada-knowledge/`（`05_AI対話/`）  
> **このリポ（`ai-imadaruma`）に原本会話を保存しない。**

---

## 今後の正しい保存先（一本化）

| AI | 当面の保存方法 | 正本パス |
|----|----------------|----------|
| **Claude Code** | SessionEnd 自動取込（継続） | `imada-knowledge/05_AI対話/Claude/` |
| **ChatGPT** | `aistock chatgpt "題名"` または Vault `00_受信箱/AIインポート/ChatGPT/` → `aipull` | `imada-knowledge/05_AI対話/ChatGPT/` |
| **Cursor** | 重要セッション終了時に明示保存（`aistock cursor "..."` または MCP `save_ai_log`） | `imada-knowledge/05_AI対話/Cursor/` |
| **Gemini** | エクスポートまたはコピー → `aistock` / `aipull` | `imada-knowledge/05_AI対話/Gemini/` |
| **Claude（ブラウザ）** | エクスポートZIP/`aiimport` またはコピー → `aistock` | `imada-knowledge/05_AI対話/Claude/` |

保存対象は全雑談ではなく、**決定・設計・重要な壁打ち・プロジェクト進行**に限る。

詳細運用: Vault 側 `06_ダ・ヴィンチ図書館/運用ルール/今田Knowledge統合運用ガイド.md` および `Knowledge_Gateway設計.md`。

完全自動化（ブラウザDOMスクレイピング等）は後続Phase。非公式スクレイピングは既定採用しない。

---

## EXTRACTの役割移管（削除しない）

旧 `EXTRACT_TEMPLATE.md` の欄は次へ移す。

| 旧欄 | 移管先 |
|------|--------|
| 決まったこと（採用） | ダ・ヴィンチ候補 → 人間承認後 `01_意思決定`。当面は `01_経済産業省/strategy/*_session_log.md` へ1行申し送り可 |
| 仮説・未決 | Vault `06_ダ・ヴィンチ図書館/候補/`（KG-4以降）。当面は session_log に「仮説」と明示 |
| 捨てた案 | 廃止候補（自動削除しない）。当面は session_log に「捨てた」と明示 |
| 次の一手 | **正本は Smart Rabbit / `daily_governance`**（Knowledge候補としては扱わない） |

---

## 実データ確認（2026-07-28）

`inbox/` / `processed/` / `extracts/` に原本・蒸留の実ファイルは**ない**（`.gitkeep` とテンプレのみ）。移行コピー不要。

---

## 旧手順（互換・非推奨）

以下は残置のみ。**新規運用では使わない。**

```
ChatGPT → sources/chatgpt/inbox → Cursor蒸留 → extracts
```

旧スクリプト: `./scripts/chatgpt_inbox_save.sh`（deprecated。実行ロジックは未変更）

旧ルール: `.cursor/rules/chatgpt-inbox.mdc`（deprecated）

---

## やらないこと

- このリポの `sources/chatgpt/` に新規原本を置くこと  
- Vault と二重に同じ会話全文を正本化すること  
- inbox に置いただけで学習完了と思うこと  
- 個人情報・顧客生データを残すこと  
