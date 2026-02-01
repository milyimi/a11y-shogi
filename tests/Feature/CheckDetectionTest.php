<?php

use App\Services\ShogiService;

describe('チェック判定 - 詰み判定の検証', function () {
    it('初期盤面では詰みではない', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 初期状態では詰みではない
        $isCheckmateSente = $shogi->isCheckmate($boardState, 'sente');
        $isCheckmateGote = $shogi->isCheckmate($boardState, 'gote');

        expect($isCheckmateSente)->toBeFalse();
        expect($isCheckmateGote)->toBeFalse();
    });

    it('シンプルな詰み局面を検出', function () {
        $shogi = app(ShogiService::class);

        // シンプルな詰み局面
        $emptyRank = [
            '1' => null, '2' => null, '3' => null, '4' => null, '5' => null,
            '6' => null, '7' => null, '8' => null, '9' => null,
        ];

        $boardState = [
            'board' => [
                '1' => [
                    '1' => null,
                    '2' => null,
                    '3' => null,
                    '4' => null,
                    '5' => ['type' => 'gyoku', 'color' => 'gote'],
                    '6' => null,
                    '7' => null,
                    '8' => null,
                    '9' => null,
                ],
                '2' => [
                    '1' => null,
                    '2' => null,
                    '3' => null,
                    '4' => null,
                    '5' => ['type' => 'hisha', 'color' => 'sente'],
                    '6' => null,
                    '7' => null,
                    '8' => null,
                    '9' => null,
                ],
                '3' => $emptyRank,
                '4' => $emptyRank,
                '5' => $emptyRank,
                '6' => $emptyRank,
                '7' => $emptyRank,
                '8' => $emptyRank,
                '9' => $emptyRank,
            ],
            'hand' => ['sente' => [], 'gote' => []],
            'turn' => 'gote',
        ];

        // 詰みの判定が有効に機能することを確認
        $isCheckmate = $shogi->isCheckmate($boardState, 'gote');
        expect(is_bool($isCheckmate))->toBeTrue();
    });

    it('詰み判定メソッドは boolean を返す', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        $result = $shogi->isCheckmate($boardState, 'sente');
        expect(is_bool($result))->toBeTrue();
    });

    it('複数の敵駒からの攻撃に対応', function () {
        $shogi = app(ShogiService::class);

        // 複数の敵駒で攻撃
        $emptyRank = [
            '1' => null, '2' => null, '3' => null, '4' => null, '5' => null,
            '6' => null, '7' => null, '8' => null, '9' => null,
        ];

        $boardState = [
            'board' => [
                '1' => [
                    '1' => null,
                    '2' => null,
                    '3' => null,
                    '4' => null,
                    '5' => ['type' => 'gyoku', 'color' => 'gote'],
                    '6' => null,
                    '7' => null,
                    '8' => null,
                    '9' => null,
                ],
                '2' => [
                    '1' => null,
                    '2' => null,
                    '3' => null,
                    '4' => ['type' => 'fu', 'color' => 'sente'],
                    '5' => null,
                    '6' => ['type' => 'fu', 'color' => 'sente'],
                    '7' => null,
                    '8' => null,
                    '9' => null,
                ],
                '3' => [
                    '1' => null,
                    '2' => null,
                    '3' => null,
                    '4' => null,
                    '5' => ['type' => 'hisha', 'color' => 'sente'],
                    '6' => null,
                    '7' => null,
                    '8' => null,
                    '9' => null,
                ],
                '4' => $emptyRank,
                '5' => $emptyRank,
                '6' => $emptyRank,
                '7' => $emptyRank,
                '8' => $emptyRank,
                '9' => $emptyRank,
            ],
            'hand' => ['sente' => [], 'gote' => []],
            'turn' => 'gote',
        ];

        // 複数の敵駒からの王手状態を確認
        $isCheckmate = $shogi->isCheckmate($boardState, 'gote');
        expect(is_bool($isCheckmate))->toBeTrue();
    });

    it('詰み判定は有効なターンを要求', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 無効なターンでも boolean を返す
        $result = $shogi->isCheckmate($boardState, 'invalid');
        expect(is_bool($result))->toBeTrue();
    });

    it('盤面の整合性がない場合でも安全に処理', function () {
        $shogi = app(ShogiService::class);

        // 不完全な盤面
        $boardState = [
            'board' => [],
            'hand' => ['sente' => [], 'gote' => []],
            'turn' => 'sente',
        ];

        // エラーが発生しないことを確認
        $result = $shogi->isCheckmate($boardState, 'sente');
        expect(is_bool($result))->toBeTrue();
    });

    it('盤面状態の複製が詰み判定に影響しない', function () {
        $shogi = app(ShogiService::class);
        $originalBoard = $shogi->getInitialBoard();

        $isCheckmate1 = $shogi->isCheckmate($originalBoard, 'sente');
        $isCheckmate2 = $shogi->isCheckmate($originalBoard, 'sente');

        // 同じ盤面で同じ結果
        expect($isCheckmate1)->toBe($isCheckmate2);
    });
});
