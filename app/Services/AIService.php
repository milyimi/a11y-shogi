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
                                $baseMove = [
                                    'from_rank' => $rank,
                                    'from_file' => $file,
                                    'to_rank' => $toRank,
                                    'to_file' => $toFile,
                                    'piece_type' => $piece['type'],
                                    'capture' => $target !== null,
                                ];
                                
                                // 成り判定
                                $canPromote = $this->shogiService->canPromote($piece['type']);
                                $enteringEnemyTerritory = $this->shogiService->isInEnemyTerritory($toRank, $color);
                                $leavingEnemyTerritory = $this->shogiService->isInEnemyTerritory($rank, $color);
                                $shouldConsiderPromotion = $canPromote && ($enteringEnemyTerritory || $leavingEnemyTerritory);
                                
                                // 強制成り判定（歩・香が最奥段、桂が最奥2段）
                                // 先手の最奥段はrank=9（敵陣最深部）、後手の最奥段はrank=1
                                $mustPromote = false;
                                if ($canPromote) {
                                    if ($color === 'sente') {
                                        if (in_array($piece['type'], ['fu', 'kyosha']) && $toRank >= 9) $mustPromote = true;
                                        if ($piece['type'] === 'keima' && $toRank >= 8) $mustPromote = true;
                                    } else {
                                        if (in_array($piece['type'], ['fu', 'kyosha']) && $toRank <= 1) $mustPromote = true;
                                        if ($piece['type'] === 'keima' && $toRank <= 2) $mustPromote = true;
                                    }
                                }
                                
                                if ($mustPromote) {
                                    // 強制成り：成り手のみ
                                    $moves[] = array_merge($baseMove, ['promote' => true]);
                                } elseif ($shouldConsiderPromotion) {
                                    // 任意成り：成りと不成の両方を候補に
                                    $moves[] = array_merge($baseMove, ['promote' => true]);
                                    $moves[] = array_merge($baseMove, ['promote' => false]);
                                } else {
                                    // 成り不可
                                    $moves[] = $baseMove;
                                }
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
            case 'nkyosha': // 成香
            case 'nkeima': // 成桂
            case 'ngin': // 成銀
                return [
                    [$direction, -1], [$direction, 0], [$direction, 1],
                    [-$direction, 0],
                    [0, -1], [0, 1],
                ];
            
            case 'ryu': // 龍（飛車の成り）= 飛車 + 斜め1マス
                $moves = [];
                for ($i = 1; $i <= 8; $i++) {
                    $moves[] = [$i, 0];
                    $moves[] = [-$i, 0];
                    $moves[] = [0, $i];
                    $moves[] = [0, -$i];
                }
                // 斜め1マス
                $moves[] = [1, 1];
                $moves[] = [1, -1];
                $moves[] = [-1, 1];
                $moves[] = [-1, -1];
                return $moves;
            
            case 'uma': // 馬（角の成り）= 角 + 縦横1マス
                $moves = [
                    [1, 1], [1, -1], [-1, 1], [-1, -1],
                    [2, 2], [2, -2], [-2, 2], [-2, -2],
                    [3, 3], [3, -3], [-3, 3], [-3, -3],
                    [4, 4], [4, -4], [-4, 4], [-4, -4],
                    [5, 5], [5, -5], [-5, 5], [-5, -5],
                    [6, 6], [6, -6], [-6, 6], [-6, -6],
                    [7, 7], [7, -7], [-7, 7], [-7, -7],
                    [8, 8], [8, -8], [-8, 8], [-8, -8],
                ];
                // 縦横1マス
                $moves[] = [1, 0];
                $moves[] = [-1, 0];
                $moves[] = [0, 1];
                $moves[] = [0, -1];
                return $moves;
            
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
            $chosen = $this->getRandomMove($candidateMoves);
            return $this->ensureKingSafety($chosen, $moves, $boardState, $color);
        }

        // 20%の確率で詰みだけは見逃さない
        if (rand(0, 100) < 20) {
            $mateMove = $this->findMateInOne($candidateMoves, $boardState, $color);
            if ($mateMove) {
                return $mateMove;
            }
        }

        // 残りは軽い評価で上位からランダム選択
        $chosen = $this->getTopScoredRandomMove($candidateMoves, $boardState, $color, 6, 80);
        return $this->ensureKingSafety($chosen, $moves, $boardState, $color);
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
            $chosen = $this->getRandomMove($candidateMoves);
            return $this->ensureKingSafety($chosen, $moves, $boardState, $color);
        }

        // 1手詰めがあれば必ず指す
        $mateMove = $this->findMateInOne($candidateMoves, $boardState, $color);
        if ($mateMove) {
            return $mateMove;
        }

        // 2手先読みで評価（上級より浅い）
        $bestMove = $this->getMinimaxMove($candidateMoves, $boardState, $color, 2);
        return $this->ensureKingSafety($bestMove, $moves, $boardState, $color);
    }

    /**
     * 上級用：市販ソフト並みの強さ（python-shogiレベル）
     */
    private function getHardMove(array $moves, array $boardState, string $color): ?array
    {
        if (empty($moves)) {
            return null;
        }

        \Log::warning('[AIService::getHardMove] VERSION CHECK - フィルタリング付きバージョン', [
            'moves_count' => count($moves),
        ]);
        
        // 移動先が敵の飛車・角に直接取られる手を検出
        // 取られた後に敵の大駒が玉周辺に到達して詰む危険な手を除外
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        $filteredMoves = [];
        foreach ($moves as $move) {
            $shouldExclude = false;
            
            $boardAfter = $this->simulateMove($boardState, $move, $color);
            
            // この手の後、移動先の駒を敵が取れるか確認
            $enemyMoves = $this->getPossibleMoves($boardAfter, $enemyColor);
            foreach ($enemyMoves as $enemyMove) {
                // 敵が移動先の駒を取る手があるか
                if ($enemyMove['to_rank'] === $move['to_rank'] && $enemyMove['to_file'] === $move['to_file'] && ($enemyMove['capture'] ?? false)) {
                    $enemyPieceType = $enemyMove['piece_type'];
                    // 敵の飛車/角/龍/馬が取りに来る場合
                    if (in_array($enemyPieceType, ['hisha', 'kaku', 'ryu', 'uma'])) {
                        // 敵がこの駒を取った後の盤面をシミュレーション
                        $boardAfterCapture = $this->simulateMove($boardAfter, $enemyMove, $enemyColor);
                        
                        // 取られた後に、敵の大駒が玉に隣接するか、同じライン上にいるか確認
                        $myKingPos = $this->findKingPosition($boardAfterCapture['board'], $color);
                        if ($myKingPos) {
                            $distRank = abs($enemyMove['to_rank'] - $myKingPos['rank']);
                            $distFile = abs($enemyMove['to_file'] - $myKingPos['file']);
                            
                            // 玉に隣接（1マス以内）
                            if ($distRank <= 1 && $distFile <= 1) {
                                $shouldExclude = true;
                                \Log::warning('[AIService::getHardMove] 取られた後に玉の隣に敵大駒が来る手を除外', [
                                    'myPiece' => $move['piece_type'],
                                    'myMove' => "{$move['from_file']}-{$move['from_rank']} -> {$move['to_file']}-{$move['to_rank']}",
                                    'enemyPiece' => $enemyPieceType,
                                    'kingPos' => "{$myKingPos['file']}-{$myKingPos['rank']}",
                                ]);
                                break;
                            }
                            
                            // 同じ筋/段で玉との間に遮蔽物がない（飛車系の場合）
                            if (in_array($enemyPieceType, ['hisha', 'ryu']) && 
                                ($enemyMove['to_file'] === $myKingPos['file'] || $enemyMove['to_rank'] === $myKingPos['rank'])) {
                                $shouldExclude = true;
                                \Log::warning('[AIService::getHardMove] 取られた後に玉と同じ筋/段に敵飛車が来る手を除外', [
                                    'myPiece' => $move['piece_type'],
                                    'myMove' => "{$move['from_file']}-{$move['from_rank']} -> {$move['to_file']}-{$move['to_rank']}",
                                    'enemyPiece' => $enemyPieceType,
                                    'kingPos' => "{$myKingPos['file']}-{$myKingPos['rank']}",
                                    'distRank' => $distRank,
                                    'distFile' => $distFile,
                                ]);
                                break;
                            }
                        }
                    }
                }
            }
            
            if (!$shouldExclude) {
                $filteredMoves[] = $move;
            }
        }
        
        // 除外後に手がない場合は最も被害の少ない手を選ぶ
        if (empty($filteredMoves)) {
            \Log::warning('[AIService::getHardMove] 全ての手が危険 - 玉を逃がす手を探す');
            // 玉を動かす手を最優先
            foreach ($moves as $move) {
                if (in_array($move['piece_type'], ['gyoku', 'ou'])) {
                    $filteredMoves[] = $move;
                }
            }
            // 玉の手もない場合は元のリストを使用
            if (empty($filteredMoves)) {
                $filteredMoves = $moves;
            }
        }

        // まず1手詰めがないかチェック
        $mateMove = $this->findMateInOne($filteredMoves, $boardState, $color);
        if ($mateMove) {
            \Log::info('[AIService::getHardMove] Mate in one found', [
                'from_rank' => $mateMove['from_rank'],
                'from_file' => $mateMove['from_file'],
                'to_rank' => $mateMove['to_rank'],
                'to_file' => $mateMove['to_file'],
                'color' => $color,
            ]);
            return $mateMove;
        }

        // 探索深度（静止探索で実質+1手深く読む）
        // デフォルト: depth=4 (強化版)、序盤は depth=3 に制限
        $depth = 4;
        
        $pieceCount = $this->countPieces($boardState);
        $moveCount = count($filteredMoves);
        
        // 序盤（駒が多い+手が多い）場合のみ depth=3 に制限
        if ($pieceCount >= 30 && $moveCount >= 30) {
            $depth = 3;
        }

        \Log::info('[AIService::getHardMove] Starting minimax search', [
            'depth' => $depth,
            'color' => $color,
            'possible_moves_count' => count($filteredMoves),
            'piece_count' => $pieceCount,
        ]);

        $bestMove = $this->getMinimaxMove($filteredMoves, $boardState, $color, $depth);
        
        \Log::info('[AIService::getHardMove] Minimax result', [
            'from_rank' => $bestMove['from_rank'] ?? null,
            'from_file' => $bestMove['from_file'] ?? null,
            'to_rank' => $bestMove['to_rank'],
            'to_file' => $bestMove['to_file'],
            'color' => $color,
        ]);
        
        // ========== 最終安全チェック ==========
        // 選んだ手を指した後、相手が玉を脅かさないことを確認
        // 全ての合法手($moves)を渡して、安全な代替手を探す
        $safeMove = $this->ensureKingSafety($bestMove, $moves, $boardState, $color);
        if ($safeMove !== $bestMove) {
            \Log::warning('[AIService::getHardMove] 最終安全チェックで手を変更', [
                'original' => "{$bestMove['from_file']}-{$bestMove['from_rank']} -> {$bestMove['to_file']}-{$bestMove['to_rank']}",
                'safe' => "{$safeMove['from_file']}-{$safeMove['from_rank']} -> {$safeMove['to_file']}-{$safeMove['to_rank']}",
            ]);
        }
        
        return $safeMove;
    }
    
    /**
     * 選んだ手が安全かチェックし、危険なら安全な手を返す
     */
    private function ensureKingSafety(array $bestMove, array $allMoves, array $boardState, string $color): array
    {
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        
        // 全ての手を安全性で分類
        $safeMoves = [];
        $riskyMoves = [];
        
        foreach ($allMoves as $move) {
            $danger = $this->canEnemyCaptureKingAfter($move, $boardState, $color, $enemyColor);
            if ($danger) {
                $riskyMoves[] = $move;
            } else {
                $safeMoves[] = $move;
            }
        }
        
        // bestMoveが安全ならそのまま返す
        $bestIsSafe = !$this->canEnemyCaptureKingAfter($bestMove, $boardState, $color, $enemyColor);
        if ($bestIsSafe) {
            return $bestMove;
        }
        
        \Log::warning('[AIService::ensureKingSafety] bestMoveは危険', [
            'move' => "{$bestMove['from_file']}-{$bestMove['from_rank']} -> {$bestMove['to_file']}-{$bestMove['to_rank']}",
            'safeMoves' => count($safeMoves),
            'riskyMoves' => count($riskyMoves),
        ]);
        
        // 安全な手があればその中で最も評価の高い手を選ぶ
        if (!empty($safeMoves)) {
            $bestSafe = null;
            $bestSafeScore = -PHP_INT_MAX;
            foreach ($safeMoves as $move) {
                $score = $this->evaluateMove($move, $boardState, $color);
                if ($score > $bestSafeScore) {
                    $bestSafeScore = $score;
                    $bestSafe = $move;
                }
            }
            return $bestSafe;
        }
        
        // 安全な手がない場合は玉を逃がす手を探す（逃げた先も安全か確認）
        \Log::warning('[AIService::ensureKingSafety] 安全な手がない - 玉を逃がす手を探す');
        $kingMoves = [];
        foreach ($allMoves as $move) {
            if (in_array($move['piece_type'], ['gyoku', 'ou'])) {
                // 逃げた先でも取られないか確認
                $boardAfterKingMove = $this->simulateMove($boardState, $move, $color);
                $enemyMovesAfter = $this->getPossibleMoves($boardAfterKingMove, $enemyColor);
                $kingNewRank = $move['to_rank'];
                $kingNewFile = $move['to_file'];
                $isSafe = true;
                foreach ($enemyMovesAfter as $em) {
                    if ($em['to_rank'] === $kingNewRank && $em['to_file'] === $kingNewFile) {
                        $isSafe = false;
                        break;
                    }
                }
                if ($isSafe) {
                    $kingMoves[] = $move;
                }
            }
        }
        
        if (!empty($kingMoves)) {
            \Log::warning('[AIService::ensureKingSafety] 安全な玉の逃げ場を発見', ['count' => count($kingMoves)]);
            return $kingMoves[0]; // 最初の安全な逃げ場
        }
        
        // 玉の安全な逃げ場もない場合、「自分の駒を大駒の前に置かない」手を優先
        \Log::warning('[AIService::ensureKingSafety] 玉の安全な逃げ場もなし - 最も被害の少ない手を選択');
        
        // まず「1手で直接玉が取られない」手をフィルタ
        $notDirectlyDangerous = [];
        foreach ($allMoves as $move) {
            $boardAfterMove = $this->simulateMove($boardState, $move, $color);
            $kingPos = $this->findKingPosition($boardAfterMove['board'], $color);
            if (!$kingPos) continue;
            $enemyMovesAfter = $this->getPossibleMoves($boardAfterMove, $enemyColor);
            $directThreat = false;
            foreach ($enemyMovesAfter as $em) {
                if ($em['to_rank'] === $kingPos['rank'] && $em['to_file'] === $kingPos['file']) {
                    $directThreat = true;
                    break;
                }
            }
            if (!$directThreat) {
                $notDirectlyDangerous[] = $move;
            }
        }
        
        if (!empty($notDirectlyDangerous)) {
            // その中で、大駒に取られて玉が危険になるパターンを避ける
            // 「大駒が駒を取って玉の隣に来る」パターンを避ける手を探す
            $safestMoves = [];
            foreach ($notDirectlyDangerous as $move) {
                $boardAfterMove = $this->simulateMove($boardState, $move, $color);
                $kingPos = $this->findKingPosition($boardAfterMove['board'], $color);
                if (!$kingPos) continue;
                
                // 大駒が玉の周囲（隣接マス）の自分の駒を取れるか
                $majorThreatToKing = false;
                $emAfter = $this->getPossibleMoves($boardAfterMove, $enemyColor);
                foreach ($emAfter as $em) {
                    if (!in_array($em['piece_type'], ['hisha', 'kaku', 'ryu', 'uma'])) continue;
                    if (!($em['capture'] ?? false)) continue;
                    
                    $distR = abs($em['to_rank'] - $kingPos['rank']);
                    $distF = abs($em['to_file'] - $kingPos['file']);
                    if ($distR <= 1 && $distF <= 1) {
                        // 大駒が玉の隣で駒を取れる → 非常に危険
                        $majorThreatToKing = true;
                        break;
                    }
                }
                
                if (!$majorThreatToKing) {
                    $safestMoves[] = $move;
                }
            }
            
            if (!empty($safestMoves)) {
                // 最も価値の低い駒を動かす手を選ぶ
                $bestChoice = null;
                $lowestValue = PHP_INT_MAX;
                foreach ($safestMoves as $move) {
                    $value = $this->getPieceValue($move['piece_type']);
                    if ($value < $lowestValue) {
                        $lowestValue = $value;
                        $bestChoice = $move;
                    }
                }
                \Log::warning('[AIService::ensureKingSafety] 最も安全な手を選択', [
                    'piece' => $bestChoice['piece_type'],
                    'move' => "{$bestChoice['from_file']}-{$bestChoice['from_rank']} -> {$bestChoice['to_file']}-{$bestChoice['to_rank']}",
                ]);
                return $bestChoice;
            }
            
            // それでも見つからなければ、玉の隣に駒を動かさない手を優先
            $kingPos = $this->findKingPosition($boardState['board'], $color);
            if ($kingPos) {
                // 玉の隣接マスに移動しない手を探す
                $awayFromKing = [];
                foreach ($notDirectlyDangerous as $move) {
                    $distR = abs($move['to_rank'] - $kingPos['rank']);
                    $distF = abs($move['to_file'] - $kingPos['file']);
                    if ($distR > 1 || $distF > 1) {
                        $awayFromKing[] = $move;
                    }
                }
                if (!empty($awayFromKing)) {
                    // 最も価値の低い駒を動かす
                    $bestChoice = null;
                    $lowestValue = PHP_INT_MAX;
                    foreach ($awayFromKing as $move) {
                        $value = $this->getPieceValue($move['piece_type']);
                        if ($value < $lowestValue) {
                            $lowestValue = $value;
                            $bestChoice = $move;
                        }
                    }
                    \Log::warning('[AIService::ensureKingSafety] 玉から離れた安全な手を選択', [
                        'piece' => $bestChoice['piece_type'],
                        'move' => ($bestChoice['from_file'] ?? '-') . "-" . ($bestChoice['from_rank'] ?? '-') . " -> {$bestChoice['to_file']}-{$bestChoice['to_rank']}",
                    ]);
                    return $bestChoice;
                }
            }
            
            \Log::warning('[AIService::ensureKingSafety] 直接脅威なしの手を選択（玉近く）');
            return $notDirectlyDangerous[0];
        }
        
        // 何もなければ元の手を返す（仕方ない）
        return $bestMove;
    }
    
    /**
     * この手を指した後、敵が玉を脅かせるか判定
     * パターン1: 敵が直接玉を取れる（王手放置）→ 常に危険
     * パターン2: 敵の大駒が自分の駒を取った後、玉も取れるが、防御可能かチェック
     */
    private function canEnemyCaptureKingAfter(array $move, array $boardState, string $color, string $enemyColor): bool
    {
        $boardAfter = $this->simulateMove($boardState, $move, $color);
        $myKingPos = $this->findKingPosition($boardAfter['board'], $color);
        if (!$myKingPos) return false;
        
        // 敵の全ての手を調べる
        $enemyMoves = $this->getPossibleMoves($boardAfter, $enemyColor);
        
        foreach ($enemyMoves as $enemyMove) {
            // パターン1: 敵が直接玉を取れるか → 常に危険（王手放置）
            if ($enemyMove['to_rank'] === $myKingPos['rank'] && $enemyMove['to_file'] === $myKingPos['file']) {
                return true;
            }
        }
        
        // パターン2: 大駒が駒を取り→玉を狙えるが、防御可能なら安全
        // evaluateDirectKingThreatがminimaxに正しく玉逃げを選ばせるので
        // ここでは「防御不可能」な場合のみ危険とする
        foreach ($enemyMoves as $enemyMove) {
            if (!in_array($enemyMove['piece_type'], ['hisha', 'kaku', 'ryu', 'uma'])) continue;
            if (!($enemyMove['capture'] ?? false)) continue;
            
            $boardAfterEnemy = $this->simulateMove($boardAfter, $enemyMove, $enemyColor);
            $kingPosAfter = $this->findKingPosition($boardAfterEnemy['board'], $color);
            if (!$kingPosAfter) return true; // 玉が消えた
            
            // 大駒が駒を取った後、玉が取れるか
            $enemyMoves2 = $this->getPossibleMoves($boardAfterEnemy, $enemyColor);
            $canTakeKing = false;
            foreach ($enemyMoves2 as $em2) {
                if ($em2['to_rank'] === $kingPosAfter['rank'] && $em2['to_file'] === $kingPosAfter['file']) {
                    $canTakeKing = true;
                    break;
                }
            }
            
            if (!$canTakeKing) continue;
            
            // 大駒が駒を取って玉を狙える → AIの応手で防げるか
            $aiResponses = $this->getPossibleMoves($boardAfterEnemy, $color);
            $canDefend = false;
            foreach ($aiResponses as $aiResp) {
                $boardAfterAiResp = $this->simulateMove($boardAfterEnemy, $aiResp, $color);
                $kingPosAfterAi = $this->findKingPosition($boardAfterAiResp['board'], $color);
                if (!$kingPosAfterAi) continue;
                
                // AI応手後に、敵が玉を取れるか
                $em3s = $this->getPossibleMoves($boardAfterAiResp, $enemyColor);
                $kingThreatened = false;
                foreach ($em3s as $em3) {
                    if ($em3['to_rank'] === $kingPosAfterAi['rank'] && $em3['to_file'] === $kingPosAfterAi['file']) {
                        $kingThreatened = true;
                        break;
                    }
                }
                if (!$kingThreatened) {
                    $canDefend = true;
                    break;
                }
            }
            
            if (!$canDefend) {
                \Log::warning('[canEnemyCaptureKingAfter] 防御不可能な大駒の攻撃', [
                    'myMove' => ($move['from_file'] ?? '-') . "-" . ($move['from_rank'] ?? '-') . " -> {$move['to_file']}-{$move['to_rank']}",
                    'enemyPiece' => $enemyMove['piece_type'],
                    'captureAt' => "{$enemyMove['to_file']}-{$enemyMove['to_rank']}",
                    'kingAt' => "{$kingPosAfter['file']}-{$kingPosAfter['rank']}",
                ]);
                return true;
            }
        }
        
        return false;
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
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        
        foreach ($moves as $move) {
            $score = $this->evaluateMove($move, $boardState, $color);
            
            // 大駒を敵の攻撃ラインに晒す低価値な取りは完全に除外
            $movedPieceType = $move['piece_type'];
            if (in_array($movedPieceType, ['hisha', 'kaku', 'ryu', 'uma']) && ($move['capture'] ?? false)) {
                $boardAfter = $this->simulateMove($boardState, $move, $color);
                $isOnAttackLine = $this->isSquareOnEnemySlidingAttack($boardAfter['board'], $move['to_rank'], $move['to_file'], $enemyColor);
                
                if ($isOnAttackLine) {
                    $target = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;
                    $capturedValue = $target ? $this->getPieceValue($target['type']) : 0;
                    
                    \Log::info('[AIService::getMinimaxMove] 大駒の取りを検証', [
                        'piece' => $movedPieceType,
                        'from' => "{$move['from_file']}-{$move['from_rank']}",
                        'to' => "{$move['to_file']}-{$move['to_rank']}",
                        'capturedValue' => $capturedValue,
                        'willExclude' => $capturedValue <= 200,
                    ]);
                    
                    // 低価値な駒（と金・歩）を取るために大駒を晒す手は候補から除外
                    if ($capturedValue <= 200) {
                        \Log::warning('[AIService::getMinimaxMove] 危険な手を除外', [
                            'piece' => $movedPieceType,
                            'from' => "{$move['from_file']}-{$move['from_rank']}",
                            'to' => "{$move['to_file']}-{$move['to_rank']}",
                            'capturedValue' => $capturedValue,
                        ]);
                        continue; // この手をスキップ
                    }
                }
            }
            
            $scoredMoves[] = ['move' => $move, 'score' => $score];
        }
        usort($scoredMoves, fn($a, $b) => $b['score'] <=> $a['score']);
        $topMoves = array_slice($scoredMoves, 0, $maxMoves);
        
        $secondBestScore = -PHP_INT_MAX;
        $secondBestMove = null;
        
        // デバッグ：全手の評価をログ出力
        $moveScores = [];
        
        foreach ($topMoves as $item) {
            $move = $item['move'];
            $newBoard = $this->simulateMove($boardState, $move, $color);
            $score = $this->minimax($newBoard, $depth - 1, $alpha, $beta, false, $color);
            
            // デバッグ用に記録
            $moveScores[] = [
                'piece' => $move['piece_type'],
                'from' => "{$move['from_file']}-{$move['from_rank']}",
                'to' => "{$move['to_file']}-{$move['to_rank']}",
                'capture' => $move['capture'] ?? false,
                'score' => $score
            ];
            
            // 玉が駒を取る手かどうかチェック
            $isKingCapture = in_array($move['piece_type'], ['gyoku', 'ou']) && ($move['capture'] ?? false);
            
            // 玉が駒を取る手には大きなペナルティを追加
            $adjustedScore = $score;
            if ($isKingCapture) {
                $adjustedScore -= 10000;  // 玉が駒を取る手は1万点減点
            }
            
            if ($adjustedScore > $bestScore) {
                $bestScore = $adjustedScore;
                $bestMove = $move;
            }
            
            $alpha = max($alpha, $score);
        }
        
        // 玉以外の手がある場合はそれを優先、なければ仕方なく玉の手
        $finalMove = $bestMove ?? $this->getAdvancedEvaluatedMove($moves, $boardState, $color);
        
        // 5-8への飛車の移動を選択した場合、詳細ログ
        if ($finalMove && $finalMove['to_rank'] == 8 && $finalMove['to_file'] == 5 && 
            in_array($finalMove['piece_type'], ['hisha', 'ryu'])) {
            \Log::warning('[AIService::getMinimaxMove] 5-8への飛車/龍を選択', [
                'selected' => "{$finalMove['from_file']}-{$finalMove['from_rank']} -> {$finalMove['to_file']}-{$finalMove['to_rank']}",
                'piece' => $finalMove['piece_type'],
                'capture' => $finalMove['capture'] ?? false,
                'score' => $bestScore,
                'all_moves' => $moveScores,
            ]);
        }
        
        // 玉が移動する場合は全手の評価をログ出力
        if ($finalMove && in_array($finalMove['piece_type'], ['gyoku', 'ou'])) {
            \Log::warning('[AIService::getMinimaxMove] King move selected', [
                'selected' => "{$finalMove['from_file']}-{$finalMove['from_rank']} -> {$finalMove['to_file']}-{$finalMove['to_rank']}",
                'all_moves' => $moveScores,
                'total_possible' => count($moves)
            ]);
        }
        
        // デバッグログ
        if ($finalMove && in_array($finalMove['piece_type'], ['gyoku', 'ou']) && ($finalMove['capture'] ?? false)) {
            \Log::warning('[AIService::getMinimaxMove] King capture selected (no better alternative)', [
                'from' => "{$finalMove['from_file']}-{$finalMove['from_rank']}",
                'to' => "{$finalMove['to_file']}-{$finalMove['to_rank']}",
                'total_moves' => count($moves),
            ]);
        }
        
        return $finalMove;
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
        
        // 手数が多い場合は上位15手のみ探索（枝刈り強化）
        if (count($moves) > 15) {
            $scoredMoves = [];
            foreach ($moves as $move) {
                $quickScore = 0;
                if ($move['capture'] ?? false) $quickScore += 1000;
                if (!empty($move['promote'])) $quickScore += 500;
                // 成り駒（龍・馬）の手を優先
                if (in_array($move['piece_type'] ?? '', ['ryu', 'uma'])) $quickScore += 300;
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
            
            // キャプチャ（玉は持ち駒にならない）
            if ($move['capture']) {
                $capturedPiece = $newBoard['board'][$move['to_rank']][$move['to_file']];
                // 玉以外のみ持ち駒に追加
                if (!in_array($capturedPiece['type'], ['gyoku', 'ou'], true)) {
                    $capturedType = $this->shogiService->demotePiece($capturedPiece['type']);
                    if (!isset($newBoard['hand'][$color][$capturedType])) {
                        $newBoard['hand'][$color][$capturedType] = 0;
                    }
                    $newBoard['hand'][$color][$capturedType]++;
                }
            }
            
            // 成り処理
            if (!empty($move['promote'])) {
                $piece['type'] = $this->shogiService->promotePiece($piece['type']);
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
        
        // 敵の大駒による脅威を検出（重要）
        $score -= $this->evaluateEnemyMajorPieceThreat($boardState, $aiColor) * 2;
        $score += $this->evaluateEnemyMajorPieceThreat($boardState, $enemyColor) * 2;

        // 大駒が敵の直線攻撃ラインに晒されている場合は大幅減点
        $score -= $this->evaluateExposedMajorPieces($boardState, $aiColor);
        $score += $this->evaluateExposedMajorPieces($boardState, $enemyColor);
        
        // 敵の歩/と金が自陣（玉の近く）に迫っている場合のペナルティ
        $score -= $this->evaluateEnemyPawnInvasion($boardState, $aiColor);
        $score += $this->evaluateEnemyPawnInvasion($boardState, $enemyColor);
        
        // 玉が直接取られる状態の検出（王手放置 = 致命的）
        $score += $this->evaluateDirectKingThreat($boardState, $aiColor);
        
        return $score;
    }
    
    /**
     * 敵が直接玉を取れる状態（王手放置）のペナルティ
     * 軽量版：玉の周囲の敵の利きを近似的に計算
     */
    private function evaluateDirectKingThreat(array $boardState, string $aiColor): int
    {
        $enemyColor = $aiColor === 'sente' ? 'gote' : 'sente';
        $myKingPos = $this->findKingPosition($boardState['board'], $aiColor);
        if (!$myKingPos) return -100000; // 玉がない = 取られた
        
        $board = $boardState['board'];
        $kingRank = $myKingPos['rank'];
        $kingFile = $myKingPos['file'];
        
        // 飛車/龍による縦横の利き
        // 同じ筋（file）で飛車/龍がいるか
        $rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
        foreach ($rookDirs as [$dr, $df]) {
            for ($step = 1; $step <= 8; $step++) {
                $r = $kingRank + $dr * $step;
                $f = $kingFile + $df * $step;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) break;
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['hisha', 'ryu'])) {
                        return -50000; // 飛車/龍が玉を直射
                    }
                    break; // 何か駒があったら遮られる
                }
            }
        }
        
        // 角/馬による斜めの利き
        $bishopDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        foreach ($bishopDirs as [$dr, $df]) {
            for ($step = 1; $step <= 8; $step++) {
                $r = $kingRank + $dr * $step;
                $f = $kingFile + $df * $step;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) break;
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['kaku', 'uma'])) {
                        return -50000; // 角/馬が玉を直射
                    }
                    break;
                }
            }
        }
        
        // 隣接マスの敵の駒（金銀桂香歩tokinなど）
        $adjacentDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        foreach ($adjacentDirs as [$dr, $df]) {
            $r = $kingRank + $dr;
            $f = $kingFile + $df;
            if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
            $piece = $board[$r][$f] ?? null;
            if (!$piece || $piece['color'] !== $enemyColor) continue;
            
            // この駒が玉のマスに来れるか（移動方向チェック）
            $canAttack = $this->canPieceAttackSquare($piece['type'], $piece['color'], $r, $f, $kingRank, $kingFile);
            if ($canAttack) {
                return -50000;
            }
        }
        
        // 桂馬の利き（隣接ではなく飛びの利き）
        $keimaDirs = $enemyColor === 'sente' ? [[-2, -1], [-2, 1]] : [[2, -1], [2, 1]];
        foreach ($keimaDirs as [$dr, $df]) {
            $r = $kingRank + $dr;
            $f = $kingFile + $df;
            if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
            $piece = $board[$r][$f] ?? null;
            if ($piece && $piece['color'] === $enemyColor && in_array($piece['type'], ['keima'])) {
                return -50000;
            }
        }
        
        return 0;
    }
    
    /**
     * 駒が特定のマスを攻撃できるか（簡易チェック）
     */
    private function canPieceAttackSquare(string $pieceType, string $color, int $fromRank, int $fromFile, int $toRank, int $toFile): bool
    {
        $dr = $toRank - $fromRank;
        $df = $toFile - $fromFile;
        
        // 先手は上方向(rank-1)が前、後手は下方向(rank+1)が前
        $forward = ($color === 'sente') ? -1 : 1;
        
        switch ($pieceType) {
            case 'fu':
                return $dr === $forward && $df === 0;
            case 'kin':
            case 'tokin':
            case 'nkyosha':
            case 'nkeima':
            case 'ngin':
                // 金と同じ動き: 前3マス + 横 + 後
                $goldMoves = [[$forward, 0], [$forward, -1], [$forward, 1], [0, -1], [0, 1], [-$forward, 0]];
                foreach ($goldMoves as [$gr, $gf]) {
                    if ($dr === $gr && $df === $gf) return true;
                }
                return false;
            case 'gin':
                // 銀: 前3マス + 後ろ斜め2マス
                $ginMoves = [[$forward, 0], [$forward, -1], [$forward, 1], [-$forward, -1], [-$forward, 1]];
                foreach ($ginMoves as [$gr, $gf]) {
                    if ($dr === $gr && $df === $gf) return true;
                }
                return false;
            case 'gyoku':
            case 'ou':
                // 全方向1マス
                return abs($dr) <= 1 && abs($df) <= 1 && ($dr !== 0 || $df !== 0);
            case 'ryu':
                // 龍: 飛車の動き + 斜め1マス（ただし隣接のみチェック）
                if (abs($dr) <= 1 && abs($df) <= 1) return true;
                return false; // 遠距離は上のスライドチェックで処理
            case 'uma':
                // 馬: 角の動き + 縦横1マス
                if (abs($dr) <= 1 && abs($df) <= 1) return true;
                return false;
            default:
                return false;
        }
    }

    /**
     * 敵の歩/と金が自陣に侵入しているペナルティを計算
     */
    private function evaluateEnemyPawnInvasion(array $boardState, string $color): int
    {
        $penalty = 0;
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        $board = $boardState['board'];
        
        // 自陣の範囲（sente: 7-9段、gote: 1-3段）
        $dangerZoneStart = ($color === 'gote') ? 7 : 1;
        $dangerZoneEnd = ($color === 'gote') ? 9 : 3;
        
        // 玉の位置を取得
        $kingPos = $this->findKingPosition($board, $color);
        
        for ($rank = $dangerZoneStart; $rank <= $dangerZoneEnd; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $enemyColor) continue;
                
                if (in_array($piece['type'], ['fu', 'tokin'])) {
                    // 自陣に敵の歩/と金がいる
                    $penalty += 300;
                    
                    // 玉と同じ筋の場合は特に危険
                    if ($kingPos && $file === $kingPos['file']) {
                        $penalty += 800;
                    }
                    
                    // 玉に近いほど危険
                    if ($kingPos) {
                        $dist = abs($file - $kingPos['file']) + abs($rank - $kingPos['rank']);
                        if ($dist <= 2) {
                            $penalty += 1000;
                        }
                    }
                    
                    // と金は歩より遥かに危険
                    if ($piece['type'] === 'tokin') {
                        $penalty += 500;
                    }
                }
            }
        }
        
        // 自陣の手前（sente: 5-6段、gote: 4-5段）にいる歩も警戒
        $approachStart = ($color === 'gote') ? 5 : 4;
        $approachEnd = ($color === 'gote') ? 6 : 5;
        
        for ($rank = $approachStart; $rank <= $approachEnd; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $enemyColor) continue;
                
                if ($piece['type'] === 'fu') {
                    // 玉と同じ筋の歩が迫っている場合
                    if ($kingPos && $file === $kingPos['file']) {
                        $penalty += 400;
                    } else {
                        $penalty += 100;
                    }
                }
            }
        }
        
        return $penalty;
    }

    /**
     * 自軍の大駒が敵の直線攻撃ラインに晒されているか評価
     */
    private function evaluateExposedMajorPieces(array $boardState, string $color): int
    {
        $penalty = 0;
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        $board = $boardState['board'];

        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $color) continue;

                if (in_array($piece['type'], ['hisha', 'kaku', 'ryu', 'uma'], true)) {
                    if ($this->isSquareOnEnemySlidingAttack($board, $rank, $file, $enemyColor)) {
                        $penalty += 2000;
                    }
                }
            }
        }

        return $penalty;
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
        
        // 玉は初期位置に留まるべき（前進すると大幅マイナス）
        if (in_array($type, ['gyoku', 'ou'])) {
            if ($color === 'sente') {
                // 先手玉は1段目にいるべき
                if ($rank === 1) {
                    $bonus += 1000;
                } else if ($rank === 2) {
                    $bonus -= 500;  // 2段目でもマイナス
                } else {
                    // 3段目以降は超大幅マイナス
                    $bonus -= ($rank - 1) * 1000;
                }
            } else {
                // 後手玉は9段目にいるべき
                if ($rank === 9) {
                    $bonus += 1000;
                } else if ($rank === 8) {
                    $bonus -= 500;  // 8段目でもマイナス
                } else {
                    // 7段目以前は超大幅マイナス
                    $bonus -= (10 - $rank) * 1000;
                }
            }
            return $bonus;
        }
        
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
        
        // 玉が駒を取る手は超危険
        if (in_array($move['piece_type'], ['gyoku', 'ou']) && ($move['capture'] ?? false)) {
            $score -= 5000;
        }

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

        // 移動先が敵に取られるリスクを簡易チェック
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        $boardAfterMove = $this->simulateMove($boardState, $move, $color);
        $enemyMoves = $this->getPossibleMoves($boardAfterMove, $enemyColor);
        foreach ($enemyMoves as $em) {
            if ($em['to_rank'] === $move['to_rank'] && $em['to_file'] === $move['to_file']) {
                // 高価値の駒ほど大きなペナルティ
                $myPieceValue = $pieceValues[$move['piece_type']] ?? 100;
                $score -= $myPieceValue;
                break;
            }
        }

        return $score;
    }

    /**
     * 指し手のスコアを評価（市販ソフト並み）
     */
    private function evaluateMove(array $move, array $boardState, string $color): int
    {
        $score = 0;
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        
        // 玉が駒を取る手は超危険（詰まされかけを除いて避ける）
        if (in_array($move['piece_type'], ['gyoku', 'ou']) && ($move['capture'] ?? false)) {
            $score -= 5000;  // 大幅なマイナス
        }

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
        $capturedValue = 0;
        if ($move['capture']) {
            $targetRank = $move['to_rank'];
            $targetFile = $move['to_file'];
            $targetPiece = $boardState['board'][$targetRank][$targetFile];
            
            if ($targetPiece) {
                $captureValue = $pieceValues[$targetPiece['type']] ?? 0;
                $capturedValue = $captureValue;

                // 金・銀・玉で敵の龍/馬を取る手は最優先
                if (in_array($targetPiece['type'], ['ryu', 'uma'], true) && in_array($move['piece_type'], ['kin', 'gin', 'gyoku', 'ou'], true)) {
                    return 900000;
                }
                
                // 龍・馬・飛車・角を取る手は特に高評価
                if (in_array($targetPiece['type'], ['ryu', 'uma', 'hisha', 'kaku'])) {
                    $score += $captureValue * 10; // 大駒を取る手は超優先
                } else {
                    $score += $captureValue * 3; // 駒を取る手を強く優先
                }
                
                // 自陣に侵入してきた敵の歩/と金を取る手は高評価（安全な場合）
                if (in_array($targetPiece['type'], ['fu', 'tokin'])) {
                    $inMyTerritory = ($color === 'gote') ? ($move['to_rank'] >= 7) : ($move['to_rank'] <= 3);
                    $approaching = ($color === 'gote') ? ($move['to_rank'] >= 5) : ($move['to_rank'] <= 5);
                    if ($inMyTerritory) {
                        $score += 500; // 自陣の敵歩を取るのは重要
                    } elseif ($approaching) {
                        $score += 200; // 迫ってくる歩を取るのも重要
                    }
                }
            }
        }
        
        // ========== 2.5 敵の大駒に隣接している位置には置かない（敵に取られるリスク） ==========
        // 自分の大駒（飛車・角）が敵の龍・馬に隣接する位置に移動する場合はペナルティ
        if (!($move['is_drop'] ?? false)) {
            $pieceType = $boardState['board'][$move['from_rank']][$move['from_file']]['type'] ?? null;
            
            if (in_array($pieceType, ['hisha', 'kaku'])) {  // 飛車・角のみ
                // 移動先が敵の龍・馬に隣接しているかチェック
                for ($dr = -1; $dr <= 1; $dr++) {
                    for ($df = -1; $df <= 1; $df++) {
                        if ($dr === 0 && $df === 0) continue;
                        $r = $move['to_rank'] + $dr;
                        $f = $move['to_file'] + $df;
                        if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
                        
                        $adjacentPiece = $boardState['board'][$r][$f] ?? null;
                        if ($adjacentPiece && $adjacentPiece['color'] === $enemyColor) {
                            if (in_array($adjacentPiece['type'], ['ryu', 'uma'])) {
                                $score -= 300; // 敵の龍・馬に隣接するのは危険
                            }
                        }
                    }
                }
            }
        }

        // ========== 2.6 直線攻撃ライン（飛・角）に入る手の危険度 ==========
        $movedPieceType = $move['piece_type'] ?? null;
        $boardAfter = $boardState['board'];
        if (!($move['is_drop'] ?? false)) {
            $movedPiece = $boardState['board'][$move['from_rank']][$move['from_file']] ?? null;
            $movedPieceType = $movedPiece['type'] ?? $movedPieceType;
            if ($movedPiece) {
                $boardAfter[$move['from_rank']][$move['from_file']] = null;
                $boardAfter[$move['to_rank']][$move['to_file']] = $movedPiece;
            }
        } else {
            $boardAfter[$move['to_rank']][$move['to_file']] = [
                'type' => $movedPieceType,
                'color' => $color,
            ];
        }

        $isOnAttackLine = false;
        if ($movedPieceType && $this->isSquareOnEnemySlidingAttack($boardAfter, $move['to_rank'], $move['to_file'], $enemyColor)) {
            $isOnAttackLine = true;
            $movedValue = $pieceValues[$movedPieceType] ?? 0;
            if (in_array($movedPieceType, ['hisha', 'kaku', 'ryu', 'uma'])) {
                $score -= max(5000, $movedValue * 15); // 大駒が一直線の攻撃ラインに入るのは致命的
            } elseif (in_array($movedPieceType, ['kin', 'gin'])) {
                $score -= 1200; // 金銀も危険
            } else {
                $score -= 400; // 小駒は控えめに減点
            }

            // 低価値の駒を取るために大駒を晒す手はさらに大幅減点
            if (in_array($movedPieceType, ['hisha', 'kaku', 'ryu', 'uma']) && $capturedValue > 0) {
                if ($capturedValue <= 200) {
                    $score -= 20000; // と金・歩のために大駒を晒す手は原則禁止
                } elseif ($capturedValue <= 300) {
                    $score -= 8000;
                }
            }
        }
        
        // 5-8への移動をログ
        if (($move['to_rank'] ?? null) == 8 && ($move['to_file'] ?? null) == 5 && in_array($movedPieceType, ['hisha', 'ryu'])) {
            \Log::info('[AIService::evaluateMove] 5-8への飛車/龍の移動を評価', [
                'from' => ($move['is_drop'] ?? false) ? 'drop' : "{$move['from_file']}-{$move['from_rank']}",
                'piece' => $movedPieceType,
                'capture' => ($move['capture'] ?? false) ? 'yes' : 'no',
                'capturedValue' => $capturedValue,
                'isOnAttackLine' => $isOnAttackLine,
                'currentScore' => $score,
            ]);
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
                    $fromDistToKing = abs($move['from_rank'] - $kingPos['rank']) + abs($move['from_file'] - $kingPos['file']);
                    $toDistToKing = abs($move['to_rank'] - $kingPos['rank']) + abs($move['to_file'] - $kingPos['file']);
                    
                    // 玉の近くにいれば守備力UP
                    if ($toDistToKing <= 2) {
                        $score += 150;
                    }
                    
                    // 玉から離れる手はペナルティ
                    if ($toDistToKing > $fromDistToKing) {
                        $score -= 200; // 守備駒が玉から離れるのは危険
                    }
                }
            }
        }

        // ========== 7. 敵陣への進出評価 ==========
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
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
        // 敵の王の位置を取得して正確な距離を測る
        $enemyKingPos = $this->findKing($boardState['board'], $enemyColor);
        if ($enemyKingPos) {
            $distanceToEnemyKing = abs($move['to_rank'] - $enemyKingPos['rank']) + abs($move['to_file'] - $enemyKingPos['file']);
            if ($distanceToEnemyKing <= 2) {
                $score += 150; // 敵王2マス以内は脅威
            } elseif ($distanceToEnemyKing <= 4) {
                $score += 80; // 敵王4マス以内も評価
            }
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

        // 5-8への移動の最終スコアをログ
        if (($move['to_rank'] ?? null) == 8 && ($move['to_file'] ?? null) == 5 && in_array($movedPieceType, ['hisha', 'ryu'])) {
            \Log::info('[AIService::evaluateMove] 5-8への飛車/龍の最終スコア', [
                'from' => ($move['is_drop'] ?? false) ? 'drop' : "{$move['from_file']}-{$move['from_rank']}",
                'piece' => $movedPieceType,
                'finalScore' => $score,
            ]);
        }

        return $score;
    }

    /**
     * 指定マスが敵の飛・角（および成り）による直線攻撃ライン上か判定
     */
    private function isSquareOnEnemySlidingAttack(array $board, int $rank, int $file, string $enemyColor): bool
    {
        $rookDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        $bishopDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        foreach ($rookDirections as [$dr, $df]) {
            $r = $rank + $dr;
            $f = $file + $df;
            while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['hisha', 'ryu'])) {
                        return true;
                    }
                    break; // ブロックされた
                }
                $r += $dr;
                $f += $df;
            }
        }

        foreach ($bishopDirections as [$dr, $df]) {
            $r = $rank + $dr;
            $f = $file + $df;
            while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['kaku', 'uma'])) {
                        return true;
                    }
                    break; // ブロックされた
                }
                $r += $dr;
                $f += $df;
            }
        }

        return false;
    }

    /**
     * 指定マスと敵の大駒の間のライン上（反対側）に自分の玉がいるか判定
     * 例：敵の飛車が5-2、自分の駒が5-8、自分の玉が5-9 → true
     */
    private function isKingBehindOnLine(array $board, int $rank, int $file, string $myColor, string $enemyColor): bool
    {
        $rookDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        $bishopDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        // 各方向について敵の大駒を探し、反対方向に自分の玉があるか確認
        foreach ($rookDirections as [$dr, $df]) {
            // この方向に敵の飛車/龍がいるか
            $r = $rank + $dr;
            $f = $file + $df;
            $foundEnemy = false;
            while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['hisha', 'ryu'])) {
                        $foundEnemy = true;
                    }
                    break;
                }
                $r += $dr;
                $f += $df;
            }
            
            if ($foundEnemy) {
                // 反対方向に自分の玉がいるか（1マス先を確認）
                $r = $rank - $dr;
                $f = $file - $df;
                while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                    $piece = $board[$r][$f] ?? null;
                    if ($piece) {
                        if ($piece['color'] === $myColor && in_array($piece['type'], ['gyoku', 'ou'])) {
                            return true;
                        }
                        break;
                    }
                    $r -= $dr;
                    $f -= $df;
                }
            }
        }
        
        foreach ($bishopDirections as [$dr, $df]) {
            $r = $rank + $dr;
            $f = $file + $df;
            $foundEnemy = false;
            while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                $piece = $board[$r][$f] ?? null;
                if ($piece) {
                    if ($piece['color'] === $enemyColor && in_array($piece['type'], ['kaku', 'uma'])) {
                        $foundEnemy = true;
                    }
                    break;
                }
                $r += $dr;
                $f += $df;
            }
            
            if ($foundEnemy) {
                $r = $rank - $dr;
                $f = $file - $df;
                while ($r >= 1 && $r <= 9 && $f >= 1 && $f <= 9) {
                    $piece = $board[$r][$f] ?? null;
                    if ($piece) {
                        if ($piece['color'] === $myColor && in_array($piece['type'], ['gyoku', 'ou'])) {
                            return true;
                        }
                        break;
                    }
                    $r -= $dr;
                    $f -= $df;
                }
            }
        }
        
        return false;
    }

    /**
     * 指定色の玉の位置を取得
     */
    private function findKingPosition(array $board, string $color): ?array
    {
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if ($piece && $piece['color'] === $color && in_array($piece['type'], ['gyoku', 'ou'])) {
                    return ['rank' => $rank, 'file' => $file];
                }
            }
        }
        return null;
    }

    /**
     * 駒の価値を取得
     */
    private function getPieceValue(string $pieceType): int
    {
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
        return $pieceValues[$pieceType] ?? 0;
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
                        $safety += 300;  // 金銀の守りを重視（150→300）
                    } else {
                        $safety += 80;
                    }
                }
            }
        }

        // 玉の隣に敵の龍・馬がいるのは即死級
        $enemyColor = $color === 'sente' ? 'gote' : 'sente';
        for ($dr = -1; $dr <= 1; $dr++) {
            for ($df = -1; $df <= 1; $df++) {
                if ($dr === 0 && $df === 0) continue;
                $r = $rank + $dr;
                $f = $file + $df;
                if ($r < 1 || $r > 9 || $f < 1 || $f > 9) continue;
                $piece = $board[$r][$f] ?? null;
                if ($piece && $piece['color'] === $enemyColor && in_array($piece['type'], ['ryu', 'uma'], true)) {
                    $safety -= 5000;
                }
            }
        }
        
        // 守備駒が少ない場合は大幅マイナス
        if ($defenders < 2) {
            $safety -= 500;  // 守備駒2枚未満は危険
        }

        // 玉の位置ボーナス（端にいると危険）
        $edgePenalty = 0;
        if ($file === 1 || $file === 9) {
            $edgePenalty += 100;
        }
        if ($color === 'sente' && $rank <= 2) {
            $safety += 300;  // 初期位置付近にいるボーナス（200→300）
        } elseif ($color === 'gote' && $rank >= 8) {
            $safety += 300;  // 初期位置付近にいるボーナス（200→300）
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
        
        // 敵の大駒（龍・馬・飛車・角）の脅威を評価
        for ($r = 1; $r <= 9; $r++) {
            for ($f = 1; $f <= 9; $f++) {
                $piece = $board[$r][$f] ?? null;
                if (!$piece || $piece['color'] !== $enemyColor) continue;
                
                if (in_array($piece['type'], ['hisha', 'ryu', 'kaku', 'uma'])) {
                    $distance = abs($r - $rank) + abs($f - $file);
                    if ($distance <= 3) {
                        $safety -= 400;  // 大駒が近い
                    } elseif ($distance <= 5) {
                        $safety -= 200;  // 大駒がやや近い
                    }
                }
            }
        }

        return $safety;
    }

    /**
     * 敵の大駒が玉に接近する脅威を検出
     */
    private function evaluateEnemyMajorPieceThreat(array $boardState, string $myColor): int
    {
        $board = $boardState['board'];
        $enemyColor = $myColor === 'sente' ? 'gote' : 'sente';
        $threat = 0;
        
        // 自分の玉の位置
        $myKingPos = $this->findKing($board, $myColor);
        if (!$myKingPos) {
            return 0;
        }
        
        // 敵の大駒を検索
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;
                if (!$piece || $piece['color'] !== $enemyColor) continue;
                
                // 龍・馬・飛車・角のみチェック
                if (in_array($piece['type'], ['ryu', 'uma', 'hisha', 'kaku'])) {
                    $distance = abs($rank - $myKingPos['rank']) + abs($file - $myKingPos['file']);
                    
                    // 玉との距離に応じて脅威度を評価
                    if ($distance <= 2) {
                        $threat += 600; // 非常に危険
                    } elseif ($distance <= 4) {
                        $threat += 300; // 危険
                    } elseif ($distance <= 6) {
                        $threat += 100; // やや危険
                    }
                    
                    // 龍と馬は特に危険
                    if (in_array($piece['type'], ['ryu', 'uma'])) {
                        $threat += 100;
                    }
                }
            }
        }
        
        return $threat;
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
