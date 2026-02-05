<?php

namespace App\Services;

class AIService
{
    private array $transpositionTable = [];
    private int $transpositionTableSize = 500000;
    private array $killerMoves = [];

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

        $safeMoves = $this->filterImmediateMateLosses($moves, $boardState, $color);
        $candidateMoves = !empty($safeMoves) ? $safeMoves : $moves;

        // 40%の確率でランダムに（ミスは残す）
        if (rand(0, 100) < 40) {
            return $this->getRandomMove($candidateMoves);
        }

        // 20%の確率で詰みだけは見逃さない
        if (rand(0, 100) < 20) {
            $mateMove = $this->findMateInOne($candidateMoves, $boardState, $color);
            if ($mateMove) {
                return $mateMove;
            }
        }

        // 残りは軽い評価で上位からランダム選択
        return $this->getTopScoredRandomMove($candidateMoves, $boardState, $color, 6, 80);
    }

    /**
     * 中級用：基本的な戦術（10%の確率で失敗）
     */
    private function getMediumMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        $safeMoves = $this->filterImmediateMateLosses($moves, $boardState, $color);
        $candidateMoves = !empty($safeMoves) ? $safeMoves : $moves;

        // 5%の確率で悪い手を選ぶ（ミス）
        if (rand(0, 100) < 5) {
            return $this->getRandomMove($candidateMoves);
        }

        // 1手詰めがあれば必ず指す
        $mateMove = $this->findMateInOne($candidateMoves, $boardState, $color);
        if ($mateMove) {
            return $mateMove;
        }

        // 2手先読みで評価（上級より浅い）
        return $this->getMinimaxMove($candidateMoves, $boardState, $color, 2);
    }

    /**
     * 上級用：市販ソフト並みの強さ（python-shogiレベル）
     */
    private function getHardMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        // Killer Movesをクリア
        $this->killerMoves = [];

        // まず1手詰めがないかチェック
        $mateMove = $this->findMateInOne($moves, $boardState, $color);
        if ($mateMove) {
            return $mateMove;
        }

        // 探索深度（静止探索で実質+1手深く読む）
        // デフォルト: depth=4 (強化版)、序盤は depth=3 に制限
        $depth = 4;
        
        $pieceCount = $this->countPieces($boardState);
        $moveCount = count($moves);
        
        // 序盤（駒が多い+手が多い）場合のみ depth=3 に制限
        if ($pieceCount >= 30 && $moveCount >= 30) {
            $depth = 3;
        }

        return $this->getMinimaxMove($moves, $boardState, $color, $depth);
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
     * N手詰めがあるか探索
     */
    private function findMateInN(array $moves, array $boardState, string $color, int $depth): ?array
    {
        if ($depth <= 1) {
            return $this->findMateInOne($moves, $boardState, $color);
        }

        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        
        foreach ($moves as $move) {
            $newBoard = $this->simulateMove($boardState, $move, $color);
            
            // 1手詰めチェック
            if ($this->shogiService->isCheckmate($newBoard, $enemyColor)) {
                return $move;
            }

            // 相手の全ての応手に対して詰みがあるか
            $enemyMoves = $this->getPossibleMoves($newBoard, $enemyColor);
            if (empty($enemyMoves)) {
                continue;
            }

            $allLeadToMate = true;
            foreach ($enemyMoves as $enemyMove) {
                $afterEnemyMove = $this->simulateMove($newBoard, $enemyMove, $enemyColor);
                $ourMoves = $this->getPossibleMoves($afterEnemyMove, $color);
                
                $mateMoveExists = $this->findMateInN($ourMoves, $afterEnemyMove, $color, $depth - 1);
                if (!$mateMoveExists) {
                    $allLeadToMate = false;
                    break;
                }
            }

            if ($allLeadToMate && count($enemyMoves) > 0) {
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
        
        // 探索する手数を制限（depth=4 では上位20手、それ以外は25手）
        $maxMoves = $depth >= 4 ? 20 : 25;
        $scoredMoves = [];
        foreach ($moves as $move) {
            $score = $this->evaluateMove($move, $boardState, $color);
            $scoredMoves[] = ['move' => $move, 'score' => $score];
        }
        usort($scoredMoves, fn($a, $b) => $b['score'] <=> $a['score']);
        $topMoves = array_slice($scoredMoves, 0, $maxMoves);
        
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
     * ミニマックスアルゴリズム（アルファベータ枝刈り＋静止探索付き）
     */
    private function minimax(array $boardState, int $depth, int $alpha, int $beta, bool $maximizing, string $aiColor): int
    {
        // 深さ制限または終局
        if ($depth <= 0) {
            $enemyColor = $aiColor === 'sente' ? 'gote' : 'sente';
            if ($this->shogiService->isCheckmate($boardState, $aiColor)) {
                return -999999;
            }
            if ($this->shogiService->isCheckmate($boardState, $enemyColor)) {
                return 999999;
            }
            // 静止探索を追加：駒取り合いが続く間は深く読む
            return $this->quiescence($boardState, $alpha, $beta, $maximizing, $aiColor, 0);
        }
        
        $currentColor = $maximizing ? $aiColor : ($aiColor === 'sente' ? 'gote' : 'sente');
        $moves = $this->getPossibleMoves($boardState, $currentColor);
        
        if (empty($moves)) {
            // 手がない = 詰み
            return $maximizing ? -999999 : 999999;
        }
        
        // 手数が多い場合は上位10手のみ探索（枝刈り強化）
        if (count($moves) > 10) {
            $scoredMoves = [];
            foreach ($moves as $move) {
                $quickScore = ($move['capture'] ?? false) ? 1000 : 0;
                $scoredMoves[] = ['move' => $move, 'score' => $quickScore];
            }
            usort($scoredMoves, fn($a, $b) => $b['score'] <=> $a['score']);
            $moves = array_column(array_slice($scoredMoves, 0, 10), 'move');
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
     * 静止探索（Quiescence Search）：駒取り合いが続く限り深く読む
     */
    private function quiescence(array $boardState, int $alpha, int $beta, bool $maximizing, string $aiColor, int $depth): int
    {
        // 静止探索の深さ制限
        if ($depth <= 0) {
            return $this->evaluatePosition($boardState, $aiColor);
        }

        $standPat = $this->evaluatePosition($boardState, $aiColor);
        
        if ($maximizing) {
            if ($standPat >= $beta) {
                return $beta;
            }
            $alpha = max($alpha, $standPat);
        } else {
            if ($standPat <= $alpha) {
                return $alpha;
            }
            $beta = min($beta, $standPat);
        }

        $currentColor = $maximizing ? $aiColor : ($aiColor === 'sente' ? 'gote' : 'sente');
        $allMoves = $this->getPossibleMoves($boardState, $currentColor);
        
        // 駒を取る手のみ探索
        $captureMoves = array_filter($allMoves, fn($m) => $m['capture'] ?? false);
        
        if (empty($captureMoves)) {
            return $standPat;
        }

        // 価値の高い駒を取る手から順に評価
        usort($captureMoves, function($a, $b) use ($boardState) {
            $aValue = $this->getCaptureValue($a, $boardState);
            $bValue = $this->getCaptureValue($b, $boardState);
            return $bValue <=> $aValue;
        });

        if ($maximizing) {
            $maxScore = $standPat;
            foreach ($captureMoves as $move) {
                $newBoard = $this->simulateMove($boardState, $move, $currentColor);
                $score = $this->quiescence($newBoard, $alpha, $beta, false, $aiColor, $depth - 1);
                $maxScore = max($maxScore, $score);
                $alpha = max($alpha, $score);
                if ($beta <= $alpha) {
                    break;
                }
            }
            return $maxScore;
        } else {
            $minScore = $standPat;
            foreach ($captureMoves as $move) {
                $newBoard = $this->simulateMove($boardState, $move, $currentColor);
                $score = $this->quiescence($newBoard, $alpha, $beta, true, $aiColor, $depth - 1);
                $minScore = min($minScore, $score);
                $beta = min($beta, $score);
                if ($beta <= $alpha) {
                    break;
                }
            }
            return $minScore;
        }
    }

    /**
     * 駒取りの価値を取得
     */
    private function getCaptureValue(array $move, array $boardState): int
    {
        if (!($move['capture'] ?? false)) {
            return 0;
        }

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

        $targetPiece = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;
        if (!$targetPiece) {
            return 0;
        }

        return $pieceValues[$targetPiece['type']] ?? 0;
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
            $score += ($pieceValues[$type] ?? 0) * $count * 0.8;
        }
        
        foreach ($boardState['hand'][$enemyColor] ?? [] as $type => $count) {
            $score -= ($pieceValues[$type] ?? 0) * $count * 0.8;
        }

        // 王手の評価
        if ($this->shogiService->isKingInCheck($boardState, $aiColor)) {
            $score -= 2000;
        }
        if ($this->shogiService->isKingInCheck($boardState, $enemyColor)) {
            $score += 2000;
        }

        // 玉の安全性評価
        $score += $this->evaluateKingSafety($boardState, $aiColor);
        $score -= $this->evaluateKingSafety($boardState, $enemyColor);

        // 駒の利き・連携評価
        $score += $this->evaluatePieceCoordination($boardState, $aiColor);
        $score -= $this->evaluatePieceCoordination($boardState, $enemyColor);

        // 敵玉への攻撃評価
        $score += $this->evaluateAttackPotential($boardState, $aiColor, $enemyColor);
        $score -= $this->evaluateAttackPotential($boardState, $enemyColor, $aiColor);

        // 詰み手筋評価（終盤で重要）
        $score += $this->evaluateMatingAttack($boardState, $aiColor, $enemyColor);
        $score -= $this->evaluateMatingAttack($boardState, $enemyColor, $aiColor);

        // 大駒連携評価
        $score += $this->evaluateMajorPieceCoordination($boardState, $aiColor);
        $score -= $this->evaluateMajorPieceCoordination($boardState, $enemyColor);
        
        return $score;
    }

    /**
     * 盤面上の駒数を数える
     */
    private function countPieces(array $boardState): int
    {
        $count = 0;
        $board = $boardState['board'] ?? [];
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                if (!empty($board[$rank][$file])) {
                    $count++;
                }
            }
        }

        return $count;
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
     * 即負け（相手の1手詰め）になる手を除外
     */
    private function filterImmediateMateLosses(array $moves, array $boardState, string $color): array
    {
        $filtered = [];
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';

        foreach ($moves as $move) {
            $nextBoard = $this->simulateMove($boardState, $move, $color);
            $enemyMoves = $this->getPossibleMoves($nextBoard, $enemyColor);
            $enemyMate = $this->findMateInOne($enemyMoves, $nextBoard, $enemyColor);
            if ($enemyMate) {
                continue;
            }
            $filtered[] = $move;
        }

        return $filtered;
    }

    /**
     * 上位N手からランダムに選択（簡易評価）
     */
    private function getTopScoredRandomMove(array $moves, array $boardState, string $color, int $topN, int $noiseRange): ?array
    {
        if (empty($moves)) {
            return null;
        }

        $scored = [];
        foreach ($moves as $move) {
            $score = $this->quickEvaluateMove($move, $boardState, $color);
            $score += rand(-$noiseRange, $noiseRange);
            $scored[] = ['move' => $move, 'score' => $score];
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        $slice = array_slice($scored, 0, max(1, $topN));
        $choice = $slice[array_rand($slice)]['move'];

        return $choice;
    }

    /**
     * 軽量な指し手評価（初級・中級向け）
     */
    private function quickEvaluateMove(array $move, array $boardState, string $color): int
    {
        $score = 0;

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
            'ryu' => 600,
            'uma' => 500,
            'tokin' => 150,
            'nkyosha' => 160,
            'nkeima' => 210,
            'ngin' => 260,
        ];

        if ($move['capture']) {
            $target = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;
            if ($target) {
                $score += ($pieceValues[$target['type']] ?? 0) * 2;
            }
        }

        if ($this->canPromoteAtTarget($boardState, $move, $color)) {
            $score += 120;
        }

        $centerFile = abs($move['to_file'] - 5);
        $centerRank = abs($move['to_rank'] - 5);
        if ($centerFile <= 2 && $centerRank <= 2) {
            $score += 40;
        }

        return $score;
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
            $score += 80; // 敵陣進出ボーナス
        }

        // ========== 4. 成りの評価（重要度UP） ==========
        if ($move['promote'] ?? false) {
            $pieceType = null;
            if (!($move['is_drop'] ?? false)) {
                $pieceType = $boardState['board'][$move['from_rank']][$move['from_file']]['type'] ?? null;
            }
            
            if ($pieceType) {
                // 成りによる価値上昇を評価
                $promoteBonus = [
                    'fu' => 100,      // 歩→と金
                    'kyosha' => 100,  // 香→成香
                    'keima' => 100,   // 桂→成桂
                    'gin' => 80,      // 銀→成銀
                    'kaku' => 150,    // 角→馬
                    'hisha' => 200,   // 飛→龍
                ];
                $score += $promoteBonus[$pieceType] ?? 0;
            }
        }

        // ========== 5. 中央制圧（将棋の基本戦略） ==========
        $fileDist = abs($move['to_file'] - 5);
        $centralBonus = (5 - $fileDist) * 15; // 中央ほど高評価
        $score += $centralBonus;

        // ========== 6. 駒の種類別の位置評価 ==========
        if (!($move['is_drop'] ?? false)) {
            $pieceType = $boardState['board'][$move['from_rank']][$move['from_file']]['type'] ?? null;
            
            // 飛車・角は中段・敵陣で強い
            if (in_array($pieceType, ['hisha', 'kaku', 'ryu', 'uma'])) {
                if ($enemyTerritory) {
                    $score += 120;
                }
            }
            
            // 歩・香・桂は前進を評価
            if (in_array($pieceType, ['fu', 'kyosha', 'keima'])) {
                $advancement = ($color === 'sente') ? (10 - $move['to_rank']) : $move['to_rank'];
                $score += $advancement * 8;
            }
            
            // 金・銀は玉の近くで高評価（守備力）
            if (in_array($pieceType, ['kin', 'gin'])) {
                $kingPos = $this->findKing($boardState['board'], $color);
                if ($kingPos) {
                    $distToKing = abs($move['to_rank'] - $kingPos['rank']) + abs($move['to_file'] - $kingPos['file']);
                    if ($distToKing <= 2) {
                        $score += 100; // 玉の近くにいれば守備力UP
                    }
                }
            }
        }

        // ========== 7. 敵玉への攻撃（重要度大幅UP） ==========
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        $enemyKingPos = $this->findKing($boardState['board'], $enemyColor);
        if ($enemyKingPos) {
            $distToEnemyKing = abs($move['to_rank'] - $enemyKingPos['rank']) + abs($move['to_file'] - $enemyKingPos['file']);
            if ($distToEnemyKing <= 2) {
                $score += 200; // 敵玉2マス以内なら大幅ボーナス
            } elseif ($distToEnemyKing <= 4) {
                $score += 100; // 敵玉4マス以内でもボーナス
            }
        }
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

    /**
     * 玉の安全性を評価
     */
    private function evaluateKingSafety(array $boardState, string $color): int
    {
        $board = $boardState['board'];
        $kingPos = $this->findKing($board, $color);
        if (!$kingPos) {
            return -50000;
        }

        $safety = 0;
        $rank = $kingPos['rank'];
        $file = $kingPos['file'];

        // 囲いの堅さ（周囲8マスの味方駒）
        $defenders = 0;
        for ($dr = -1; $dr <= 1; $dr++) {
            for ($df = -1; $df <= 1; $df++) {
                if ($dr === 0 && $df === 0) continue;
                $r = $rank + $dr;
                $f = $file + $df;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
                $piece = $board[$r][$f] ?? null;
                if ($piece && $piece['color'] === $color) {
                    $defenders++;
                    if (in_array($piece['type'], ['kin', 'gin'])) {
                        $safety += 150;
                    } else {
                        $safety += 80;
                    }
                }
            }
        }

        // 玉の位置ボーナス（端にいると危険）
        $edgePenalty = 0;
        if ($file === 1 || $file === 9) {
            $edgePenalty += 100;
        }
        if ($color === 'sente' && $rank <= 2) {
            $safety += 200;
        } elseif ($color === 'gote' && $rank >= 8) {
            $safety += 200;
        }

        $safety -= $edgePenalty;

        // 脱出マス数
        $escapeCells = 0;
        for ($dr = -1; $dr <= 1; $dr++) {
            for ($df = -1; $df <= 1; $df++) {
                if ($dr === 0 && $df === 0) continue;
                $r = $rank + $dr;
                $f = $file + $df;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
                $piece = $board[$r][$f] ?? null;
                if (!$piece || $piece['color'] !== $color) {
                    $escapeCells++;
                }
            }
        }
        $safety += $escapeCells * 30;

        return $safety;
    }

    /**
     * 駒の連携・利きを評価
     */
    private function evaluatePieceCoordination(array $boardState, string $color): int
    {
        $board = $boardState['board'];
        $coordination = 0;

        // 大駒の利きの長さ
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                if (in_array($piece['type'], ['hisha', 'ryu'])) {
                    $coordination += $this->countMobility($board, $rank, $file, $piece['type'], $color) * 15;
                }
                if (in_array($piece['type'], ['kaku', 'uma'])) {
                    $coordination += $this->countMobility($board, $rank, $file, $piece['type'], $color) * 12;
                }
            }
        }

        return $coordination;
    }

    /**
     * 敵玉への攻撃力を評価
     */
    private function evaluateAttackPotential(array $boardState, string $color, string $enemyColor): int
    {
        $board = $boardState['board'];
        $enemyKingPos = $this->findKing($board, $enemyColor);
        if (!$enemyKingPos) {
            return 0;
        }

        $attack = 0;
        $kr = $enemyKingPos['rank'];
        $kf = $enemyKingPos['file'];

        // 敵玉周辺への利き
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                $dist = abs($rank - $kr) + abs($file - $kf);
                if ($dist <= 3) {
                    if (in_array($piece['type'], ['hisha', 'ryu', 'kaku', 'uma'])) {
                        $attack += (4 - $dist) * 100;
                    } elseif (in_array($piece['type'], ['kin', 'gin'])) {
                        $attack += (4 - $dist) * 60;
                    }
                }
            }
        }

        return $attack;
    }

    /**
     * 駒の機動力を数える
     */
    private function countMobility(array $board, int $rank, int $file, string $type, string $color): int
    {
        $moves = 0;
        $patterns = $this->getMovementPatterns($type, $color);

        foreach ($patterns as $pattern) {
            $newRank = $rank + $pattern[0];
            $newFile = $file + $pattern[1];

            if ($newRank < 1 || $newRank > 9 || $newFile < 1 || $newFile > 9) {
                continue;
            }

            $targetPiece = $board[$newRank][$newFile] ?? null;
            if ($targetPiece && $targetPiece['color'] === $color) {
                continue;
            }

            $moves++;
        }

        return $moves;
    }

    /**
     * 王の位置を取得
     */
    private function findKing(array $board, string $color): ?array
    {
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if ($piece && in_array($piece['type'], ['gyoku', 'ou']) && $piece['color'] === $color) {
                    return ['rank' => $rank, 'file' => $file];
                }
            }
        }
        return null;
    }

    /**
     * 終盤評価：敵玉への詰み手筋を検出
     */
    private function evaluateMatingAttack(array $boardState, string $color, string $enemyColor): int
    {
        $board = $boardState['board'];
        $enemyKingPos = $this->findKing($board, $enemyColor);
        if (!$enemyKingPos) {
            return 0;
        }

        $matingScore = 0;
        $kr = $enemyKingPos['rank'];
        $kf = $enemyKingPos['file'];

        // 敵玉の脱出マスをカウント
        $escapeSquares = 0;
        for ($dr = -1; $dr <= 1; $dr++) {
            for ($df = -1; $df <= 1; $df++) {
                if ($dr === 0 && $df === 0) continue;
                $r = $kr + $dr;
                $f = $kf + $df;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
                
                $piece = $board[$r][$f] ?? null;
                if (!$piece || $piece['color'] !== $enemyColor) {
                    $escapeSquares++;
                }
            }
        }

        // 脱出マスが少ないほど詰みに近い → 加点
        if ($escapeSquares <= 1) {
            $matingScore += 1500; // 詰み状態に近い
        } elseif ($escapeSquares <= 2) {
            $matingScore += 800;
        } elseif ($escapeSquares <= 3) {
            $matingScore += 400;
        }

        // 敵玉が盤端または隅に追い詰められている
        $cornerDistance = min(
            min($kr - 1, 9 - $kr),
            min($kf - 1, 9 - $kf)
        );
        if ($cornerDistance === 0) {
            $matingScore += 600; // 隅に詰み
        } elseif ($cornerDistance === 1) {
            $matingScore += 300; // 辺に詰み
        }

        // 攻撃駒の数（敵玉の周辺3マス以内）
        $attackingPieces = 0;
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                $dist = max(abs($rank - $kr), abs($file - $kf));
                if ($dist <= 2 && in_array($piece['type'], ['hisha', 'ryu', 'kaku', 'uma', 'kin', 'gin'])) {
                    $attackingPieces++;
                    if (in_array($piece['type'], ['hisha', 'ryu'])) {
                        $matingScore += 150;
                    } elseif (in_array($piece['type'], ['kaku', 'uma'])) {
                        $matingScore += 120;
                    } else {
                        $matingScore += 80;
                    }
                }
            }
        }

        // 複数の攻撃駒がいると大きなボーナス
        if ($attackingPieces >= 3) {
            $matingScore += 600;
        } elseif ($attackingPieces >= 2) {
            $matingScore += 300;
        }

        return $matingScore;
    }

    /**
     * 二枚飛車など強力な大駒連携をボーナス
     */
    private function evaluateMajorPieceCoordination(array $boardState, string $color): int
    {
        $board = $boardState['board'];
        $coordination = 0;

        $rooks = 0;
        $bishops = 0;

        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                if (in_array($piece['type'], ['hisha', 'ryu'])) {
                    $rooks++;
                }
                if (in_array($piece['type'], ['kaku', 'uma'])) {
                    $bishops++;
                }
            }
        }

        // 二枚以上の飛車があるとボーナス
        if ($rooks >= 2) {
            $coordination += 400;
        }

        // 飛車と角の組み合わせ
        if ($rooks >= 1 && $bishops >= 1) {
            $coordination += 300;
        }

        // 成り駒の補正
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                if (in_array($piece['type'], ['tokin', 'nkyosha', 'nkeima', 'ngin'])) {
                    // 敵陣での成り駒は活躍しやすい
                    $enemyTerritory = $color === 'sente' ? $rank >= 7 : $rank <= 3;
                    if ($enemyTerritory) {
                        $coordination += 100;
                    }
                }
            }
        }

        return $coordination;
    }
}
