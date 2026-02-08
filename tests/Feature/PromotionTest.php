<?php

use App\Services\ShogiService;
use App\Services\AIService;

/**
 * 成り手生成・成駒移動パターン・simulateMove成り処理のテスト
 */

// ── ヘルパー関数 ──

function createEmptyBoard(): array
{
    $board = [];
    for ($rank = 1; $rank <= 9; $rank++) {
        $board[$rank] = array_fill(1, 9, null);
    }
    return [
        'board' => $board,
        'hand' => [
            'sente' => ['fu' => 0, 'kyosha' => 0, 'keima' => 0, 'gin' => 0, 'kin' => 0, 'kaku' => 0, 'hisha' => 0],
            'gote'  => ['fu' => 0, 'kyosha' => 0, 'keima' => 0, 'gin' => 0, 'kin' => 0, 'kaku' => 0, 'hisha' => 0],
        ],
        'turn' => 'sente',
    ];
}

function createMinimalBoard(array $pieces): array
{
    $bs = createEmptyBoard();
    // 玉は必須
    $bs['board'][1][5] = ['type' => 'gyoku', 'color' => 'sente'];
    $bs['board'][9][5] = ['type' => 'gyoku', 'color' => 'gote'];
    foreach ($pieces as $p) {
        $bs['board'][$p['rank']][$p['file']] = ['type' => $p['type'], 'color' => $p['color']];
    }
    return $bs;
}

function extractMovesForPiece(array $moves, int $fromRank, int $fromFile): array
{
    return array_values(array_filter($moves, fn($m) =>
        ($m['from_rank'] ?? null) === $fromRank && ($m['from_file'] ?? null) === $fromFile
    ));
}

function extractDestinations(array $moves): array
{
    return array_map(fn($m) => [$m['to_rank'], $m['to_file']], $moves);
}

// ── 成り手生成テスト ──

describe('getPossibleMoves 成り手生成', function () {

    it('先手の歩が敵陣(7段)に進入時、promote=trueとfalseの両方が生成される', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 3, 'type' => 'fu', 'color' => 'sente'],
        ]);
        $bs['turn'] = 'sente';

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $fuMoves = extractMovesForPiece($moves, 6, 3);
        $toR7 = array_filter($fuMoves, fn($m) => $m['to_rank'] === 7 && $m['to_file'] === 3);

        expect(count($toR7))->toBe(2);
        $promotes = array_column(array_values($toR7), 'promote');
        sort($promotes);
        expect($promotes)->toBe([false, true]);
    });

    it('先手の歩が敵陣(7段)に既にいて8段へ進む場合も成り/不成の両方生成', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 7, 'file' => 5, 'type' => 'fu', 'color' => 'sente'],
        ]);
        // 歩が7段→8段 (敵陣内移動)
        $moves = $ai->getPossibleMoves($bs, 'sente');
        $fuMoves = extractMovesForPiece($moves, 7, 5);
        $toR8 = array_filter($fuMoves, fn($m) => $m['to_rank'] === 8 && $m['to_file'] === 5);

        expect(count($toR8))->toBe(2);
    });

    it('金将は成り候補を含まない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'kin', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $kinMoves = extractMovesForPiece($moves, 6, 5);

        foreach ($kinMoves as $m) {
            expect(array_key_exists('promote', $m))->toBeFalse();
        }
    });

    it('玉は成り候補を含まない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        // 先手玉 (1,5) の手
        $gyokuMoves = extractMovesForPiece($moves, 1, 5);

        foreach ($gyokuMoves as $m) {
            expect(array_key_exists('promote', $m))->toBeFalse();
        }
    });

    it('既に成った駒(ryu)は成り候補を含まない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'ryu', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $ryuMoves = extractMovesForPiece($moves, 5, 5);

        foreach ($ryuMoves as $m) {
            expect(array_key_exists('promote', $m))->toBeFalse();
        }
    });

    it('既に成った駒(uma)は成り候補を含まない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'uma', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $umaMoves = extractMovesForPiece($moves, 5, 5);

        foreach ($umaMoves as $m) {
            expect(array_key_exists('promote', $m))->toBeFalse();
        }
    });

    it('敵陣外の歩は成り候補を含まない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 4, 'file' => 3, 'type' => 'fu', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $fuMoves = extractMovesForPiece($moves, 4, 3);

        foreach ($fuMoves as $m) {
            expect(array_key_exists('promote', $m))->toBeFalse();
        }
    });

    it('後手の歩が敵陣(3段)に進入時、成り/不成の両方が生成される', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 4, 'file' => 3, 'type' => 'fu', 'color' => 'gote'],
        ]);
        $bs['turn'] = 'gote';

        $moves = $ai->getPossibleMoves($bs, 'gote');
        $fuMoves = extractMovesForPiece($moves, 4, 3);
        $toR3 = array_filter($fuMoves, fn($m) => $m['to_rank'] === 3 && $m['to_file'] === 3);

        expect(count($toR3))->toBe(2);
    });
});

// ── 強制成りテスト ──

describe('getPossibleMoves 強制成り', function () {

    it('先手の歩が最奥段(9段)に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 8, 'file' => 3, 'type' => 'fu', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $fuMoves = extractMovesForPiece($moves, 8, 3);
        $toR9 = array_values(array_filter($fuMoves, fn($m) => $m['to_rank'] === 9 && $m['to_file'] === 3));

        expect(count($toR9))->toBe(1);
        expect($toR9[0]['promote'])->toBeTrue();
    });

    it('先手の香が最奥段(9段)に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 8, 'file' => 3, 'type' => 'kyosha', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $kyMoves = extractMovesForPiece($moves, 8, 3);
        $toR9 = array_values(array_filter($kyMoves, fn($m) => $m['to_rank'] === 9 && $m['to_file'] === 3));

        expect(count($toR9))->toBe(1);
        expect($toR9[0]['promote'])->toBeTrue();
    });

    it('先手の桂馬が最奥段(9段)に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 7, 'file' => 5, 'type' => 'keima', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $kmMoves = extractMovesForPiece($moves, 7, 5);
        $toR9 = array_values(array_filter($kmMoves, fn($m) => $m['to_rank'] === 9));

        foreach ($toR9 as $m) {
            expect($m['promote'])->toBeTrue();
        }
    });

    it('先手の桂馬が8段に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'keima', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $kmMoves = extractMovesForPiece($moves, 6, 5);
        $toR8 = array_values(array_filter($kmMoves, fn($m) => $m['to_rank'] === 8));

        foreach ($toR8 as $m) {
            expect($m['promote'])->toBeTrue();
        }
    });

    it('後手の歩が最奥段(1段)に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 2, 'file' => 3, 'type' => 'fu', 'color' => 'gote'],
        ]);
        $bs['turn'] = 'gote';

        $moves = $ai->getPossibleMoves($bs, 'gote');
        $fuMoves = extractMovesForPiece($moves, 2, 3);
        $toR1 = array_values(array_filter($fuMoves, fn($m) => $m['to_rank'] === 1 && $m['to_file'] === 3));

        expect(count($toR1))->toBe(1);
        expect($toR1[0]['promote'])->toBeTrue();
    });

    it('後手の桂馬が2段に到達時は成りのみ', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 4, 'file' => 5, 'type' => 'keima', 'color' => 'gote'],
        ]);
        $bs['turn'] = 'gote';

        $moves = $ai->getPossibleMoves($bs, 'gote');
        $kmMoves = extractMovesForPiece($moves, 4, 5);
        $toR2 = array_values(array_filter($kmMoves, fn($m) => $m['to_rank'] === 2));

        foreach ($toR2 as $m) {
            expect($m['promote'])->toBeTrue();
        }
    });

    it('先手の歩が敵陣7段へ進入（最奥でない）なら成り/不成の両方', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 3, 'type' => 'fu', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $fuMoves = extractMovesForPiece($moves, 6, 3);
        $toR7 = array_values(array_filter($fuMoves, fn($m) => $m['to_rank'] === 7 && $m['to_file'] === 3));

        expect(count($toR7))->toBe(2);
        $promotes = array_column($toR7, 'promote');
        expect(in_array(true, $promotes, true))->toBeTrue();
        expect(in_array(false, $promotes, true))->toBeTrue();
    });
});

// ── 成駒の移動パターンテスト ──

describe('成駒の移動パターン', function () {

    it('龍(ryu)は飛車の動き+斜め1マスに移動できる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'ryu', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $ryuMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($ryuMoves);

        // 斜め1マス4方向
        expect(in_array([4, 4], $dests))->toBeTrue();
        expect(in_array([4, 6], $dests))->toBeTrue();
        expect(in_array([6, 4], $dests))->toBeTrue();
        expect(in_array([6, 6], $dests))->toBeTrue();

        // 直線移動（飛車部分）
        // (1,5)は先手玉がいるので到達不可、(2,5)まで
        expect(in_array([2, 5], $dests))->toBeTrue();
        expect(in_array([9, 5], $dests))->toBeTrue(); // 後手玉=9,5 を取れる
        expect(in_array([5, 1], $dests))->toBeTrue();
        expect(in_array([5, 9], $dests))->toBeTrue();

        // 斜め2マスには行けない（龍は斜め1マスのみ）
        expect(in_array([3, 3], $dests))->toBeFalse();
        expect(in_array([7, 7], $dests))->toBeFalse();
    });

    it('馬(uma)は角の動き+縦横1マスに移動できる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'uma', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $umaMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($umaMoves);

        // 縦横1マス
        expect(in_array([4, 5], $dests))->toBeTrue();
        expect(in_array([6, 5], $dests))->toBeTrue();
        expect(in_array([5, 4], $dests))->toBeTrue();
        expect(in_array([5, 6], $dests))->toBeTrue();

        // 斜め遠距離（角部分）
        expect(in_array([1, 1], $dests))->toBeTrue();
        expect(in_array([9, 9], $dests))->toBeTrue();
        expect(in_array([1, 9], $dests))->toBeTrue();

        // 縦横2マスには行けない（馬は縦横1マスのみ）
        expect(in_array([3, 5], $dests))->toBeFalse();
        expect(in_array([7, 5], $dests))->toBeFalse();
    });

    it('成香(nkyosha)は金将と同じ動きをする', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'nkyosha', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $nkMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($nkMoves);

        // 先手の金の動き: 前3方向 + 横2方向 + 後ろ1方向
        // 先手の「前」= rank増加方向 (direction = -1 * rank) → 実装では $direction = -1
        // つまり getMovementPatterns の direction = -1 (sente)
        // [$direction, -1]=[-1,-1], [$direction, 0]=[-1,0], [$direction, 1]=[-1,1] → 前3 → これは先手=上方向=rank減少
        // 待って、先手は $direction=-1 なので [-1,0]は rank-1 = rank4方向（上） 
        // これは先手にとっての前方

        // 先手の金将の動き: direction=1
        // 前3方向(rank+1): (6,4), (6,5), (6,6)
        // 横: (5,4), (5,6)
        // 後ろ(rank-1, file=0): (4,5)
        expect(in_array([6, 4], $dests))->toBeTrue();  // 左前
        expect(in_array([6, 5], $dests))->toBeTrue();  // 前
        expect(in_array([6, 6], $dests))->toBeTrue();  // 右前
        expect(in_array([4, 5], $dests))->toBeTrue();  // 後ろ
        expect(in_array([5, 4], $dests))->toBeTrue();  // 左
        expect(in_array([5, 6], $dests))->toBeTrue();  // 右

        // 斜め後ろ（金将は行けない）
        expect(in_array([4, 4], $dests))->toBeFalse();
        expect(in_array([4, 6], $dests))->toBeFalse();
    });

    it('成桂(nkeima)は金将と同じ動きをする', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'nkeima', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $nkMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($nkMoves);

        // 金将と同じ6方向 (先手direction=1)
        expect(in_array([6, 4], $dests))->toBeTrue();
        expect(in_array([6, 5], $dests))->toBeTrue();
        expect(in_array([6, 6], $dests))->toBeTrue();
        expect(in_array([4, 5], $dests))->toBeTrue();
        expect(in_array([5, 4], $dests))->toBeTrue();
        expect(in_array([5, 6], $dests))->toBeTrue();
        // 斜め後ろ不可
        expect(in_array([4, 4], $dests))->toBeFalse();
        expect(in_array([4, 6], $dests))->toBeFalse();
    });

    it('成銀(ngin)は金将と同じ動きをする', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'ngin', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $ngMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($ngMoves);

        // 金将と同じ6方向 (先手direction=1)
        expect(in_array([6, 4], $dests))->toBeTrue();
        expect(in_array([6, 5], $dests))->toBeTrue();
        expect(in_array([6, 6], $dests))->toBeTrue();
        expect(in_array([4, 5], $dests))->toBeTrue();
        expect(in_array([5, 4], $dests))->toBeTrue();
        expect(in_array([5, 6], $dests))->toBeTrue();
        // 斜め後ろ不可
        expect(in_array([4, 4], $dests))->toBeFalse();
        expect(in_array([4, 6], $dests))->toBeFalse();
    });

    it('と金(tokin)は金将と同じ動きをする', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 5, 'file' => 5, 'type' => 'tokin', 'color' => 'sente'],
        ]);

        $moves = $ai->getPossibleMoves($bs, 'sente');
        $tkMoves = extractMovesForPiece($moves, 5, 5);
        $dests = extractDestinations($tkMoves);

        // 金将と同じ6方向 (先手direction=1)
        expect(in_array([6, 4], $dests))->toBeTrue();
        expect(in_array([6, 5], $dests))->toBeTrue();
        expect(in_array([6, 6], $dests))->toBeTrue();
        expect(in_array([4, 5], $dests))->toBeTrue();
        expect(in_array([5, 4], $dests))->toBeTrue();
        expect(in_array([5, 6], $dests))->toBeTrue();
        // 斜め後ろ不可
        expect(in_array([4, 4], $dests))->toBeFalse();
        expect(in_array([4, 6], $dests))->toBeFalse();
    });
});

// ── simulateMove 成り処理テスト ──

describe('simulateMove 成り処理', function () {

    it('promote=trueで歩がと金に変わる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 8, 'file' => 3, 'type' => 'fu', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 8, 'from_file' => 3,
            'to_rank' => 9, 'to_file' => 3,
            'piece_type' => 'fu', 'capture' => false,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][9][3]['type'])->toBe('tokin');
        expect($newBoard['board'][9][3]['color'])->toBe('sente');
        expect($newBoard['board'][8][3])->toBeNull();
    });

    it('promote=trueで飛車が龍に変わる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 8, 'type' => 'hisha', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 8,
            'to_rank' => 7, 'to_file' => 8,
            'piece_type' => 'hisha', 'capture' => false,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][7][8]['type'])->toBe('ryu');
    });

    it('promote=trueで角が馬に変わる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 2, 'type' => 'kaku', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 2,
            'to_rank' => 7, 'to_file' => 3,
            'piece_type' => 'kaku', 'capture' => false,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][7][3]['type'])->toBe('uma');
    });

    it('promote=trueで銀が成銀に変わる', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 5,
            'to_rank' => 7, 'to_file' => 5,
            'piece_type' => 'gin', 'capture' => false,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][7][5]['type'])->toBe('ngin');
    });

    it('promote=falseでは駒タイプが変わらない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 5,
            'to_rank' => 7, 'to_file' => 5,
            'piece_type' => 'gin', 'capture' => false,
            'promote' => false,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][7][5]['type'])->toBe('gin');
    });

    it('promoteキー未指定では駒タイプが変わらない', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 4, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 4, 'from_file' => 5,
            'to_rank' => 5, 'to_file' => 5,
            'piece_type' => 'gin', 'capture' => false,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        expect($newBoard['board'][5][5]['type'])->toBe('gin');
    });

    it('成り+駒取りの同時処理が正しく動く', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
            ['rank' => 7, 'file' => 5, 'type' => 'fu', 'color' => 'gote'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 5,
            'to_rank' => 7, 'to_file' => 5,
            'piece_type' => 'gin', 'capture' => true,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        // 銀が成銀に
        expect($newBoard['board'][7][5]['type'])->toBe('ngin');
        expect($newBoard['board'][7][5]['color'])->toBe('sente');
        // 取った歩は持ち駒に
        expect($newBoard['hand']['sente']['fu'])->toBe(1);
        // 元の位置は空
        expect($newBoard['board'][6][5])->toBeNull();
    });

    it('成り駒を取った場合は元の駒として持ち駒に入る', function () {
        $ai = app(AIService::class);
        $bs = createMinimalBoard([
            ['rank' => 6, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
            ['rank' => 7, 'file' => 5, 'type' => 'ryu', 'color' => 'gote'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 5,
            'to_rank' => 7, 'to_file' => 5,
            'piece_type' => 'gin', 'capture' => true,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        // 龍→飛車として持ち駒に
        expect($newBoard['hand']['sente']['hisha'])->toBe(1);
    });
});
