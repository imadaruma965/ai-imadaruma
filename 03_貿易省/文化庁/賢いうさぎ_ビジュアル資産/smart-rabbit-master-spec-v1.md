# 賢いうさぎ マスター画像仕様書 v1

> **2026-09-13 注記**：現行マスターは **キャラ01（`キャラマスター/01_クールなワクワクうさぎ_v1.png`）**（2026-08-31 BOSS指示）。本仕様書は**元祖（浮世絵羽織）の仕様書**として保存する。キャラ01とXヘッダーの世界観・画風は `キャラマスター/世界観正本_v1.md` を正とする。以下の「正式マスター」の記述は、2026-08-25 時点のもの。

制定日：2026-08-25  
状態：正式マスター  
基準画像：`smart-rabbit-master-v1.png`  
SHA-256：`5856f566c9e473f45dbb002172e2cd092005fc999b60c46acf4b528e633f4a1b`

## 1. マスター宣言

`smart-rabbit-master-v1.png`を「賢いうさぎ」の正式なキャラクター基準原画とする。

今後、プロフィール画像、記事挿絵、SNS投稿、動画、表情差分、ポーズ差分、季節衣装などを制作するときは、必ずこの画像を最優先の参照画像として指定する。文章プロンプトだけで再生成せず、顔・耳・眼鏡・髪・顎ひげ・羽織・色調の同一性を維持する。

## 2. 固定する識別要素

- 基本形：人間化しすぎていない、動物としての白いうさぎ
- 擬人化比率：動物7：人間3
- 年齢感：成熟した知性と落ち着き。幼いマスコットにしない
- 顔：細めで穏やかな目、静かな自信、わずかに含みのある微笑み
- 耳：向かって左が柔らかく折れ、右がまっすぐ立つ
- 髪：耳の間から流れる、短く無造作な金髪の前髪
- 眼鏡：横長の黒い角型フロント、白いテンプル
- 顎：小さく尖った顎ひげ
- 毛色：温かい生成り寄りのクリームホワイト
- 体型：うさぎ本来の丸みを残した、自然な直立姿勢
- 衣装：濃い藍色の短い羽織。生成りと淡いターコイズの波・雲文様
- 差し色：襟元にごく少量の落ち着いた朱色
- 背景：無地に近いパステルターコイズ。紙の質感のみ
- 画風：江戸期の動物戯画・浮世絵風。手描きの不均一な墨線と平面的な色面

## 3. 禁止事項

- 顔、眼鏡、耳の左右、金髪、顎ひげを変更しない
- 人間の体格、手、脚へ寄せすぎない
- 幼児的、過度にかわいい、目が大きいマスコット表現にしない
- Pixar、Disney、アニメ、漫画、3D、写真、写実的な毛並みにしない
- ベクターのように均一で滑らかな線へ整えない
- グラデーション、光沢、映画的照明、被写界深度を使わない
- ロゴ、文字、署名、落款、透かしを加えない
- 波柄を派手に増やして衣装より目立たせない
- 背景色を高彩度のシアンにしない

## 4. 完全再現用プロンプト

以下では、マスター画像を「参照画像1」として必ず添付する。

```text
Use case: identity-preserve / style-transfer
Asset type: official master reproduction of the Japanese brand character “賢いうさぎ”

REFERENCE AUTHORITY:
Reference Image 1 is the canonical master image. Reproduce the same single character with maximum identity and style fidelity. Preserve the exact facial proportions, expression, ear configuration, hairstyle, glasses shape and colors, chin tuft, body proportions, haori silhouette and pattern density, palette, line quality, background color, framing, and overall quiet dignity. Do not reinterpret or redesign the character.

SUBJECT IDENTITY — LOCKED:
A mature intelligent cream-white rabbit that remains fundamentally an animal rather than a human-bodied mascot. Anthropomorphism ratio: animal 70%, human 30%. Natural upright rabbit anatomy with rounded torso, rabbit paws and feet, and a small tail. The viewer-left ear bends softly outward and downward; the viewer-right ear stands tall and straight. Between the ears is a short, tousled, swept bleached-gold forelock. The rabbit wears horizontally rectangular black front eyeglass frames with clearly white side temples. Add the same very small pointed chin goatee. Preserve the narrow calm eyes and subtle knowing half-smile: thoughtful, confident, gentle, mature, never childish.

COSTUME — LOCKED:
The same short Japanese haori-style jacket, draped naturally over the rabbit body. Deep faded indigo/Prussian blue base with restrained traditional wave and cloud motifs in warm cream and muted pale turquoise. A tiny muted vermilion inner-collar accent. Keep the same amount and scale of patterning as the master. No pants, shoes, props, logos, text, signature, or seal.

STYLE — LOCKED:
Authentic Edo-period animal caricature / ukiyo-e folk-print character. Thin irregular hand-drawn sumi-ink contours, organic uneven line weight, restrained flat pigment fills, sparse short hatching, understated aged-washi paper grain, slight analogue printing imperfection. Sparse, elegant, eccentric, witty and iconic. Preserve the unpolished hand-printed quality of the master image.

COLOR — LOCKED:
Flat softly desaturated pastel turquoise background matching the reference, approximately #9CCFD0, with subtle paper grain only. Warm cream rabbit, sumi-black contours, faded deep indigo haori, pale turquoise details, tiny muted vermilion accent, bleached ochre-gold hair. Do not shift the background toward bright cyan, green, or blue.

COMPOSITION — LOCKED:
Square 1:1. One full-body rabbit centered, occupying approximately 82% of the canvas height, shown in the same quiet three-quarter stance as the master. Entire ears and feet visible. Keep enough negative space for a circular profile crop. The face, gold hair, black-and-white glasses, bent ear, upright ear and haori pattern must remain legible at small icon size.

INVARIANTS:
Change nothing unless a later instruction explicitly names the permitted change. When creating a pose, expression, setting, or clothing variant, preserve the canonical face, ear asymmetry, gold forelock, black-front/white-temple glasses, chin tuft, mature expression, cream fur, Edo folk-print linework and core palette.

AVOID:
human body proportions, human hands, cute baby mascot styling, large glossy eyes, anime, manga, Pixar, Disney, modern vector art, clean uniform curves, photorealism, 3D rendering, detailed realistic fur, gradients, glossy surfaces, cinematic lighting, airbrushing, saturated digital colors, text, logos, signature, seal, watermark.
```

## 5. 派生画像用の追記方法

完全再現用プロンプトの末尾に、変更を許可する内容だけを追加する。

例：

```text
PERMITTED CHANGE ONLY:
Change only the pose so that the rabbit is writing in a notebook. Preserve every locked identity, costume, palette and style feature from Reference Image 1.
```

表情差分、ポーズ差分、背景差分を同時に指示しない。原則として一回の生成につき変更点は一つに限定する。

## 6. 推奨用途

- マスター画像：ブランド正装、プロフィール紹介、固定ページ
- 顔中心の切り抜き：note、X、Instagram等のプロフィールアイコン
- 派生画像：記事挿絵、公開実験、AI設計、マネタイズ、自己統治の各場面

プロフィールアイコンを作る場合も新規生成はせず、まずマスター画像から顔と上半身を円形トリミングする。新しい表情が必要な場合のみ、マスター画像を参照して派生生成する。
