# インテリメーカー 〜賢いは作れる〜

## プロジェクト概要

インテリメーカーは、ユーザーが入力したキーワードに基づいて、知識を深め、賢くなるためのコンテンツを生成するウェブアプリケーションです。Google の Gemini AI を活用して、以下の機能を提供します：

1. 賢く聞こえるセリフの生成
2. 関連用語の解説
3. キーパーソンの紹介

## 主な機能

- キーワード入力による知識コンテンツの生成

## 技術スタック

- フレームワーク: Next.js 14
- 言語: TypeScript
- スタイリング: Tailwind CSS
- AI API: Google Generative AI (Gemini)
- アニメーション: Framer Motion
- その他: shadcn/ui コンポーネント

## セットアップ

1. リポジトリをクローンします：

   ```
   git clone https://github.com/tahara-pg/intelli-maker.git
   ```

2. 依存関係をインストールします：

   ```
   npm install
   ```

3. `.env.local` ファイルを作成し、Gemini API キーを設定します：

   ```
   NEXT_PUBLIC_GEMINI_API_KEY=あなたのAPIキー
   ```

4. 開発サーバーを起動します：

   ```
   npm run dev
   ```

5. ブラウザで `http://localhost:3000` を開きます。

## 使用方法

1. メインページの検索バーにキーワードを入力します。
2. 「生成」ボタンをクリックするか、Enter キーを押します。
3. 生成されたコンテンツ（セリフ、用語解説、キーパーソン情報）が表示されます。
