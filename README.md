# a11y-shogi

アクセシビリティに配慮した将棋アプリケーション

## 概要

a11y-shogiは、視覚障害者を含むすべてのユーザーが楽しめる将棋対局システムです。Laravel + Viteをベースに、Web標準のアクセシビリティガイドライン（WCAG 2.1）に準拠した設計となっています。

## 主な機能

- **対人対局**: PHP AI エンジンとの対局（3段階の難易度設定）
- **外部AI対局**: python-shogi / USIエンジンとの対局テスト
- **ランキング機能**: 難易度別スコア記録
- **アクセシビリティ**: スクリーンリーダー完全対応、キーボード操作
- **棋譜機能**: 対局履歴の保存と再生

## 技術スタック

- **Backend**: PHP 8.3.27, Laravel 12.48.1
- **Frontend**: Vite 7.3.1, Vanilla JavaScript
- **AI Engine**: Minimax + Alpha-Beta Pruning (Depth 4)
- **External AI**: python-shogi 1.1.1, Fairy-Stockfish 11.1
- **Testing**: Pest (84/100 tests passing)

## セットアップ

```bash
# 依存関係インストール
composer install
npm install

# 環境設定
cp .env.example .env
php artisan key:generate

# データベースマイグレーション
php artisan migrate

# 開発サーバー起動
php artisan serve &
npm run dev
```

## AI 対局テスト

### Python-shogi との対局

```bash
php artisan ai:match --external=python --games=5
```

### USI エンジンとの対局

```bash
# Fairy-Stockfish (depth-based)
php artisan ai:match --external=usi --usi-path=/usr/games/fairy-stockfish --games=5

# Fairy-Stockfish (time-based)
php artisan ai:match --external=usi --usi-path=/usr/games/fairy-stockfish --usi-movetime=500 --games=5
```

### オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--games=N` | 対局数 | 1 |
| `--external=TYPE` | 外部AIタイプ (python/usi) | - |
| `--php-depth=N` | PHP AI探索深さ | 4 |
| `--external-depth=N` | 外部AI探索深さ | 3 |
| `--usi-path=PATH` | USIエンジンパス | /usr/games/fairy-stockfish |
| `--usi-variant=VAR` | USI variant | shogi |
| `--usi-movetime=MS` | USI思考時間(ms) | null |
| `--max-moves=N` | 最大手数 | 300 |
| `--sennichite=N` | 千日手閾値(0=無効) | 4 |
| `--sennichite-min-moves=N` | 千日手判定開始手数 | 24 |
| `--php-noise=N` | PHP AIノイズ(%) | 0 |
| `--external-noise=N` | 外部AIノイズ(%) | 0 |
| `--seed=N` | 乱数シード | random |
| `--save-log` | JSON ログ保存 | false |

### 統計分析

```bash
python analyze_matches.py storage/app/private/ai_matches/*.json
```

出力情報:
- 勝率 (PHP vs External)
- 平均手数
- 終局理由分布
- 設定別比較

## テスト実行

```bash
# 全テスト実行
vendor/bin/pest

# 低速テストを含む
RUN_SLOW_TESTS=true vendor/bin/pest

# ブラウザビルド確認
npm run build
```

## ドキュメント

- [プロジェクト概要](docs/design/00_PROJECT_OVERVIEW.md)
- [システムアーキテクチャ](docs/design/01_SYSTEM_ARCHITECTURE.md)
- [ユーザーフロー](docs/design/02_USER_FLOWS.md)
- [データベース設計](docs/design/03_DATABASE_DESIGN.md)
- [API仕様](docs/design/04_API_SPECIFICATION.md)
- [ワイヤーフレーム](docs/design/05_WIREFRAMES.md)
- [アクセシビリティガイドライン](docs/design/06_ACCESSIBILITY_GUIDELINES.md)
- [AI強化レポート](AI_ENHANCEMENT_REPORT.md)
- [ランキング実装レポート](RANKING_IMPLEMENTATION_REPORT.md)

## ライセンス

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
