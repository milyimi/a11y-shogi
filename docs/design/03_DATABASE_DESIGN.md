# データベース設計

## 1. テーブル一覧

- `game_sessions` - ゲームセッション情報
- `game_moves` - 指し手の履歴
- `board_states` - 局面の履歴（undo機能の復元に必須）
- `rankings` - ランキング情報（勝利記録）

## 2. テーブル定義

### game_sessions

```sql
CREATE TABLE game_sessions (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- ゲーム状態
  status ENUM('in_progress', 'mate', 'draw', 'resigned') DEFAULT 'in_progress',
  winner ENUM('human', 'ai', NULL) DEFAULT NULL,
  winner_type VARCHAR(50) COMMENT '勝利方法: checkmate, resignation, draw',
  
  -- ゲーム設定
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
  human_color ENUM('sente', 'gote') DEFAULT 'sente' COMMENT '人間が先手か後手か',
  
  -- 局面データ
  current_board_position LONGTEXT NOT NULL COMMENT '現在の盤面（JSON or Base64）',
  move_history JSON NOT NULL DEFAULT '[]' COMMENT '指し手履歴の配列',
  last_move_index INT DEFAULT 0 COMMENT '現在の手数',
  
  -- ゲーム情報
  total_moves INT DEFAULT 0,
  human_moves_count INT DEFAULT 0,
  ai_moves_count INT DEFAULT 0,
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  
  -- メタデータ
  elapsed_seconds INT DEFAULT 0 COMMENT '対局時間',
  browser_user_agent TEXT,
  ip_address VARCHAR(45),
  
  INDEX idx_session_id (session_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_difficulty (difficulty)
);
```

### game_moves

```sql
CREATE TABLE game_moves (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  game_session_id VARCHAR(36) NOT NULL,
  
  -- 指し手情報
  move_number INT NOT NULL COMMENT '手数（1, 2, 3...）',
  from_position VARCHAR(10) NOT NULL COMMENT '移動前 例: "7g"',
  to_position VARCHAR(10) NOT NULL COMMENT '移動先 例: "7f"',
  piece_type VARCHAR(20) NOT NULL COMMENT '駒種 例: "fu", "kin", "hisha"',
  piece_color ENUM('sente', 'gote') NOT NULL,
  
  -- 指し手の詳細
  is_capture BOOLEAN DEFAULT FALSE COMMENT '取った駒があるか',
  captured_piece_type VARCHAR(20) COMMENT '取った駒の種類',
  is_promotion BOOLEAN DEFAULT FALSE COMMENT '成ったか',
  is_check BOOLEAN DEFAULT FALSE COMMENT '王手をかけたか',
  
  -- エンジン情報
  move_by ENUM('human', 'ai') NOT NULL,
  ai_evaluation INT COMMENT 'AI評価値（セントス）',
  ai_depth INT COMMENT 'AI探索深さ',
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  move_time_ms INT COMMENT '指すのにかかった時間（ミリ秒）',
  
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  INDEX idx_game_session_id (game_session_id),
  INDEX idx_move_number (move_number),
  UNIQUE KEY uk_game_move_number (game_session_id, move_number)
);
```

### board_states（undo復元用・必須）

```sql
CREATE TABLE board_states (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  game_session_id VARCHAR(36) NOT NULL,
  move_number INT NOT NULL,
  
  -- 盤面データ
  board_position LONGTEXT NOT NULL COMMENT '盤面状態（JSON形式）',
  captured_pieces_sente JSON DEFAULT '[]' COMMENT '先手が取った駒',
  captured_pieces_gote JSON DEFAULT '[]' COMMENT '後手が取った駒',
  
  -- ゲーム状態
  is_check BOOLEAN DEFAULT FALSE,
  is_checkmate BOOLEAN DEFAULT FALSE,
  is_stalemate BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  INDEX idx_game_session_id (game_session_id),
  UNIQUE KEY uk_game_move (game_session_id, move_number)
);
```

### rankings

```sql
CREATE TABLE rankings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  game_session_id VARCHAR(36) NOT NULL,
  
  -- プレイヤー情報
  nickname VARCHAR(15) NOT NULL COMMENT 'ニックネーム（3～15文字）',
  
  -- ゲーム情報
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
  total_moves INT NOT NULL COMMENT '総手数',
  elapsed_seconds INT NOT NULL COMMENT '対局時間（秒）',
  
  -- スコア計算用
  score INT NOT NULL COMMENT 'スコア（手数と時間から算出）',
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  INDEX idx_difficulty (difficulty),
  INDEX idx_score (score DESC),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_difficulty_score (difficulty, score DESC)
);
```

## 3. JSONスキーマ例

### current_board_position (game_sessions)

```json
{
  "format": "shogi_standard",
  "version": "1.0",
  "board": {
    "9": {"9": null, "8": null, "7": {"type": "fu", "color": "sente"}, ...},
    "8": [...],
    ...
    "1": [...]
  },
  "hand": {
    "sente": {"fu": 1, "kin": 0, ...},
    "gote": {"fu": 2, "kin": 1, ...}
  },
  "turn": "sente",
  "last_move": {
    "from": "7g",
    "to": "7f",
    "piece": "fu",
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
```

### move_history (game_sessions)

```json
[
  {
    "moveNumber": 1,
    "sente": {
      "from": "7g",
      "to": "7f",
      "piece": "fu",
      "isPromotion": false,
      "isCapture": false,
      "timestamp": "2025-01-28T10:30:00Z"
    },
    "gote": {
      "from": "3c",
      "to": "3d",
      "piece": "fu",
      "isPromotion": false,
      "isCapture": false,
      "timestamp": "2025-01-28T10:30:05Z"
    }
  },
  ...
]
```

## 4. マイグレーション

```php
// database/migrations/XXXX_create_game_tables.php
Schema::create('game_sessions', function (Blueprint $table) {
    $table->id()->primary();
    // ... (上のSQL参照)
});

Schema::create('game_moves', function (Blueprint $table) {
    // ... (上のSQL参照)
});
```

## 5. データベースアクセスパターン

### ゲーム開始
```
1. GameSession レコード作成
   - 初期盤面を current_board_position に保存
   - session_id にセッションIDを保存
   
2. game_moves テーブルは空のまま
```

### 指し手追加
```
1. GameSession の move_history を更新
2. GameSession の total_moves をインクリメント
3. GameMove レコード追加（saveMoveRecord）
4. BoardState レコード追加（saveBoardState、undo復元用）
```

### 盤面取得
```
SELECT current_board_position, move_history 
FROM game_sessions 
WHERE id = ? AND session_id = ?
```

### ゲーム終了
```
UPDATE game_sessions
SET status = 'mate',
    winner = 'human',
    winner_type = 'checkmate',
    finished_at = NOW()
WHERE id = ?
```

## 6. インデックス戦略

| テーブル | カラム | 用途 |
|---------|--------|------|
| game_sessions | session_id | セッション復帰時の高速検索 |
| game_sessions | status | ゲーム一覧表示用 |
| game_sessions | created_at | ユーザーの対局履歴表示 |
| game_moves | game_session_id | 指し手履歴検索 |
| game_moves | move_number | 棋譜再生時の高速アクセス |
| board_states | game_session_id, move_number | 局面の復元 |

## 7. 将来的な最適化

- **キャッシング**: RedisでセッションID → GameSession マッピング
- **アーカイビング**: 古いゲームデータは圧縮アーカイブへ
- **分析DB**: analytics テーブルで統計データ保存
- **全文検索**: 棋譜検索が必要になった場合

## 8. データ保持ポリシー

- **セッションデータ**: セッションタイムアウト後7日間保持
- **ゲーム履歴**: 1年間保持（分析用）
- **古いレコード**: 自動削除バッチジョブで処理

## 9. AI 対局ログ（ファイルストレージ）

AIエンジン間の対局結果は、データベースではなくファイルストレージに JSON 形式で保存されます。

### 9.1 ストレージパス
```
storage/app/private/ai_matches/
├── match_YYYYMMDD_HHMMSS_XXXXX.json
└── match_YYYYMMDD_HHMMSS_XXXXX.json
```

### 9.2 JSON スキーマ

```json
{
  "winner": "PHP|External|Draw",
  "end_reason": "Checkmate|Repetition|MaxMoves",
  "moves": 123,
  "timestamp": "2024-01-01T12:34:56.000000Z",
  "config": {
    "php_depth": 4,
    "external_type": "usi",
    "external_depth": 3,
    "usi_movetime": null,
    "usi_path": "/usr/games/fairy-stockfish",
    "usi_variant": "shogi",
    "max_moves": 300,
    "php_noise": 0,
    "external_noise": 0,
    "sennichite_threshold": 4,
    "sennichite_min_moves": 24,
    "seed": 12345
  }
}
```

### 9.3 統計分析

`analyze_matches.py` スクリプトで統計分析を実行:

```bash
python analyze_matches.py storage/app/private/ai_matches/*.json
```

出力情報:
- 勝率 (PHP vs External)
- 平均手数
- 終局理由分布 (千日手 / 詰み / 最大手数)
- 設定別比較 (depth, noise, sennichite)
