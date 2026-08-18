const pptxgen = require('/private/tmp/portfolio-pptx/node_modules/pptxgenjs');
const sizeOf = require('/private/tmp/portfolio-pptx/node_modules/image-size');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '今田唯仁';
pptx.subject = 'SNS運用代行ポートフォリオ';
pptx.title = '今田唯仁｜Brand Architect';
pptx.company = 'Pound the Rock Design';
pptx.lang = 'ja-JP';
pptx.theme = { headFontFace: 'Noto Sans JP', bodyFontFace: 'Noto Sans JP', lang: 'ja-JP' };
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: 'F7F8F7' },
  objects: [
    { rect: { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: '42AFC0' }, line: { color: '42AFC0' } } },
    { text: { text: 'IMADA TADAHITO  |  BRAND ARCHITECT', options: { x: 0.52, y: 7.09, w: 5.9, h: 0.16, fontFace: 'Aptos', fontSize: 6.5, color: '7C8588', charSpacing: 1.4, margin: 0 } } },
    { text: { text: 'Pound the Rock Design', options: { x: 10.85, y: 7.06, w: 1.86, h: 0.2, fontFace: 'Aptos', fontSize: 6.5, color: '7C8588', align: 'right', margin: 0 } } },
  ],
  slideNumber: { x: 12.77, y: 7.04, w: 0.25, h: 0.2, fontFace: 'Aptos', fontSize: 7, color: '7C8588', align: 'right', margin: 0 }
});

const C = { teal: '42AFC0', tealDark: '188CA1', pale: 'DDE3E2', ink: '202526', muted: '687174', white: 'FFFFFF', bg: 'F7F8F7', lime: 'D8E88D', blue: 'DDEDF1' };
const F = 'Noto Sans JP';
const root = '/Users/imadatadahito/Desktop/ai-imadaruma';
const assets = path.join(root, '04_貿易省/文化庁/portfolio/assets');
const out = path.join(root, '04_貿易省/文化庁/portfolio/今田唯仁_SNS運用代行ポートフォリオ_v4_Canva編集用.pptx');

// 外付けHDDに依存しないよう、使用画像はすべて assets/ 配下へ取り込み済み。
// 取り込み元の対応は README.md の「素材の出所」を参照。
const IMG = {
  face: path.join(assets, 'profile/face.jpg'),
  flextLogo: path.join(assets, 'works/flext_emblem.jpg'),
  rexLogo: path.join(assets, 'works/rex_emblem.png'),
  rexSns: path.join(assets, 'works/rex_sns.jpg'),
  arsoa: path.join(assets, 'arsoa_wellness.png'),
  lemonBrand: path.join(assets, 'works/lemon_brand.jpg'),
  lemonDress: path.join(assets, 'works/lemon_dressing.jpg'),
  freienTop: path.join(assets, 'works/freien_top.png'),
  freienPost: path.join(assets, 'works/freien_post.jpg'),
  colors: path.join(assets, 'brand_colors.png'),
  festivalCover: path.join(assets, 'instagram/vamos_festival_cover.png'),
  festival1: path.join(assets, 'instagram/vamos_festival_01.png'),
  festival2: path.join(assets, 'instagram/vamos_festival_02.png'),
  vamosCup1: path.join(assets, 'instagram/vamoscup_01.png'),
  vamosCup2: path.join(assets, 'instagram/vamoscup_02.png'),
  vamosCup3: path.join(assets, 'instagram/vamoscup_03.png'),
  ptrd: path.join(assets, 'reels/PTRDinsta2024リール_ニーチェ流天才論.mp4.png'),
  sound: path.join(assets, 'reels/imadaruma.soundリール05ブリッジヘア (1).mp4.png'),
  soundMarche: path.join(assets, 'reels/sound_marche.png'),
  rexReel: path.join(assets, 'reels/rex-trainingcamp.mp4.png'),
  rexPhysical: path.join(assets, 'reels/rex_physical.png'),
  sleepBook: path.join(assets, 'kindle/shori_sleep.jpg'),
  foodBook: path.join(assets, 'kindle/shori_food.jpg')
};

function addText(slide, text, x, y, w, h, o = {}) {
  slide.addText(text, { x, y, w, h, fontFace: F, fontSize: o.fontSize || 14, color: o.color || C.ink,
    bold: !!o.bold, margin: o.margin === undefined ? 0 : o.margin, breakLine: false,
    valign: o.valign || 'mid', align: o.align || 'left', fit: 'shrink',
    paraSpaceAfterPt: o.paraSpaceAfterPt || 0, bullet: o.bullet, isTextBox: true,
    charSpacing: o.charSpacing, italic: o.italic, transparency: o.transparency, lineSpacingMultiple: o.lsm });
}
function rect(slide, x, y, w, h, fill = C.white, radius = 0.1, line = fill) {
  slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x, y, w, h,
    rectRadius: radius, fill: { color: fill }, line: { color: line, transparency: line === fill ? 100 : 0, width: 0.7 } });
}
function line(slide, x, y, w, h, color = C.teal, width = 1.5) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h, line: { color, width, beginArrowType: 'none', endArrowType: 'none' } });
}
function imageContain(slide, file, x, y, w, h) {
  const s = sizeOf(file); const r = Math.min(w / s.width, h / s.height);
  const iw = s.width * r, ih = s.height * r;
  slide.addImage({ path: file, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}
function imageBox(slide, file, x, y, w, h, bg = C.white, mode = 'contain') {
  rect(slide, x, y, w, h, bg, 0.08);
  if (mode === 'crop') imageContain(slide, file, x + 0.04, y + 0.04, w - 0.08, h - 0.08);
  else imageContain(slide, file, x + 0.12, y + 0.12, w - 0.24, h - 0.24);
}
let PG = 1;
function title(slide, eyebrow, heading, sub = '') {
  addText(slide, String(++PG).padStart(2, '0'), 0.54, 0.38, 0.42, 0.34, { fontSize: 11, bold: true, color: C.tealDark });
  addText(slide, eyebrow.toUpperCase(), 1.05, 0.39, 6.5, 0.28, { fontSize: 8, color: C.muted, charSpacing: 1.3 });
  addText(slide, heading, 0.54, 0.82, 11.9, 0.55, { fontSize: 24, bold: true });
  if (sub) addText(slide, sub, 0.57, 1.42, 11.4, 0.36, { fontSize: 10.5, color: C.muted });
}
function chip(slide, text, x, y, w, fill = C.blue, color = C.ink) {
  rect(slide, x, y, w, 0.36, fill, 0.18);
  addText(slide, text, x + 0.08, y + 0.03, w - 0.16, 0.28, { fontSize: 8.7, bold: true, color, align: 'center' });
}
function card(slide, x, y, w, h, num, head, body, fill = C.white) {
  rect(slide, x, y, w, h, fill, 0.1);
  addText(slide, num, x + 0.2, y + 0.18, 0.45, 0.35, { fontSize: 10, bold: true, color: C.tealDark });
  addText(slide, head, x + 0.2, y + 0.62, w - 0.4, 0.43, { fontSize: 15, bold: true });
  addText(slide, body, x + 0.2, y + 1.12, w - 0.4, h - 1.3, { fontSize: 9.4, color: C.muted, valign: 'top' });
}
// Small labelled block used across the new Works pages.
function point(slide, x, y, w, h, label, body, fill = C.white) {
  rect(slide, x, y, w, h, fill, 0.08);
  addText(slide, label, x + 0.18, y + 0.11, w - 0.36, 0.27, { fontSize: 11, bold: true });
  addText(slide, body, x + 0.18, y + 0.42, w - 0.36, h - 0.54, { fontSize: 9, color: C.muted, valign: 'top' });
}
// ROLE行の右端に RESULT 欄を置く。縦スペースを使わずに数値の記入先を用意するため。
// 数値が出たら、Canva上でこの枠内の文字を差し替える運用。
function roleRow(slide, y, roleText, x = 0.66, w = 10.85, showResult = true) {
  addText(slide, 'ROLE', x, y, 0.72, 0.25, { fontSize: 7.2, bold: true, color: C.tealDark, charSpacing: 1 });
  const rw = 3.4;
  addText(slide, roleText, x + 0.86, y - 0.04, showResult ? w - rw - 0.3 : w, 0.34, { fontSize: 10.8, bold: true });
  if (showResult) {
    const rx = x + 0.86 + (w - rw);
    rect(slide, rx, y - 0.1, rw, 0.44, C.bg, 0.06, C.pale);
    addText(slide, 'RESULT', rx + 0.16, y - 0.03, 0.9, 0.24, { fontSize: 7.2, bold: true, color: C.tealDark, charSpacing: 1 });
    addText(slide, '（数値を記入）', rx + 1.1, y - 0.04, rw - 1.26, 0.26, { fontSize: 8.6, color: '9AA3A5' });
  }
}
// 全実績ページ共通。担当範囲は2026-08-17のBOSS回答に基づき統一。
const ROLE_ALL = '企画／デザイン制作／投稿／分析';

// 講師指導の必須4項目（ターゲット・悩み・目的・未来）を2×2で敷く。
function metaGrid(slide, x, y, w, h, items) {
  const gap = 0.14;
  const cw = (w - gap) / 2, ch = (h - gap) / 2;
  const tone = [C.blue, C.white, C.white, C.pale];
  items.forEach((it, i) => {
    const cx = x + (i % 2) * (cw + gap), cy = y + Math.floor(i / 2) * (ch + gap);
    rect(slide, cx, cy, cw, ch, tone[i], 0.08);
    addText(slide, it[0], cx + 0.18, cy + 0.13, cw - 0.36, 0.24, { fontSize: 7.4, bold: true, color: C.tealDark, charSpacing: 1.1 });
    addText(slide, it[1], cx + 0.18, cy + 0.42, cw - 0.36, ch - 0.58, { fontSize: 9.3, valign: 'top' });
  });
}
const META = ['TARGET', 'ISSUE', 'PURPOSE', 'FUTURE'];
function meta4(target, issue, purpose, future) {
  return [[META[0], target], [META[1], issue], [META[2], purpose], [META[3], future]];
}

/* ---------------------------------------------------------------- 1 Cover */
{
  const s = pptx.addSlide(); s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 9.15, y: 0, w: 4.18, h: 7.5, fill: { color: C.teal }, line: { color: C.teal } });
  s.addShape(pptx.ShapeType.arc, { x: 8.52, y: 0.8, w: 4.2, h: 4.2, adjustPoint: 0.35, rotate: 22, fill: { color: C.teal, transparency: 100 }, line: { color: C.pale, transparency: 30, width: 2 } });
  addText(s, 'SNS MANAGEMENT PORTFOLIO', 0.8, 0.72, 5.5, 0.3, { fontSize: 9, color: C.pale, charSpacing: 2.2 });
  addText(s, '想いを、\n届き続けるブランドへ。', 0.78, 1.65, 7.85, 1.7, { fontSize: 30, bold: true, color: C.white, valign: 'top' });
  addText(s, 'Brand Architect', 0.83, 4.22, 4.7, 0.38, { fontSize: 14, bold: true, color: C.teal, charSpacing: 0.6 });
  addText(s, '今田 唯仁  /  Imada Tadahito', 0.83, 4.72, 5.5, 0.52, { fontSize: 20, bold: true, color: C.white });
  addText(s, 'SNSブランド設計・運用ディレクション', 0.84, 5.36, 5.4, 0.32, { fontSize: 11, color: C.pale, charSpacing: 0.8 });
  addText(s, '設計力 × 編集力 × 伴走力', 0.84, 5.8, 4.8, 0.32, { fontSize: 10, color: C.teal, charSpacing: 1.1 });
  addText(s, '2026', 11.64, 6.83, 0.8, 0.28, { fontSize: 9, color: C.ink, bold: true, align: 'right' });
}

/* ------------------------------------------------------------- 2 Contents */
{
  const s = pptx.addSlide('MASTER'); title(s, 'Contents', 'ブランドの「伝わる仕組み」を、SNSに。', '見た目だけで終わらせず、目的・対象・言葉・運用まで一貫して設計します。');
  const items = [['01','WHO I AM','経歴・強み・25年の実務','p.3–6'],['02','HOW I THINK','市場・リサーチ・\nアルゴリズム・設計方針','p.7–15'],['03','WORKS','実績・企画提案・出版','p.16–27'],['04','CONTACT','料金・稼働体制・\nご依頼方法','p.28–31']];
  items.forEach((a,i)=>{const x=0.58+i*3.1; rect(s,x,2.22,2.78,3.72,i===1?C.blue:C.white,0.08); addText(s,a[0],x+0.2,2.46,0.5,0.32,{fontSize:10,bold:true,color:C.tealDark}); addText(s,a[1],x+0.2,3.02,2.35,0.32,{fontSize:10,bold:true,charSpacing:1.1}); line(s,x+0.2,3.56,0.56,0,C.teal,2); addText(s,a[2],x+0.2,3.84,2.35,0.95,{fontSize:13,bold:true,valign:'top'}); addText(s,a[3],x+0.2,5.42,2.35,0.28,{fontSize:8.5,color:C.muted});});
  addText(s, '25年以上のデザイン・編集経験を、SNSの継続運用へ。', 0.6, 6.35, 11.9, 0.42, { fontSize: 15, bold: true, align: 'center' });
}

/* -------------------------------------------------------------- 3 Profile */
{
  const s = pptx.addSlide('MASTER'); title(s, 'Profile', '今田 唯仁  |  Brand Architect', 'SNSブランド設計・運用ディレクション');
  imageBox(s, IMG.face, 0.62, 2.0, 3.18, 3.18, C.pale, 'crop');
  chip(s, 'Pound the Rock Design', 0.84, 5.52, 2.75, C.ink, C.white);
  addText(s, 'グラフィックデザイン・編集・ブランド設計に25年以上携わってきました。\n企業や地域、スポーツクラブが持つ「らしさ」を言葉とビジュアルに整理し、SNSで継続的に伝わる形へ落とし込みます。', 4.35, 2.03, 7.94, 1.4, { fontSize: 14, valign: 'top' });
  const rows=[['BACKGROUND','元地域情報誌 編集長／プロスポーツクラブのVI・SNS'],['SPECIALTY','ブランド設計・編集・SNSコンテンツ'],['COACHING','JFA B級／メンタルコーチ資格'],['TOOLS','Adobe CC / Premiere Pro / ChatGPT / Claude / Gemini']];
  rows.forEach((r,i)=>{const y=3.72+i*0.58; addText(s,r[0],4.38,y,1.35,0.28,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:0.8}); addText(s,r[1],5.86,y-0.02,6.4,0.32,{fontSize:10.8,bold:i===1}); line(s,4.38,y+0.39,7.88,0,C.pale,0.8);});
  addText(s, '「葦なる刃は、静かに尖れる。」', 4.4, 6.23, 7.6, 0.35, { fontSize: 13, italic: true, color: C.tealDark });
}

/* -------------------------------------------------------------- 4 Career */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Career', '25年、「伝わる形」をつくり続けてきた。', '出典：職歴正本。数値はいずれも実績として確認できるもののみを記載しています。');
  const rows = [
    ['2001.10\n2002.12', 'TOPPAN 株式会社', '大判印刷デザイナー', '大判印刷事業の立ち上げスタッフとして、企画から制作までを一任される。'],
    ['2004.01\n2005.10', '有限会社ボウオフィス', 'デザイナー', '不動産会社のロゴから名刺・封筒・看板までVI一式を担当。ごみ減少をテーマにしたポスターでは、掲示のみでごみの減少を実現。'],
    ['2008.04\n2013.12', '株式会社NOTE', '編集長／クリエイティブディレクター', '地域情報誌を全面リニューアルし、1年で昨対比・年商10倍。町勢要覧コンペでは、従来の行政発行物ではないフリーペーパー仕様で提案し受託。'],
    ['2008.10\n2010.10', 'フットサルラボ（兼業）', '個人事業主', '施設運営・スクール指導・イベント企画を担当。並行してアパレルブランドを立ち上げ、制作から販売・営業まで担う。'],
    ['2015.04\n現在', 'Pound the Rock Design', '代表／クリエイティブディレクター', 'ボルクバレット北九州、カノアラウレアーズ福岡のエンブレム・SNS戦略・VIデザインを担当。雑誌の誌面・広告に加え、SNSフィード投稿デザインも手がける。']
  ];
  rows.forEach((r, i) => {
    const y = 1.96 + i * 0.93;
    rect(s, 0.6, y, 12.12, 0.83, i % 2 ? C.white : C.blue, 0.06);
    addText(s, r[0], 0.82, y + 0.12, 1.05, 0.56, { fontSize: 8.6, bold: true, color: C.tealDark, valign: 'top' });
    addText(s, r[1], 2.02, y + 0.11, 2.72, 0.29, { fontSize: 12, bold: true });
    addText(s, r[2], 2.02, y + 0.45, 2.72, 0.26, { fontSize: 8.2, color: C.muted });
    line(s, 4.95, y + 0.14, 0, 0.53, C.pale, 1);
    addText(s, r[3], 5.16, y + 0.10, 7.34, 0.62, { fontSize: 9.3, valign: 'mid' });
  });
  addText(s, '※ 各社での担当領域は、企画・取材・ライティング・デザイン・提案まで一貫しています。', 0.6, 6.66, 12.12, 0.28, { fontSize: 8.5, color: C.muted });
}

/* ------------------------------------------------------------ 5 Strengths */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Strengths','3つの力で、運用が続く土台をつくる。');
  card(s,0.6,2.05,3.88,3.85,'01','設計力','目的・顧客・競合・導線を整理し、発信の軸と優先順位を明確にします。\n\n誰に、何を、どの順で伝えるか。ここが決まらないまま投稿を重ねても、本数が増えるだけで何も積み上がりません。',C.blue);
  card(s,4.72,2.05,3.88,3.85,'02','編集力','伝えたい情報を、相手が読みたくなる言葉・順序・ビジュアルに再構成します。\n\n25年の編集経験は、足す技術より削る判断の蓄積です。何を書かないかを決められることが、読ませる条件だと考えています。',C.white);
  card(s,8.84,2.05,3.88,3.85,'03','伴走力','制作して終わりではなく、反応を見ながら改善します。\n\n担当者が代わっても回るよう、判断基準とテンプレートを残す。属人化させないことが、続く運用の条件です。',C.pale);
  addText(s,'DESIGN  ×  EDITORIAL  ×  COACHING',0.62,6.36,12.05,0.35,{fontSize:10,bold:true,color:C.muted,align:'center',charSpacing:2});
}

/* ----------------------------------------------------------- 5 Experience */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Experience','経験を、SNS運用の判断力に変える。');
  const nums=[['25+','YEARS','デザイン・編集・ブランド支援'],['10×','SALES','編集長として刷新後、年間売上が前年比約10倍'],['4','FIELDS','スポーツ・地域・美容・ブランド']];
  nums.forEach((n,i)=>{const x=0.65+i*4.15; rect(s,x,2.08,3.78,2.05,i===1?C.teal:C.white,0.08); addText(s,n[0],x+0.22,2.31,3.3,0.65,{fontSize:32,bold:true,color:i===1?C.white:C.tealDark}); addText(s,n[1],x+0.24,3.03,1.8,0.25,{fontSize:7.5,bold:true,color:i===1?C.ink:C.muted,charSpacing:1.5}); addText(s,n[2],x+0.23,3.42,3.28,0.47,{fontSize:9.5,bold:true,color:i===1?C.white:C.ink,valign:'top'});});
  addText(s,'媒体をつくる視点',0.75,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'企画・取材・編集・デザインを横断し、情報を一つの体験にまとめる。',0.75,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'ブランドを育てる視点',4.88,4.73,2.9,0.36,{fontSize:14,bold:true}); addText(s,'単発の投稿ではなく、積み重ねで信頼が育つ世界観と運用ルールをつくる。',4.88,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'人を動かす視点',9.0,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'コーチ経験を活かし、依頼者・チーム・顧客の目線をつなぎながら前進させる。',9.0,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
}

/* --------------------------------------------------------------- 7 Market */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Market', 'いま伸びているのは、10代ではなく40代・60代。', '出典：総務省情報通信政策研究所「令和6年度 情報通信メディアの利用時間と情報行動に関する調査」（令和7年6月公表・N=1,800）');
  // 年代別バー
  const ages = [['10代', 75.0], ['20代', 78.0], ['30代', 70.5], ['40代', 67.0], ['50代', 52.7], ['60代', 34.7]];
  const bx = 0.62, by = 2.05, bw = 7.5, bh = 3.05;
  rect(s, bx, by, bw, bh, C.white, 0.08);
  addText(s, '年代別 Instagram 利用率', bx + 0.26, by + 0.18, 4.0, 0.28, { fontSize: 10.5, bold: true });
  addText(s, '全年代 52.6％（前年度 48.4％）', bx + 0.26, by + 0.5, 4.0, 0.24, { fontSize: 8.6, color: C.muted });
  ages.forEach((a, i) => {
    const y = by + 0.88 + i * 0.35;
    addText(s, a[0], bx + 0.26, y, 0.6, 0.26, { fontSize: 9, bold: true });
    rect(s, bx + 0.95, y + 0.04, 5.4, 0.19, C.pale, 0.09);
    rect(s, bx + 0.95, y + 0.04, 5.4 * (a[1] / 80), 0.19, i === 3 || i === 5 ? C.tealDark : C.teal, 0.09);
    addText(s, a[1].toFixed(1) + '％', bx + 6.45, y, 0.85, 0.26, { fontSize: 9, bold: true, color: C.tealDark });
  });
  // 伸び幅
  const g = [['40代', '57.2％ → 67.0％', '＋9.8pt'], ['60代', '22.6％ → 34.7％', '＋12.1pt']];
  rect(s, 8.35, 2.05, 4.37, 3.05, C.ink, 0.08);
  addText(s, '前年度からの伸び', 8.6, 2.23, 3.0, 0.28, { fontSize: 10.5, bold: true, color: C.teal });
  g.forEach((v, i) => {
    const y = 2.68 + i * 1.05;
    addText(s, v[0], 8.6, y, 1.2, 0.34, { fontSize: 15, bold: true, color: C.white });
    addText(s, v[2], 10.6, y - 0.02, 1.9, 0.36, { fontSize: 17, bold: true, color: C.teal, align: 'right' });
    addText(s, v[1], 8.6, y + 0.4, 3.9, 0.26, { fontSize: 9.2, color: C.pale });
    if (i === 0) line(s, 8.6, y + 0.78, 3.87, 0, C.muted, 0.8);
  });
  addText(s, '報告書本文にも「特に60代で大幅に増加」と明記されています。', 8.6, 4.66, 3.9, 0.36, { fontSize: 8.5, color: C.pale, valign: 'top' });
  // 結論
  rect(s, 0.62, 5.32, 12.1, 1.12, C.blue, 0.08);
  addText(s, '「若者向けの媒体」という前提は、すでに古い。', 0.9, 5.5, 11.5, 0.36, { fontSize: 15, bold: true, align: 'center' });
  addText(s, '購買力のある40代・シニア層が新たに流入しています。地域事業者・スポーツクラブ・店舗にとって、いま始める理由がここにあります。', 0.9, 5.94, 11.5, 0.32, { fontSize: 10, color: C.muted, align: 'center' });
  addText(s, '※ 数値は上記の政府統計のみを使用しています。出典を確認できない民間調査の数値は掲載していません。', 0.62, 6.62, 12.1, 0.28, { fontSize: 8.2, color: C.muted });
}

/* ------------------------------------------------------------- 8 Services */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Services','SNS運用を、戦略から制作・改善まで。','必要な範囲だけの部分支援にも対応します。');
  const a=[['01','戦略設計','目的設定／競合・顧客整理／媒体選定／KPI設計'],['02','企画・編集','投稿テーマ／企画カレンダー／コピー・構成／導線'],['03','クリエイティブ','投稿画像／カルーセル／ショート動画／テンプレート'],['04','運用・改善','投稿管理／数値確認／月次レポート／改善提案']];
  a.forEach((v,i)=>{const x=0.62+(i%2)*6.13,y=2.08+Math.floor(i/2)*2.08; rect(s,x,y,5.82,1.72,i===0?C.blue:C.white,0.08); addText(s,v[0],x+0.2,y+0.2,0.5,0.27,{fontSize:8,bold:true,color:C.tealDark}); addText(s,v[1],x+0.82,y+0.17,1.45,0.35,{fontSize:14,bold:true}); addText(s,v[2],x+0.82,y+0.75,4.55,0.52,{fontSize:9.5,color:C.muted,valign:'top'});});
  chip(s,'Instagram',1.44,6.43,1.55); chip(s,'Web / LP',3.23,6.43,1.42); chip(s,'Brand / VI',4.89,6.43,1.55); chip(s,'Print',6.68,6.43,1.12); chip(s,'AI workflow',8.04,6.43,1.62); chip(s,'Short video',9.9,6.43,1.62);
}

/* -------------------------------------------------------------- 7 Process */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Process','感覚に頼らず、5段階で運用する。');
  const a=[['01','RESEARCH','現状・競合・顧客'],['02','TARGET','ペルソナ・課題'],['03','CONCEPT','言葉・世界観・導線'],['04','CREATE','企画・制作・投稿'],['05','IMPROVE','計測・振り返り・改善']];
  a.forEach((v,i)=>{const x=0.64+i*2.48; rect(s,x,2.18,2.16,3.36,i===2?C.teal:(i%2?C.white:C.blue),0.08); addText(s,v[0],x+0.18,2.38,0.5,0.3,{fontSize:8,bold:true,color:i===2?C.ink:C.tealDark}); addText(s,v[1],x+0.18,3.02,1.78,0.35,{fontSize:11,bold:true,color:i===2?C.white:C.ink,charSpacing:0.8}); line(s,x+0.18,3.54,0.5,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.18,3.9,1.75,0.7,{fontSize:10,bold:true,color:i===2?C.white:C.muted,valign:'top'}); if(i<4)addText(s,'→',x+2.2,3.48,0.27,0.3,{fontSize:15,bold:true,color:C.tealDark,align:'center'});});
  addText(s,'毎月の改善サイクルへ',4.55,6.14,4.18,0.42,{fontSize:14,bold:true,color:C.tealDark,align:'center'});
}

/* ------------------------------------------------------------- 8 Research */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Research','「なんとなく」を捨て、数で当たりをつける。','案件に入る前から、市場・競合・勝ち筋を自分の手で調べ切ります。');
  card(s,0.6,2.05,3.88,2.95,'01','アカウント調査','53アカウント／15ジャンルを収集し、プロフィール文・フォロワー数・投稿数・投稿形式・開始時期まで台帳化。',C.blue);
  card(s,4.72,2.05,3.88,2.95,'02','リール分解','伸びた動画のフック文・構成・尺を分類し、「当たりワード」として蓄積。感覚ではなく型で企画する。',C.white);
  card(s,8.84,2.05,3.88,2.95,'03','市場マップ','ジャンル別に需要と競合密度を並べ、まだ埋まっていない切り口を特定してから発信を設計する。',C.pale);
  rect(s,0.6,5.3,12.12,1.0,C.ink,0.08);
  addText(s,'保有するリサーチ台帳',0.92,5.46,3.0,0.3,{fontSize:9,bold:true,color:C.teal,charSpacing:0.8});
  addText(s,'アカウントリサーチ台帳（53件）　／　バズリールリサーチシート（フック当たりワード・高品質リール・0→1企画）　／　Instagram Market Research Master',0.92,5.8,11.5,0.34,{fontSize:10,bold:true,color:C.white});
  addText(s,'※ 台帳はいずれも当方が独自に作成・運用しているものです。',0.6,6.5,12.12,0.28,{fontSize:8.5,color:C.muted});
}

/* ------------------------------------------------------- 9 Original metric */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Original Metric','フォロワー数ではなく、「1投稿あたりの効率」で見る。','他社と同じ数字を見ていては、他社と同じ結論しか出ません。');
  rect(s,0.6,2.02,12.12,1.5,C.teal,0.08);
  addText(s,'フォロワー数  ÷  投稿数  ×  100',0.9,2.3,11.5,0.6,{fontSize:26,bold:true,color:C.white,align:'center'});
  addText(s,'＝ 投稿1本が、どれだけフォロワーを連れてきたか',0.9,3.0,11.5,0.3,{fontSize:10.5,color:C.ink,align:'center'});
  const a=[['なぜ必要か','フォロワー数だけでは、投稿を大量に重ねて積み上げたアカウントと、少ない本数で深く刺さったアカウントを区別できない。'],['何が分かるか','企画の再現性。効率が高いアカウントほど、1本あたりの設計が強く、真似すべき「型」を持っている。'],['どう使うか','効率上位のアカウントだけを抽出し、その型をクライアントのジャンル・語り口へ翻訳して投稿計画に落とす。']];
  a.forEach((v,i)=>{const x=0.6+i*4.08; point(s,x,3.8,3.88,1.95,v[0],v[1],i===1?C.blue:C.white);});
  rect(s,0.6,6.02,12.12,0.6,C.pale,0.08);
  addText(s,'台帳は案件ごとに作り直します。ジャンルが違えば、勝ち筋も変わるからです。',0.9,6.16,11.5,0.32,{fontSize:11,bold:true,align:'center'});
  addText(s,'※ この指標は当方が独自に設計したものです。Instagram公式の指標ではありません。',0.6,6.78,12.12,0.28,{fontSize:8.5,color:C.muted});
}

/* --------------------------------------------------------------- 10 Trends */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Trends','公式発表を、運用の判断材料にする。','出典はすべて Meta / Instagram 公式発表。参照日：2026年8月17日。');
  const a=[['2024.12','Trial Reels','非フォロワーへ先行配信し、約24時間で表示数・いいね・コメント・シェアを確認できる。72時間以内の成績で自動的に全体公開する設定も選べる。'],['2025.01','リールの推奨条件','最長3分の動画が推奨対象に。写真・カルーセルも音源を付けるとリールタブの対象になる、と公式が案内している。'],['2025.08','リポスト','公開中のリール・フィード投稿を他のユーザーが再共有でき、元の投稿者がクレジットされる。第三者経由の露出が増える。'],['2025.08','Friends タブ','友人が「いいね・作成・リポスト・コメント」したリールが並ぶ面が追加。知人の反応が到達の経路になる。']];
  a.forEach((v,i)=>{const x=0.6+(i%2)*6.13, y=2.02+Math.floor(i/2)*2.05;
    rect(s,x,y,5.82,1.72,i%3===0?C.blue:C.white,0.08);
    rect(s,x+0.2,y+0.2,0.86,0.3,C.tealDark,0.14);
    addText(s,v[0],x+0.2,y+0.23,0.86,0.24,{fontSize:8,bold:true,color:C.white,align:'center'});
    addText(s,v[1],x+1.2,y+0.18,4.4,0.34,{fontSize:14,bold:true});
    addText(s,v[2],x+0.2,y+0.66,5.42,0.92,{fontSize:9.2,color:C.muted,valign:'top'});});
  addText(s,'出典：about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best/　／　creators.instagram.com/blog/the-latest-with-instagram（2025年1月21日）　／　about.fb.com/news/2025/08/new-instagram-features-help-you-connect/',0.6,6.28,12.12,0.5,{fontSize:6.8,color:C.muted,valign:'top'});
}

/* ------------------------------------------------------------ 11 Algorithm */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Algorithm','公式のランキング指標に、運用を合わせる。','Instagram公式「Instagram Ranking Explained」（2023年5月31日公開）が示す面ごとのシグナルに基づく。');
  addText(s,'面',0.72,1.98,1.5,0.26,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'公式が挙げるシグナル',2.42,1.98,4.6,0.26,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'運用でやること',7.5,1.98,5.0,0.26,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:1});
  const a=[['フィード','自分の活動／投稿の情報／投稿者の情報／過去の交流','保存とシェアが起きる情報設計に寄せる。単発ではなく、同じ相手に届き続ける連載型で組む。'],
           ['ストーリーズ','視聴履歴／エンゲージ履歴／親密度','質問・アンケートなど反応装置を置き、双方向の履歴そのものを資産としてつくる。'],
           ['発見','投稿の人気度／発見での行動／投稿者の情報','初見の相手に届く前提で、1枚目とフックを設計する。文脈が要る言い回しを避ける。'],
           ['リール','自分の活動／過去の交流／リールの情報（音源・映像）／投稿者の情報','音源と冒頭2秒を検証対象に固定し、Trial Reelsで非フォロワーに先に当てて判断する。']];
  a.forEach((v,i)=>{const y=2.34+i*1.05;
    rect(s,0.6,y,12.12,0.94,i%2?C.white:C.blue,0.06);
    addText(s,v[0],0.84,y+0.28,1.6,0.38,{fontSize:12.5,bold:true});
    addText(s,v[1],2.42,y+0.14,4.85,0.66,{fontSize:9,color:C.muted,valign:'mid'});
    line(s,7.28,y+0.16,0,0.62,C.pale,1);
    addText(s,v[2],7.5,y+0.14,5.0,0.66,{fontSize:9.4,valign:'mid'});});
  addText(s,'※ アルゴリズムは変化します。公式発表を継続的に確認し、運用ルールを更新したうえでご報告します。',0.6,6.68,12.12,0.3,{fontSize:8.5,color:C.muted});
}

/* ------------------------------------------------------------ 12 Framework */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Framework','「投稿」ではなく、「伝わり続ける流れ」を設計。');
  const a=[['想い','WHY'],['言語化','MESSAGE'],['世界観','IDENTITY'],['コンテンツ','CONTENT'],['継続運用','OPERATION']];
  a.forEach((v,i)=>{const x=0.82+i*2.42; s.addShape(pptx.ShapeType.ellipse,{x,y:2.25,w:1.72,h:1.72,fill:{color:i===4?C.teal:(i%2?C.pale:C.white)},line:{color:i===4?C.teal:C.pale,width:1}}); addText(s,v[0],x+0.1,2.72,1.52,0.36,{fontSize:14,bold:true,color:i===4?C.white:C.ink,align:'center'}); addText(s,v[1],x+0.1,3.18,1.52,0.22,{fontSize:6.8,bold:true,color:i===4?C.ink:C.tealDark,align:'center',charSpacing:0.8}); if(i<4)line(s,x+1.72,3.1,0.7,0,C.teal,1.6);});
  rect(s,1.25,4.65,10.83,1.25,C.ink,0.08); addText(s,'ブランドの核を守りながら、媒体と顧客に合わせて表現を変える。',1.6,4.95,10.15,0.42,{fontSize:16,bold:true,color:C.white,align:'center'});
  addText(s,'一貫性と変化の両方が、長く選ばれるSNSをつくります。',2.3,6.2,8.75,0.32,{fontSize:10,color:C.muted,align:'center'});
}

/* -------------------------------------------------------- 15 Design policy */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Design Policy', '色も書体も、感覚ではなく理由で選ぶ。', 'この資料自体を、私の判断基準のサンプルとしてご覧ください。');
  // 書体
  rect(s, 0.62, 2.02, 5.9, 2.5, C.white, 0.08);
  addText(s, 'TYPEFACE', 0.88, 2.22, 2.0, 0.24, { fontSize: 7.4, bold: true, color: C.tealDark, charSpacing: 1.1 });
  addText(s, 'Noto Sans JP', 0.88, 2.5, 4.0, 0.42, { fontSize: 20, bold: true });
  addText(s, '・和文と欧文で字面が揃い、混植しても行が乱れない\n・9ウェイトあるため、強弱を「色」ではなく「太さ」でつくれる\n・Canvaに標準搭載。納品後にクライアント側で編集しても崩れない',
    0.88, 3.06, 5.4, 1.3, { fontSize: 9.6, color: C.muted, valign: 'top' });
  // 配色
  rect(s, 6.8, 2.02, 5.92, 2.5, C.white, 0.08);
  addText(s, 'COLOR', 7.06, 2.22, 2.0, 0.24, { fontSize: 7.4, bold: true, color: C.tealDark, charSpacing: 1.1 });
  const cols = [[C.teal, '#42AFC0', '主役'], [C.ink, '#202526', '文字'], [C.pale, '#DDE3E2', '余白の段差'], [C.blue, '#DDEDF1', '強調の背景']];
  cols.forEach((c, i) => {
    const x = 7.06 + i * 1.42;
    rect(s, x, 2.56, 1.24, 0.86, c[0], 0.08, C.pale);
    addText(s, c[1], x, 3.5, 1.24, 0.24, { fontSize: 8, bold: true, align: 'center' });
    addText(s, c[2], x, 3.76, 1.24, 0.24, { fontSize: 8.2, color: C.muted, align: 'center' });
  });
  addText(s, '色数は4色に固定。増やすほど「どこを見ればいいか」が消えるためです。', 7.06, 4.08, 5.4, 0.3, { fontSize: 9.3 });
  // 判断理由
  const r = [['ターコイズを主役に置く理由', 'スポーツ・教育・地域など「信頼が要る領域」を扱うため、彩度を落として浮つかせない。同時に、青より前向きで、緑より軽い。'],
             ['黒を使わない理由', '純黒は写真の黒と競合し、文字が沈む。チャコールに寄せることで、写真の上でも文字が独立して読める。'],
             ['余白に色を持たせる理由', '白の上に白を置くと段差が消える。ライトグレーを挟むことで、情報の階層が「線を引かなくても」伝わる。']];
  r.forEach((v, i) => { point(s, 0.62 + i * 4.08, 4.76, 3.88, 1.62, v[0], v[1], i === 1 ? C.blue : C.white); });
  addText(s, 'この判断基準は、クライアントのブランドに合わせて毎回組み直します。上記は本資料のためのものです。', 0.62, 6.62, 12.1, 0.28, { fontSize: 8.5, color: C.muted });
}

/* --------------------------------------------- 16 Works 01 VAMOS festival */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 01 / Instagram Feed','少年サッカー情報舎 VAMOS｜告知を、参加動機に変える。','第3回 VAMOSまつり（2026年6月28日／ルイガンズ福岡）の告知クリエイティブ。');
  imageBox(s,IMG.festival1,0.62,1.95,2.36,2.95,C.white);
  imageBox(s,IMG.festival2,3.08,1.95,2.36,2.95,C.white);
  metaGrid(s,5.72,1.95,7.0,2.95, meta4(
    '福岡近郊の小学生年代の子をもつ保護者。休日に家族で行ける場所を探している層。',
    'サッカーイベントの告知は多いが、どれが自分の子に合うのかが分からない。',
    '第3回VAMOSまつりへの参加を増やしつつ、冠協賛の露出価値を毎回同じ強さで担保する。',
    '「うちの子もあの輪に入れる」と親が想像でき、申し込みの心理的ハードルが下がる。'));
  roleRow(s,5.14,ROLE_ALL);
  const p=[['主役を決める','参加した子どもたちの集合写真を主役に置き、「行けば自分もあの輪に入れる」を一目で伝える。'],['読む相手を変える','家族向けの回では観戦する人の表情に主役を差し替え、同じ大会を別の動機で見せる。'],['協賛を立てる','冠協賛（ケイカフェ／MAKERS GROUP）を定位置に固定。告知の強さと還元を両立させる。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,5.54,3.85,1.16,v[0],v[1],i===1?C.blue:C.white);});
}

/* --------------------------------------------------- 14 Works 02 VAMOS CUP */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 02 / Instagram Feed','駅前不動産 presents 第3回 VAMOS CUP｜大会の「格」を、1枚で伝える。','同じクライアントの別シリーズ。まつりとは狙いを変え、競技の緊張感を前に出す。');
  imageBox(s,IMG.vamosCup1,0.62,1.95,2.36,2.95,C.white);
  imageBox(s,IMG.vamosCup2,3.08,1.95,2.36,2.95,C.white);
  metaGrid(s,5.72,1.95,7.0,2.95, meta4(
    'ジュニア年代の選手・指導者と、その保護者。出場する大会を選ぶ立場にある層。',
    '地域大会は数が多く、どれが「出る価値のある大会」なのかが伝わりにくい。',
    '大会の格を可視化し、参加チームの質と協賛価値を同時に引き上げる。',
    '「あの大会に出た」と言える大会になり、翌年以降の集客と協賛獲得が楽になる。'));
  roleRow(s,5.14,ROLE_ALL);
  const p=[['格をつくる','実写の質感と大きなロゴタイプで、地域大会に全国大会の空気をまとわせる。'],['長文を読ませる','協賛企業からのメッセージを、行間と段落の階層で読み飛ばされない密度に組む。'],['冠を守る','「駅前不動産 presents」を毎回同じ定位置に置き、協賛の露出を同じ強さで確保する。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,5.54,3.85,1.16,v[0],v[1],i===1?C.blue:C.white);});
}

/* ------------------------------------------------------ 15 Works 03 Reels */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 03 / Reels','Pound the Rock Design｜思想を、2秒で立ち止まらせる。','自社アカウントで、哲学・自己統治をテーマにした縦型リールを継続制作。');
  imageBox(s,IMG.ptrd,0.62,1.95,1.98,3.34,C.ink,'crop');
  rect(s,2.78,1.95,2.86,3.34,C.ink,0.08);
  addText(s,'HOOK',3.0,2.16,2.0,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1.2});
  addText(s,'「奇跡が\n起こったかのように」',3.0,2.46,2.46,0.86,{fontSize:14,bold:true,color:C.white,valign:'top'});
  addText(s,'結論を先に出さない。冒頭の一文だけでは意味が完結せず、続きを見ないと分からない状態をつくる。指を止めることに全振りする。',3.0,3.42,2.44,1.16,{fontSize:9,color:C.pale,valign:'top'});
  line(s,3.0,4.66,2.42,0,C.teal,1.4);
  addText(s,'ニーチェ流 天才論\nAdobe Premiere Pro / 9:16',3.0,4.82,2.44,0.56,{fontSize:8.6,color:C.teal,valign:'top'});
  metaGrid(s,5.86,1.95,6.86,3.34, meta4(
    '自分を律したい20〜40代。思想や哲学に関心があり、消費的な情報に飽きている層。',
    '情報は溢れているのに、行動を変えるだけの強さを持った言葉に出会えない。',
    '世界観で記憶に残し、Pound the Rock Design の思想的な立ち位置を確立する。',
    '「この人の言葉をまた読みたい」と思われ、比較ではなく指名で依頼が来る状態をつくる。'));
  roleRow(s,5.52,ROLE_ALL);
  const p=[['画づくり','暗い背景に発光する被写体。タイムライン上で前後の投稿と輝度差が出る配色を選ぶ。'],['縦組みの日本語','横書きが並ぶタイムラインの中で異物になり、同時に世界観そのものを担わせる。'],['続けられる型','素材・配色・文字組みをテンプレート化し、テーマだけ差し替えて量を出す。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,6.1,3.85,0.86,v[0],v[1],i===1?C.blue:C.white);});
}

/* --------------------------------------------- 16 Works 04 Reels (clients) */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 04 / Reels','現場を、そのままブランドの素材にする。','撮って出しにせず、「誰の発信か」が一目で分かる状態まで作り込む。');
  // 2件は狙いが異なるため件別に構成。各2本ずつ並べ、単発でなく続いていることを示す。
  imageBox(s,IMG.sound,0.62,1.95,1.46,2.6,C.ink,'crop');
  imageBox(s,IMG.soundMarche,2.14,1.95,1.46,2.6,C.ink,'crop');
  rect(s,3.72,1.95,2.6,2.6,C.white,0.08);
  addText(s,'imadaruma.sound',3.92,2.14,2.24,0.3,{fontSize:12,bold:true});
  addText(s,'店舗ブランディング',3.92,2.46,2.24,0.22,{fontSize:8,color:C.tealDark,bold:true});
  line(s,3.92,2.76,2.2,0,C.pale,1);
  addText(s,'TARGET',3.92,2.88,2.0,0.2,{fontSize:7,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'近隣で店を探している住民。仕上がりより「店の空気」で選ぶ層。',3.92,3.08,2.2,0.56,{fontSize:8.6,color:C.muted,valign:'top'});
  addText(s,'PURPOSE',3.92,3.68,2.0,0.2,{fontSize:7,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'外観から店内へ視線を送り、行く前に雰囲気を体感させる。イベント告知も同じ型で回す。',3.92,3.88,2.2,0.62,{fontSize:8.6,color:C.muted,valign:'top'});
  imageBox(s,IMG.rexReel,6.5,1.95,1.46,2.6,C.ink,'crop');
  imageBox(s,IMG.rexPhysical,8.02,1.95,1.46,2.6,C.ink,'crop');
  rect(s,9.6,1.95,3.12,2.6,C.blue,0.08);
  addText(s,'CFC REX 筑紫',9.8,2.14,2.76,0.3,{fontSize:12,bold:true});
  addText(s,'スポーツクラブ｜活動レポート',9.8,2.46,2.76,0.22,{fontSize:8,color:C.tealDark,bold:true});
  line(s,9.8,2.76,2.72,0,C.white,1.2);
  addText(s,'TARGET',9.8,2.88,2.0,0.2,{fontSize:7,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'入団を検討する選手と保護者。練習の中身と雰囲気を知りたい層。',9.8,3.08,2.72,0.56,{fontSize:8.6,color:C.muted,valign:'top'});
  addText(s,'PURPOSE',9.8,3.68,2.0,0.2,{fontSize:7,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'合宿は4分割グリッド、練習は日付入りの帯と、内容に応じて型を使い分ける。',9.8,3.88,2.72,0.62,{fontSize:8.6,color:C.muted,valign:'top'});
  addText(s,'いずれも1本で終わらせず、同じ型を使い回して継続的に投稿しています。',0.62,4.7,12.1,0.3,{fontSize:10.5,bold:true,color:C.tealDark});
  roleRow(s,5.2,ROLE_ALL);
  const p=[['共通の狙い','どちらも「行く前の不安」を消すための動画。上手く見せるのではなく、実際の空気をそのまま出す。'],['ブランド要素の常設','ロゴ・エンブレムを画面内に固定し、二次拡散で文脈が外れても発信元が分かる状態を保つ。'],['続けられる型を先に決める','特別な機材を使わず、現場で撮れる素材だけで成立する型にする。だから毎週回せる。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,5.6,3.85,1.2,v[0],v[1],i===1?C.blue:C.white);});
}

/* ------------------------------------------------------ 17 Works 05 Sports */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 05 / Sports Branding','スポーツクラブ｜らしさが伝わる、チームの顔づくり。','ロゴ・エンブレムからSNSビジュアルまで、一貫したトーンを設計。');
  // プロクラブ実績。実名掲載は2026-08-18にBOSS承認済み。
  rect(s,0.62,1.95,12.1,0.98,C.ink,0.08);
  addText(s,'PRO CLUBS',0.9,2.12,1.6,0.24,{fontSize:7.4,bold:true,color:C.teal,charSpacing:1.2});
  addText(s,'ボルクバレット北九州（プロフットサルクラブ）　／　カノアラウレアーズ福岡（プロバレーボールクラブ）',2.62,2.08,9.9,0.36,{fontSize:14,bold:true,color:C.white});
  addText(s,'クラブエンブレム・SNS戦略・VIデザインを担当。アマチュアクラブを含め、スポーツ領域のブランディングに継続的に携わっています。',2.62,2.52,9.9,0.3,{fontSize:9,color:C.pale});
  imageBox(s,IMG.flextLogo,0.62,3.06,2.36,2.36,C.white);
  imageBox(s,IMG.rexLogo,3.24,3.06,2.36,2.36,C.white);
  imageBox(s,IMG.rexSns,5.86,3.06,2.36,2.36,C.ink,'crop');
  metaGrid(s,8.48,3.06,4.24,2.36, meta4(
    'プロ・アマチュアのスポーツクラブ。理念はあるが伝え方が定まっていない組織。',
    '理念と見た目と言葉がばらばらで、クラブとしての一貫性が伝わらない。',
    'エンブレムから投稿まで、同じクラブに見える状態をつくる。',
    '募集・試合情報・物販すべてが積み上がり、ブランドがクラブの資産になる。'));
  roleRow(s,5.62,ROLE_ALL);
  addText(s,'エンブレムは、印刷でもSNSでもリールでも耐えるよう設計し、使う人が迷わないよう配置ルールごとお渡しします。',0.66,5.98,12.0,0.32,{fontSize:10,color:C.muted});
  chip(s,'SPORTS BRANDING',0.66,6.42,2.05,C.blue); chip(s,'SNS VISUAL',2.94,6.42,1.65,C.pale); chip(s,'COMMUNITY',4.82,6.42,1.65,C.white);
}

/* ------------------------------------------------------ 18 Works 06 Beauty */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 06 / Beauty','美容・地域店舗｜情報量を整理し、行動につなげる。','キャンペーン情報を読みやすく編集し、店舗らしい安心感をビジュアル化。');
  imageBox(s,IMG.arsoa,0.62,1.95,3.6,4.55,C.white);
  metaGrid(s,4.5,1.95,8.22,2.5, meta4(
    '地域の30〜60代女性。美容や健康に関心があり、通える範囲で店を探している層。',
    '伝えたい情報が多く、結局どれから読めばいいのか分からず離脱されてしまう。',
    'キャンペーン情報を整理し、来店予約という一つの行動まで導線をつなぐ。',
    '情報量が多くても迷わず読め、「行ってみよう」までの距離が短くなる。'));
  roleRow(s,4.62,ROLE_ALL,4.5,7.3);
  const p=[['優先順位をつくる','伝える情報が多いほど、何を最初に読ませるかの設計が効く。全部を同じ強さで置かない。'],['季節と結びつける','季節感を入り口にすると、内容が同じでも「いま行く理由」が生まれる。'],['SNSへ展開できる形に','紙面の企画をそのまま投稿・ストーリーズへ再編集できる構造で作る。']];
  p.forEach((v,i)=>{point(s,4.5+i*2.78,4.98,2.62,1.52,v[0],v[1],i===1?C.blue:C.white);});
}

/* ---------------------------------------------------- 19 Works 07 Regional */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 07 / Regional','地域商品｜物語から、選ばれるブランドをつくる。','ネーミング・ロゴ・パッケージ・販促まで、地域の背景を一つの物語に。');
  imageBox(s,IMG.lemonBrand,0.62,1.95,4.02,2.85,C.white,'contain');
  imageBox(s,IMG.lemonDress,4.76,1.95,3.9,2.85,C.white,'contain');
  metaGrid(s,8.78,1.95,3.94,2.85, meta4(
    '地域の産品を贈り物や日常づかいで選ぶ生活者と、取扱いを検討する小売。',
    '味や品質は良くても、棚に並んだ瞬間に他の商品と見分けがつかない。',
    'ネーミングからパッケージまでを一つの物語に束ね、選ぶ理由をつくる。',
    '価格ではなく背景で選ばれ、贈り物として指名される商品になる。'));
  addText(s,'結ぶレモン宮若',0.66,4.98,2.45,0.3,{fontSize:12,bold:true});
  addText(s,'ロゴ／ステッカー／リボン／ブランドストーリー',0.66,5.28,4.0,0.28,{fontSize:9,color:C.muted});
  addText(s,'里山レモンドレッシング',4.8,4.98,2.7,0.3,{fontSize:12,bold:true});
  addText(s,'商品設計／パッケージ／販促ビジュアル',4.8,5.28,3.9,0.28,{fontSize:9,color:C.muted});
  roleRow(s,5.78,ROLE_ALL);
  addText(s,'地域の背景（誰が、どこで、なぜ作っているか）を先に言語化し、そこからロゴ・色・パッケージ・販促を一続きで設計しています。',0.66,6.2,12.0,0.32,{fontSize:10,color:C.muted});
}

/* ------------------------------------------------------- 20 Works 08 Brand */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Works 08 / Brand & Web','ブランド・Web｜価値観を、接点ごとに翻訳する。','VI、Web、投稿。媒体が変わっても、同じブランドに感じられる設計。');
  imageBox(s,IMG.freienTop,0.62,1.95,12.1,1.5,C.ink,'contain');
  imageBox(s,IMG.freienPost,0.62,3.62,3.6,2.05,C.white,'crop');
  metaGrid(s,4.48,3.62,8.24,2.05, meta4(
    '価値観で選ぶ層。価格や機能より、その主体が何を大切にしているかを見ている。',
    'Web・SNS・印刷で表現がばらつき、同じブランドだと認識されない。',
    '記号と規則を決め、どの接点でも同じブランドに感じられる状態をつくる。',
    '接点が増えるほど印象が積み上がり、発信そのものが資産として蓄積される。'));
  roleRow(s,5.85,ROLE_ALL);
  addText(s,'ロゴの一文字を欠けさせた形をブランドの記号として定義し、Webのファーストビューから投稿画像まで同じ規則で展開しています。',0.66,6.22,12.0,0.32,{fontSize:10,color:C.muted});
  chip(s,'IDENTITY',0.66,6.58,1.35,C.blue); chip(s,'WEB',2.21,6.58,0.94,C.pale); chip(s,'CONTENT',3.35,6.58,1.25,C.white);
}

/* -------------------------------------------------------- 24 Proposal 01 */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Proposal 01', '同じ告知を、届く形に組み直す。', '既存アカウントの実物は使わず、よくある構成を自分で再現したうえで改善しています。');
  // BEFORE（自作の悪い例）
  addText(s, 'BEFORE', 0.66, 1.98, 1.4, 0.26, { fontSize: 8, bold: true, color: C.muted, charSpacing: 1.4 });
  rect(s, 0.62, 2.3, 2.62, 3.28, 'E8E8E6', 0.06, C.pale);
  addText(s, '体験会やります', 0.82, 2.5, 2.22, 0.28, { fontSize: 11, bold: true });
  addText(s, '3月15日 10時〜12時\n場所：〇〇グラウンド\n対象：小学生\n持ち物：運動できる服装、\n飲み物、タオル、すね当て\n参加費：無料\n雨天時は中止となります\nお申し込みはお電話または\nDM、LINEでも受付中です\nお気軽にご連絡ください',
    0.82, 2.86, 2.22, 2.5, { fontSize: 8.4, valign: 'top', color: '4A5052' });
  addText(s, '・全部同じ大きさ　・誰向けか不明　・連絡先が3つ', 0.62, 5.66, 2.62, 0.3, { fontSize: 7.8, color: C.muted, align: 'center' });
  addText(s, '→', 3.4, 3.7, 0.5, 0.5, { fontSize: 22, bold: true, color: C.tealDark, align: 'center' });
  // AFTER（自作の改善案）
  addText(s, 'AFTER', 4.08, 1.98, 1.4, 0.26, { fontSize: 8, bold: true, color: C.tealDark, charSpacing: 1.4 });
  rect(s, 4.04, 2.3, 2.62, 3.28, C.ink, 0.06);
  rect(s, 4.04, 2.3, 2.62, 0.1, C.teal, 0);
  addText(s, '年長さん、', 4.26, 2.62, 2.2, 0.3, { fontSize: 12, bold: true, color: C.teal });
  addText(s, 'はじめての\nサッカー。', 4.26, 2.94, 2.2, 0.9, { fontSize: 20, bold: true, color: C.white, valign: 'top' });
  line(s, 4.26, 3.94, 2.18, 0, C.teal, 1.4);
  addText(s, '体験会 ／ 参加無料', 4.26, 4.08, 2.2, 0.28, { fontSize: 10, bold: true, color: C.white });
  addText(s, '3/15 (土) 10:00', 4.26, 4.4, 2.2, 0.36, { fontSize: 15, bold: true, color: C.white });
  rect(s, 4.26, 4.92, 2.18, 0.4, C.teal, 0.16);
  addText(s, 'DMで空き状況を確認', 4.26, 4.98, 2.18, 0.28, { fontSize: 9, bold: true, color: C.ink, align: 'center' });
  addText(s, '・対象を明記　・日付を最大化　・行動は1つ', 4.04, 5.66, 2.62, 0.3, { fontSize: 7.8, color: C.tealDark, align: 'center' });
  // 変更理由
  const r = [['① 誰に向けたかを書く', '「体験会やります」では、自分の子が対象か分からない。「年長さん」と書いた瞬間に、その親だけが自分ごとにする。'],
             ['② 全部を同じ強さで置かない', '持ち物も雨天対応も必要な情報。ただし1枚目の仕事は「行く気にさせる」ことなので、詳細は2枚目とキャプションへ送る。'],
             ['③ 行動を1つに絞る', '電話・DM・LINEと並べると、選ぶ手間で止まる。もっとも心理的負担が軽いDMだけを残す。']];
  r.forEach((v, i) => { point(s, 7.0, 2.02 + i * 1.6, 5.72, 1.46, v[0], v[1], i === 1 ? C.blue : C.white); });
  addText(s, '※ 他アカウントの投稿画像は転載していません。BEFOREはよくある構成を当方が再現したものです。', 0.62, 6.14, 12.1, 0.28, { fontSize: 8.2, color: C.muted });
}

/* -------------------------------------------------------- 25 Proposal 02 */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Proposal 02', '1本ずつではなく、1か月単位で設計する。', '単発の投稿を積んでも資産になりません。役割を分けた型で回します。');
  const wk = [['WEEK 1', '知ってもらう', 'クラブの理念・指導方針。\n「どんな場所か」を語る回。', C.blue],
              ['WEEK 2', '信じてもらう', '練習風景・選手の変化。\n言葉ではなく事実を見せる回。', C.white],
              ['WEEK 3', '思い出してもらう', '保護者の声・日常の一場面。\n関係を温める回。', C.white],
              ['WEEK 4', '動いてもらう', '体験会・募集告知。\n行動を1つだけ提示する回。', C.teal]];
  wk.forEach((v, i) => {
    const x = 0.62 + i * 3.06;
    rect(s, x, 2.02, 2.9, 2.68, v[4], 0.08);
    const w = v[4] === C.teal;
    addText(s, v[0], x + 0.2, 2.22, 1.6, 0.24, { fontSize: 7.6, bold: true, color: w ? C.ink : C.tealDark, charSpacing: 1.2 });
    addText(s, v[1], x + 0.2, 2.6, 2.5, 0.36, { fontSize: 14, bold: true, color: w ? C.white : C.ink });
    line(s, x + 0.2, 3.1, 0.56, 0, w ? C.white : C.teal, 2);
    addText(s, v[2], x + 0.2, 3.3, 2.5, 1.2, { fontSize: 9.2, color: w ? C.white : C.muted, valign: 'top' });
    if (i < 3) addText(s, '→', x + 2.92, 3.1, 0.2, 0.3, { fontSize: 13, bold: true, color: C.tealDark, align: 'center' });
  });
  rect(s, 0.62, 4.94, 12.1, 1.0, C.ink, 0.08);
  addText(s, '4週で一巡し、翌月は「反応が良かった回」を厚くして組み直す。', 0.9, 5.1, 11.5, 0.34, { fontSize: 14, bold: true, color: C.white, align: 'center' });
  addText(s, '毎回ゼロから企画を考えないため、担当者が代わっても止まりません。', 0.9, 5.5, 11.5, 0.3, { fontSize: 9.6, color: C.pale, align: 'center' });
  const n = [['なぜ役割を分けるか', '全部の投稿で「入団してください」と言うと、見る側は疲れて離れる。売る回は4週に1回で足りる。'],
             ['なぜ月単位か', '1本の伸びは運に左右される。1か月の合計で見ると、企画の良し悪しが判断できるようになる。'],
             ['何を計測するか', '保存とプロフィール遷移。いいねより、次の行動に近い指標を見る。']];
  n.forEach((v, i) => { point(s, 0.62 + i * 4.08, 6.06, 3.88, 0.94, v[0], v[1], i === 1 ? C.blue : C.white); });
}

/* ----------------------------------------------------------- 26 Publishing */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Publishing','企画から装丁まで、一冊を一人で通す。','Amazon Kindleで2冊を出版。長文を設計し切る力の、確認できる証拠として。');
  imageBox(s,IMG.sleepBook,0.62,1.95,2.55,3.55,C.white);
  imageBox(s,IMG.foodBook,3.35,1.95,2.55,3.55,C.white);
  addText(s,'『レジリエンスを鍛える 勝利の睡眠』',0.62,5.58,2.55,0.62,{fontSize:9,bold:true,valign:'top'});
  addText(s,'ホルモン×脳科学「回復力」を爆上げする戦略的メソッド',0.62,6.24,2.55,0.42,{fontSize:7.6,color:C.muted,valign:'top'});
  addText(s,'amazon.co.jp/dp/B0FQMDK6S8',0.62,6.72,2.55,0.24,{fontSize:7,color:C.tealDark});
  addText(s,'『自分という国家を、食卓から統治する 勝利の食事』',3.35,5.58,2.55,0.62,{fontSize:9,bold:true,valign:'top'});
  addText(s,'Daily Statecraft Series｜内政統治編①',3.35,6.24,2.55,0.42,{fontSize:7.6,color:C.muted,valign:'top'});
  addText(s,'amazon.co.jp/dp/B0H1QKRT5H',3.35,6.72,2.55,0.24,{fontSize:7,color:C.tealDark});
  addText(s,'出版が、SNS運用に効く理由',6.2,1.98,6.5,0.4,{fontSize:15,bold:true});
  const a=[['構成力','一冊分の情報を、読者が迷わない順番に並べ切る。カルーセルや連載投稿の設計は、その縮小版にすぎない。'],['調査力','根拠にあたり、断定できることだけを書く。誇張しないまま読ませる文章は、そのまま運用の信頼につながる。'],['装丁の一貫性','2冊とも表紙のキーカラーはターコイズ。本・SNS・Webで媒体が変わっても、同じ書き手の仕事に見える。'],['一人称で完結','企画・構成・執筆・装丁デザインを一人で通す。分業前提の座組みでなくても、成果物が出る。']];
  a.forEach((v,i)=>{const y=2.5+i*1.14; point(s,6.2,y,6.52,1.02,v[0],v[1],i%2?C.white:C.blue);});
}

/* ------------------------------------------------------ 22 Content system */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Writing & Content System','制作を速くするだけでなく、判断を揃える。','人の編集判断とAIの補助を組み合わせ、品質と継続性を両立します。');
  const a=[['01','企画の種','顧客の悩み／季節／現場の声'],['02','構成・コピー','フック／本文／CTA／ハッシュタグ'],['03','デザイン','ブランドテンプレート／写真／図解'],['04','展開','投稿／カルーセル／リール／Web'],['05','学習','反応の記録／仮説更新／次月改善']];
  a.forEach((v,i)=>{const x=0.62+i*2.5; rect(s,x,2.18,2.18,2.62,i===3?C.teal:(i%2?C.pale:C.white),0.08); addText(s,v[0],x+0.18,2.39,0.45,0.25,{fontSize:7.5,bold:true,color:i===3?C.ink:C.tealDark}); addText(s,v[1],x+0.18,2.89,1.8,0.38,{fontSize:13,bold:true,color:i===3?C.white:C.ink}); addText(s,v[2],x+0.18,3.48,1.76,0.72,{fontSize:9,color:i===3?C.white:C.muted,valign:'top'});});
  rect(s,1.1,5.35,11.14,0.9,C.ink,0.08); addText(s,'Adobe Creative Cloud  ＋  ChatGPT  /  Claude  /  Gemini  /  Cursor',1.45,5.61,10.44,0.32,{fontSize:12,bold:true,color:C.white,align:'center'});
  addText(s,'※ AIは調査・草案・整理を補助。最終判断と表現設計は人が行います。',2.25,6.47,8.85,0.28,{fontSize:8.5,color:C.muted,align:'center'});
}

/* ------------------------------------------------------- 23 Collaboration */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Collaboration','「任せる」と「一緒につくる」の間を、柔軟に。');
  const a=[['SPOT','単発制作','投稿テンプレート、キャンペーン、プロフィール改善など'],['PARTIAL','部分代行','企画のみ／制作のみ／投稿管理など、必要な工程を担当'],['FULL','一貫支援','設計・企画・制作・運用・改善まで、窓口を一本化']];
  a.forEach((v,i)=>{const x=0.66+i*4.15; rect(s,x,2.1,3.79,3.05,i===2?C.teal:(i===1?C.blue:C.white),0.08); addText(s,v[0],x+0.22,2.32,1.2,0.24,{fontSize:7.5,bold:true,color:i===2?C.ink:C.tealDark,charSpacing:1.2}); addText(s,v[1],x+0.22,2.86,3.3,0.4,{fontSize:16,bold:true,color:i===2?C.white:C.ink}); line(s,x+0.22,3.42,0.58,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.22,3.62,3.27,1.2,{fontSize:10,color:i===2?C.white:C.muted,valign:'top'});});
  // 料金：下限のみ提示（2026-08-17 BOSS承認）
  rect(s,0.66,5.36,12.06,1.0,C.ink,0.08);
  addText(s,'PRICE',0.94,5.52,1.2,0.24,{fontSize:7.4,bold:true,color:C.teal,charSpacing:1.2});
  addText(s,'月額 10万円 〜',2.32,5.5,3.0,0.44,{fontSize:20,bold:true,color:C.white});
  line(s,5.6,5.56,0,0.6,C.muted,0.8);
  addText(s,'ご支援の範囲・投稿本数・制作内容に応じてお見積りします。単発のご相談や、\n一部の工程だけをお任せいただく形にも対応しています。',5.9,5.52,6.6,0.68,{fontSize:9.6,color:C.pale,valign:'top'});
  addText(s,'ヒアリング後、目的・期間・社内体制に合わせて支援範囲をご提案します。',0.66,6.56,12.06,0.34,{fontSize:12,bold:true,align:'center'});
}

/* -------------------------------------------------------- 24 Request flow */
{
  const s=pptx.addSlide('MASTER'); title(s, 'Request Flow','ご相談から開始まで。','まずは現状と「こうなりたい」をお聞かせください。');
  const a=[['01','お問い合わせ'],['02','ヒアリング'],['03','ご提案・お見積り'],['04','ご契約・準備'],['05','運用開始']];
  a.forEach((v,i)=>{const x=0.63+i*2.5; s.addShape(pptx.ShapeType.ellipse,{x:x+0.62,y:2.24,w:0.92,h:0.92,fill:{color:i===4?C.teal:C.white},line:{color:C.teal,width:1.4}}); addText(s,v[0],x+0.74,2.48,0.68,0.28,{fontSize:9,bold:true,color:i===4?C.white:C.tealDark,align:'center'}); addText(s,v[1],x,3.47,2.18,0.52,{fontSize:11.5,bold:true,align:'center'}); if(i<4)line(s,x+1.56,2.7,0.9,0,C.pale,2);});
  rect(s,1.16,4.68,11.0,1.16,C.blue,0.08); addText(s,'料金：ご支援範囲・投稿本数・制作内容に応じてお見積り',1.52,4.91,10.28,0.35,{fontSize:14,bold:true,align:'center'}); addText(s,'副業サイト上のメッセージからでも、お気軽にご相談ください。',2.2,5.4,8.9,0.28,{fontSize:9.5,color:C.muted,align:'center'});
}

/* ------------------------------------------------------------ 30 Working */
{
  const s = pptx.addSlide('MASTER');
  title(s, 'Working Style', '連絡が取れないことを、不安にさせない。', '外注で最も多い不安は品質ではなく、「返事が来ないこと」だと考えています。');
  const a = [['対応時間', '平日 〜 16:00', 'この時間帯は基本的に連絡がつきます。'],
             ['連絡手段', 'メール／チャット／電話', 'ご指定の方法に合わせます。ツールの追加導入も可能です。'],
             ['時間内の返信', '当日中に返信', 'その場で判断できないことは、いつ返せるかを先にお伝えします。'],
             ['時間外の連絡', '確認後に折り返し', '受け取ったこと自体は必ずお返しし、放置しません。']];
  a.forEach((v, i) => {
    const x = 0.62 + (i % 2) * 6.13, y = 2.02 + Math.floor(i / 2) * 1.62;
    rect(s, x, y, 5.82, 1.42, i === 0 ? C.blue : C.white, 0.08);
    addText(s, v[0], x + 0.22, y + 0.18, 2.4, 0.26, { fontSize: 8, bold: true, color: C.tealDark, charSpacing: 1 });
    addText(s, v[1], x + 0.22, y + 0.5, 5.4, 0.36, { fontSize: 16, bold: true });
    addText(s, v[2], x + 0.22, y + 0.94, 5.4, 0.34, { fontSize: 9.4, color: C.muted });
  });
  rect(s, 0.62, 5.42, 12.1, 1.06, C.ink, 0.08);
  addText(s, 'STATUS', 0.9, 5.58, 1.4, 0.24, { fontSize: 7.4, bold: true, color: C.teal, charSpacing: 1.2 });
  addText(s, '現在、1社のInstagram運用が進行中です。', 2.32, 5.56, 5.2, 0.34, { fontSize: 14, bold: true, color: C.white });
  addText(s, '新規のご相談も承れます。着手時期はご相談ください。', 2.32, 5.94, 5.6, 0.3, { fontSize: 9.6, color: C.pale });
  addText(s, '25年の実務で身についたのは、\n作る力より「約束した期日を動かさないこと」でした。', 8.1, 5.56, 4.4, 0.7, { fontSize: 9.6, color: C.pale, valign: 'top' });
  addText(s, '※ 稼働時間・連絡方法は、ご依頼内容に応じて調整可能です。まずはご希望をお聞かせください。', 0.62, 6.62, 12.1, 0.28, { fontSize: 8.5, color: C.muted });
}

/* -------------------------------------------------------------- 31 Contact */
{
  const s = pptx.addSlide(); s.background={color:C.ink};
  s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.18,h:7.5,fill:{color:C.teal},line:{color:C.teal}});
  addText(s,'CONTACT',0.83,0.74,2.5,0.3,{fontSize:9,color:C.teal,charSpacing:2});
  addText(s,'ブランドの魅力が、\nきちんと届くSNSへ。',0.8,1.42,6.8,1.4,{fontSize:29,bold:true,color:C.white,valign:'top'});
  addText(s,'まずは、現在のお悩みをお聞かせください。',0.84,3.23,5.8,0.38,{fontSize:13,color:C.pale});
  rect(s,0.82,4.18,7.12,1.63,'2A3031',0.08);
  addText(s,'今田 唯仁  /  Imada Tadahito',1.12,4.42,4.35,0.38,{fontSize:16,bold:true,color:C.white});
  addText(s,'Brand Architect',1.12,4.87,3.6,0.28,{fontSize:10,color:C.teal,bold:true});
  addText(s,'SNSブランド設計・運用ディレクション',1.12,5.22,4.5,0.28,{fontSize:9.5,color:C.pale});
  // CTAは1つに絞る（選択肢が増えるほど行動が止まるため）。他は補助表記。
  rect(s,8.5,1.38,4.15,1.72,C.teal,0.1);
  addText(s,'まずはメールをください',8.76,1.6,3.7,0.3,{fontSize:10,bold:true,color:C.ink});
  addText(s,'imadaruma965@gmail.com',8.76,1.96,3.7,0.4,{fontSize:14,bold:true,color:C.ink});
  addText(s,'現状のお悩みだけで構いません。\n返信は当日中にお返しします。',8.76,2.42,3.7,0.56,{fontSize:8.8,color:'12454E',valign:'top'});
  addText(s,'WEB',8.5,3.42,0.8,0.22,{fontSize:7,bold:true,color:C.teal,charSpacing:1});
  addText(s,'https://imadaruma.jp',8.5,3.68,4.0,0.3,{fontSize:11,color:C.pale});
  addText(s,'INSTAGRAM',8.5,4.14,1.2,0.22,{fontSize:7,bold:true,color:C.teal,charSpacing:1});
  addText(s,'@imada_tadahito',8.5,4.4,4.0,0.3,{fontSize:11,color:C.pale});
  addText(s,'※掲載する連絡先・SNSは、Canva上で用途に合わせて削除・差し替えできます。',8.5,5.0,3.95,0.7,{fontSize:8.5,color:C.muted,valign:'top'});
  addText(s,'THANK YOU',0.84,6.68,2.8,0.3,{fontSize:9,bold:true,color:C.teal,charSpacing:2});
}

pptx.writeFile({ fileName: out }).then(() => console.log('written:', out));
