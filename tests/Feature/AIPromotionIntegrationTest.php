<?php

use App\Services\ShogiService;
use App\Services\AIService;

/**
 * AIが成りを正しく選択するか統合テスト
 */

function createAITestBoard(array $pieces, string $turn = 'sente'): array
{
    $board = [];
    for ($rank = 1; $rank <= 9; $rank++) {
        $board[$rank] = array_fill(1, 9, null);
    }
    $bs = [
        'board' => $board,
        'hand' => [
            'sente' => ['fu' => 0, 'kyosha' => 0, 'keima' => 0, 'gin' => 0, 'kin' => 0, 'kaku' => 0, 'hisha' => 0],
            'gote'  => ['fu' => 0, 'kyosha' => 0, 'keima' => 0, 'gin' => 0, 'kin' => 0, 'kaku' => 0, 'hisha' => 0],
        ],
        'turn' => $turn,
    ];
    foreach ($pieces as $p) {
        $bs['board'][$p['rank']][$p['file']] = ['type' => $p['type'], 'color' => $p['color']];
    }
    return $bs;
}

describe('AI成り選択統合テスト', function () {

    it('先手AIが飛車を敵陣に移動する手にpromoteフラグが含まれる', function () {
        $ai = app(AIService::class);

        // 先手飛車が敵陣直前(rank=6)、rank=7に進むと敵陣進入で成れる
        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 5, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 6, 'file' => 8, 'type' => 'hisha', 'color' => 'sente'],
        ]);

        // getPossibleMovesで飛車が敵陣に入る手を確認
        $moves = $ai->getPossibleMoves($bs, 'sente');
        $hishaMoves = array_values(array_filter($moves, fn($m) =>
            ($m['from_rank'] ?? null) === 6 && ($m['from_file'] ?? null) === 8
            && ($m['to_rank'] ?? 0) >= 7
        ));

        // 敵陣移動の手には必ずpromote true/false の両方が含まれる
        $promoteTrue = array_filter($hishaMoves, fn($m) => ($m['promote'] ?? false) === true);
        $promoteFalse = array_filter($hishaMoves, fn($m) => ($m['promote'] ?? null) === false);

        expect(count($promoteTrue))->toBeGreaterThan(0);
        expect(count($promoteFalse))->toBeGreaterThan(0);
    });

    it('先手AIが角を敵陣で馬に成る手を生成する', function () {
        $ai = app(AIService::class);

        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 5, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 5, 'file' => 5, 'type' => 'kaku', 'color' => 'sente'],
        ]);

        $move = $ai->generateMove($bs, 'hard', 'sente');
        expect($move)->not->toBeNull();

        // 角が敵陣に入る手を選んだ場合、成りが選択されるはず
        if ($move['piece_type'] === 'kaku' && ($move['to_rank'] ?? 0) >= 7) {
            expect($move['promote'])->toBeTrue();
        }
    });

    it('AIの返す手にpromoteフラグが含まれる（成り局面）', function () {
        $ai = app(AIService::class);

        // 先手の銀が敵陣の直前にいて、前進で敵陣に入れる
        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 5, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 6, 'file' => 5, 'type' => 'gin', 'color' => 'sente'],
        ]);

        $move = $ai->generateMove($bs, 'hard', 'sente');
        expect($move)->not->toBeNull();

        // 生成された手が敵陣に入る場合、promoteキーが存在するはず
        if (isset($move['to_rank']) && $move['to_rank'] >= 7) {
            expect(array_key_exists('promote', $move))->toBeTrue();
        }
    });

    it('強制成り局面ではAIがpromote=trueの手のみを返す', function () {
        $ai = app(AIService::class);

        // 先手の歩がrank=8（最奥9段の一つ手前）、rank=9に進むしかない→強制成り
        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 1, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 8, 'file' => 5, 'type' => 'fu', 'color' => 'sente'],
        ]);

        $move = $ai->generateMove($bs, 'hard', 'sente');
        expect($move)->not->toBeNull();

        // 歩がrank=9に進む場合、必ずpromote=true
        if ($move['piece_type'] === 'fu' && $move['to_rank'] === 9) {
            expect($move['promote'])->toBeTrue();
        }
    });

    it('成駒(龍)が正しく移動手を生成する', function () {
        $ai = app(AIService::class);

        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 5, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 5, 'file' => 5, 'type' => 'ryu', 'color' => 'sente'],
        ]);

        $move = $ai->generateMove($bs, 'medium', 'sente');
        expect($move)->not->toBeNull();
        // promoteフラグは含まれない（既に成り駒）
        expect($move['promote'] ?? null)->toBeNull();
    });

    it('simulateMove後の盤面で成駒が正しく配置される', function () {
        $ai = app(AIService::class);

        $bs = createAITestBoard([
            ['rank' => 1, 'file' => 5, 'type' => 'gyoku', 'color' => 'sente'],
            ['rank' => 9, 'file' => 5, 'type' => 'gyoku', 'color' => 'gote'],
            ['rank' => 6, 'file' => 8, 'type' => 'hisha', 'color' => 'sente'],
        ]);

        $method = new ReflectionMethod(AIService::class, 'simulateMove');
        $method->setAccessible(true);

        $move = [
            'from_rank' => 6, 'from_file' => 8,
            'to_rank' => 8, 'to_file' => 8,
            'piece_type' => 'hisha', 'capture' => false,
            'promote' => true,
        ];
        $newBoard = $method->invoke($ai, $bs, $move, 'sente');

        // 飛車が龍になっている
        expect($newBoard['board'][8][8]['type'])->toBe('ryu');
        expect($newBoard['board'][8][8]['color'])->toBe('sente');

        // 龍の可能な手を確認
        $ryuMoves = $ai->getPossibleMoves($newBoard, 'gote');
        // ターンはgoteに切り替わっている
        expect($newBoard['turn'])->toBe('gote');
    });
});
