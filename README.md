# インテリメーカー 〜賢いは作れる！〜

<p align="center">
  <img src="/src/app/images/logo.png" alt="ロゴ" width="700">
</p>

## 概要

インテリメーカーは、ユーザーが入力したキーワードに基づいて、知識を深め、賢くなるためのコンテンツを生成するウェブアプリケーションです。Perplexity AI を活用して、以下の機能を提供します：

1. 用語の解説
2. 賢く聞こえるセリフの生成
3. 面白い雑学の提供
4. 関連用語の解説
5. キーパーソンの紹介

## 技術スタック

- フレームワーク：Next.js 14
- 言語：TypeScript
- スタイリング：Tailwind CSS
- AI：Perplexity
- アニメーション：Framer Motion
- その他：shadcn/ui コンポーネント

## セットアップ

1. リポジトリをクローンします：

   ```
   git clone https://github.com/tahara-pg/intelli-maker.git
   ```

2. 依存関係をインストールします：

   ```
   npm install
   ```

3. `.env.local`ファイルを作成し、必要な環境変数を設定します。`.env.sample`ファイルを参考にしてください：

   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=あなたのGoogleアナリティクスID
   PERPLEXITY_API_KEY=あなたのPerplexity APIキー
   ```

4. 開発サーバーを起動します：

   ```
   npm run dev
   ```

5. ブラウザで`http://localhost:3000`を開きます。

## 使用方法

1. メインページの検索バーにキーワードを入力します。
2. 「調べる」ボタンをクリックするか、Enter キーを押します。
3. 生成されたコンテンツ（用語の解説、セリフ、雑学、関連用語、キーパーソン情報）が表示されます。
