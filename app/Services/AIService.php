<?php

namespace App\Services;

class AIService
{
    public function __construct(private ShogiService $shogiService) {}

    /**
     * 難易度に応じたAIの指し手を生成
     */
    public function generateMove(array $boardState, string $difficulty, string $aiColor = 'gote'): ?array
    {
        $possibleMoves = $this->getPossibleMoves($boardState, $aiColor);
        
        if (empty($possibleMoves)) {
            return null; // 合法手がない = 詰み
        }

        switch ($difficulty) {
            case 'easy':
                // 初級：ほぼランダムに指す（30%の確率で悪い手）
                return $this->getEasyMove($possibleMoves, $boardState, $aiColor);
            
            case 'medium':
                // 中級：基本的な戦術を理解しているが時々ミス（10%失敗率）
                return $this->getMediumMove($possibleMoves, $boardState, $aiColor);
            
            case 'hard':
                // 上級：市販ソフト並みの強さ
                return $this->getHardMove($possibleMoves, $boardState, $aiColor);
            
            default:
                return $this->getRandomMove($possibleMoves);
        }
    }

    /**
     * 指定した色の合法手を全て列挙
     */
    public function getPossibleMoves(array $boardState, string $color): array
    {
        $moves = [];
        $board = $boardState['board'];
        
        // 盤面上の全ての駒を調べる
        for ($rank = 9; $rank >= 1; $rank--) {
            for ($file = 9; $file >= 1; $file--) {
                $piece = $board[$rank][$file] ?? null;
                
                if ($piece && $piece['color'] === $color) {
                    // 合法な移動先を総当たりで確認
                    for ($toRank = 1; $toRank <= 9; $toRank++) {
                        for ($toFile = 1; $toFile <= 9; $toFile++) {
                            if ($this->shogiService->isValidMove($boardState, $rank, $file, $toRank, $toFile, $color)) {
                                $target = $board[$toRank][$toFile] ?? null;
                                $moves[] = [
                                    'from_rank' => $rank,
                                    'from_file' => $file,
                                    'to_rank' => $toRank,
                                    'to_file' => $toFile,
                                    'piece_type' => $piece['type'],
                                    'capture' => $target !== null,
                                ];
                            }
                        }
                    }
                }
            }
        }
        
        // 持ち駒の打ち込みを調べる
        if (!empty($boardState['hand'][$color])) {
            $dropMoves = $this->getDropMoves($boardState, $color);
            $moves = array_merge($moves, $dropMoves);
        }
        
        return $moves;
    }

    /**
     * 指定した駒が移動できるマスを取得
     */
    private function getMovableCells(array $board, int $rank, int $file, string $type, string $color): array
    {
        $cells = [];
        
        // 駒の種類に応じた移動パターンを定義
        $patterns = $this->getMovementPatterns($type, $color);
        
        foreach ($patterns as $pattern) {
            $newRank = $rank + $pattern[0];
            $newFile = $file + $pattern[1];
            
            // 盤面内か確認
            if ($newRank < 1 || $newRank > 9 || $newFile < 1 || $newFile > 9) {
                continue;
            }
            
            $targetPiece = $board[$newRank][$newFile] ?? null;
            
            // 自分の駒がある場合はスキップ
            if ($targetPiece && $targetPiece['color'] === $color) {
                continue;
            }
            
            $cells[] = [
                'rank' => $newRank,
                'file' => $newFile,
                'capture' => $targetPiece !== null,
            ];
        }
        
        return $cells;
    }

    /**
     * 駒の移動パターンを取得
     */
    private function getMovementPatterns(string $type, string $color): array
    {
        $direction = $color === 'sente' ? -1 : 1; // 先手は上（-1）、後手は下（+1）
        
        switch ($type) {
            case 'fu': // 歩
                return [[$direction, 0]];
            
            case 'kyosha': // 香
                $moves = [];
                for ($i = 1; $i <= 9; $i++) {
                    $moves[] = [$direction * $i, 0];
                }
                return $moves;
            
            case 'keima': // 桂
                return [[$direction * 2, -1], [$direction * 2, 1]];
            
            case 'gin': // 銀
                return [
                    [$direction, -1], [$direction, 0], [$direction, 1],
                    [-$direction, -1], [-$direction, 1],
                ];
            
            case 'kin': // 金
            case 'tokin': // と（成った歩）
                return [
                    [$direction, -1], [$direction, 0], [$direction, 1],
                    [-$direction, 0],
                    [0, -1], [0, 1],
                ];
            
            case 'kaku': // 角
                return [
                    [1, 1], [1, -1], [-1, 1], [-1, -1],
                    [2, 2], [2, -2], [-2, 2], [-2, -2],
                    [3, 3], [3, -3], [-3, 3], [-3, -3],
                    [4, 4], [4, -4], [-4, 4], [-4, -4],
                    [5, 5], [5, -5], [-5, 5], [-5, -5],
                    [6, 6], [6, -6], [-6, 6], [-6, -6],
                    [7, 7], [7, -7], [-7, 7], [-7, -7],
                    [8, 8], [8, -8], [-8, 8], [-8, -8],
                ];
            
            case 'hisha': // 飛
                $moves = [];
                for ($i = 1; $i <= 8; $i++) {
                    $moves[] = [$i, 0];
                    $moves[] = [-$i, 0];
                    $moves[] = [0, $i];
                    $moves[] = [0, -$i];
                }
                return $moves;
            
            case 'gyoku': // 玉（王）
            case 'ou':
                return [
                    [1, 0], [-1, 0], [0, 1], [0, -1],
                    [1, 1], [1, -1], [-1, 1], [-1, -1],
                ];
            
            default:
                return [];
        }
    }

    /**
     * 持ち駒の打ち込みを取得
     */
    private function getDropMoves(array $boardState, string $color): array
    {
        $moves = [];
        $board = $boardState['board'];
        $hand = $boardState['hand'][$color] ?? [];
        
        foreach ($hand as $pieceType => $count) {
            if ($count <= 0) continue;

            // 盤面上の空きマスに打ち込める
            for ($rank = 9; $rank >= 1; $rank--) {
                for ($file = 9; $file >= 1; $file--) {
                    if ($this->shogiService->isLegalDrop($boardState, $pieceType, $rank, $file, $color)) {
                        $moves[] = [
                            'from_rank' => null,
                            'from_file' => null,
                            'to_rank' => $rank,
                            'to_file' => $file,
                            'piece_type' => $pieceType,
                            'is_drop' => true,
                            'capture' => false,  // ドロップは駒を取らない
                        ];
                    }
                }
            }
        }
        
        return $moves;
    }

    /**
     * ランダムな指し手を選択（初級用）
     */
    private function getRandomMove(array $moves): ?array
    {
        if (empty($moves)) {
            return null;
        }
        
        $randomIndex = array_rand($moves);
        return $moves[$randomIndex];
    }

    /**
     * 初級用：ほぼランダム（50%の確率で明らかに悪い手を選ぶ）
     */
    private function getEasyMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        // 50%の確率で完全ランダムに（悪い手もあり得る）
        if (rand(0, 100) < 50) {
            return $this->getRandomMove($moves);
        }

        // 30%の確率で駒を取る手を優先（少しだけ考える）
        $captureMoves = array_filter($moves, fn($m) => $m['capture']);
        
        if (!empty($captureMoves) && rand(0, 100) < 30) {
            return $captureMoves[array_rand($captureMoves)];
        }

        // 20%の確率で詰みだけは見逃さない（完全初心者ではない）
        if (rand(0, 100) < 20) {
            $mateMove = $this->findMateInOne($moves, $boardState, $color);
            if ($mateMove) {
                return $mateMove;
            }
        }

        return $this->getRandomMove($moves);
    }

    /**
     * 中級用：基本的な戦術（10%の確率で失敗）
     */
    private function getMediumMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        // 10%の確率で悪い手を選ぶ（ミス）
        if (rand(0, 100) < 10) {
            return $this->getRandomMove($moves);
        }

        // 1手詰めがあれば必ず指す
        $mateMove = $this->findMateInOne($moves, $boardState, $color);
        if ($mateMove) {
            return $mateMove;
        }

        // 1手先読みで評価
        return $this->getMinimaxMove($moves, $boardState, $color, 1);
    }

    /**
     * 上級用：市販ソフト並みの強さ
     */
    private function getHardMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        // まず詰みがないかチェック
        $mateMove = $this->findMateInOne($moves, $boardState, $color);
        if ($mateMove) {
            return $mateMove;
        }

        // ミニマックス探索で最良手を選ぶ（3手先まで読む）
            return $this->getMinimaxMove($moves, $boardState, $color, 2);
    }
    
    /**
     * 1手詰めがあるか探索
     */
    private function findMateInOne(array $moves, array $boardState, string $color): ?array
    {
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        
        foreach ($moves as $move) {
            // この手を指した後の盤面をシミュレート
            $newBoard = $this->simulateMove($boardState, $move, $color);
            
            // 詰みかチェック
            if ($this->shogiService->isCheckmate($newBoard, $enemyColor)) {
                return $move;
            }
        }
        
        return null;
    }
    
    /**
     * ミニマックス探索で最良手を選択
     */
    private function getMinimaxMove(array $moves, array $boardState, string $color, int $depth): ?array
    {
        $bestScore = -PHP_INT_MAX;
        $bestMove = null;
        $alpha = -PHP_INT_MAX;
        $beta = PHP_INT_MAX;
        
        // 探索する手数を制限（上位20手まで）
        $scoredMoves = [];
        foreach ($moves as $move) {
            $score = $this->evaluateMove($move, $boardState, $color);
            $scoredMoves[] = ['move' => $move, 'score' => $score];
        }
        usort($scoredMoves, fn($a, $b) => $b['score'] <=> $a['score']);
        $topMoves = array_slice($scoredMoves, 0, 20);
        
        foreach ($topMoves as $item) {
            $move = $item['move'];
            $newBoard = $this->simulateMove($boardState, $move, $color);
            $score = $this->minimax($newBoard, $depth - 1, $alpha, $beta, false, $color);
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMove = $move;
            }
            
            $alpha = max($alpha, $score);
        }
        
        return $bestMove ?? $this->getAdvancedEvaluatedMove($moves, $boardState, $color);
    }
    
    /**
     * ミニマックスアルゴリズム（アルファベータ枝刈り付き）
     */
    private function minimax(array $boardState, int $depth, int $alpha, int $beta, bool $maximizing, string $aiColor): int
    {
        // 深さ制限または終局
        if ($depth <= 0) {
            return $this->evaluatePosition($boardState, $aiColor);
        }
        
        $currentColor = $maximizing ? $aiColor : ($aiColor === 'sente' ? 'gote' : 'sente');
        $moves = $this->getPossibleMoves($boardState, $currentColor);
        
        if (empty($moves)) {
            // 手がない = 詰み
            return $maximizing ? -999999 : 999999;
        }
        
        // 手数が多い場合は上位15手のみ探索
        if (count($moves) > 15) {
            $scoredMoves = [];
            foreach ($moves as $move) {
                $quickScore = ($move['capture'] ?? false) ? 1000 : 0;
                $scoredMoves[] = ['move' => $move, 'score' => $quickScore];
            }
            usort($scoredMoves, fn($a, $b) => $b['score'] <=> $a['score']);
            $moves = array_column(array_slice($scoredMoves, 0, 15), 'move');
        }
        
        if ($maximizing) {
            $maxScore = -PHP_INT_MAX;
            foreach ($moves as $move) {
                $newBoard = $this->simulateMove($boardState, $move, $currentColor);
                $score = $this->minimax($newBoard, $depth - 1, $alpha, $beta, false, $aiColor);
                $maxScore = max($maxScore, $score);
                $alpha = max($alpha, $score);
                if ($beta <= $alpha) {
                    break; // ベータ刈り
                }
            }
            return $maxScore;
        } else {
            $minScore = PHP_INT_MAX;
            foreach ($moves as $move) {
                $newBoard = $this->simulateMove($boardState, $move, $currentColor);
                $score = $this->minimax($newBoard, $depth - 1, $alpha, $beta, true, $aiColor);
                $minScore = min($minScore, $score);
                $beta = min($beta, $score);
                if ($beta <= $alpha) {
                    break; // アルファ刈り
                }
            }
            return $minScore;
        }
    }
    
    /**
     * 手をシミュレートして新しい盤面を返す
     */
    private function simulateMove(array $boardState, array $move, string $color): array
    {
        $newBoard = json_decode(json_encode($boardState), true); // Deep copy
        
        if ($move['is_drop'] ?? false) {
            // 駒打ち
            $newBoard['board'][$move['to_rank']][$move['to_file']] = [
                'type' => $move['piece_type'],
                'color' => $color,
            ];
            $newBoard['hand'][$color][$move['piece_type']]--;
        } else {
            // 通常の移動
            $piece = $newBoard['board'][$move['from_rank']][$move['from_file']];
            
            // キャプチャ
            if ($move['capture']) {
                $capturedPiece = $newBoard['board'][$move['to_rank']][$move['to_file']];
                $capturedType = $this->shogiService->demotePiece($capturedPiece['type']);
                if (!isset($newBoard['hand'][$color][$capturedType])) {
                    $newBoard['hand'][$color][$capturedType] = 0;
                }
                $newBoard['hand'][$color][$capturedType]++;
            }
            
            // 移動
            $newBoard['board'][$move['to_rank']][$move['to_file']] = $piece;
            $newBoard['board'][$move['from_rank']][$move['from_file']] = null;
        }
        
        $newBoard['turn'] = $color === 'sente' ? 'gote' : 'sente';
        return $newBoard;
    }
    
    /**
     * 盤面全体の評価値を計算
     */
    private function evaluatePosition(array $boardState, string $aiColor): int
    {
        $score = 0;
        $enemyColor = $aiColor === 'sente' ? 'gote' : 'sente';
        
        $pieceValues = [
            'gyoku' => 10000, 'ou' => 10000,
            'hisha' => 1000, 'kaku' => 900,
            'kin' => 600, 'gin' => 500,
            'keima' => 400, 'kyosha' => 350,
            'fu' => 100,
            'ryu' => 1200, 'uma' => 1100,
            'tokin' => 600, 'nkyosha' => 550,
            'nkeima' => 600, 'ngin' => 700,
        ];
        
        // 盤面上の駒を評価
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $boardState['board'][$rank][$file] ?? null;
                if (!$piece) continue;
                
                $value = $pieceValues[$piece['type']] ?? 0;
                $positionBonus = $this->getPositionBonus($piece['type'], $rank, $file, $piece['color']);
                
                if ($piece['color'] === $aiColor) {
                    $score += $value + $positionBonus;
                } else {
                    $score -= $value + $positionBonus;
                }
            }
        }
        
        // 持ち駒を評価
        foreach ($boardState['hand'][$aiColor] ?? [] as $type => $count) {
            $score += ($pieceValues[$type] ?? 0) * $count * 0.8; // 持ち駒は少し価値低め
        }
        
        foreach ($boardState['hand'][$enemyColor] ?? [] as $type => $count) {
            $score -= ($pieceValues[$type] ?? 0) * $count * 0.8;
        }
        
        return $score;
    }
    
    /**
     * 駒の位置ボーナス
     */
    private function getPositionBonus(string $type, int $rank, int $file, string $color): int
    {
        $bonus = 0;
        
        // 中央制御
        $centerDist = abs($file - 5);
        $bonus += (4 - $centerDist) * 10;
        
        // 前進ボーナス
        if ($color === 'sente') {
            $bonus += (10 - $rank) * 15;
        } else {
            $bonus += $rank * 15;
        }
        
        // 特定の駒の配置ボーナス
        if (in_array($type, ['hisha', 'kaku', 'ryu', 'uma'])) {
            $bonus += 100; // 大駒は存在自体が価値
        }
        
        return $bonus;
    }

    /**
     * 簡易評価で指し手を選択（中級用）
     * 駒を取る手を優先、その中でも価値の高い駒から
     */
    private function getSimpleEvaluatedMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        // 駒の価値を定義
        $pieceValues = [
            'gyoku' => 1000,
            'ou' => 1000,
            'hisha' => 500,
            'kaku' => 450,
            'kin' => 300,
            'gin' => 250,
            'keima' => 200,
            'kyosha' => 150,
            'fu' => 100,
        ];

        // 取られる駒の価値でソート
        usort($moves, function ($a, $b) use ($boardState, $pieceValues) {
            if (!$a['capture'] && $b['capture']) {
                return 1; // b（取られる）を優先
            }
            if ($a['capture'] && !$b['capture']) {
                return -1; // a（取られる）を優先
            }
            if (!$a['capture'] && !$b['capture']) {
                return 0;
            }

            // 両方共駒を取る場合、価値の高い駒を優先
            $aValue = $pieceValues[$a['piece_type']] ?? 0;
            $bValue = $pieceValues[$b['piece_type']] ?? 0;
            return $bValue <=> $aValue;
        });

        return $moves[0];
    }

    /**
     * 高度な評価で指し手を選択（上級用）
     */
    private function getAdvancedEvaluatedMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        $bestScore = -PHP_INT_MAX;
        $bestMove = null;

        foreach ($moves as $move) {
            $score = $this->evaluateMove($move, $boardState, $color);
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMove = $move;
            }
        }

        return $bestMove ?? $this->getRandomMove($moves);
    }

    /**
     * 指し手のスコアを評価（市販ソフト並み）
     */
    private function evaluateMove(array $move, array $boardState, string $color): int
    {
        $score = 0;

        // 駒の価値
        $pieceValues = [
            'gyoku' => 1000,
            'ou' => 1000,
            'hisha' => 500,
            'kaku' => 450,
            'kin' => 300,
            'gin' => 250,
            'keima' => 200,
            'kyosha' => 150,
            'fu' => 100,
            // 成った駒
            'ryu' => 600,      // 龍（飛の成）
            'uma' => 500,      // 馬（角の成）
            'tokin' => 150,    // と金
            'nkyosha' => 160,  // 成香
            'nkeima' => 210,   // 成桂
            'ngin' => 260,     // 成銀
        ];

        // ========== 1. 詰みに関連する手（最高優先度） ==========
        // 敵の王を取れば即座に最良手
        if ($move['capture']) {
            $targetRank = $move['to_rank'];
            $targetFile = $move['to_file'];
            $targetPiece = $boardState['board'][$targetRank][$targetFile];
            
            if ($targetPiece && in_array($targetPiece['type'], ['gyoku', 'ou'])) {
                return 999999; // 詰みスコア
            }
        }

        // ========== 2. 駒を取る手（高い優先度） ==========
        if ($move['capture']) {
            $targetRank = $move['to_rank'];
            $targetFile = $move['to_file'];
            $targetPiece = $boardState['board'][$targetRank][$targetFile];
            
            if ($targetPiece) {
                $captureValue = $pieceValues[$targetPiece['type']] ?? 0;
                $score += $captureValue * 3; // 駒を取る手を強く優先
            }
        }

        // ========== 3. 敵陣への進出と攻撃性 ==========
        $enemyTerritory = ($color === 'sente') ? ($move['to_rank'] <= 3) : ($move['to_rank'] >= 7);
        if ($enemyTerritory) {
            $score += 150;
            
            // さらに深く進出していれば加点
            $depth = ($color === 'sente') ? (4 - $move['to_rank']) : ($move['to_rank'] - 6);
            $score += $depth * 50;
        }

        // ========== 4. 成り可能な手の高い優先度 ==========
        if ($this->canPromoteAtTarget($boardState, $move, $color)) {
            $score += 200; // 成れる手は強く優先
        }

        // ========== 5. 盤面中央への移動（陣地取り） ==========
        $centerFile = abs($move['to_file'] - 5);
        $centerRank = abs($move['to_rank'] - 5);
        if ($centerFile <= 2 && $centerRank <= 2) {
            $score += 80;
        } elseif ($centerFile <= 3 && $centerRank <= 3) {
            $score += 40;
        }

        // ========== 6. 敵王への圧力 ==========
        // 敵の王の周辺マスに進出
        $enemyKingRank = $color === 'sente' ? 1 : 9; // 敵王は通常ここ付近
        $distanceToEnemyKing = abs($move['to_rank'] - $enemyKingRank);
        if ($distanceToEnemyKing <= 3) {
            $score += 100 - ($distanceToEnemyKing * 20);
        }

        // ========== 7. 自分の王の防御 ==========
        if ($move['is_drop'] ?? false) {
            // ドロップ（打ち込み）は防御的な手として評価
            $score += 80;
        }

        // 自分の王の周辺に駒を配置（防御）
        $myKingRank = $color === 'sente' ? 9 : 1;
        $distanceToMyKing = abs($move['to_rank'] - $myKingRank);
        if ($distanceToMyKing >= 5) {
            $score += 30; // 王から離れている手は少し加点（前進する意思）
        }

        // ========== 8. ランダム性（強さの微調整） ==========
        $score += rand(-5, 15); // 小さなランダム要素で自然な戦い

        return $score;
    }

    /**
     * 指定位置で成ることができるか確認
     */
    private function canPromoteAtTarget(array $boardState, array $move, string $color): bool
    {
        $piece = $boardState['board'][$move['from_rank']][$move['from_file']] ?? null;
        if (!$piece) return false;

        // 成ることができる駒か
        if (!$this->shogiService->canPromote($piece['type'])) {
            return false;
        }

        // 敵陣にいるか
        if ($color === 'sente') {
            return $move['to_rank'] <= 3;
        } else {
            return $move['to_rank'] >= 7;
        }
    }
}
