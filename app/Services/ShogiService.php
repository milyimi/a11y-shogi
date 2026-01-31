<?php

namespace App\Services;

class ShogiService
{
    /**
     * 初期盤面を取得（標準的な将棋の配置）
     */
    public function getInitialBoard(): array
    {
        return [
            'format' => 'shogi_standard',
            'version' => '1.0',
            'board' => [
                // 9段目（後手側最奥）
                '9' => [
                    '1' => ['type' => 'kyosha', 'color' => 'gote'],
                    '2' => ['type' => 'keima', 'color' => 'gote'],
                    '3' => ['type' => 'gin', 'color' => 'gote'],
                    '4' => ['type' => 'kin', 'color' => 'gote'],
                    '5' => ['type' => 'gyoku', 'color' => 'gote'],
                    '6' => ['type' => 'kin', 'color' => 'gote'],
                    '7' => ['type' => 'gin', 'color' => 'gote'],
                    '8' => ['type' => 'keima', 'color' => 'gote'],
                    '9' => ['type' => 'kyosha', 'color' => 'gote'],
                ],
                // 8段目
                '8' => [
                    '1' => null,
                    '2' => ['type' => 'hisha', 'color' => 'gote'],
                    '3' => null,
                    '4' => null,
                    '5' => null,
                    '6' => null,
                    '7' => null,
                    '8' => ['type' => 'kaku', 'color' => 'gote'],
                    '9' => null,
                ],
                // 7段目（後手の歩）
                '7' => [
                    '1' => ['type' => 'fu', 'color' => 'gote'],
                    '2' => ['type' => 'fu', 'color' => 'gote'],
                    '3' => ['type' => 'fu', 'color' => 'gote'],
                    '4' => ['type' => 'fu', 'color' => 'gote'],
                    '5' => ['type' => 'fu', 'color' => 'gote'],
                    '6' => ['type' => 'fu', 'color' => 'gote'],
                    '7' => ['type' => 'fu', 'color' => 'gote'],
                    '8' => ['type' => 'fu', 'color' => 'gote'],
                    '9' => ['type' => 'fu', 'color' => 'gote'],
                ],
                // 6段目（空）
                '6' => array_fill(1, 9, null),
                // 5段目（空）
                '5' => array_fill(1, 9, null),
                // 4段目（空）
                '4' => array_fill(1, 9, null),
                // 3段目（先手の歩）
                '3' => [
                    '1' => ['type' => 'fu', 'color' => 'sente'],
                    '2' => ['type' => 'fu', 'color' => 'sente'],
                    '3' => ['type' => 'fu', 'color' => 'sente'],
                    '4' => ['type' => 'fu', 'color' => 'sente'],
                    '5' => ['type' => 'fu', 'color' => 'sente'],
                    '6' => ['type' => 'fu', 'color' => 'sente'],
                    '7' => ['type' => 'fu', 'color' => 'sente'],
                    '8' => ['type' => 'fu', 'color' => 'sente'],
                    '9' => ['type' => 'fu', 'color' => 'sente'],
                ],
                // 2段目
                '2' => [
                    '1' => null,
                    '2' => ['type' => 'kaku', 'color' => 'sente'],
                    '3' => null,
                    '4' => null,
                    '5' => null,
                    '6' => null,
                    '7' => null,
                    '8' => ['type' => 'hisha', 'color' => 'sente'],
                    '9' => null,
                ],
                // 1段目（先手側最奥）
                '1' => [
                    '1' => ['type' => 'kyosha', 'color' => 'sente'],
                    '2' => ['type' => 'keima', 'color' => 'sente'],
                    '3' => ['type' => 'gin', 'color' => 'sente'],
                    '4' => ['type' => 'kin', 'color' => 'sente'],
                    '5' => ['type' => 'gyoku', 'color' => 'sente'],
                    '6' => ['type' => 'kin', 'color' => 'sente'],
                    '7' => ['type' => 'gin', 'color' => 'sente'],
                    '8' => ['type' => 'keima', 'color' => 'sente'],
                    '9' => ['type' => 'kyosha', 'color' => 'sente'],
                ],
            ],
            'hand' => [
                'sente' => [],
                'gote' => [],
            ],
            'turn' => 'sente',
        ];
    }

    /**
     * 駒の日本語名を取得
     */
    public function getPieceName(string $type): string
    {
        return match($type) {
            'fu' => '歩',
            'kyosha' => '香',
            'keima' => '桂',
            'gin' => '銀',
            'kin' => '金',
            'kaku' => '角',
            'hisha' => '飛',
            'gyoku' => '玉',
            'ou' => '王',
            default => $type,
        };
    }

    /**
     * 指し手が合法か判定
     */
    public function isValidMove(array $boardState, int $fromRank, int $fromFile, int $toRank, int $toFile, string $color): bool
    {
        $board = $boardState['board'];
        
        // 盤面内か確認
        if ($fromRank < 1 || $fromRank > 9 || $fromFile < 1 || $fromFile > 9 ||
            $toRank < 1 || $toRank > 9 || $toFile < 1 || $toFile > 9) {
            return false;
        }

        // 移動元に駒があるか確認
        $piece = $board[$fromRank][$fromFile] ?? null;
        if (!$piece) {
            return false;
        }

        // 自分の駒か確認
        if ($piece['color'] !== $color) {
            return false;
        }

        // 移動先に自分の駒がないか確認
        $targetPiece = $board[$toRank][$toFile] ?? null;
        if ($targetPiece && $targetPiece['color'] === $color) {
            return false;
        }

        // 同じマスへの移動は不可
        if ($fromRank === $toRank && $fromFile === $toFile) {
            return false;
        }

        // 駒の移動ルールをチェック
        if (!$this->isLegalPieceMove($board, $fromRank, $fromFile, $toRank, $toFile, $piece['type'], $color)) {
            return false;
        }

        // 移動後、自分の王が危険に晒されていないか確認
        if (!$this->isKingSafe($board, $fromRank, $fromFile, $toRank, $toFile, $color)) {
            return false;
        }

        return true;
    }

    /**
     * 駒の移動ルールが正しいか確認
     */
    private function isLegalPieceMove(array $board, int $fromRank, int $fromFile, int $toRank, int $toFile, string $type, string $color): bool
    {
        $rankDiff = $toRank - $fromRank;
        $fileDiff = $toFile - $fromFile;

        switch ($type) {
            case 'fu': // 歩
                $direction = $color === 'sente' ? 1 : -1;
                return $rankDiff === $direction && $fileDiff === 0;

            case 'kyosha': // 香
                $direction = $color === 'sente' ? 1 : -1;
                if ($fileDiff !== 0) return false;
                if ($direction === -1 && $rankDiff >= 0) return false;
                if ($direction === 1 && $rankDiff <= 0) return false;
                return $this->isPathClear($board, $fromRank, $fromFile, $toRank, $toFile);

            case 'keima': // 桂
                $direction = $color === 'sente' ? 1 : -1;
                return (abs($fileDiff) === 1 && $rankDiff === 2 * $direction);

            case 'gin': // 銀
                $direction = $color === 'sente' ? 1 : -1;
                if (abs($fileDiff) > 1) return false;
                if ($rankDiff === $direction) return abs($fileDiff) <= 1;
                if ($rankDiff === -$direction) return abs($fileDiff) === 1;
                return false;

            case 'kin': // 金
            case 'tokin': // と
                $direction = $color === 'sente' ? 1 : -1;
                if (abs($rankDiff) > 1 || abs($fileDiff) > 1) return false;
                if ($rankDiff === 0 && $fileDiff === 0) return false;
                if ($rankDiff === $direction && abs($fileDiff) <= 1) return true;
                if ($rankDiff === 0) return abs($fileDiff) === 1;
                if ($rankDiff === -$direction) return $fileDiff === 0;
                return false;

            case 'kaku': // 角
                if (abs($rankDiff) !== abs($fileDiff)) return false;
                return $this->isPathClear($board, $fromRank, $fromFile, $toRank, $toFile);

            case 'hisha': // 飛
                if ($rankDiff !== 0 && $fileDiff !== 0) return false;
                return $this->isPathClear($board, $fromRank, $fromFile, $toRank, $toFile);

            case 'gyoku':
            case 'ou': // 玉
                return abs($rankDiff) <= 1 && abs($fileDiff) <= 1 && ($rankDiff !== 0 || $fileDiff !== 0);

            default:
                return false;
        }
    }

    /**
     * 駒が移動先までの道が空いているか確認（香、桂以外の直線・斜線駒用）
     */
    private function isPathClear(array $board, int $fromRank, int $fromFile, int $toRank, int $toFile): bool
    {
        $rankStep = $toRank === $fromRank ? 0 : ($toRank > $fromRank ? 1 : -1);
        $fileStep = $toFile === $fromFile ? 0 : ($toFile > $fromFile ? 1 : -1);

        $currentRank = $fromRank + $rankStep;
        $currentFile = $fromFile + $fileStep;

        while ($currentRank !== $toRank || $currentFile !== $toFile) {
            if (($board[$currentRank][$currentFile] ?? null) !== null) {
                return false; // 道が塞がっている
            }
            $currentRank += $rankStep;
            $currentFile += $fileStep;
        }

        return true;
    }

    /**
     * 移動後、自分の王が安全か確認
     */
    private function isKingSafe(array $board, int $fromRank, int $fromFile, int $toRank, int $toFile, string $color): bool
    {
        // 仮にボード状態を変更
        $testBoard = $board;
        $piece = $testBoard[$fromRank][$fromFile];
        $testBoard[$toRank][$toFile] = $piece;
        $testBoard[$fromRank][$fromFile] = null;

        // 移動後の玉の位置を取得
        $kingPos = $this->findKing($testBoard, $color);
        if (!$kingPos) {
            return false; // 玉が見つからない（ありえない）
        }

        // 敵の駒から王が攻撃されていないか確認
        $opponentColor = $color === 'sente' ? 'gote' : 'sente';
        return !$this->isPositionUnderAttack($testBoard, $kingPos['rank'], $kingPos['file'], $opponentColor);
    }

    /**
     * 玉の位置を取得
     */
    private function findKing(array $board, string $color): ?array
    {
        for ($rank = 9; $rank >= 1; $rank--) {
            for ($file = 9; $file >= 1; $file--) {
                $piece = $board[$rank][$file] ?? null;
                if ($piece && in_array($piece['type'], ['gyoku', 'ou']) && $piece['color'] === $color) {
                    return ['rank' => $rank, 'file' => $file];
                }
            }
        }
        return null;
    }

    /**
     * 指定した位置が敵の駒から攻撃されているか確認
     */
    private function isPositionUnderAttack(array $board, int $rank, int $file, string $opponentColor): bool
    {
        for ($r = 9; $r >= 1; $r--) {
            for ($f = 9; $f >= 1; $f--) {
                $piece = $board[$r][$f] ?? null;
                if ($piece && $piece['color'] === $opponentColor) {
                    if ($this->canAttack($board, $r, $f, $rank, $file, $piece['type'], $opponentColor)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 駒が指定した位置を攻撃できるか確認
     */
    private function canAttack(array $board, int $fromRank, int $fromFile, int $toRank, int $toFile, string $type, string $color): bool
    {
        // 攻撃元と攻撃先が同じ場合
        if ($fromRank === $toRank && $fromFile === $toFile) {
            return false;
        }

        // 移動ルールが合法か確認（攻撃能力＝移動能力）
        return $this->isLegalPieceMove($board, $fromRank, $fromFile, $toRank, $toFile, $type, $color);
    }

    /**
     * 詰み（checkmate）かどうかを判定
     * 指定の色の側に合法的な指し手がない場合、詰みと判定する
     */
    public function isCheckmate(array $boardState, string $color): bool
    {
        $board = $boardState['board'];
        $hand = $boardState['hand'] ?? ['sente' => [], 'gote' => []];

        // 盤面の全てのマスをチェック
        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                $piece = $board[$rank][$file] ?? null;

                // 自分の駒の場合、移動できるマスがあるか確認
                if ($piece && $piece['color'] === $color) {
                    // 通常の移動先
                    for ($toRank = 1; $toRank <= 9; $toRank++) {
                        for ($toFile = 1; $toFile <= 9; $toFile++) {
                            // 同じマスではない
                            if ($rank === $toRank && $file === $toFile) {
                                continue;
                            }

                            // 合法的な指し手か確認
                            if ($this->isValidMove($boardState, $rank, $file, $toRank, $toFile, $color)) {
                                // 合法的な指し手がある = 詰みではない
                                return false;
                            }
                        }
                    }
                }
            }
        }

        // 手札の駒で打つ（drop）ことができるか確認
        if (!empty($hand[$color])) {
            // 盤面の全てのマスをチェック
            for ($rank = 1; $rank <= 9; $rank++) {
                for ($file = 1; $file <= 9; $file++) {
                    $targetPiece = $board[$rank][$file] ?? null;

                    // 空きマスの場合、駒を打つことができるか確認
                    if (!$targetPiece) {
                        foreach ($hand[$color] as $handPieceType => $count) {
                            if ($count > 0) {
                                // 手札の駒を打つことでcheck状態を解除できるか
                                $testBoard = $board;
                                $testBoard[$rank][$file] = ['type' => $handPieceType, 'color' => $color];

                                $testBoardState = [
                                    'board' => $testBoard,
                                    'hand' => $hand,
                                ];

                                // 王が安全か確認
                                $kingPos = $this->findKing($testBoard, $color);
                                if ($kingPos && !$this->isPositionUnderAttack($testBoard, $kingPos['rank'], $kingPos['file'], $color === 'sente' ? 'gote' : 'sente')) {
                                    // 合法的な打ちがある = 詰みではない
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 合法的な指し手がない = 詰み
        return true;
    }

    /**
     * 駒が成り対象かどうかを確認
     * 敵陣に到達した駒が成りの対象かチェック
     */
    public function canPromote(string $pieceType): bool
    {
        // 成ることができる駒：歩、香、桂、銀、角、飛
        // 成ることができない駒：金、玉
        return in_array($pieceType, ['fu', 'kyosha', 'keima', 'gin', 'kaku', 'hisha']);
    }

    /**
     * 駒が敵陣に到達したかどうかを確認
     */
    public function isInEnemyTerritory(int $rank, string $color): bool
    {
        if ($color === 'sente') {
            // 先手の敵陣は9段、8段、7段
            return $rank >= 7;
        } else {
            // 後手の敵陣は1段、2段、3段
            return $rank <= 3;
        }
    }

    /**
     * 指し手が成りの対象かどうかを確認
     * 移動先が敵陣で、かつ成り可能な駒の場合はtrue
     */
    public function shouldPromote(array $boardState, int $fromRank, int $fromFile, int $toRank, int $toFile): bool
    {
        $piece = $boardState['board'][$fromRank][$fromFile] ?? null;
        
        if (!$piece) {
            return false;
        }

        // 成り可能な駒か確認
        if (!$this->canPromote($piece['type'])) {
            return false;
        }

        // 移動先が敵陣か確認
        return $this->isInEnemyTerritory($toRank, $piece['color']);
    }

    /**
     * 駒を成る（昇格）
     */
    public function promotePiece(string $pieceType): string
    {
        $promotionMap = [
            'fu' => 'tokin',           // 歩 → と金
            'kyosha' => 'nkyosha',     // 香 → 成香
            'keima' => 'nkeima',       // 桂 → 成桂
            'gin' => 'ngin',           // 銀 → 成銀
            'kaku' => 'uma',           // 角 → 馬（竜馬）
            'hisha' => 'ryu',          // 飛 → 龍（竜王）
        ];

        return $promotionMap[$pieceType] ?? $pieceType;
    }

    /**
     * 成った駒の名前を取得
     */
    public function getPromotedPieceName(string $pieceType): string
    {
        $promotedNames = [
            'tokin' => 'と金',
            'nkyosha' => '成香',
            'nkeima' => '成桂',
            'ngin' => '成銀',
            'uma' => '馬',
            'ryu' => '龍',
        ];

        return $promotedNames[$pieceType] ?? $this->getPieceName($pieceType);
    }

    /**
     * 駒の日本語名前を取得（成った駒対応）
     */
    public function getPieceNameJapanese(string $pieceType): string
    {
        $japaneseNames = [
            'fu' => '歩',
            'kyosha' => '香',
            'keima' => '桂',
            'gin' => '銀',
            'kin' => '金',
            'kaku' => '角',
            'hisha' => '飛',
            'gyoku' => '玉',
            'ou' => '王',
            'tokin' => 'と金',
            'nkyosha' => '成香',
            'nkeima' => '成桂',
            'ngin' => '成銀',
            'uma' => '馬',
            'ryu' => '龍',
        ];

        return $japaneseNames[$pieceType] ?? ucfirst($pieceType);
    }
}
