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
                // 初級：ランダムに指す
                return $this->getRandomMove($possibleMoves);
            
            case 'medium':
                // 中級：簡易評価（駒を取る手を優先）
                return $this->getSimpleEvaluatedMove($possibleMoves, $boardState, $aiColor);
            
            case 'hard':
                // 上級：より深い評価
                return $this->getAdvancedEvaluatedMove($possibleMoves, $boardState, $aiColor);
            
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
     * 指し手のスコアを評価
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
        ];

        // 駒を取る場合
        if ($move['capture']) {
            $targetRank = $move['to_rank'];
            $targetFile = $move['to_file'];
            $targetPiece = $boardState['board'][$targetRank][$targetFile];
            
            if ($targetPiece) {
                $score += $pieceValues[$targetPiece['type']] ?? 0;
                
                // 相手の王を取ればゲーム終了（最高スコア）
                if (in_array($targetPiece['type'], ['gyoku', 'ou'])) {
                    $score += 10000;
                }
            }
        }

        // 進出（敵陣に入る）の評価
        $opponentRankStart = $color === 'sente' ? 1 : 9;
        if ($move['to_rank'] <= 3 || $move['to_rank'] >= 7) {
            $score += 50;
        }

        // 駒の集中度
        $score += rand(0, 20); // 同スコアの場合のランダム性

        return $score;
    }
}
