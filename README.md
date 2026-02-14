# アクセシブル将棋 (a11y-shogi)

**WCAG 2.1 AAA 準拠** のアクセシビリティに配慮した将棋アプリケーション

## 概要

a11y-shogiは、視覚障害・上肢障害・認知障害・色覚多様性・感覚過敏を含む**すべてのユーザー**が楽しめる将棋対局システムです。Laravel + Viteをベースに、WCAG 2.1 AAA レベルのアクセシビリティ基準を達成しています。

## 主な機能

### ゲーム機能
- **AI対局**: PHP AI エンジンとの対局（3段階の難易度設定）
- **外部AI対局**: python-shogi / USIエンジンとの対局テスト
- **ランキング機能**: 難易度別スコア記録（ニックネーム登録）
- **棋譜機能**: 対局中の指し手を日本語で記録・リアルタイム表示

### アクセシビリティ機能

#### スクリーンリーダー対応
- NVDA / JAWS / VoiceOver 完全対応
- 全99セル（9×9盤面）に `aria-label` で座標と駒情報
- `aria-live` による指し手・エラー・AI応答のリアルタイム読み上げ
- 盤面差分読み上げ（Shift+Bで前回からの変化のみ）
- 利き筋情報（Iキーで現在マスを狙う相手の駒を読み上げ）
- 合法手読み上げ（駒選択時に移動可能マス一覧）
- 初期ガイダンス（ゲーム開始時に操作方法を自動アナウンス）

#### キーボード操作
- マウス不要で全操作可能
- 矢印キー + WASD代替ナビゲーション
- 1/2キーで駒台操作（Shift同時押し不要な片手対応）
- Enter/Spaceで選択・Escapeで解除
- キー入力デバウンス（手の震えによる誤操作防止）
- ショートカットキー一覧（B: 盤面読み上げ、S: ステータス、I: 利き筋、H: ヘルプ等）

#### 視覚的サポート
- コントラスト比 7:1 以上（AAA基準）
- ダークモード（OS設定自動検出 + 手動切替）
- ハイコントラストモード
- Windows強制カラーモード完全対応（`forced-colors: active`）
- 色覚多様性対応（形状・記号・テキスト・下線で区別）
- 合法手ハイライト（緑色ドット＋`●`マーカー）
- AI最終手ハイライト（`★`マーカー）
- 選択中駒の状態バー表示
- 駒文字サイズ変更（小〜特大）

#### 認知・読字サポート
- ふりがな対応（全画面の漢字に `<ruby>` タグ）
- 平易な難易度表記（「初級（よわい）」等）
- UDフォント選択（UDデジタル教科書体・BIZ UDゴシック）
- 初心者向けガイダンス・ヘルプページ

#### 感覚過敏配慮
- `prefers-reduced-motion` でアニメーション完全停止
- トースト通知無効化オプション
- タイマー非表示オプション
- 点滅要素なし（WCAG 2.3.1 準拠）

#### UI/UX設計
- レスポンシブデザイン（3段階ブレークポイント: 1199px / 799px / 480px）
- 将棋盤の木目調デザイン
- ボタン分離設計（投了ボタンは赤色で分離配置し誤操作防止）
- モーダルダイアログ（棋譜・設定・ショートカット）— フォーカストラップ・Escape閉じ・フォーカス復帰
- セッション期限切れ時のアクセシブルなダイアログ通知
- 全ボタンの最小タッチターゲット 44×44px

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| バックエンド | PHP 8.3.27, Laravel 12.48.1 |
| フロントエンド | Blade テンプレート, Vite 7.3.1, Vanilla JavaScript |
| CSS | Tailwind CSS + カスタムCSS変数 |
| データベース | SQLite |
| AI エンジン | Minimax + Alpha-Beta Pruning (Depth 4, 500K Transposition Table) |
| 外部AI | python-shogi 1.1.1, Fairy-Stockfish 11.1 (USI) |
| テスト | Pest (PHP 125), Puppeteer (E2E 585) — **計710テスト** |

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

## テスト

### テスト一覧

| テストスイート | コマンド | テスト数 | 内容 |
|---|---|---|---|
| PHP ユニット | `vendor/bin/pest` | 125 | ルール検証、AI評価、成り・持ち駒等 |
| E2E アクセシビリティ | `node tests/accessibility/puppeteer-a11y-test.mjs` | 59 | ARIA属性、キーボード、フォーカス管理 |
| コントラスト | `node tests/accessibility/contrast-test.mjs` | 28 | WCAG AAA配色、ダーク/HC両モード |
| 全盲ユーザー対局 | `node tests/accessibility/blind-user-playtest.mjs` | 77 | 22フェーズの対局シミュレーション |
| 全機能E2E | `node tests/e2e/full-feature-test.mjs` | 59 | 15カテゴリの全機能動作検証 |
| 障害者AI Wave 1 | `node tests/customer-ai/test-diverse.mjs` | 45 | 上肢障害/色覚/認知/聴覚/高齢者/ADHD |
| 障害者AI Wave 2 | `node tests/customer-ai/test-diverse2.mjs` | 31 | 脳性麻痺/ディスレクシア/ズーム/自閉症 |
| 障害者AI Wave 3 | `node tests/customer-ai/test-diverse3.mjs` | 26 | 知的障害/片麻痺/てんかん/WCAG AAA |
| 棋士AIペルソナ | `node tests/expert-ai/test-kishi.mjs` | 30 | 初期配置/駒移動/将棋用語/ゲームフロー |
| WebデザイナーAI | `node tests/expert-ai/test-designer.mjs` | 37 | レイアウト/レスポンシブ/配色/一貫性 |
| 高齢者AI | `node tests/customer-ai/test-senior.mjs` | 62 | 視認性/マウス操作/誤操作復帰/安定性 |
| 子供・初心者AI | `node tests/customer-ai/test-child.mjs` | 28 | ふりがな/直感性/エラー親切さ/楽しさ |
| UXリサーチャーAI | `node tests/customer-ai/test-ux.mjs` | 45 | ニールセン10原則/認知負荷/一貫性 |
| 教育者AI | `node tests/customer-ai/test-teacher.mjs` | 30 | 授業活用/安全性/多様な障がい/Chromebook |
| モバイルユーザーAI | `node tests/customer-ai/test-mobile.mjs` | 28 | スマホ視認性/タッチ/レスポンシブ/性能 |
| **合計** | | **710** | |

### 全テスト一括実行

```bash
# PHP テスト
vendor/bin/pest

# E2E テスト
node tests/accessibility/puppeteer-a11y-test.mjs
node tests/accessibility/contrast-test.mjs
node tests/accessibility/blind-user-playtest.mjs
node tests/e2e/full-feature-test.mjs

# 障害者AIペルソナテスト
node tests/customer-ai/test-diverse.mjs
node tests/customer-ai/test-diverse2.mjs
node tests/customer-ai/test-diverse3.mjs

# 専門家AIペルソナテスト
node tests/expert-ai/test-kishi.mjs
node tests/expert-ai/test-designer.mjs

# 追加お客様AIペルソナテスト
node tests/customer-ai/test-senior.mjs
node tests/customer-ai/test-child.mjs
node tests/customer-ai/test-ux.mjs
node tests/customer-ai/test-teacher.mjs
node tests/customer-ai/test-mobile.mjs
```

### テスト対象ペルソナ（24種類）

| # | ペルソナ | 障害種別 |
|---|---|---|
| A | 全盲ユーザー | スクリーンリーダー |
| B | 弱視ユーザー | 拡大表示 |
| C | 全盲初心者 | スクリーンリーダー + 将棋初心者 |
| D | 弱視初心者 | 拡大表示 + 将棋初心者 |
| E | 上肢障害者 | 片手キーボード操作 |
| F | 色覚障害者 | P型色覚 |
| G | 認知障害者 | 学習障害 |
| H | 聴覚障害者 | ろう者 |
| I | 高齢者 | 弱視 + 手の震え |
| J | ADHD | 感覚過敏 |
| K | 脳性麻痺 | Tab + Enter のみ |
| L | ディスレクシア | 読字障害 |
| M | 400%ズーム | 重度弱視 |
| N | 自閉スペクトラム | 一貫性重視 |
| O | 知的障害者 | シンプルUI |
| P | 片麻痺 | 左手のみ |
| Q | てんかん | 光感受性 |
| — | 棋士AI | 将棋ルール正確性 |
| — | WebデザイナーAI | UI/UX設計品質 |
| — | 高齢者AI | デジタル不慣れ（72歳） |
| — | 子供・初心者AI | 小学生（12歳）将棋初心者 |
| — | UXリサーチャーAI | ヒューリスティック評価専門家 |
| — | 教育者AI | 特別支援学校教諭 |
| — | モバイルユーザーAI | スマートフォン通勤ユーザー |

## プロジェクト構造

```
a11y-shogi/
├── app/
│   ├── Console/Commands/    # AI対局コマンド (ai:match, battle)
│   ├── Http/Controllers/    # GameController, RankingController
│   ├── Models/              # GameSession, GameMove, BoardState, Ranking
│   └── Services/            # GameService, ShogiService, AIService, ExternalAI, USI
├── resources/views/
│   ├── layouts/app.blade.php   # 共通レイアウト（CSS変数、ダークモード、HC）
│   ├── home.blade.php          # ホーム（ふりがな付きゲーム開始フォーム）
│   ├── help.blade.php          # ヘルプ（操作ガイド・将棋ルール）
│   ├── game/show.blade.php     # 対局画面（盤面・駒台・モーダル・全JS）
│   └── ranking/                # ランキング表示
├── routes/web.php              # 全16エンドポイント
├── database/migrations/        # game_sessions, game_moves, board_states, rankings
├── tests/
│   ├── Feature/                # PHP ユニットテスト (Pest)
│   ├── accessibility/          # E2E アクセシビリティテスト (Puppeteer)
│   ├── e2e/                    # 全機能E2Eテスト (Puppeteer)
│   ├── customer-ai/            # お客様AIペルソナテスト (8ファイル)
│   └── expert-ai/              # 専門家AIペルソナテスト (2ファイル)
├── tests/customer-ai/          # お客様AIペルソナテスト (8ファイル)
├── tests/expert-ai/            # 専門家AIペルソナテスト (2ファイル)
└── docs/design/                # 設計ドキュメント（7文書）
```

## 設計ドキュメント

| ドキュメント | 内容 |
|---|---|
| [プロジェクト概要](docs/design/00_PROJECT_OVERVIEW.md) | ビジョン・コア機能・技術スタック・達成指標 |
| [システムアーキテクチャ](docs/design/01_SYSTEM_ARCHITECTURE.md) | 5層設計・ルーティング・Controller/Service構成 |
| [ユーザーフロー](docs/design/02_USER_FLOWS.md) | 9つの操作フロー・キーボードショートカット |
| [データベース設計](docs/design/03_DATABASE_DESIGN.md) | 4テーブル定義・JSONスキーマ・インデックス |
| [API仕様](docs/design/04_API_SPECIFICATION.md) | 全16エンドポイント・リクエスト/レスポンス例 |
| [ワイヤーフレーム](docs/design/05_WIREFRAMES.md) | 8画面のテキストワイヤーフレーム・色彩設計 |
| [アクセシビリティガイドライン](docs/design/06_ACCESSIBILITY_GUIDELINES.md) | WCAG 4原則実装ガイド・チェックリスト・テスト結果 |

## キーボードショートカット

| キー | 操作 |
|---|---|
| 矢印キー / WASD | 盤面移動 |
| Enter / Space | 駒選択・移動決定 |
| Escape | 選択解除・盤面復帰 |
| B | 盤面全体読み上げ |
| Shift+B | 盤面差分読み上げ |
| S | ゲームステータス読み上げ |
| I | 利き筋情報読み上げ |
| K | 棋譜モーダル |
| H | ヘルプモーダル |
| U | 待った |
| R | リセット |
| 1 | 先手駒台にフォーカス |
| 2 | 後手駒台にフォーカス |
| Shift+T / Shift+G | 先手/後手駒台にフォーカス（代替） |

## ライセンス

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
