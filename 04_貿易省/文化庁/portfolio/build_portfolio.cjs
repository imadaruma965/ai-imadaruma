const pptxgen = require('/private/tmp/portfolio-pptx/node_modules/pptxgenjs');
const sizeOf = require('/private/tmp/portfolio-pptx/node_modules/image-size');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '今田唯仁';
pptx.subject = 'SNS運用代行ポートフォリオ';
pptx.title = '今田唯仁｜SNSブランド運用ディレクター';
pptx.company = 'Pound the Rock Design';
pptx.lang = 'ja-JP';
pptx.theme = {
  headFontFace: 'Noto Sans JP', bodyFontFace: 'Noto Sans JP', lang: 'ja-JP'
};
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: 'F7F8F7' },
  objects: [
    { rect: { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: '42AFC0' }, line: { color: '42AFC0' } } },
    { text: { text: 'IMADA TADAHITO  |  SNS BRAND DIRECTION', options: { x: 0.52, y: 7.09, w: 5.9, h: 0.16, fontFace: 'Aptos', fontSize: 6.5, color: '7C8588', charSpacing: 1.4, margin: 0 } } },
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
    charSpacing: o.charSpacing, italic: o.italic, transparency: o.transparency });
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
function imageCrop(slide, file, x, y, w, h) {
  // Keep the image transform simple for reliable Canva/Keynote import.
  // The surrounding frame provides the visual crop without a proprietary crop mask.
  imageContain(slide, file, x, y, w, h);
}
function imageBox(slide, file, x, y, w, h, bg = C.white, mode = 'contain') {
  rect(slide, x, y, w, h, bg, 0.08);
  if (mode === 'crop') imageCrop(slide, file, x + 0.04, y + 0.04, w - 0.08, h - 0.08);
  else imageContain(slide, file, x + 0.12, y + 0.12, w - 0.24, h - 0.24);
}
function title(slide, no, eyebrow, heading, sub = '') {
  addText(slide, String(no).padStart(2, '0'), 0.54, 0.38, 0.42, 0.34, { fontSize: 11, bold: true, color: C.tealDark });
  addText(slide, eyebrow.toUpperCase(), 1.05, 0.39, 4.5, 0.28, { fontSize: 8, color: C.muted, charSpacing: 1.3 });
  addText(slide, heading, 0.54, 0.82, 11.9, 0.55, { fontSize: 25, bold: true });
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

// 1 Cover
{
  const s = pptx.addSlide(); s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 9.15, y: 0, w: 4.18, h: 7.5, fill: { color: C.teal }, line: { color: C.teal } });
  s.addShape(pptx.ShapeType.arc, { x: 8.52, y: 0.8, w: 4.2, h: 4.2, adjustPoint: 0.35, rotate: 22, fill: { color: C.teal, transparency: 100 }, line: { color: C.pale, transparency: 30, width: 2 } });
  addText(s, 'SNS MANAGEMENT PORTFOLIO', 0.8, 0.72, 5.5, 0.3, { fontSize: 9, color: C.pale, charSpacing: 2.2 });
  addText(s, '想いを、\n届き続けるブランドへ。', 0.78, 1.65, 7.85, 1.7, { fontSize: 30, bold: true, color: C.white, valign: 'top' });
  addText(s, 'SNSブランド運用ディレクター', 0.83, 4.28, 4.7, 0.38, { fontSize: 14, bold: true, color: C.teal });
  addText(s, '今田 唯仁  /  Imada Tadahito', 0.83, 4.78, 5.5, 0.52, { fontSize: 20, bold: true, color: C.white });
  addText(s, '設計力 × 編集力 × 伴走力', 0.84, 5.48, 4.8, 0.32, { fontSize: 10.5, color: C.pale, charSpacing: 1.1 });
  addText(s, '2026', 11.64, 6.83, 0.8, 0.28, { fontSize: 9, color: C.ink, bold: true, align: 'right' });
}

// 2 Contents
{
  const s = pptx.addSlide('MASTER'); title(s, 2, 'Overview', 'ブランドの「伝わる仕組み」を、SNSに。', '見た目だけで終わらせず、目的・対象・言葉・運用まで一貫して設計します。');
  const items = [['01','WHO I AM','プロフィール・強み'],['02','HOW I WORK','SNS運用の設計と進め方'],['03','WORKS','制作・ブランド支援事例'],['04','CONTACT','ご依頼方法・連絡先']];
  items.forEach((a,i)=>{const x=0.58+i*3.1; rect(s,x,2.22,2.78,3.72,i===1?C.blue:C.white,0.08); addText(s,a[0],x+0.2,2.46,0.5,0.32,{fontSize:10,bold:true,color:C.tealDark}); addText(s,a[1],x+0.2,3.08,2.35,0.32,{fontSize:10,bold:true,charSpacing:1.1}); line(s,x+0.2,3.62,0.56,0,C.teal,2); addText(s,a[2],x+0.2,3.92,2.35,0.75,{fontSize:13,bold:true,valign:'top'});});
  addText(s, '25年以上のデザイン・編集経験を、SNSの継続運用へ。', 0.6, 6.35, 11.9, 0.42, { fontSize: 15, bold: true, align: 'center' });
}

// 3 Profile
{
  const s = pptx.addSlide('MASTER'); title(s, 3, 'Profile', '今田 唯仁  |  SNSブランド運用ディレクター');
  imageBox(s, IMG.face, 0.62, 2.0, 3.18, 3.18, C.pale, 'crop');
  chip(s, 'Pound the Rock Design', 0.84, 5.52, 2.75, C.ink, C.white);
  addText(s, 'グラフィックデザイン・編集・ブランド設計に25年以上携わってきました。\n企業や地域、スポーツクラブが持つ「らしさ」を言葉とビジュアルに整理し、SNSで継続的に伝わる形へ落とし込みます。', 4.35, 2.03, 7.94, 1.4, { fontSize: 14, valign: 'top' });
  const rows=[['BACKGROUND','元地域情報誌 編集長／アートディレクション'],['SPECIALTY','ブランド設計・編集・SNSコンテンツ'],['COACHING','JFA B級／メンタルコーチ資格'],['TOOLS','Adobe CC / ChatGPT / Claude / Gemini']];
  rows.forEach((r,i)=>{const y=3.72+i*0.58; addText(s,r[0],4.38,y,1.35,0.28,{fontSize:7.5,bold:true,color:C.tealDark,charSpacing:0.8}); addText(s,r[1],5.86,y-0.02,6.4,0.32,{fontSize:10.8,bold:i===1}); line(s,4.38,y+0.39,7.88,0,C.pale,0.8);});
  addText(s, '「葦なる刃は、静かに尖れる。」', 4.4, 6.23, 7.6, 0.35, { fontSize: 13, italic: true, color: C.tealDark });
}

// 4 Strengths
{
  const s=pptx.addSlide('MASTER'); title(s,4,'Strengths','3つの力で、運用が続く土台をつくる。');
  card(s,0.6,2.05,3.88,3.85,'01','設計力','目的・顧客・競合・導線を整理し、発信の軸と優先順位を明確にします。',C.blue);
  card(s,4.72,2.05,3.88,3.85,'02','編集力','伝えたい情報を、相手が読みたくなる言葉・順序・ビジュアルに再構成します。',C.white);
  card(s,8.84,2.05,3.88,3.85,'03','伴走力','制作して終わりではなく、反応を見ながら改善。チームが続けられる運用を支えます。',C.pale);
  addText(s,'DESIGN  ×  EDITORIAL  ×  COACHING',0.62,6.36,12.05,0.35,{fontSize:10,bold:true,color:C.muted,align:'center',charSpacing:2});
}

// 5 Credibility
{
  const s=pptx.addSlide('MASTER'); title(s,5,'Experience','経験を、SNS運用の判断力に変える。');
  const nums=[['25+','YEARS','デザイン・編集・ブランド支援'],['10×','SALES','編集長として刷新後、年間売上が前年比約10倍'],['4','FIELDS','スポーツ・地域・美容・ブランド']];
  nums.forEach((n,i)=>{const x=0.65+i*4.15; rect(s,x,2.08,3.78,2.05,i===1?C.teal:C.white,0.08); addText(s,n[0],x+0.22,2.31,3.3,0.65,{fontSize:32,bold:true,color:i===1?C.white:C.tealDark}); addText(s,n[1],x+0.24,3.03,1.8,0.25,{fontSize:7.5,bold:true,color:i===1?C.ink:C.muted,charSpacing:1.5}); addText(s,n[2],x+0.23,3.42,3.28,0.47,{fontSize:9.5,bold:true,color:i===1?C.white:C.ink,valign:'top'});});
  addText(s,'媒体をつくる視点',0.75,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'企画・取材・編集・デザインを横断し、情報を一つの体験にまとめる。',0.75,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'ブランドを育てる視点',4.88,4.73,2.9,0.36,{fontSize:14,bold:true}); addText(s,'単発の投稿ではなく、積み重ねで信頼が育つ世界観と運用ルールをつくる。',4.88,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
  addText(s,'人を動かす視点',9.0,4.73,2.6,0.36,{fontSize:14,bold:true}); addText(s,'コーチ経験を活かし、依頼者・チーム・顧客の目線をつなぎながら前進させる。',9.0,5.22,3.55,0.9,{fontSize:10,color:C.muted,valign:'top'});
}

// 6 Services
{
  const s=pptx.addSlide('MASTER'); title(s,6,'Services','SNS運用を、戦略から制作・改善まで。','必要な範囲だけの部分支援にも対応します。');
  const a=[['01','戦略設計','目的設定／競合・顧客整理／媒体選定／KPI設計'],['02','企画・編集','投稿テーマ／企画カレンダー／コピー・構成／導線'],['03','クリエイティブ','投稿画像／カルーセル／ショート動画／テンプレート'],['04','運用・改善','投稿管理／数値確認／月次レポート／改善提案']];
  a.forEach((v,i)=>{const x=0.62+(i%2)*6.13,y=2.08+Math.floor(i/2)*2.08; rect(s,x,y,5.82,1.72,i===0?C.blue:C.white,0.08); addText(s,v[0],x+0.2,y+0.2,0.5,0.27,{fontSize:8,bold:true,color:C.tealDark}); addText(s,v[1],x+0.82,y+0.17,1.45,0.35,{fontSize:14,bold:true}); addText(s,v[2],x+0.82,y+0.75,4.55,0.52,{fontSize:9.5,color:C.muted,valign:'top'});});
  chip(s,'Instagram',1.44,6.43,1.55); chip(s,'Web / LP',3.23,6.43,1.42); chip(s,'Brand / VI',4.89,6.43,1.55); chip(s,'Print',6.68,6.43,1.12); chip(s,'AI workflow',8.04,6.43,1.62); chip(s,'Short video',9.9,6.43,1.62);
}

// 7 Process
{
  const s=pptx.addSlide('MASTER'); title(s,7,'Process','感覚に頼らず、5段階で運用する。');
  const a=[['01','RESEARCH','現状・競合・顧客'],['02','TARGET','ペルソナ・課題'],['03','CONCEPT','言葉・世界観・導線'],['04','CREATE','企画・制作・投稿'],['05','IMPROVE','計測・振り返り・改善']];
  a.forEach((v,i)=>{const x=0.64+i*2.48; rect(s,x,2.18,2.16,3.36,i===2?C.teal:(i%2?C.white:C.blue),0.08); addText(s,v[0],x+0.18,2.38,0.5,0.3,{fontSize:8,bold:true,color:i===2?C.ink:C.tealDark}); addText(s,v[1],x+0.18,3.02,1.78,0.35,{fontSize:11,bold:true,color:i===2?C.white:C.ink,charSpacing:0.8}); line(s,x+0.18,3.54,0.5,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.18,3.9,1.75,0.7,{fontSize:10,bold:true,color:i===2?C.white:C.muted,valign:'top'}); if(i<4)addText(s,'→',x+2.2,3.48,0.27,0.3,{fontSize:15,bold:true,color:C.tealDark,align:'center'});});
  addText(s,'毎月の改善サイクルへ',4.55,6.14,4.18,0.42,{fontSize:14,bold:true,color:C.tealDark,align:'center'});
}

// 8 Framework
{
  const s=pptx.addSlide('MASTER'); title(s,8,'Framework','「投稿」ではなく、「伝わり続ける流れ」を設計。');
  const a=[['想い','WHY'],['言語化','MESSAGE'],['世界観','IDENTITY'],['コンテンツ','CONTENT'],['継続運用','OPERATION']];
  a.forEach((v,i)=>{const x=0.82+i*2.42; s.addShape(pptx.ShapeType.ellipse,{x,y:2.25,w:1.72,h:1.72,fill:{color:i===4?C.teal:(i%2?C.pale:C.white)},line:{color:i===4?C.teal:C.pale,width:1}}); addText(s,v[0],x+0.1,2.72,1.52,0.36,{fontSize:14,bold:true,color:i===4?C.white:C.ink,align:'center'}); addText(s,v[1],x+0.1,3.18,1.52,0.22,{fontSize:6.8,bold:true,color:i===4?C.ink:C.tealDark,align:'center',charSpacing:0.8}); if(i<4)line(s,x+1.72,3.1,0.7,0,C.teal,1.6);});
  rect(s,1.25,4.65,10.83,1.25,C.ink,0.08); addText(s,'ブランドの核を守りながら、媒体と顧客に合わせて表現を変える。',1.6,4.95,10.15,0.42,{fontSize:16,bold:true,color:C.white,align:'center'});
  addText(s,'一貫性と変化の両方が、長く選ばれるSNSをつくります。',2.3,6.2,8.75,0.32,{fontSize:10,color:C.muted,align:'center'});
}

// 9 Sports case
{
  const s=pptx.addSlide('MASTER'); title(s,9,'Works 01 / Sports','スポーツクラブ｜らしさが伝わる、チームの顔づくり。','ロゴ・エンブレムからSNSビジュアルまで、一貫したトーンを設計。');
  imageBox(s,IMG.flextLogo,0.62,2.03,3.05,2.05,C.white); imageBox(s,IMG.rexLogo,3.9,2.03,3.05,2.05,C.white); imageBox(s,IMG.rexSns,7.18,2.03,5.5,2.05,C.ink,'crop');
  addText(s,'ROLE',0.66,4.52,0.72,0.25,{fontSize:7.2,bold:true,color:C.tealDark,charSpacing:1}); addText(s,'ブランド設計／VI・ロゴ／SNSビジュアル／告知・募集クリエイティブ',1.52,4.48,10.85,0.34,{fontSize:11,bold:true});
  line(s,0.66,5.05,11.95,0,C.pale,1);
  addText(s,'運用への接続',0.66,5.38,2.12,0.34,{fontSize:13,bold:true}); addText(s,'チームの理念と対象年代を整理し、投稿・募集・試合情報で表現がぶれない共通言語と見た目を整えます。',2.86,5.37,9.5,0.75,{fontSize:10.5,color:C.muted,valign:'top'});
  chip(s,'SPORTS BRANDING',0.66,6.4,2.05,C.blue); chip(s,'SNS VISUAL',2.94,6.4,1.65,C.pale); chip(s,'COMMUNITY',4.82,6.4,1.65,C.white);
}

// 10 Beauty case
{
  const s=pptx.addSlide('MASTER'); title(s,10,'Works 02 / Beauty','美容・地域店舗｜情報量を整理し、行動につなげる。','キャンペーン情報を読みやすく編集し、店舗らしい安心感をビジュアル化。');
  imageBox(s,IMG.arsoa,0.66,1.97,5.05,4.54,C.white);
  rect(s,6.1,2.03,6.15,1.22,C.blue,0.08); addText(s,'課題の捉え方',6.38,2.25,2.0,0.32,{fontSize:13,bold:true}); addText(s,'伝える情報が多いほど、優先順位と導線が重要。',8.28,2.22,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
  rect(s,6.1,3.48,6.15,1.22,C.white,0.08); addText(s,'編集・デザイン',6.38,3.7,2.0,0.32,{fontSize:13,bold:true}); addText(s,'季節感、写真、見出し、申込情報を一つの流れに。',8.28,3.67,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
  rect(s,6.1,4.93,6.15,1.22,C.pale,0.08); addText(s,'SNSへの展開',6.38,5.15,2.0,0.32,{fontSize:13,bold:true}); addText(s,'紙面の企画を投稿・ストーリーズへ再編集可能。',8.28,5.12,3.6,0.52,{fontSize:10,color:C.muted,valign:'top'});
}

// 11 Regional case
{
  const s=pptx.addSlide('MASTER'); title(s,11,'Works 03 / Regional','地域商品｜物語から、選ばれるブランドをつくる。','ネーミング・ロゴ・パッケージ・販促まで、地域の背景を一つの物語に。');
  imageBox(s,IMG.lemonBrand,0.64,1.98,6.0,3.92,C.white,'contain'); imageBox(s,IMG.lemonDress,6.9,1.98,5.8,3.92,C.white,'contain');
  addText(s,'結ぶレモン宮若',0.7,6.15,2.45,0.34,{fontSize:13,bold:true}); addText(s,'ロゴ／ステッカー／リボン／ブランドストーリー',2.84,6.13,3.65,0.39,{fontSize:9.5,color:C.muted});
  addText(s,'里山レモンドレッシング',6.95,6.15,2.7,0.34,{fontSize:13,bold:true}); addText(s,'商品設計／パッケージ／販促ビジュアル',9.55,6.13,2.93,0.39,{fontSize:9.5,color:C.muted});
}

// 12 Brand case
{
  const s=pptx.addSlide('MASTER'); title(s,12,'Works 04 / Brand','ブランド・Web｜価値観を、接点ごとに翻訳する。','VI、Web、投稿。媒体が変わっても、同じブランドに感じられる設計。');
  imageBox(s,IMG.freienTop,0.65,2.02,5.85,3.64,C.ink,'contain'); imageBox(s,IMG.freienPost,6.78,2.02,3.63,3.64,C.white,'crop'); imageBox(s,IMG.colors,10.68,2.02,1.96,3.64,C.white,'contain');
  addText(s,'Freien',0.68,5.95,1.15,0.34,{fontSize:14,bold:true}); addText(s,'ブランドアイデンティティ／Webビジュアル／投稿コンテンツ',1.83,5.94,6.0,0.36,{fontSize:9.8,color:C.muted});
  chip(s,'IDENTITY',8.65,5.94,1.35,C.blue); chip(s,'WEB',10.2,5.94,0.94,C.pale); chip(s,'CONTENT',11.34,5.94,1.25,C.white);
}

// 13 Content system
{
  const s=pptx.addSlide('MASTER'); title(s,13,'Content System','制作を速くするだけでなく、判断を揃える。','人の編集判断とAIの補助を組み合わせ、品質と継続性を両立します。');
  const a=[['01','企画の種','顧客の悩み／季節／現場の声'],['02','構成・コピー','フック／本文／CTA／ハッシュタグ'],['03','デザイン','ブランドテンプレート／写真／図解'],['04','展開','投稿／カルーセル／リール／Web'],['05','学習','反応の記録／仮説更新／次月改善']];
  a.forEach((v,i)=>{const x=0.62+i*2.5; rect(s,x,2.18,2.18,2.62,i===3?C.teal:(i%2?C.pale:C.white),0.08); addText(s,v[0],x+0.18,2.39,0.45,0.25,{fontSize:7.5,bold:true,color:i===3?C.ink:C.tealDark}); addText(s,v[1],x+0.18,2.89,1.8,0.38,{fontSize:13,bold:true,color:i===3?C.white:C.ink}); addText(s,v[2],x+0.18,3.48,1.76,0.72,{fontSize:9,color:i===3?C.white:C.muted,valign:'top'});});
  rect(s,1.1,5.35,11.14,0.9,C.ink,0.08); addText(s,'Adobe Creative Cloud  ＋  ChatGPT  /  Claude  /  Gemini  /  Cursor',1.45,5.61,10.44,0.32,{fontSize:12,bold:true,color:C.white,align:'center'});
  addText(s,'※ AIは調査・草案・整理を補助。最終判断と表現設計は人が行います。',2.25,6.47,8.85,0.28,{fontSize:8.5,color:C.muted,align:'center'});
}

// 14 Collaboration
{
  const s=pptx.addSlide('MASTER'); title(s,14,'Collaboration','「任せる」と「一緒につくる」の間を、柔軟に。');
  const a=[['SPOT','単発制作','投稿テンプレート、キャンペーン、プロフィール改善など'],['PARTIAL','部分代行','企画のみ／制作のみ／投稿管理など、必要な工程を担当'],['FULL','一貫支援','設計・企画・制作・運用・改善まで、窓口を一本化']];
  a.forEach((v,i)=>{const x=0.66+i*4.15; rect(s,x,2.1,3.79,3.55,i===2?C.teal:(i===1?C.blue:C.white),0.08); addText(s,v[0],x+0.22,2.34,1.2,0.24,{fontSize:7.5,bold:true,color:i===2?C.ink:C.tealDark,charSpacing:1.2}); addText(s,v[1],x+0.22,3.02,3.3,0.4,{fontSize:16,bold:true,color:i===2?C.white:C.ink}); line(s,x+0.22,3.62,0.58,0,i===2?C.white:C.teal,2); addText(s,v[2],x+0.22,3.98,3.27,0.82,{fontSize:10,color:i===2?C.white:C.muted,valign:'top'});});
  addText(s,'ヒアリング後、目的・期間・社内体制に合わせて支援範囲をご提案します。',1.24,6.13,10.9,0.4,{fontSize:13,bold:true,align:'center'});
}

// 15 Request flow
{
  const s=pptx.addSlide('MASTER'); title(s,15,'Request Flow','ご相談から開始まで。','まずは現状と「こうなりたい」をお聞かせください。');
  const a=[['01','お問い合わせ'],['02','ヒアリング'],['03','ご提案・お見積り'],['04','ご契約・準備'],['05','運用開始']];
  a.forEach((v,i)=>{const x=0.63+i*2.5; s.addShape(pptx.ShapeType.ellipse,{x:x+0.62,y:2.24,w:0.92,h:0.92,fill:{color:i===4?C.teal:C.white},line:{color:C.teal,width:1.4}}); addText(s,v[0],x+0.74,2.48,0.68,0.28,{fontSize:9,bold:true,color:i===4?C.white:C.tealDark,align:'center'}); addText(s,v[1],x,3.47,2.18,0.52,{fontSize:11.5,bold:true,align:'center'}); if(i<4)line(s,x+1.56,2.7,0.9,0,C.pale,2);});
  rect(s,1.16,4.68,11.0,1.16,C.blue,0.08); addText(s,'料金：ご支援範囲・投稿本数・制作内容に応じてお見積り',1.52,4.91,10.28,0.35,{fontSize:14,bold:true,align:'center'}); addText(s,'副業サイト上のメッセージからでも、お気軽にご相談ください。',2.2,5.4,8.9,0.28,{fontSize:9.5,color:C.muted,align:'center'});
}

// 16 Contact
{
  const s=pptx.addSlide(); s.background={color:C.ink};
  s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.18,h:7.5,fill:{color:C.teal},line:{color:C.teal}});
  addText(s,'CONTACT',0.83,0.74,2.5,0.3,{fontSize:9,color:C.teal,charSpacing:2});
  addText(s,'ブランドの魅力が、\nきちんと届くSNSへ。',0.8,1.42,6.8,1.4,{fontSize:29,bold:true,color:C.white,valign:'top'});
  addText(s,'まずは、現在のお悩みをお聞かせください。',0.84,3.23,5.8,0.38,{fontSize:13,color:C.pale});
  rect(s,0.82,4.18,7.12,1.63,'2A3031',0.08); addText(s,'今田 唯仁  /  Imada Tadahito',1.12,4.42,4.35,0.38,{fontSize:16,bold:true,color:C.white}); addText(s,'SNSブランド運用ディレクター',1.12,4.87,3.6,0.28,{fontSize:9.5,color:C.teal});
  addText(s,'MAIL',8.66,1.42,0.8,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'imadaruma965@gmail.com',8.66,1.77,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'WEB',8.66,2.55,0.8,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'https://imadaruma.jp',8.66,2.9,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'INSTAGRAM',8.66,3.68,1.2,0.24,{fontSize:7.2,bold:true,color:C.teal,charSpacing:1}); addText(s,'@imada_tadahito',8.66,4.03,3.9,0.36,{fontSize:13,bold:true,color:C.white});
  addText(s,'※掲載する連絡先・SNSは、Canva上で用途に合わせて削除・差し替えできます。',8.66,5.08,3.78,0.7,{fontSize:8.5,color:C.pale,valign:'top'});
  addText(s,'THANK YOU',0.84,6.68,2.8,0.3,{fontSize:9,bold:true,color:C.teal,charSpacing:2});
}

pptx.writeFile({ fileName: out });
