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
