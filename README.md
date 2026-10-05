# めしログ 🍺

友達同士で朝・昼・晩の食事を写真付きで記録し、無駄な外食を減らすスマホ向けWebアプリです。  
ルールは **無駄な外食1回 = ビール1杯おごり**。

## 実装済み
- メールアドレス + パスワード認証
- 朝・昼・晩の食事記録
- 食事写真アップロード（ブラウザ側でJPEG圧縮）
- 全ユーザーのタイムライン
- コメント
- 無駄な外食判定
- ユーザーごとの「ビール何杯おごり」カウント
- プロフィール・アイコン変更
- Supabase RLS / Realtime
- GitHub Pages 自動デプロイ

## 初回セットアップ

### 1. Supabase
Supabase Dashboard → **SQL Editor** で [supabase/schema.sql](./supabase/schema.sql) を一度実行してください。

profiles / meals / comments / Storage buckets / RLS / profile生成trigger / Realtime設定が作成されます。

フロントエンドにはSupabaseの **anon key** を置いています。これはブラウザ利用前提の公開キーです。ただしRLSを無効化すると危険です。service_role keyは絶対にフロントへ置かないでください。

### 2. Authentication
Supabase Dashboard → Authentication → Providers → Email を有効にしてください。

友達だけで使う場合は、必要なユーザー登録後に新規サインアップを無効化すると閉じた運用にできます。

### 3. GitHub Pages
Repository Settings → Pages → **Build and deployment** → Source を **GitHub Actions** にしてください。

mainへのpushで `.github/workflows/deploy.yml` が実行されます。

公開URL: `https://buncho08.github.io/food-recording/`

## ローカル開発
```bash
npm install
npm run dev
```

## 判定ルール
`meals.is_wasteful_outing = true` の食事をビール1杯として集計します。判定を変更できるのは投稿者本人だけです。
