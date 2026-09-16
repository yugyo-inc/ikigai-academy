# Ikigai Academy 会期中ガイド

Colive Fukuoka 2026「Ikigai Academy」の参加者向け1ページサイトです。

スマートフォンで「今どこで何が行われているか」を確認することを主目的にしています。広告用LPではありません。

## この構成を選んだ理由

素のHTML・CSS・JavaScriptで作っています。`npm install` やビルドは不要です。

- `ikigai_schedule.json` の差し替えだけで時間割を更新できる
- Vercelへそのまま配置できる
- JavaScriptフレームワークの更新や依存関係を管理しなくてよい
- 会場の通信環境でも読み込みを軽く保ちやすい

## ファイル構成

```text
ikigai-colivefukuoka-site/
├── index.html
├── favicon.ico
├── robots.txt
├── sitemap.xml
├── hero-comparison.html        # 以前の写真ベース3案。公開本体からリンクしない
├── css/
│   ├── styles.css
│   └── hero-comparison.css
├── js/
│   ├── app.js
│   ├── render.js
│   ├── tokyo-time.js
│   └── hero-comparison.js
├── data/
│   └── ikigai_schedule.json
├── assets/
│   ├── Logo (white).png
│   ├── logo-white-480.png
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── key-visual-horizontal.jpg
│   ├── key-visual-vertical.jpg
│   ├── og-ikigai-academy-2026.jpg
│   ├── Ikigai_Academy_Thumbnail_1200x630.jpg # 旧素材。公開対象外
│   ├── Woven_Ground_Photo.jpg
│   ├── Woven_Ground_Photo_web.jpg
│   ├── conference-2025-stage.jpg
│   ├── community-2025.jpg
│   ├── volunteers-2025.jpg
│   ├── performer-2025.jpg
│   ├── welcome-2025.jpg
│   ├── community-food-2025.jpg
│   ├── fukuoka-now.png
│   └── faces/
│       └── 600px角の顔写真.jpg
├── scripts/
│   └── build-brand-images.py   # 素材変更時のみ使う制作スクリプト。公開対象外
├── vercel.json
└── README.md
```

公開本体 `index.html` のヒーローは、指定された[公式キーグラフィックのフォルダ](https://drive.google.com/drive/folders/12aKeCXQY5JVESGQXKy5zAWmhP-d_VOYl)内のロゴなし横長版・縦長版を背景に使用します。PCでは横長版、620px以下の画面では縦長版を読み込みます。ブランドロゴと中央揃えの文字を上に重ね、読みやすさのために背景を少し暗くしています。写真や顔のコラージュ、AI生成画像は使用していません。イベント名・日付・会場はスケジュールJSONから取得します。画像は表示速度のために縮小・圧縮したもので、元のデザインを変更していません。

`hero-comparison.html` には、以前検討した写真ベースの3案を参考として残しています。2025年の登壇・交流写真と実在の登壇者写真のみを使い、AI生成画像は使用していません。公開本体からはリンクしていません。

Ask Us欄の `volunteers-2025.jpg` は、指定の[受付で笑顔の3人の写真](https://drive.google.com/file/d/1lG9bxHJ6wORiI0IeqZ1TLFmDEYf60jNZ/view)の軽量版です。横長に切り抜かず3人の顔を表示します。ボタンは指定のWhatsAppグループへつながります。

**公開前の確認:** 比較ページには識別可能な人物写真が含まれます。`noindex` でもURLを知る人は見られるため、比較ページと比較案専用写真は `.gitignore` と `.vercelignore` で公開対象から除外しています。公開本体にも登壇者と受付ボランティアの写真があるため、これらの掲載許諾を確認してから公開してください。

`logo-white-480.png` は表示速度のための軽量版で、正規ロゴも同梱しています。

## OG画像・ファビコン・検索表示

- 共有時の画像は `assets/og-ikigai-academy-2026.jpg`（1200×630）です。指定の公式キーグラフィックとColive Fukuokaロゴから作成したもので、AI生成画像は使用していません。旧 `Ikigai_Academy_Thumbnail_1200x630.jpg` はOG画像に指定していません。
- ファビコンは `favicon.ico`、`assets/favicon-32.png`、Apple用 `assets/apple-touch-icon.png` です。すべて正規のColive Fukuokaロゴを濃紺の正方形に配置しています。
- `index.html` に正規URL、ページ説明、OG/Twitter設定、機械可読なスケジュールJSONへのリンクを置き、`robots.txt` と `sitemap.xml` には公開本体のURLだけを載せています。
- Event／WebPageの構造化データは、ページ読み込み時にスケジュールJSONの `event` から生成します。日付・会場をHTMLに二重入力しません。GoogleはJavaScript生成の構造化データを処理できますが、すべての検索・AIサービスでの表示を保証するものではありません。
- キーグラフィック・ロゴ・イベント日付を変更した場合は、OG画像も作り直してください。制作環境にPillowがある場合は `python3 scripts/build-brand-images.py` で再生成できます。公開サイト自体にPythonは不要です。
- SNSの共有画像はサービス側のキャッシュにより更新が遅れることがあります。新画像のURLで公開HTMLが返ることを確認してください。

## スケジュールを更新する

編集するファイルは原則として `data/ikigai_schedule.json` だけです。

### セッションの主な項目

```json
{
  "day": "2026-10-01",
  "kind": "workshop",
  "time": "14:00-14:45",
  "room": "A",
  "title": "Session title",
  "who": "Speaker name",
  "category": "local",
  "photos": ["jacquie"],
  "community_slug": "community-page-slug",
  "note": null
}
```

- `day`: `2026-10-01` または `2026-10-02`
- `kind`: `plenary`、`workshop`、`evening` のいずれか
- `time`: 原則 `HH:MM-HH:MM`。例: `10:30-11:15`
- `room`: `MAIN`、`A`、`B`、`G`、`BEACH`、`OUT` のいずれか
- `photos`: `assets/faces/` 内のファイル名から `.jpg` を除いた文字列
- `community_slug`: communityサイトのURL末尾。ページがない場合は `null`
- `note`: 通常は `null`。未確定は `"soon"`、前枠からの続きは `"cont"`
- `partner_logo`: 実在のロゴ画像への相対パス。必要なセッションだけ設定

`community_slug` が `null` のセッションには「Book your seat」を表示しません。

`note` が `"cont"` のセッションは、直前に同じ部屋で行われるセッションと自動的に結合されます。PCでは2つの時間枠をまたぐ1枚のカード、スマートフォンでは結合後の開始・終了時刻を表示した1枚のカードになります。

### 終了時刻が未定の場合

現在のデータには、終了時刻が未確定の `19:00-` の枠があります。サイトはこの表記も読み込めます。

- 時間割には `From 19:00` と表示
- 当日の19:00以降、PROGRAM上の該当カードを強調表示

終了時刻が決まったら、通常の `19:00-22:00` の形式に変更してください。

### Coming soonを更新する

内容が確定したら、対象セッションの次を変更します。

1. `title` と `who` を確定内容へ変更
2. `community_slug` を登録済みページのslugへ変更
3. `note` を `"soon"` から `null` へ変更

未確定の間は内容を推測して書かないでください。

## 顔写真を追加・差し替えする

1. 600px角のJPEGを `assets/faces/` に入れる
2. 半角英数字の短いファイル名にする。例: `new-speaker.jpg`
3. JSONの `photos` に拡張子なしで `"new-speaker"` と記入する

複数人の場合は次のように書きます。

```json
"photos": ["oren", "yeji"]
```

写真はCSSで丸く表示されます。画像自体を丸く加工する必要はありません。

登壇者のプロフィールは `speakers` の `name`、`role`、`session`、`when`、`bio`、`photos` を編集します。写真をタップするとプロフィールが開き、10月1日・2日のセッションが登録されていればその枠へ移動できます。別日のイベントだけに出る人について、Academyのセッションを創作しないでください。

現在、略歴が提供されていない登壇者には `bio` を創作していません。その場合も名前・写真・担当枠・日時・セッションへの移動が表示されます。正式な略歴が届いたら、その人の `bio` に英語で追加できます。

Ask Us欄の写真は `assets/volunteers-2025.jpg` です。同じファイル名の画像に差し替えれば表示が変わります。縦横比が変わる場合は `css/styles.css` の `.ask-grid img` も確認してください。肖像・掲載許可を確認してください。

会場住所、GoogleマップURL、会場マップURL、9時前のバス案内はJSONの `event` 内にあります。バス時刻が確定した場合は正本を確認して変更してください。

## JSONを壊さないための注意

- 項目と文字列は半角の `"` で囲む
- 項目の間のカンマを削除しない
- 最後の項目には余分なカンマを付けない
- 未設定は空文字ではなく `null` を使う
- 人名、時間、部屋は正本を確認してから変更する

Macのターミナルで次を実行すると、JSONの文法を確認できます。

```bash
jq empty data/ikigai_schedule.json
```

何も表示されなければ文法は正常です。

## ローカルで確認する

`index.html` を直接ダブルクリックすると、ブラウザの制限でJSONを読み込めない場合があります。簡易サーバーを使ってください。

このフォルダで次を実行します。

```bash
python3 -m http.server 4173
```

その後、ブラウザで次を開きます。

```text
http://localhost:4173
```

以前のヒーロー3案の比較画面は `http://localhost:4173/hero-comparison.html` です。比較画面もスケジュールJSONからイベント名・日付・会場を読み込みます。

終了するときは、ターミナルで `Control + C` を押します。

## 確認するポイント

更新後は最低限、次を確認してください。

1. Day 1とDay 2を切り替えられる
2. 変更したセッションの時間・部屋・登壇者が正しい
3. 顔写真が表示される
4. Coming soonと、2枠をまたぐセッションの結合表示が正しい
5. 「Book your seat」が正しいcommunityページを開く
6. スマートフォン幅で3部屋が横スクロールにならず、縦に並ぶ
7. 会場マップのボタン、Googleマップ、住所コピーが使える
8. 登壇者写真からプロフィールと該当セッションへ移動できる
9. 名前・タイトル・カテゴリーの検索で合致した枠が強調される
10. CLF26のコピーボタンが使える
11. Ask Usで3人の顔が見切れず、WhatsAppグループへのボタンが正しい
12. トップのヒーローに公式キーグラフィックが表示され、PC・360px幅とも中央揃えの文字が読める
13. 公開HTMLの `og:image` が `og-ikigai-academy-2026.jpg` を指し、正方形ファビコン・`robots.txt`・`sitemap.xml` が開ける

## 現在進行中の枠の表示

- 端末の場所に関係なく `Asia/Tokyo` の現在時刻を使う
- PROGRAM見出しの下に会場時間を表示する
- 開催中は、進行中のセッションカードを部屋ごとに同時に強調する。前後の枠もそのままスクロールできる
- 開催日以外と枠のない時間帯は誤ったカードを強調しない
- `cont` の枠は直前のカードを強調する

会場マップは外部サイトを埋め込まず、直接開く方式です。ブラウザによって埋め込みが表示されない問題を避けています。

## Vercelへ公開する

### GitHub連携

1. このフォルダ一式をGitHubリポジトリへ入れる
2. Vercelで「Add New Project」を選ぶ
3. 対象リポジトリを選ぶ
4. Framework Presetは `Other` を選ぶ
5. Build Commandは空欄
6. Output Directoryも空欄または `.`
7. Deployを実行する

以後はGitHubへpushすると自動デプロイされます。

独自ドメイン設定で `ikigai.colivefukuoka.com` を割り当ててください。

## キャッシュについて

Service Workerは使っていません。会期直前・会期中の更新が古いキャッシュに残るリスクを避けるためです。

- JSON: 毎回更新確認
- 画像: 5分キャッシュし、その後はバックグラウンドで更新確認

同じ名前の顔写真を差し替えた直後に古い写真が見える場合は、5分待つかブラウザを再読み込みしてください。

## データと文章のルール

- 英語は米国綴り
- `ticket` ではなく `pass` を使う
- 2025年の実績数字を追加しない
- 市長の登壇は `Words of welcome from Fukuoka City`
- VIPディナーの会場名を書かない
- 未確定の3件は `note: "soon"` のままにし、内容を創作しない

OG画像は `assets/og-ikigai-academy-2026.jpg` です。
