# AI対話のKnowledge取込（運用メモ）

> **正本**: `/Users/imadatadahito/Documents/imada-knowledge/05_AI対話/`  
> **設計**: Vault `Knowledge_Gateway設計.md`（KG-0）／本リポ Smart Rabbit は MCP 検索のみ（KG-1）  
> **旧経路**: `sources/chatgpt/` は **deprecated**（即削除しない）。詳細は `sources/chatgpt/README.md`

## AI別・当面の保存方法

| AI | 方法 |
|----|------|
| Claude Code | SessionEnd 自動（継続）。手動追加は不要が原則 |
| ChatGPT | 重要分のみコピー → Vault で `aistock chatgpt "題名"` または AIインポート＋`aipull` |
| Cursor | 重要セッション終了時のみ明示保存（`aistock cursor "..."` 等） |
| Gemini | エクスポート／コピー → `aistock` / `aipull` |
| Claude（ブラウザ） | エクスポート／コピー → `aiimport` / `aistock` |

**保存する**: 決定・設計・重要な壁打ち・プロジェクト進行  
**保存しない**: 雑談全文、個人情報、顧客生データ

## 国家OS側に残すもの

- 数えられるタスク・申し送り → `daily_governance` / Smart Rabbit ログ  
- 戦略・発信の短い学び → `strategy/*_session_log.md`（原本ではない）  
- 原本会話 → **必ず Vault**（このリポへ複製しない）

## 旧ChatGPT手順（非推奨）

`./scripts/chatgpt_inbox_save.sh` → `sources/chatgpt/inbox` → Cursor「inboxを処理して」は使わない。

外出先: メモ1行でよい。帰宅後に Vault へ `aistock`。

---

## 実運用テスト（2026-07-28）

テスト文「Kingdom OS v1 実運用開始」（期限11/30・象徴日12/9）。

| AI | 保存方法 | 自動／手動 | 保存先 | テスト結果 |
|----|----------|------------|--------|------------|
| Cursor | MCP `save_ai_log` | 手動（明示） | `05_AI対話/Cursor/2026/07/2026-07-28_045208_Kingdom_OS_v1_実運用開始.md` | OK。`search_knowledge`／`read_knowledge` 成功。`duplicate:false` |
| Claude Code | SessionEnd 自動 | 自動 | `05_AI対話/Claude/` | 本スプリントでは新規セッションログ未発生。手順は正式継続 |
| ChatGPT | `aistock chatgpt` または AIインポート＋`aipull` | 手動 | `05_AI対話/ChatGPT/` | 直接自動不可。上記手動を正式運用とする（スクレイピング禁止） |
| Claudeチャット | エクスポート／コピー → `aiimport` / `aistock` | 手動 | `05_AI対話/Claude/` | 同上・手動正式 |
| Gemini | エクスポート／コピー → `aistock` / `aipull` | 手動 | `05_AI対話/Gemini/` | 同上・手動正式 |

Smart Rabbit 参照: 上記 Cursor パスを Knowledge 参照元として `today.md` に記載済み。
