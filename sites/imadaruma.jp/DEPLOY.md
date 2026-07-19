# imadaruma.jp /sound の載せ方

このフォルダの `sound/index.html` を、サーバのドキュメントルートに

```text
/sound/index.html
```

として置くと、**https://imadaruma.jp/sound/** が開きます。

（いま `/sound` は 404 です。トップの sound カードは Instagram 直リンクです。）

## 手順

1. レンタルサーバ／FTP／パネルで、公開ディレクトリに `sound` フォルダを作成  
2. この `index.html` をアップロード  
3. ブラウザで https://imadaruma.jp/sound/ を確認  
4. トップページ `index.html` の sound カードを次のように変更  

```html
<a href="https://imadaruma.jp/sound/" class="link-card">
```

（いまは `https://www.instagram.com/imadaruma_sound/`）  
説明文も例: `テーマ曲 · 音ブランディング`

5. Instagram `@imadaruma_sound` のプロフィールリンクに  
   `https://imadaruma.jp/sound/` を設定  

6. Xserver で `sound@imadaruma.jp` を作成し、ページ上の mailto と一致させる  
   CTA「InstagramでDMする」は `https://ig.me/m/imadaruma_sound`（DM起動）  

## ソースの場所

リポジトリ: `sites/imadaruma.jp/sound/`  
サイト本体の編集場所が別にあれば、そちらへコピーしてデプロイしてください。
