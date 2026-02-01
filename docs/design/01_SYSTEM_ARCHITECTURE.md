# システムアーキテクチャ

## 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド（HTML/CSS/JS）                │
│  - 盤面表示 & 操作インターフェース                              │
│  - キーボード入力ハンドリング                                  │
│  - アクセシビリティ機能（ARIA、スクリーンリーダー対応）        │
└────────────────┬──────────────────────────────────────────────┘
                 │ HTTP/AJAX
┌────────────────▼──────────────────────────────────────────────┐
│                     Laravel バックエンド                       │
├─────────────────────────────────────────────────────────────┤
│ ▪ Game Controller     - ゲーム管理                            │
│ ▪ Move Controller     - 指し手処理                            │
│ ▪ AI Engine          - AI指し手生成                           │
│ ▪ Board Logic        - 盤面ロジック（将棋ルール実装）         │
│ ▪ Session Manager    - セッション管理                         │
└────────────────┬──────────────────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────────────┐
│                     データベース（SQLite）                      │
│  - sessions (セッション情報)                                  │
│  - games (ゲーム履歴)                                         │
│  - moves (指し手の記録)                                       │
│  - board_states (局面データ)                                  │
└─────────────────────────────────────────────────────────────┘
```

## レイヤー設計

### 1. プレゼンテーション層
```
Routes/web.php
  ├── GET  / → GameController@home
  ├── POST /game/start → GameController@start
  ├── GET  /game/{session} → GameController@show
  ├── POST /game/{session}/move → GameController@move
  ├── POST /game/{session}/promote → GameController@promote
  ├── POST /game/{session}/undo → GameController@undo
  ├── POST /game/{session}/resign → GameController@resign
  ├── POST /game/{session}/quit → GameController@quit
  ├── GET  /game/{session}/state → GameController@state
  ├── POST /game/{session}/reset → GameController@reset
  ├── GET  /session/status → GameController@sessionStatus
  ├── POST /session/extend → GameController@extendSession
  ├── GET  /ranking → RankingController@index
  ├── POST /ranking/register → RankingController@register
  └── GET  /help → GameController@help
```

### 2. アプリケーション層
```
app/Http/Controllers/
  ├── GameController
  │   ├── home()           - ホーム画面表示
  │   ├── start()          - 新規ゲーム開始
  │   ├── show()           - ゲーム画面表示
  │   ├── move()           - 指し手処理（移動/打ち）
  │   ├── promote()        - 成り確定
  │   ├── undo()           - 棋譜戻る
  │   ├── resign()         - 投了
  │   ├── quit()           - 一時停止
  │   ├── state()          - ゲーム状態取得（JSON）
  │   ├── reset()          - 対局リセット
  │   ├── sessionStatus()  - セッション状態取得
  │   └── extendSession()  - セッション延長
  │
  └── RankingController
      ├── index()          - ランキング一覧
      └── register()       - 勝利時の登録
```

### 3. ビジネスロジック層
```
app/Services/
  ├── GameService
  │   ├── createGame()           - ゲーム作成
  │   ├── getGameState()         - 現在の局面取得
  │   ├── validateMove()         - 指し手の合法性チェック
  │   ├── applyMove()            - 指し手を局面に適用
  │   └── checkGameEnd()         - ゲーム終了判定
  │
  ├── AIService
  │   ├── generateMove(difficulty)  - 指し手生成
  │   │   ├── easy: 高ランダム性 + ミス率
  │   │   ├── medium: 1手先読み + 詰み優先
  │   │   └── hard: 2手先ミニマックス + アルファベータ枝刈り
  │   ├── evaluateMove()           - 指し手評価
  │   ├── evaluatePosition()       - 盤面評価
  │   └── findMateInOne()          - 1手詰め探索
  │
  └── ShogiService
      ├── isValidMove()     - ルール検証
      ├── isLegalDrop()     - 打ちの合法性
      ├── canPromote()      - 成り可能判定
      └── isCheckmate()     - チェックメイト判定
```

### 4. データアクセス層
```
app/Models/
  ├── GameSession
  ├── GameMove
  └── BoardState
```

### 5. データベース層
```
SQLite Database
  ├── game_sessions
  ├── game_moves
  └── board_states
```

## セッション管理フロー

```
ユーザーアクセス
    ↓
[Laravel Session] (Cookie: XSRF-TOKEN, laravel_session)
    ↓
SessionMiddleware が既存セッション復元
    ↓
GameService が game_sessions テーブルから局面復元
    ↓
JSON API で現在の局面をフロントエンドに返却
```

## ゲーム状態管理

```json
{
  "sessionId": "abc123def456",
  "gameStatus": "in_progress|mate|draw|resigned",
  "currentPlayer": "human|ai",
  "boardState": "base64_encoded_or_json",
  "moveHistory": [...],
  "difficulty": "easy|medium|hard",
  "timeElapsed": 1234,
  "lastMove": {
    "from": "7g",
    "to": "7f",
    "piece": "fu",
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
```

## API応答フォーマット

### 成功時
```json
{
  "success": true,
  "data": {
    "gameState": {...},
    "legalMoves": ["7f", "8h", ...],
    "nextPlayer": "ai"
  }
}
```

### エラー時
```json
{
  "success": false,
  "error": "invalid_move|game_ended|unauthorized",
  "message": "指し手が不正です"
}
```

## スケーラビリティ考慮

- セッションはLaravel標準のセッション管理を使用
- ゲーム数が増加する場合、データベースをPostgreSQLに移行可能
- AIエンジンは将来的にPythonマイクロサービスに分離可能
