<?php

use App\Console\Commands\EngineBattle;
use App\Services\ShogiService;
use App\Services\AIService;

/**
 * EngineBattle USI座標変換テスト
 */
describe('USI座標変換', function () {

    beforeEach(function () {
        $this->command = new EngineBattle(
            app(ShogiService::class),
            app(AIService::class)
        );
        $this->usiToMove = new ReflectionMethod(EngineBattle::class, 'usiToMove');
        $this->usiToMove->setAccessible(true);
        $this->moveToUSI = new ReflectionMethod(EngineBattle::class, 'moveToUSI');
        $this->moveToUSI->setAccessible(true);
    });

    it('USI 7g7f が正しくアプリ座標に変換される', function () {
        // USI: 7g7f → file=7, rank=g(7) → file=7, rank=f(6)
        // app: file = 10-7 = 3, rank = 10-7 = 3 → 10-6 = 4
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $move = $this->usiToMove->invoke($this->command, '7g7f', $bs, 'sente');

        expect($move['from_file'])->toBe(3);
        expect($move['from_rank'])->toBe(3);
        expect($move['to_file'])->toBe(3);
        expect($move['to_rank'])->toBe(4);
    });

    it('USI 2g2f が正しくアプリ座標に変換される', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $move = $this->usiToMove->invoke($this->command, '2g2f', $bs, 'sente');

        // USI file=2 → app file = 10-2 = 8
        // USI rank=g(7) → app rank = 10-7 = 3
        // USI rank=f(6) → app rank = 10-6 = 4
        expect($move['from_file'])->toBe(8);
        expect($move['from_rank'])->toBe(3);
        expect($move['to_file'])->toBe(8);
        expect($move['to_rank'])->toBe(4);
    });

    it('通常移動の双方向変換が一致する', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $usi = '7g7f';
        $move = $this->usiToMove->invoke($this->command, $usi, $bs, 'sente');
        $result = $this->moveToUSI->invoke($this->command, $move);

        expect($result)->toBe($usi);
    });

    it('成り付き移動の双方向変換が一致する', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();
        // 2段の角(sente)を3cに成る移動をシミュレート
        // USI: 8h2b+ (角が8hから2bへ成り)
        $bs['board'][2][2] = ['type' => 'kaku', 'color' => 'sente']; // アプリ座標(2,2)

        $usi = '8h2b+';
        $move = $this->usiToMove->invoke($this->command, $usi, $bs, 'sente');

        expect($move['promote'])->toBeTrue();
        expect($move['from_file'])->toBe(2);  // 10-8=2
        expect($move['from_rank'])->toBe(2);  // 10-8(h)=2

        $result = $this->moveToUSI->invoke($this->command, $move);
        expect($result)->toBe($usi);
    });

    it('駒打ちUSI P*5e が正しく変換される', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $move = $this->usiToMove->invoke($this->command, 'P*5e', $bs, 'sente');

        // USI: P*5e → file=5, rank=e(5)
        // app: file = 10-5 = 5, rank = 10-5 = 5
        expect($move['is_drop'])->toBeTrue();
        expect($move['piece_type'])->toBe('fu');
        expect($move['to_file'])->toBe(5);
        expect($move['to_rank'])->toBe(5);
    });

    it('駒打ちの双方向変換が一致する', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $usi = 'P*5e';
        $move = $this->usiToMove->invoke($this->command, $usi, $bs, 'sente');
        $result = $this->moveToUSI->invoke($this->command, $move);

        expect($result)->toBe($usi);
    });

    it('各駒種の打ちUSI変換が正しい', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        $testCases = [
            ['usi' => 'L*3d', 'type' => 'kyosha', 'to_file' => 7, 'to_rank' => 6],
            ['usi' => 'N*4c', 'type' => 'keima', 'to_file' => 6, 'to_rank' => 7],
            ['usi' => 'S*6f', 'type' => 'gin', 'to_file' => 4, 'to_rank' => 4],
            ['usi' => 'G*7e', 'type' => 'kin', 'to_file' => 3, 'to_rank' => 5],
            ['usi' => 'B*5e', 'type' => 'kaku', 'to_file' => 5, 'to_rank' => 5],
            ['usi' => 'R*1a', 'type' => 'hisha', 'to_file' => 9, 'to_rank' => 9],
        ];

        foreach ($testCases as $tc) {
            $move = $this->usiToMove->invoke($this->command, $tc['usi'], $bs, 'sente');
            expect($move['piece_type'])->toBe($tc['type']);
            expect($move['to_file'])->toBe($tc['to_file']);
            expect($move['to_rank'])->toBe($tc['to_rank']);
        }
    });

    it('端の座標(1a, 9i)の変換が正しい', function () {
        $shogi = app(ShogiService::class);
        $bs = $shogi->getInitialBoard();

        // 1a: file=1, rank=a(1) → app file=10-1=9, rank=10-1=9
        $move1 = $this->usiToMove->invoke($this->command, 'P*1a', $bs, 'sente');
        expect($move1['to_file'])->toBe(9);
        expect($move1['to_rank'])->toBe(9);

        // 9i: file=9, rank=i(9) → app file=10-9=1, rank=10-9=1
        $move2 = $this->usiToMove->invoke($this->command, 'P*9i', $bs, 'sente');
        expect($move2['to_file'])->toBe(1);
        expect($move2['to_rank'])->toBe(1);
    });
});
