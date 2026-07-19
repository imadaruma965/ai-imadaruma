# ChatGPT壁打ちの捕獲（運用メモ）

> **詳細正本**: `sources/chatgpt/README.md`  
> **接続**: ChatGPT → `sources/chatgpt/inbox/` → Cursor蒸留 → セッションログ／extracts  
> **管轄**: 尊徳（習慣化）／君主（投下）

## 固定手順（毎回同じ）

1. 壁打ち終了時に `sources/chatgpt/CHATGPT_EXPORT_PROMPT.md` をChatGPTへ貼る  
2. 出力をコピー  
3. PowerBookで `./scripts/chatgpt_inbox_save.sh （タグ）`  
4. Cursorで「inboxを処理して」  
5. 確認後に commit（指示時）

外出先では全文を無理に処理しない。メモ1行＋帰宅後にinbox投下でよい。
