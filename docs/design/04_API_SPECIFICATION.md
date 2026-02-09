# API仕様書

## 基本情報

- **ベースURL**: `/`（Web ルート）
- **フォーマット**: HTML / JSON（AJAX）
- **認証**: セッションベース（Laravel Session）
- **エラーハンドリ**: 標準的な HTTP ステータスコード + JSONエラーレスポンス

## エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| GET | `/` | ホーム画面 |
| POST | `/game/start` | 新規ゲーム開始 |
| GET | `/game/{sessionId}` | ゲーム画面表示 |
| POST | `/game/{sessionId}/move` | 指し手送信 |
| POST | `/game/{sessionId}/promote` | 成り確定 |
| POST | `/game/{sessionId}/undo` | 棋譜1手戻す |
| POST | `/game/{sessionId}/resign` | 投了 |
| POST | `/game/{sessionId}/quit` | 一時停止 |
| GET | `/game/{sessionId}/state` | ゲーム状態取得（JSON） |
| POST | `/game/{sessionId}/reset` | 対局リセット |
| POST | `/ranking/register` | ランキング登録 |
| GET | `/ranking` | ランキング一覧表示 |
| GET | `/ranking/{difficulty}` | 難易度別ランキング |
| GET | `/session/status` | セッション状態確認 |
| POST | `/session/extend` | セッション延長 |
| GET | `/help` | ヘルプページ |

---

## 詳細仕様

### 1. GET `/` - ホーム画面

**説明**: ホーム画面を表示

**レスポンス (200 OK)**
```
HTML ページ
- "新しい対局を始める" ボタン
- "過去の対局を再開" ボタン（セッション有の場合）
- "使い方" リンク
```

**アクセシビリティ**
- `<h1>`: "a11y-shogi へようこそ"
- `<button role="button">`: 各アクション
- `aria-label`: 全ての機能に説明文
- `aria-live="polite"`: 重要な通知

---

### 2. POST `/game/start` - 新規ゲーム開始

**説明**: 新しいゲームセッションを作成、難易度選択画面を表示

**リクエストボディ (application/x-www-form-urlencoded)**
```
(なし - 初回はGET画面から直接POST、またはAJAXで難易度指定)
```

または難易度を直接指定する場合:
```
difficulty=medium&color=sente
```

**パラメータ**
| 名前 | 型 | 説明 | 必須 |
|------|-----|------|------|
| difficulty | string | "easy" \| "medium" \| "hard" | ○ |
| color | string | "sente" (先手) \| "gote" (後手) | △ デフォルト: sente |

**レスポンス (201 Created) - HTML**
```html
<div id="game-board">
  <h1>対局画面 - 初級 vs AI</h1>
  <!-- 盤面 -->
  <div role="board" aria-label="将棋盤">
    <!-- 9x9グリッド -->
  </div>
  
  <!-- ステータス -->
  <div role="status" aria-live="polite" aria-atomic="true">
    先手（あなた）の番です
  </div>
  
  <!-- コントロール -->
  <button type="button" id="undo-btn">棋譜を戻す</button>
  <button type="button" id="resign-btn">投了</button>
</div>

<script>
  const gameData = {
    sessionId: "abc123",
    difficulty: "easy",
    status: "in_progress",
    currentPlayer: "human",
    boardState: {...},
    legalMoves: ["7f", "8h", ...]
  };
</script>
```

**レスポンス (200 OK) - JSON (AJAX)** 
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123def456",
    "difficulty": "easy",
    "status": "in_progress",
    "currentPlayer": "human",
    "humanColor": "sente",
    "boardState": {
      "board": {...},
      "hand": {...},
      "turn": "sente"
    },
    "legalMoves": ["7f", "8h", "6h", "2h"]
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "invalid_difficulty",
  "message": "難易度が不正です。easy, medium, hard から選択してください。"
}
```

---

### 3. GET `/game/{sessionId}` - ゲーム画面表示

**説明**: 既存のゲームセッション画面を表示

**パラメータ**
| 名前 | 型 | 説明 |
|------|-----|------|
| sessionId | string (URL) | ゲームセッションID |

**レスポンス (200 OK)**
```html
<!-- /game/start と同じHTML構造 -->
```

**エラーレスポンス (404 Not Found)**
```json
{
  "success": false,
  "error": "session_not_found",
  "message": "セッションが見つかりません。新しい対局を開始してください。"
}
```

---

### 4. POST `/game/{sessionId}/move` - 指し手送信

**説明**: ユーザーの指し手を受け取り、盤面を更新し、AI応答を返す

**リクエストボディ (application/json)**
```json
{
  "from": "7g",
  "to": "7f"
}
```

または座標形式:
```json
{
  "move": "7g-7f"
}
```

**パラメータ**
| 名前 | 型 | 説明 | 必須 |
|------|-----|------|------|
| from | string | 移動元座標 "7g" | ○ (moveない場合) |
| to | string | 移動先座標 "7f" | ○ (moveない場合) |
| move | string | "7g-7f" 形式 | ○ (from/toない場合) |
| promote | boolean | 成る場合true | △ |

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "humanMove": {
      "from": "7g",
      "to": "7f",
      "piece": "fu",
      "isCapture": false,
      "isPromotion": false,
      "isCheck": false
    },
    "boardState": {
      "board": {...},
      "hand": {...},
      "turn": "gote"
    },
    "moveHistory": ["先手: 7の4に歩"],
    "legalMoves": ["3d", "3e", "2d", ...],
    "status": "in_progress",
    "currentPlayer": "ai"
  }
}
```

AI応答がある場合:
```json
{
  "success": true,
  "data": {
    "humanMove": {...},
    "aiMove": {
      "from": "3c",
      "to": "3d",
      "piece": "fu",
      "isCapture": false,
      "isCheck": false
    },
    "boardState": {...},
    "status": "in_progress",
    "currentPlayer": "human",
    "legalMoves": [...]
  }
}
```

ゲーム終了時:
```json
{
  "success": true,
  "data": {
    "humanMove": {...},
    "aiMove": {...},
    "boardState": {...},
    "status": "mate",
    "winner": "human",
    "winnerType": "checkmate",
    "message": "チェックメイト。あなたの勝ちです！",
    "moveHistory": [...]
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "invalid_move",
  "message": "その指し手は不正です。その位置には駒がありません。",
  "details": {
    "reason": "no_piece_at_source",
    "from": "7g"
  }
}
```

その他のエラー:
```json
{
  "error": "not_your_turn"
  // or
  "error": "game_already_ended"
  // or
  "error": "session_expired"
}
```

---

### 5. POST `/game/{sessionId}/undo` - 棋譜を戻す

**説明**: 最後の1手を戻す（自分の手のみ）

**リクエストボディ**
```json
{}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "boardState": {...},
    "lastMove": null,
    "currentPlayer": "human",
    "status": "in_progress",
    "legalMoves": [...]
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "cannot_undo",
  "message": "棋譜を戻せません。AI計算中または最初の局面です。"
}
```

---

### 6. POST `/game/{sessionId}/resign` - 投了

**説明**: ユーザーが投了する

**リクエストボディ**
```json
{}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "status": "resigned",
    "winner": "ai",
    "message": "投了しました。AIの勝ちです。",
    "moveHistory": [...]
  }
}
```

---

### 7. GET `/game/{sessionId}/state` - ゲーム状態取得

**説明**: 現在のゲーム状態をJSON形式で取得（ページリロード時など）

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "status": "in_progress",
    "difficulty": "medium",
    "currentPlayer": "human",
    "boardState": {
      "board": {...},
      "hand": {...},
      "turn": "sente"
    },
    "legalMoves": ["7f", "8h", ...],
    "lastMove": {
      "from": "3c",
      "to": "3d",
      "piece": "fu",
      "player": "ai"
    },
    "moveCount": 5,
    "elapsedSeconds": 120
  }
}
```

---

### 8. GET `/session/status` - セッション状態確認

**説明**: セッションの残り時間を取得（タイムアウト警告用）

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "expiresAt": "2026-01-31T14:30:00Z",
    "remainingMinutes": 15,
    "warningThreshold": 5,
    "shouldWarn": false
  }
}
```

**警告が必要な場合 (200 OK)**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "expiresAt": "2026-01-31T14:25:00Z",
    "remainingMinutes": 3,
    "warningThreshold": 5,
    "shouldWarn": true,
    "message": "セッションがあと3分で期限切れになります。延長しますか？"
  }
}
```

---

### 9. POST `/session/extend` - セッション延長

**説明**: セッションタイムアウトを120分延長（WCAG 2.2.1 対応）

**リクエストボディ**
```json
{}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "expiresAt": "2026-01-31T16:25:00Z",
    "extendedMinutes": 120,
    "message": "セッションを延長しました。"
  }
}
```

**エラーレスポンス (410 Gone)**
```json
{
  "success": false,
  "error": "session_expired",
  "message": "セッションが既に期限切れです。新しい対局を始めてください。"
}
```

---

### 10. GET `/help` - ヘルプページ

**説明**: キーボード操作方法とアクセシビリティ情報を表示

**レスポンス (200 OK)**
```html
<article id="help">
  <h1>使い方</h1>
  
  <section>
    <h2>キーボード操作</h2>
    <table role="table">
      <thead>
        <tr>
          <th>キー</th>
          <th>説明</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>↑↓←→</td>
          <td>盤上のカーソル移動</td>
        </tr>
        <tr>
          <td>Enter</td>
          <td>駒選択／移動</td>
        </tr>
        <!-- ... -->
      </tbody>
    </table>
  </section>
  
  <!-- ... -->
</article>
```

---

### 9. POST `/ranking/register` - ランキング登録

**説明**: 勝利したゲームをランキングに登録

**リクエストボディ (application/json)**
```json
{
  "sessionId": "abc123def456",
  "nickname": "将棋マスター"
}
```

**パラメータ**
| 名前 | 型 | 説明 | 必須 |
|------|-----|------|------|
| sessionId | string | ゲームセッションID | ○ |
| nickname | string | ニックネーム（3〜15文字） | ○ |

**レスポンス (201 Created)**
```json
{
  "success": true,
  "data": {
    "rankingId": 123,
    "nickname": "将棋マスター",
    "difficulty": "medium",
    "totalMoves": 42,
    "elapsedSeconds": 932,
    "score": 8500,
    "rank": 5,
    "message": "ランキングに登録されました！現在5位です。"
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "invalid_nickname",
  "message": "ニックネームは3〜15文字で入力してください。"
}
```

その他のエラー:
```json
{
  "error": "game_not_won"
  // ゲームに勝利していない
  
  "error": "already_registered"
  // このゲームは既に登録済み
  
  "error": "session_not_found"
  // セッションが見つからない
}
```

---

### 10. GET `/ranking` - ランキング一覧表示

**説明**: 全難易度のランキングを表示

**クエリパラメータ**
| 名前 | 型 | 説明 | デフォルト |
|------|-----|------|----------|
| limit | int | 表示件数 | 50 |

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "easy": [
      {
        "rank": 1,
        "nickname": "初心者A",
        "totalMoves": 30,
        "elapsedSeconds": 600,
        "score": 9200,
        "createdAt": "2026-01-28T10:30:00Z"
      },
      ...
    ],
    "medium": [...],
    "hard": [...]
  }
}
```

---

### 12. GET `/ranking/{difficulty}` - 難易度別ランキング

**説明**: 特定の難易度のランキングを表示

**パラメータ**
| 名前 | 型 | 説明 |
|------|-----|------|
| difficulty | string (URL) | "easy" \| "medium" \| "hard" |

**クエリパラメータ**
| 名前 | 型 | 説明 | デフォルト |
|------|-----|------|----------|
| limit | int | 表示件数（推奨: 20件） | 20 |
| offset | int | オフセット | 0 |
| myRank | boolean | 自分の順位を含める | false |

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "difficulty": "medium",
    "rankings": [
      {
        "rank": 1,
        "nickname": "将棋マスター",
        "totalMoves": 42,
        "elapsedSeconds": 932,
        "score": 8500,
        "createdAt": "2026-01-28T10:30:00Z",
        "isCurrentUser": false
      },
      {
        "rank": 2,
        "nickname": "AI撃破者",
        "totalMoves": 45,
        "elapsedSeconds": 1020,
        "score": 8200,
        "createdAt": "2026-01-27T15:20:00Z",
        "isCurrentUser": false
      },
      ...
    ],
    "total": 523,
    "limit": 20,
    "offset": 0,
    "currentPage": 1,
    "totalPages": 27,
    "myRanking": {
      "rank": 45,
      "nickname": "駒の達人",
      "totalMoves": 52,
      "elapsedSeconds": 1245,
      "score": 7800,
      "page": 3
    }
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "invalid_difficulty",
  "message": "難易度が不正です。easy, medium, hard から選択してください。"
}
```

---

## エラーコード一覧

| エラーコード | HTTP ステータス | 説明 |
|------------|---|---|
| invalid_move | 400 | 指し手が不正（ルール違反） |
| not_your_turn | 400 | 自分のターンではない |
| game_already_ended | 400 | ゲームが終了している |
| session_not_found | 404 | セッションが見つからない |
| session_expired | 410 | セッションが期限切れ |
| csrf_token_mismatch | 419 | CSRFトークン期限切れ（フロントで専用ダイアログ表示） |
| session_extension_failed | 400 | セッション延長失敗 |
| cannot_undo | 400 | 棋譜を戻せない状態 |
| invalid_difficulty | 400 | 難易度が不正 |
| invalid_nickname | 400 | ニックネームが不正（長さ制限など） |
| game_not_won | 400 | ゲームに勝利していない |
| already_registered | 409 | このゲームは既にランキング登録済み |
| server_error | 500 | サーバーエラー |

---

## HTTP ステータスコード

| ステータス | 説明 |
|-----------|------|
| 200 OK | リクエスト成功 |
| 201 Created | リソース作成成功 |
| 400 Bad Request | クライアントエラー（パラメータ不正など） |
| 404 Not Found | リソースが見つからない |
| 410 Gone | セッション期限切れ |
| 419 | CSRFトークン期限切れ（セッションタイムアウト） |
| 500 Internal Server Error | サーバーエラー |

---

## レート制限

特に設定なし（セッションベースのため）

---

## セキュリティ

- CSRF保護: `@csrf` ディレクティブで自動実装
- CSRF期限切れ対応: 419レスポンス検出時に`role="alertdialog"`で日本語ダイアログを表示、ページ再読み込みを促す
- セッション: Laravel 標準セッション管理（有効期限: 120分）
- 入力検証: バックエンド側で座標・難易度の検証
- SQLインジェクション対策: Eloquent ORM + バインドパラメータ
