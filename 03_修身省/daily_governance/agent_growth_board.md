# agent_growth_board — エージェント学習候補ボード

> **用途**: Skill／Knowledgeへ昇格させる候補の週次棚卸し  
> **プロトコル**: `.claude/skills/_shared/knowledge_growth.md`  
> **設計**: `08_情報省/agent_growth_os.md`  
> **更新**: 対話終了時に追記可。確定は週次

---

## 未承認

| 日付 | エージェント | 種別 | 要約 | 推奨先 | 承認 |
|------|--------------|------|------|--------|------|
| 2026-08-15 | テスラ | knowledge | Supabase RLSはポリシーとテーブルGRANTの両方が必要。書込ポリシーはorganization_id一致検証を明示しないと越境書込を許す | Vault（Supabase技術知見） | 未 |
| 2026-08-15 | テスラ | skill | 本番のみでステージングがないDB案件では、ローカルPostgresにBaaS環境をスタブして適用前検証する手順を標準化する | `.claude/skills/tesla/` | 未 |
| | | knowledge / skill / discard | | | 未 |

---

## 適用済み（直近）

| 日付 | 種別 | 内容 | 反映先 |
|------|------|------|--------|
| 2026-08-03 | skill | 全SkillにKnowledge軽量参照＋学習候補を導入 | `_shared/knowledge_growth.md` ＋各 SKILL.md |

---

## 今週のメモ

- 
