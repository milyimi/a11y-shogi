# アクセシブル将棋 (a11y-shogi)

アクセシビリティに配慮した将棋アプリケーション

## 概要

a11y-shogiは、視覚障害者を含むすべてのユーザーが楽しめる将棋対局システムです。Laravel + Viteをベースに、Web標準のアクセシビリティガイドライン（WCAG 2.1）に準拠した設計となっています。

## 主な機能

- **対人対局**: PHP AI エンジンとの対局（3段階の難易度設定）
- **外部AI対局**: python-shogi / USIエンジンとの対局テスト
- **ランキング機能**: 難易度別スコア記録
- **棋譜機能**: 対局中の指し手を日本語で記録・リアルタイム表示（`aria-live` 対応）
- **アクセシビリティ**:
  - WCAG 2.1 AAA レベル準拠
  - スクリーンリーダー完全対応（NVDA / JAWS / VoiceOver）
  - キーボードのみで全操作可能（矢印キー + WASD代替ナビゲーション、駒台操作: Shift+T/G → Enter → 盤面自動復帰）
  - **合法手ハイライト**: 駒選択時に移動可能マスを緑色ドットで視覚表示
  - **AIハイライト**: AI最終手を★マーカーで表示（通常モード・ハイコントラスト両対応）
  - **ショートカットヒント**: 画面内に主要キーボードショートカットを常時表示
  - コントラスト比 7:1 以上（AAA基準）
  - **ダークモード**: OS設定自動検出（`prefers-color-scheme`）+ 手動切替
  - **セッション期限切れ対応**: CSRFトークン期限切れ時にアクセシブルなダイアログで通知
  - **初期ガイダンス**: ゲーム開始時に操作方法をaria-liveで自動アナウンス

## 技術スタック

- **Backend**: PHP 8.3.27, Laravel 12.48.1
- **Frontend**: Vite 7.3.1, Vanilla JavaScript
- **AI Engine**: Minimax + Alpha-Beta Pruning (Depth 4)
- **External AI**: python-shogi 1.1.1, Fairy-Stockfish 11.1
- **Testing**: Pest (127 tests), Puppeteer (58 E2E + 30 contrast + 74 blind user + 59 full-feature)

## セットアップ

### 初回セットアップ（開発環境構築）

```bash
# 依存関係インストール
composer install

# 環境設定
cp .env.example .env
php artisan key:generate

# データベースマイグレーション
php artisan migrate
```

### 開発サーバー起動

ビルド済みフロントエンドファイルがGit管理対象のため、以下で起動します：

```bash
php artisan serve
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

### ユニット・機能テスト

```bash
# 全テスト実行
vendor/bin/pest

# 低速テストを含む
RUN_SLOW_TESTS=true vendor/bin/pest

# ブラウザビルド確認
npm run build
```

### アクセシビリティ E2E テスト（Puppeteer）

#### 基本的なアクセシビリティ検証（58項目）

```bash
node tests/accessibility/puppeteer-a11y-test.mjs
```

**検証項目:**
- ホーム画面: 言語属性、スキップリンク、ランドマーク
- ゲーム画面: 盤面の ARIA ラベル、キーボードナビゲーション、ライブリージョン
- 成りダイアログ: role/aria 属性、フォーカストラップ
- ランキング登録: ダイアログ操作、フォーム入力
- アクセシビリティツリー: 階層構造、ロール検証
- 視覚的アクセシビリティ: フォーカス表示（44×44px 以上）、コントラスト

#### コントラスト検証（30項目）

```bash
node tests/accessibility/contrast-test.mjs
```

**検証項目:**
- 通常モード / ダークモード / ハイコントラストモードの配色
- WCAG AAA コントラスト比（7:1以上）
- フォーカスインジケータの可視性
- ボタンのタッチターゲットサイズ（44×44px以上）
- ランキング画面のハイコントラスト維持

#### 全盲ユーザー対局テスト（75項目）

```bash
node tests/accessibility/blind-user-playtest.mjs
```

**テスト内容（22フェーズ）:**
- ホーム画面の構造とフォーム操作
- ゲーム開始・盤面構造・ARIA属性
- キーボードナビゲーション（矢印キー移動）
- 駒の選択・移動・持ち駒打ち
- ショートカットキー（B: 盤面読み上げ、S: 状態読み上げ）
- 待った・投了・リセット・中断ダイアログ
- タイマー・棋譜・情報パネル
- フォーカス管理・エラーフィードバック
- ヘルプページ・境界チェック
- **CSRFトークン期限切れ時のダイアログ表示**

#### 全機能E2Eテスト（59項目）

```bash
node tests/e2e/full-feature-test.mjs
```

**テスト内容（15カテゴリ）:**
- ホーム画面・難易度選択・ゲーム開始
- 駒の移動・成り判定・持ち駒打ち
- 待った（AI戦2手戻し）・投了・リセット・中断
- ランキング登録・ヘルプページ
- ダークモード切替・タイマー・棋譜表示

### テスト結果サマリー

| テストスイート | テスト数 | 内容 |
|---|---|---|
| PHP (Pest) | 127 | ルール検証、AI評価、成り、ボード境界、エラーハンドリング等 |
| E2E アクセシビリティ | 58 | ARIA属性、キーボード操作、フォーカス管理 |
| コントラスト | 30 | WCAG AAA配色、ダーク/ハイコントラストモード |
| 全盲ユーザー対局 | 75 | 実際の対局シミュレーション（22フェーズ） |
| 全機能E2E | 59 | ブラウザ経由の全機能動作検証（15カテゴリ） |
| **合計** | **349** | |

## ドキュメント

- [プロジェクト概要](docs/design/00_PROJECT_OVERVIEW.md)
- [システムアーキテクチャ](docs/design/01_SYSTEM_ARCHITECTURE.md)
- [ユーザーフロー](docs/design/02_USER_FLOWS.md)
- [データベース設計](docs/design/03_DATABASE_DESIGN.md)
- [API仕様](docs/design/04_API_SPECIFICATION.md)
- [ワイヤーフレーム](docs/design/05_WIREFRAMES.md)
- [アクセシビリティガイドライン](docs/design/06_ACCESSIBILITY_GUIDELINES.md)

## ライセンス

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
