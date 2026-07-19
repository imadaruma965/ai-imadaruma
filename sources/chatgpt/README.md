# ChatGPT壁打ち → リポジトリ格納パイプライン

> **目的**: ChatGPTでの壁打ちを国家OSの正本側（このリポ）に残し、Cursorが学習・蒸留できるようにする。  
> **限界**: ChatGPT本体からMacへ**完全自動で飛ぶ公式経路はない**。本パイプラインは「最短手数でinboxへ」「Cursorが自動で蒸留」を担う。  
> **管轄**: 尊徳（習慣）／栄一・正篤（蒸留先）／君主（投下）

---

## フォルダ

| パス | 役割 |
|------|------|
| `sources/chatgpt/inbox/` | **未処理の全文**を置く（ここだけに落とす） |
| `sources/chatgpt/processed/` | 蒸留済みの原文バックアップ |
| `sources/chatgpt/extracts/` | 要点メモ（確定した学び） |
| `EXTRACT_TEMPLATE.md` | 蒸留の型 |
| `CHATGPT_EXPORT_PROMPT.md` | ChatGPT側に貼る書き出し指示 |

---

## 毎日の流れ（これが運用の本体）

```
ChatGPTで壁打ち
  → 終わりに「書き出しプロンプト」を投げる（または全文コピー）
  → Macで inbox に保存（下記A or B）
  → Cursorで「inboxを処理して」と言う
  → 要点が extracts／セッションログへ → commit
```

### A. いちばん速い（推奨）— クリップボード保存スクリプト

1. ChatGPTで全文または要約付き全文をコピー  
2. ターミナルで:

```bash
./scripts/chatgpt_inbox_save.sh sound-ds-ig
```

（末尾のタグは任意。日付時刻付きで `inbox/` に保存される）

### B. 手置き

ChatGPTの出力を  
`sources/chatgpt/inbox/YYYY-MM-DD_題名.md`  
として保存する。

### C. Macショートカット（任意・さらに自動化）

1. ショートカットAppで「クリップボードからテキストファイルを保存」  
2. 保存先をこのリポの `sources/chatgpt/inbox/` に固定  
3. メニューバーから1クリック、またはホットキー割り当て  

スクリプトと同じ結果になる。

---

## Cursorでの処理（蒸留）

inbox にファイルがあるとき、Cursorに:

```text
sources/chatgpt/inbox を処理して
```

エージェントはルール（`.cursor/rules/chatgpt-inbox.mdc`）に従い:

1. inbox のファイルを読む  
2. `EXTRACT_TEMPLATE.md` で要点を `extracts/` に書く  
3. 方針・価格・発信は該当する `strategy/*_session_log.md` 等へ短く申し送る  
4. 原文を `processed/` へ移す  
5. **勝手に commit / push しない**（君主の指示待ち）

---

## 今日話した例（sound / Daily Statecraft Instagram）

ファイル名例:

```text
sources/chatgpt/inbox/2026-07-19_sound-ds-instagram.md
```

タグ例: `sound` `ds` `instagram` `pricing`

---

## やらないこと

- inbox に置いただけで学習完了と思わない（蒸留までがセット）  
- 個人情報・顧客の生データ・パスワードをinboxに残さない（伏せてから投下）  
- ChatGPTの記憶＝リポの正本、とみなさない（正本は常にこのリポ）
