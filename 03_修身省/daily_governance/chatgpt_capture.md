# AI対話のKnowledge取込（運用メモ）

> **正本**: `08_情報省/ダヴィンチ図書館/05_AI対話/`（互換: `~/imada-knowledge` / `~/Documents/imada-knowledge`）  
> **設計**: Vault `Knowledge_Gateway設計.md`（KG-0）／本リポ Smart Rabbit は MCP 検索のみ（KG-1）  
> **旧経路**: `08_情報省/ダヴィンチ図書館/91_原資料/chatgpt/` は **deprecated**（即削除しない）。詳細は `08_情報省/ダヴィンチ図書館/91_原資料/chatgpt/README.md`

## AI別・当面の保存方法

| AI | 方法 |
|----|------|
| Claude Code | SessionEnd 自動（継続）。手動追加は不要が原則 |
| ChatGPT | 重要分のみコピー → Vault で `aistock chatgpt "題名"` または AIインポート＋`aipull` |
| Cursor | **重要壁打ちはすべて**図書館へ（原本は他に置かない）。MCP `save_ai_log` または要約手動。方針: 常時格納 |
| Gemini | エクスポート／コピー → `aistock` / `aipull` |
| Claude（ブラウザ） | エクスポート／コピー → `aiimport` / `aistock` |

**保存する**: 決定・設計・重要な壁打ち・プロジェクト進行  
**保存しない**: 雑談全文、個人情報、顧客生データ

## 国家OS側に残すもの

- 数えられるタスク・申し送り → `daily_governance` / Smart Rabbit ログ  
- 戦略・発信の短い学び → `02_律政省/strategy/*_session_log.md`（原本ではない）  
- 再利用する決定・Skill改善 → 学習候補 → `agent_growth_board.md` → 承認後に Vault／Skill（`08_情報省/agent_growth_os.md`）  
- 原本会話 → **必ず Vault**（このリポへ複製しない）


## 旧ChatGPT手順（非推奨）

`./scripts/chatgpt_inbox_save.sh` → `08_情報省/ダヴィンチ図書館/91_原資料/chatgpt/inbox` → Cursor「inboxを処理して」は使わない。

外出先: メモ1行でよい。帰宅後に Vault へ `aistock`。

---

## 実運用テスト（2026-07-28）

テスト文「Kingdom OS v1 実運用開始」（期限11/30・象徴日12/9）。

| AI | 保存方法 | 自動／手動 | 保存先 | テスト結果 |
|----|----------|------------|--------|------------|
| Cursor | **常時格納**（重要セッションは必ず）。MCP `save_ai_log` 優先。未接続時は要約を `05_AI対話/Cursor/YYYY/MM/` へ手動 | 手動必須→常時 | `05_AI対話/Cursor/` | 2026-08-08方針更新。ポリシー: Vault `運用ルール/Cursor常時格納ポリシー_2026-08-08.md` |
| Claude Code | SessionEnd 自動 | 自動 | `05_AI対話/Claude/` | 本スプリントでは新規セッションログ未発生。手順は正式継続 |
| ChatGPT | `aistock chatgpt` または AIインポート＋`aipull` | 手動 | `05_AI対話/ChatGPT/` | 直接自動不可。上記手動を正式運用とする（スクレイピング禁止） |
| Claudeチャット | エクスポート／コピー → `aiimport` / `aistock` | 手動 | `05_AI対話/Claude/` | 同上・手動正式 |
| Gemini | エクスポート／コピー → `aistock` / `aipull` | 手動 | `05_AI対話/Gemini/` | 同上・手動正式 |

Smart Rabbit 参照: 上記 Cursor パスを Knowledge 参照元として `today.md` に記載済み。
