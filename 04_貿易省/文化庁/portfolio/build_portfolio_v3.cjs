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
const ext = '/Volumes/HDPH-macOS拡張';
const dl = '/Users/imadatadahito/Downloads';
const assets = path.join(root, '04_貿易省/文化庁/portfolio/assets');
const out = path.join(root, '04_貿易省/文化庁/portfolio/今田唯仁_SNS運用代行ポートフォリオ_v3_Canva編集用.pptx');

const IMG = {
  face: path.join(dl, 'IMG_9919.JPG'),
  flextLogo: path.join(ext, 'フレスト筑紫/ロゴ-エンブレム/フレスト2021エンブレム.jpg'),
  rexLogo: path.join(ext, 'レックス筑紫/ロゴ/recfc-エンブレム2023フルカラー.png'),
  rexSns: path.join(ext, 'レックス筑紫/SNS/facebook/rexfc-insta01.jpg'),
  arsoa: path.join(assets, 'arsoa_wellness.png'),
  lemonBrand: path.join(ext, '結ぶレモン宮若/むすぶレモン最終.jpg'),
  lemonDress: path.join(ext, '里山レモンドレッシング/レモンドレ03.jpg'),
  freienTop: path.join(ext, 'Freien/公式サイト/freien-top.png'),
  freienPost: path.join(ext, 'Freien/公式サイト/投稿/freien-training1-1.jpg'),
  colors: path.join(assets, 'brand_colors.png'),
  festivalCover: path.join(assets, 'instagram/vamos_festival_cover.png'),
  festival1: path.join(assets, 'instagram/vamos_festival_01.png'),
  festival2: path.join(assets, 'instagram/vamos_festival_02.png'),
  vamosCup1: path.join(assets, 'instagram/vamoscup_01.png'),
  vamosCup2: path.join(assets, 'instagram/vamoscup_02.png'),
  vamosCup3: path.join(assets, 'instagram/vamoscup_03.png'),
  ptrd: path.join(assets, 'reels/PTRDinsta2024リール_ニーチェ流天才論.mp4.png'),
  sound: path.join(assets, 'reels/imadaruma.soundリール05ブリッジヘア (1).mp4.png'),
  rexReel: path.join(assets, 'reels/rex-trainingcamp.mp4.png'),
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
function title(slide, no, eyebrow, heading, sub = '') {
  addText(slide, String(no).padStart(2, '0'), 0.54, 0.38, 0.42, 0.34, { fontSize: 11, bold: true, color: C.tealDark });
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
  addText(slide, label, x + 0.18, y + 0.14, w - 0.36, 0.3, { fontSize: 11.5, bold: true });
  addText(slide, body, x + 0.18, y + 0.5, w - 0.36, h - 0.66, { fontSize: 9, color: C.muted, valign: 'top' });
}
function roleRow(slide, y, roleText) {
  addText(slide, 'ROLE', 0.66, y, 0.72, 0.25, { fontSize: 7.2, bold: true, color: C.tealDark, charSpacing: 1 });
  addText(slide, roleText, 1.52, y - 0.04, 10.85, 0.34, { fontSize: 10.8, bold: true });
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
  const s = pptx.addSlide('MASTER'); title(s, 2, 'Contents', 'ブランドの「伝わる仕組み」を、SNSに。', '見た目だけで終わらせず、目的・対象・言葉・運用まで一貫して設計します。');
  const items = [['01','WHO I AM','プロフィール・強み','p.3–7'],['02','HOW I THINK','リサーチと\nアルゴリズム対応','p.8–12'],['03','WORKS','SNS・ブランド・\n出版実績','p.13–22'],['04','CONTACT','支援範囲・ご依頼方法','p.23–25']];
  items.forEach((a,i)=>{const x=0.58+i*3.1; rect(s,x,2.22,2.78,3.72,i===1?C.blue:C.white,0.08); addText(s,a[0],x+0.2,2.46,0.5,0.32,{fontSize:10,bold:true,color:C.tealDark}); addText(s,a[1],x+0.2,3.02,2.35,0.32,{fontSize:10,bold:true,charSpacing:1.1}); line(s,x+0.2,3.56,0.56,0,C.teal,2); addText(s,a[2],x+0.2,3.84,2.35,0.95,{fontSize:13,bold:true,valign:'top'}); addText(s,a[3],x+0.2,5.42,2.35,0.28,{fontSize:8.5,color:C.muted});});
  addText(s, '25年以上のデザイン・編集経験を、SNSの継続運用へ。', 0.6, 6.35, 11.9, 0.42, { fontSize: 15, bold: true, align: 'center' });
}

/* -------------------------------------------------------------- 3 Profile */
{
  const s = pptx.addSlide('MASTER'); title(s, 3, 'Profile', '今田 唯仁  |  Brand Architect', 'SNSブランド設計・運用ディレクション');
  imageBox(s, IMG.face, 0.62, 2.0, 3.18, 3.18, C.pale, 'crop');
  chip(s, 'Pound the Rock Design', 0.84, 5.52, 2.75, C.ink, C.white);
  addText(s, 'グラフィックデザイン・編集・ブランド設計に25年以上携わってきました。\n企業や地域、スポーツクラブが持つ「らしさ」を言葉とビジュアルに整理し、SNSで継続的に伝わる形へ落とし込みます。', 4.35, 2.03, 7.94, 1.4, { fontSize: 14, valign: 'top' });
  const rows=[['BACKGROUND','元地域情報誌 編集長／アートディレクション'],['SPECIALTY','ブランド設計・編集・SNSコンテンツ'],['COACHING','JFA B級／メンタルコーチ資格'],['TOOLS','Adobe CC / Premiere Pro / ChatGPT / Claude / Gemini']];
  rows.forEach((r,i)=>{const y=3.72+i*0.58; addText(s,r[0],4.38,y,1.35,0.28,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:0.8}); addText(s,r[1],5.86,y-0.02,6.4,0.32,{fontSize:10.8,bold:i===1}); line(s,4.38,y+0.39,7.88,0,C.pale,0.8);});
  addText(s, '「葦なる刃は、静かに尖れる。」', 4.4, 6.23, 7.6, 0.35, { fontSize: 13, italic: true, color: C.tealDark });
}

/* ------------------------------------------------------------ 4 Strengths */
{
  const s=pptx.addSlide('MASTER'); title(s,4,'Strengths','3つの力で、運用が続く土台をつくる。');
  card(s,0.6,2.05,3.88,3.85,'01','設計力','目的・顧客・競合・導線を整理し、発信の軸と優先順位を明確にします。\n\n誰に、何を、どの順で伝えるか。ここが決まらないまま投稿を重ねても、本数が増えるだけで何も積み上がりません。',C.blue);
  card(s,4.72,2.05,3.88,3.85,'02','編集力','伝えたい情報を、相手が読みたくなる言葉・順序・ビジュアルに再構成します。\n\n25年の編集経験は、足す技術より削る判断の蓄積です。何を書かないかを決められることが、読ませる条件だと考えています。',C.white);
  card(s,8.84,2.05,3.88,3.85,'03','伴走力','制作して終わりではなく、反応を見ながら改善します。\n\n担当者が代わっても回るよう、判断基準とテンプレートを残す。属人化させないことが、続く運用の条件です。',C.pale);
  addText(s,'DESIGN  ×  EDITORIAL  ×  COACHING',0.62,6.36,12.05,0.35,{fontSize:10,bold:true,color:C.muted,align:'center',charSpacing:2});
}

/* ----------------------------------------------------------- 5 Experience */
{
  const s=pptx.addSlide('MASTER'); title(s,5,'Experience','経験を、SNS運用の判断力に変える。');
  const nums=[['25+','YEARS','デザイン・編集・ブランド支援'],['10×','SALES','編集長として刷新後、年間売上が前年比約10倍'],['4','FIELDS','スポーツ・地域・美容・ブランド']];
  nums.forEach((n,i)=>{const x=0.65+i*4.15; rect(s,x,2.08,3.78,2.05,i===1?C.teal:C.white,0.08); addText(s,n[0],x+0.22,2.31,3.3,0.65,{fontSize:32,bold:true,color:i===1?C.white:C.tealDark}); addText(s,n[1],x+0.24,3.03,1.8,0.25,{fontSize:7.5,bold:true,color:i===1?C.ink:C.muted,charSpacing:1.5}); addText(s,n[2],x+0.23,3.42,3.28,0.47,{fontSize:9.5,bold:true,color:i===1?C.white:C.ink,valign:'top'});});
  addText(s,'媒体をつくる視点',0.75,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'企画・取材・編集・デザインを横断し、情報を一つの体験にまとめる。',0.75,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'ブランドを育てる視点',4.88,4.73,2.9,0.36,{fontSize:14,bold:true}); addText(s,'単発の投稿ではなく、積み重ねで信頼が育つ世界観と運用ルールをつくる。',4.88,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'人を動かす視点',9.0,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'コーチ経験を活かし、依頼者・チーム・顧客の目線をつなぎながら前進させる。',9.0,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
}

/* ------------------------------------------------------------- 6 Services */
{
  const s=pptx.addSlide('MASTER'); title(s,6,'Services','SNS運用を、戦略から制作・改善まで。','必要な範囲だけの部分支援にも対応します。');
  const a=[['01','戦略設計','目的設定／競合・顧客整理／媒体選定／KPI設計'],['02','企画・編集','投稿テーマ／企画カレンダー／コピー・構成／導線'],['03','クリエイティブ','投稿画像／カルーセル／ショート動画／テンプレート'],['04','運用・改善','投稿管理／数値確認／月次レポート／改善提案']];
  a.forEach((v,i)=>{const x=0.62+(i%2)*6.13,y=2.08+Math.floor(i/2)*2.08; rect(s,x,y,5.82,1.72,i===0?C.blue:C.white,0.08); addText(s,v[0],x+0.2,y+0.2,0.5,0.27,{fontSize:8,bold:true,color:C.tealDark}); addText(s,v[1],x+0.82,y+0.17,1.45,0.35,{fontSize:14,bold:true}); addText(s,v[2],x+0.82,y+0.75,4.55,0.52,{fontSize:9.5,color:C.muted,valign:'top'});});
  chip(s,'Instagram',1.44,6.43,1.55); chip(s,'Web / LP',3.23,6.43,1.42); chip(s,'Brand / VI',4.89,6.43,1.55); chip(s,'Print',6.68,6.43,1.12); chip(s,'AI workflow',8.04,6.43,1.62); chip(s,'Short video',9.9,6.43,1.62);
}

/* -------------------------------------------------------------- 7 Process */
{
  const s=pptx.addSlide('MASTER'); title(s,7,'Process','感覚に頼らず、5段階で運用する。');
  const a=[['01','RESEARCH','現状・競合・顧客'],['02','TARGET','ペルソナ・課題'],['03','CONCEPT','言葉・世界観・導線'],['04','CREATE','企画・制作・投稿'],['05','IMPROVE','計測・振り返り・改善']];
  a.forEach((v,i)=>{const x=0.64+i*2.48; rect(s,x,2.18,2.16,3.36,i===2?C.teal:(i%2?C.white:C.blue),0.08); addText(s,v[0],x+0.18,2.38,0.5,0.3,{fontSize:8,bold:true,color:i===2?C.ink:C.tealDark}); addText(s,v[1],x+0.18,3.02,1.78,0.35,{fontSize:11,bold:true,color:i===2?C.white:C.ink,charSpacing:0.8}); line(s,x+0.18,3.54,0.5,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.18,3.9,1.75,0.7,{fontSize:10,bold:true,color:i===2?C.white:C.muted,valign:'top'}); if(i<4)addText(s,'→',x+2.2,3.48,0.27,0.3,{fontSize:15,bold:true,color:C.tealDark,align:'center'});});
  addText(s,'毎月の改善サイクルへ',4.55,6.14,4.18,0.42,{fontSize:14,bold:true,color:C.tealDark,align:'center'});
}

/* ------------------------------------------------------------- 8 Research */
{
  const s=pptx.addSlide('MASTER'); title(s,8,'Research','「なんとなく」を捨て、数で当たりをつける。','案件に入る前から、市場・競合・勝ち筋を自分の手で調べ切ります。');
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
  const s=pptx.addSlide('MASTER'); title(s,9,'Original Metric','フォロワー数ではなく、「1投稿あたりの効率」で見る。','他社と同じ数字を見ていては、他社と同じ結論しか出ません。');
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
  const s=pptx.addSlide('MASTER'); title(s,10,'Trends','公式発表を、運用の判断材料にする。','出典はすべて Meta / Instagram 公式発表。参照日：2026年8月17日。');
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
  const s=pptx.addSlide('MASTER'); title(s,11,'Algorithm','公式のランキング指標に、運用を合わせる。','Instagram公式「Instagram Ranking Explained」（2023年5月31日公開）が示す面ごとのシグナルに基づく。');
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
  const s=pptx.addSlide('MASTER'); title(s,12,'Framework','「投稿」ではなく、「伝わり続ける流れ」を設計。');
  const a=[['想い','WHY'],['言語化','MESSAGE'],['世界観','IDENTITY'],['コンテンツ','CONTENT'],['継続運用','OPERATION']];
  a.forEach((v,i)=>{const x=0.82+i*2.42; s.addShape(pptx.ShapeType.ellipse,{x,y:2.25,w:1.72,h:1.72,fill:{color:i===4?C.teal:(i%2?C.pale:C.white)},line:{color:i===4?C.teal:C.pale,width:1}}); addText(s,v[0],x+0.1,2.72,1.52,0.36,{fontSize:14,bold:true,color:i===4?C.white:C.ink,align:'center'}); addText(s,v[1],x+0.1,3.18,1.52,0.22,{fontSize:6.8,bold:true,color:i===4?C.ink:C.tealDark,align:'center',charSpacing:0.8}); if(i<4)line(s,x+1.72,3.1,0.7,0,C.teal,1.6);});
  rect(s,1.25,4.65,10.83,1.25,C.ink,0.08); addText(s,'ブランドの核を守りながら、媒体と顧客に合わせて表現を変える。',1.6,4.95,10.15,0.42,{fontSize:16,bold:true,color:C.white,align:'center'});
  addText(s,'一貫性と変化の両方が、長く選ばれるSNSをつくります。',2.3,6.2,8.75,0.32,{fontSize:10,color:C.muted,align:'center'});
}

/* --------------------------------------------- 13 Works 01 VAMOS festival */
{
  const s=pptx.addSlide('MASTER'); title(s,13,'Works 01 / Instagram Feed','少年サッカー情報舎 VAMOS｜告知を、参加動機に変える。','第3回 VAMOSまつり（2026年6月28日／ルイガンズ福岡）の告知クリエイティブ。');
  imageBox(s,IMG.festival1,0.62,1.95,2.72,3.40,C.white);
  imageBox(s,IMG.festival2,3.55,1.95,2.72,3.40,C.white);
  rect(s,6.6,1.95,6.12,3.40,C.blue,0.08);
  addText(s,'CLIENT',6.88,2.2,2.0,0.24,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'少年サッカー情報舎 VAMOS ／ ケイカフェ（共催）',6.88,2.5,5.6,0.34,{fontSize:12,bold:true});
  line(s,6.88,2.98,5.56,0,C.white,1.2);
  addText(s,'FORMAT',6.88,3.18,2.0,0.24,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'Instagram フィード（4:5）／ イベント告知シリーズ',6.88,3.48,5.6,0.34,{fontSize:12,bold:true});
  line(s,6.88,3.96,5.56,0,C.white,1.2);
  addText(s,'同じイベントでも、伝える相手によって1枚の役割を変えています。左は「大会そのもの」を告知する回、右は「観に来る家族」に向けた回。冠協賛（ケイカフェ／MAKERS GROUP）のロゴは毎回同じ位置に固定し、告知としての強さとスポンサーへの還元を同時に成立させています。',6.88,4.14,5.56,1.05,{fontSize:9.6,color:C.muted,valign:'top'});
  roleRow(s,5.55,'グラフィック制作／告知ビジュアル設計');
  const p=[['主役を決める','参加した子どもたちの集合写真を主役に置き、「行けば自分もあの輪に入れる」を一目で伝える。'],['読む相手を変える','家族向けの回では観戦する人の表情を主役に差し替え、同じ大会を別の動機で見せる。'],['協賛を立てる','冠協賛のロゴを定位置に固定。告知の強さとスポンサーへの還元を両立させる。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,5.9,3.85,0.95,v[0],v[1],i===1?C.blue:C.white);});
}

/* --------------------------------------------------- 14 Works 02 VAMOS CUP */
{
  const s=pptx.addSlide('MASTER'); title(s,14,'Works 02 / Instagram Feed','駅前不動産 presents 第3回 VAMOS CUP｜大会の「格」を、1枚で伝える。','同じクライアントの別シリーズ。まつりとは狙いを変え、競技の緊張感を前に出す。');
  imageBox(s,IMG.vamosCup1,0.62,1.95,2.72,3.40,C.white);
  imageBox(s,IMG.vamosCup2,3.55,1.95,2.72,3.40,C.white);
  imageBox(s,IMG.vamosCup3,6.48,1.95,2.72,3.40,C.white);
  rect(s,9.55,1.95,3.17,3.40,C.pale,0.08);
  addText(s,'TITLE SPONSOR',9.78,2.18,2.3,0.24,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'駅前不動産グループ',9.78,2.48,2.75,0.4,{fontSize:13,bold:true});
  line(s,9.78,3.0,2.72,0,C.white,1.2);
  addText(s,'FORMAT',9.78,3.2,2.0,0.24,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'Instagram フィード（4:5）\nJunior Football Tournament',9.78,3.5,2.75,0.62,{fontSize:11,bold:true,valign:'top'});
  line(s,9.78,4.24,2.72,0,C.white,1.2);
  addText(s,'1枚ずつ役割を変えた連作。表紙・協賛メッセージ・ゲスト告知で構成し、大会の全体像を順に見せる。',9.78,4.42,2.75,0.8,{fontSize:8.8,color:C.muted,valign:'top'});
  roleRow(s,5.55,'グラフィック制作／大会ビジュアル設計／長文の組版');
  const p=[['① 格をつくる','実写の質感と大きなロゴタイプで、地域大会に全国大会の空気をまとわせる。'],['② 長文を読ませる','協賛企業からのメッセージを、行間と段落の階層で読み飛ばされない密度に組む。'],['③ 情報を整理する','ゲスト6名の所属とJ通算成績を、対戦構図として1枚に収める。']];
  p.forEach((v,i)=>{point(s,0.62+i*4.05,5.9,3.85,0.95,v[0],v[1],i===1?C.blue:C.white);});
}

/* ------------------------------------------------------ 15 Works 03 Reels */
{
  const s=pptx.addSlide('MASTER'); title(s,15,'Works 03 / Reels','Pound the Rock Design｜思想を、2秒で立ち止まらせる。','自社アカウントで、哲学・自己統治をテーマにした縦型リールを継続制作。');
  imageBox(s,IMG.ptrd,0.62,1.95,2.45,4.35,C.ink,'crop');
  rect(s,3.3,1.95,4.55,4.35,C.ink,0.08);
  addText(s,'HOOK',3.55,2.2,2.0,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1.2});
  addText(s,'「奇跡が起こったかのように」',3.55,2.55,4.1,0.5,{fontSize:17,bold:true,color:C.white});
  addText(s,'結論を先に出さない。冒頭の一文だけでは意味が完結せず、続きを見ないと分からない状態をつくる。フィードを流す指を、まず止めることに全振りする。',3.55,3.25,4.05,1.1,{fontSize:9.6,color:C.pale,valign:'top'});
  line(s,3.55,4.5,4.05,0,C.teal,1.5);
  addText(s,'テーマ：ニーチェ流 天才論',3.55,4.7,4.05,0.3,{fontSize:9.5,bold:true,color:C.teal});
  addText(s,'編集：Adobe Premiere Pro',3.55,5.08,4.05,0.3,{fontSize:9.5,color:C.pale});
  addText(s,'形式：9:16 縦型リール',3.55,5.46,4.05,0.3,{fontSize:9.5,color:C.pale});
  const p=[['画づくり','暗い背景に発光する被写体。タイムライン上で前後の投稿と輝度差が出る配色を選び、スクロール中でも視界に引っかかるようにする。'],['縦組みの日本語','縦書きを画面中央に据える。横書きが並ぶタイムラインの中で異物になり、同時に世界観そのものを担わせる。'],['続けられる型','素材・配色・文字組みをテンプレート化。毎回ゼロから作らず、思想テーマだけを差し替えて量を出す。']];
  p.forEach((v,i)=>{point(s,8.1,1.95+i*1.48,4.62,1.35,v[0],v[1],i===1?C.blue:C.white);});
  roleRow(s,6.52,'企画／構成・コピー／デザイン／動画編集');
}

/* --------------------------------------------- 16 Works 04 Reels (clients) */
{
  const s=pptx.addSlide('MASTER'); title(s,16,'Works 04 / Reels','現場を、そのままブランドの素材にする。','撮って出しにせず、「誰の発信か」が一目で分かる状態まで作り込む。');
  imageBox(s,IMG.sound,0.62,1.95,2.45,4.05,C.ink,'crop');
  rect(s,3.3,1.95,3.2,4.05,C.white,0.08);
  addText(s,'imadaruma.sound',3.52,2.18,2.8,0.34,{fontSize:13,bold:true});
  addText(s,'店舗ブランディング',3.52,2.56,2.8,0.26,{fontSize:8.5,color:C.tealDark,bold:true});
  line(s,3.52,2.92,2.76,0,C.pale,1);
  addText(s,'店舗の外観から入り、ガラス越しに店内へ視線を送る導入。何の店で、どんな空気かを、説明せずに見せる。\n\n右上にロゴを常時表示し、リポストや保存で文脈が外れても発信元が分かる状態を保つ。',3.52,3.1,2.76,2.7,{fontSize:9.2,color:C.muted,valign:'top'});
  imageBox(s,IMG.rexReel,6.75,1.95,2.45,4.05,C.ink,'crop');
  rect(s,9.43,1.95,3.29,4.05,C.blue,0.08);
  addText(s,'CFC REX 筑紫',9.65,2.18,2.9,0.34,{fontSize:13,bold:true});
  addText(s,'スポーツクラブ｜合宿レポート',9.65,2.56,2.9,0.26,{fontSize:8.5,color:C.tealDark,bold:true});
  line(s,9.65,2.92,2.85,0,C.white,1.2);
  addText(s,'練習風景を4分割グリッドで構成し、短い尺に複数カットを収める。「どんな活動をしているか」を一度に伝える。\n\n中央にクラブエンブレムを重ね、選手・保護者・見込み入団者の誰が見てもクラブの公式発信だと分かるようにする。',9.65,3.1,2.85,2.7,{fontSize:9.2,color:C.muted,valign:'top'});
  roleRow(s,6.2,'撮影素材の編集／構成設計／ブランド要素の実装');
  addText(s,'※ 掲載中の映像はいずれも縦型（9:16）リール。静止画はサムネイル用に書き出したものです。',0.66,6.62,12.0,0.3,{fontSize:8.5,color:C.muted});
}

/* ------------------------------------------------------ 17 Works 05 Sports */
{
  const s=pptx.addSlide('MASTER'); title(s,17,'Works 05 / Sports Branding','スポーツクラブ｜らしさが伝わる、チームの顔づくり。','ロゴ・エンブレムからSNSビジュアルまで、一貫したトーンを設計。');
  imageBox(s,IMG.flextLogo,0.62,2.03,2.62,2.62,C.white);
  imageBox(s,IMG.rexLogo,3.5,2.03,2.62,2.62,C.white);
  imageBox(s,IMG.rexSns,6.38,2.03,2.62,2.62,C.ink,'crop');
  rect(s,9.26,2.03,3.46,2.62,C.blue,0.08);
  addText(s,'CLUBS',9.5,2.26,2.0,0.24,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1});
  addText(s,'フレスト筑紫\nCFC REX 筑紫',9.5,2.56,3.0,0.66,{fontSize:12.5,bold:true,valign:'top'});
  line(s,9.5,3.32,3.0,0,C.white,1.2);
  addText(s,'エンブレムは、印刷でもSNSでもリールでも耐えるように設計します。使う人が迷わないよう、配置ルールごと渡すところまでが仕事です。',9.5,3.5,3.0,1.0,{fontSize:9.2,color:C.muted,valign:'top'});
  roleRow(s,4.95,'ブランド設計／VI・ロゴ／SNSビジュアル／告知・募集クリエイティブ');
  line(s,0.66,5.42,11.95,0,C.pale,1);
  addText(s,'運用への接続',0.66,5.72,2.12,0.34,{fontSize:13,bold:true});
  addText(s,'チームの理念と対象年代を整理し、投稿・募集・試合情報で表現がぶれない共通言語と見た目を整えます。',2.86,5.71,9.5,0.4,{fontSize:10.5,color:C.muted,valign:'top'});
  chip(s,'SPORTS BRANDING',0.66,6.4,2.05,C.blue); chip(s,'SNS VISUAL',2.94,6.4,1.65,C.pale); chip(s,'COMMUNITY',4.82,6.4,1.65,C.white);
}

/* ------------------------------------------------------ 18 Works 06 Beauty */
{
  const s=pptx.addSlide('MASTER'); title(s,18,'Works 06 / Beauty','美容・地域店舗｜情報量を整理し、行動につなげる。','キャンペーン情報を読みやすく編集し、店舗らしい安心感をビジュアル化。');
  imageBox(s,IMG.arsoa,0.66,1.97,5.05,4.54,C.white);
  rect(s,6.1,2.03,6.15,1.22,C.blue,0.08); addText(s,'課題の捉え方',6.38,2.25,2.0,0.32,{fontSize:13,bold:true}); addText(s,'伝える情報が多いほど、優先順位と導線が重要。',8.28,2.22,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
  rect(s,6.1,3.48,6.15,1.22,C.white,0.08); addText(s,'編集・デザイン',6.38,3.7,2.0,0.32,{fontSize:13,bold:true}); addText(s,'季節感、写真、見出し、申込情報を一つの流れに。',8.28,3.67,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
  rect(s,6.1,4.93,6.15,1.22,C.pale,0.08); addText(s,'SNSへの展開',6.38,5.15,2.0,0.32,{fontSize:13,bold:true}); addText(s,'紙面の企画を投稿・ストーリーズへ再編集可能。',8.28,5.12,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
}

/* ---------------------------------------------------- 19 Works 07 Regional */
{
  const s=pptx.addSlide('MASTER'); title(s,19,'Works 07 / Regional','地域商品｜物語から、選ばれるブランドをつくる。','ネーミング・ロゴ・パッケージ・販促まで、地域の背景を一つの物語に。');
  imageBox(s,IMG.lemonBrand,0.64,1.98,6.0,3.92,C.white,'contain'); imageBox(s,IMG.lemonDress,6.9,1.98,5.8,3.92,C.white,'contain');
  addText(s,'結ぶレモン宮若',0.7,6.15,2.45,0.34,{fontSize:13,bold:true}); addText(s,'ロゴ／ステッカー／リボン／ブランドストーリー',2.84,6.13,3.65,0.39,{fontSize:9.5,color:C.muted});
  addText(s,'里山レモンドレッシング',6.95,6.15,2.7,0.34,{fontSize:13,bold:true}); addText(s,'商品設計／パッケージ／販促ビジュアル',9.55,6.13,2.93,0.39,{fontSize:9.5,color:C.muted});
}

/* ------------------------------------------------------- 20 Works 08 Brand */
{
  const s=pptx.addSlide('MASTER'); title(s,20,'Works 08 / Brand & Web','ブランド・Web｜価値観を、接点ごとに翻訳する。','VI、Web、投稿。媒体が変わっても、同じブランドに感じられる設計。');
  imageBox(s,IMG.freienTop,0.62,1.98,12.1,1.85,C.ink,'contain');
  imageBox(s,IMG.freienPost,0.62,4.02,5.9,2.32,C.white,'crop');
  rect(s,6.8,4.02,5.92,2.32,C.blue,0.08);
  addText(s,'Freien',7.05,4.24,2.0,0.36,{fontSize:15,bold:true});
  addText(s,'ブランドアイデンティティ／Webビジュアル／投稿コンテンツ',7.05,4.64,5.4,0.3,{fontSize:9.8,color:C.muted});
  line(s,7.05,5.02,5.44,0,C.white,1.2);
  addText(s,'ロゴの一文字を欠けさせた形をブランドの記号として決め、Webのファーストビューから投稿画像まで同じ規則で使い回します。媒体が変わっても、同じブランドだと分かる状態を保つのが設計の目的です。',7.05,5.18,5.44,1.0,{fontSize:9.6,valign:'top'});
  chip(s,'IDENTITY',0.66,6.5,1.35,C.blue); chip(s,'WEB',2.21,6.5,0.94,C.pale); chip(s,'CONTENT',3.35,6.5,1.25,C.white);
}

/* ----------------------------------------------------------- 21 Publishing */
{
  const s=pptx.addSlide('MASTER'); title(s,21,'Publishing','企画から装丁まで、一冊を一人で通す。','Amazon Kindleで2冊を出版。長文を設計し切る力の、確認できる証拠として。');
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
  const s=pptx.addSlide('MASTER'); title(s,22,'Writing & Content System','制作を速くするだけでなく、判断を揃える。','人の編集判断とAIの補助を組み合わせ、品質と継続性を両立します。');
  const a=[['01','企画の種','顧客の悩み／季節／現場の声'],['02','構成・コピー','フック／本文／CTA／ハッシュタグ'],['03','デザイン','ブランドテンプレート／写真／図解'],['04','展開','投稿／カルーセル／リール／Web'],['05','学習','反応の記録／仮説更新／次月改善']];
  a.forEach((v,i)=>{const x=0.62+i*2.5; rect(s,x,2.18,2.18,2.62,i===3?C.teal:(i%2?C.pale:C.white),0.08); addText(s,v[0],x+0.18,2.39,0.45,0.25,{fontSize:7.5,bold:true,color:i===3?C.ink:C.tealDark}); addText(s,v[1],x+0.18,2.89,1.8,0.38,{fontSize:13,bold:true,color:i===3?C.white:C.ink}); addText(s,v[2],x+0.18,3.48,1.76,0.72,{fontSize:9,color:i===3?C.white:C.muted,valign:'top'});});
  rect(s,1.1,5.35,11.14,0.9,C.ink,0.08); addText(s,'Adobe Creative Cloud  ＋  ChatGPT  /  Claude  /  Gemini  /  Cursor',1.45,5.61,10.44,0.32,{fontSize:12,bold:true,color:C.white,align:'center'});
  addText(s,'※ AIは調査・草案・整理を補助。最終判断と表現設計は人が行います。',2.25,6.47,8.85,0.28,{fontSize:8.5,color:C.muted,align:'center'});
}

/* ------------------------------------------------------- 23 Collaboration */
{
  const s=pptx.addSlide('MASTER'); title(s,23,'Collaboration','「任せる」と「一緒につくる」の間を、柔軟に。');
  const a=[['SPOT','単発制作','投稿テンプレート、キャンペーン、プロフィール改善など'],['PARTIAL','部分代行','企画のみ／制作のみ／投稿管理など、必要な工程を担当'],['FULL','一貫支援','設計・企画・制作・運用・改善まで、窓口を一本化']];
  a.forEach((v,i)=>{const x=0.66+i*4.15; rect(s,x,2.1,3.79,3.55,i===2?C.teal:(i===1?C.blue:C.white),0.08); addText(s,v[0],x+0.22,2.34,1.2,0.24,{fontSize:7.5,bold:true,color:i===2?C.ink:C.tealDark,charSpacing:1.2}); addText(s,v[1],x+0.22,3.02,3.3,0.4,{fontSize:16,bold:true,color:i===2?C.white:C.ink}); line(s,x+0.22,3.62,0.58,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.22,3.98,3.27,0.82,{fontSize:10,color:i===2?C.white:C.muted,valign:'top'});});
  addText(s,'ヒアリング後、目的・期間・社内体制に合わせて支援範囲をご提案します。',1.24,6.13,10.9,0.4,{fontSize:13,bold:true,align:'center'});
}

/* -------------------------------------------------------- 24 Request flow */
{
  const s=pptx.addSlide('MASTER'); title(s,24,'Request Flow','ご相談から開始まで。','まずは現状と「こうなりたい」をお聞かせください。');
  const a=[['01','お問い合わせ'],['02','ヒアリング'],['03','ご提案・お見積り'],['04','ご契約・準備'],['05','運用開始']];
  a.forEach((v,i)=>{const x=0.63+i*2.5; s.addShape(pptx.ShapeType.ellipse,{x:x+0.62,y:2.24,w:0.92,h:0.92,fill:{color:i===4?C.teal:C.white},line:{color:C.teal,width:1.4}}); addText(s,v[0],x+0.74,2.48,0.68,0.28,{fontSize:9,bold:true,color:i===4?C.white:C.tealDark,align:'center'}); addText(s,v[1],x,3.47,2.18,0.52,{fontSize:11.5,bold:true,align:'center'}); if(i<4)line(s,x+1.56,2.7,0.9,0,C.pale,2);});
  rect(s,1.16,4.68,11.0,1.16,C.blue,0.08); addText(s,'料金：ご支援範囲・投稿本数・制作内容に応じてお見積り',1.52,4.91,10.28,0.35,{fontSize:14,bold:true,align:'center'}); addText(s,'副業サイト上のメッセージからでも、お気軽にご相談ください。',2.2,5.4,8.9,0.28,{fontSize:9.5,color:C.muted,align:'center'});
}

/* -------------------------------------------------------------- 25 Contact */
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
  addText(s,'MAIL',8.66,1.42,0.8,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'imadaruma965@gmail.com',8.66,1.77,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'WEB',8.66,2.55,0.8,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'https://imadaruma.jp',8.66,2.9,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'INSTAGRAM',8.66,3.68,1.2,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'@imada_tadahito',8.66,4.03,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'※掲載する連絡先・SNSは、Canva上で用途に合わせて削除・差し替えできます。',8.66,5.08,3.78,0.7,{fontSize:8.5,color:C.pale,valign:'top'});
  addText(s,'THANK YOU',0.84,6.68,2.8,0.3,{fontSize:9,bold:true,color:C.teal,charSpacing:2});
}

pptx.writeFile({ fileName: out }).then(() => console.log('written:', out));
