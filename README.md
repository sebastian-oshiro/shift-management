# シフト管理アプリケーション

## 📋 概要

従業員のシフト管理を効率的に行うためのWebアプリケーションです。オーナーと従業員それぞれの権限に応じた機能を提供し、リアルタイムでのシフト更新と自動給与計算を実現します。

## ✨ 主な機能

### 👑 オーナー機能
- **ダッシュボード**: 最近のアクティビティと統計情報の表示
- **シフト管理**: カレンダー形式でのシフト作成・編集・削除
- **シフト詳細**: 日別のガントチャート表示とシフト管理
- **従業員管理**: 従業員の登録・編集・削除
- **勤怠管理**: 全従業員の出退勤記録の確認
- **給与管理**: 月別の給与自動計算と表示
- **時間帯設定**: ガントチャート用の時間範囲設定
- **権限管理**: 従業員の権限設定

### 👤 従業員機能
- **ダッシュボード**: 今日の出退勤と今月の統計
- **シフト確認**: 自分のシフトの確認（権限に応じて他者シフトも閲覧可能）
- **シフト希望提出**: カレンダー形式でのシフト希望提出
- **出退勤記録**: 出勤・退勤ボタン（5秒間取り消し可能）
- **勤怠履歴**: 過去の勤怠記録の確認
- **給与確認**: 自分の月給の確認

### 🔧 共通機能
- **リアルタイム更新**: シフト変更の即座反映
- **時間表示統一**: UTC→JST変換による統一された時間表示
- **レスポンシブデザイン**: スマートフォン・タブレット対応
- **権限ベースアクセス**: 役割に応じた機能制限

## 🛠 技術スタック

### フロントエンド
- **React 18** + **TypeScript**: 型安全な動的UI
- **CSS Modules**: スコープ付きスタイリング
- **React Router**: シングルページアプリケーション
- **Context API**: グローバル状態管理

### バックエンド
- **Go 1.21+** + **Echo Framework**: 高速APIサーバー
- **bcrypt**: パスワードハッシュ化
- **JWT**: 認証トークン管理
- **GORM**: データベースORM

### データベース
- **PostgreSQL 14+**: リレーショナルデータベース
- **自動マイグレーション**: テーブル自動作成

### 開発環境
- **Node.js 18+**: フロントエンド開発
- **npm**: パッケージ管理
- **PowerShell**: Windows開発環境

## 🚀 セットアップ

### 前提条件
- Go 1.21以上
- Node.js 18以上
- PostgreSQL 14以上
- Git

### 1. リポジトリのクローン
```bash
git clone https://github.com/yourusername/shift-management.git
cd shift-management
```

### 2. データベースのセットアップ
```bash
# PostgreSQLにログイン
psql -U postgres

# データベースを作成
CREATE DATABASE shift_management;

# データベースに接続
\c shift_management

# スキーマを実行（database/schema.sql）
\i database/schema.sql

# 終了
\q
```

### 3. バックエンドのセットアップ
```bash
cd backend

# 依存関係のインストール
go mod download

# 環境変数の設定（必要に応じて）
# データベース接続情報を connection.go で確認・修正

# サーバーの起動
go run main.go
```

### 4. フロントエンドのセットアップ
```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

### 5. アプリケーションへのアクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8080

## 👥 テストアカウント

### オーナーアカウント
- **メールアドレス**: `owner@test.com`
- **パスワード**: `Shift2024!Secure#Test`

### 従業員アカウント
- **メールアドレス**: `employee@test.com`
- **パスワード**: `Employee2024!Test`

## 📁 プロジェクト構造

```
shift-management/
├── backend/                 # Go バックエンド
│   ├── handlers/           # HTTP ハンドラー
│   ├── models/             # データモデル
│   ├── database/           # データベース接続
│   ├── main.go             # エントリーポイント
│   └── go.mod              # Go モジュール
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── components/     # 再利用可能コンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── contexts/       # React Context
│   │   ├── services/       # API サービス
│   │   ├── types/          # TypeScript 型定義
│   │   └── utils/          # ユーティリティ関数
│   ├── public/             # 静的ファイル
│   └── package.json        # npm パッケージ
├── database/               # データベース関連
│   └── schema.sql          # データベーススキーマ
└── README.md               # プロジェクト説明
```

## 🔧 開発

### バックエンド開発
```bash
cd backend

# 開発サーバー起動（ホットリロード）
go run main.go

# テスト実行
go test ./...

# ビルド
go build -o shift-management main.go
```

### フロントエンド開発
```bash
cd frontend

# 開発サーバー起動
npm start

# テスト実行
npm test

# ビルド
npm run build
```

## 📊 データベーススキーマ

### 主要テーブル
- **users**: ユーザー認証情報
- **employees**: 従業員情報
- **shifts**: シフト情報
- **attendance**: 出退勤記録
- **shift_requests**: シフト希望
- **permissions**: 従業員権限
- **gantt_settings**: ガントチャート設定

## 🔐 セキュリティ機能

- **パスワードハッシュ化**: bcryptによる安全なパスワード保存
- **JWT認証**: セッションベースの認証
- **権限管理**: 役割ベースのアクセス制御
- **入力検証**: サーバーサイドでのデータ検証
- **SQLインジェクション対策**: プリペアドステートメント使用

## 🎨 UI/UX 特徴

- **モダンデザイン**: 直感的で使いやすいインターフェース
- **レスポンシブ**: デスクトップ、タブレット、スマートフォン対応
- **リアルタイム更新**: 即座に反映される変更
- **視覚的フィードバック**: 操作結果の明確な表示
- **アクセシビリティ**: キーボード操作とスクリーンリーダー対応

## 🚀 デプロイ

### 本番環境での実行
```bash
# バックエンド
cd backend
go build -o shift-management main.go
./shift-management

# フロントエンド
cd frontend
npm run build
# ビルドされたファイルをWebサーバーに配置
```

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページでお知らせください。

## 🔄 更新履歴

### v1.0.0 (2024-12-19)
- 初期リリース
- オーナー・従業員機能の実装
- シフト管理システムの完成
- 給与計算機能の実装
- 権限管理システムの実装 