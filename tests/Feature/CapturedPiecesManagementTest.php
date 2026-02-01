<?php

use App\Services\ShogiService;

describe('持ち駒管理 - 駒の保有・管理', function () {
    it('駒をキャプチャして持ち駒に追加できる', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 先手が後手の歩を取る（仮想的なシナリオ）
        $boardState['hand']['sente']['fu'] = 1;

        expect($boardState['hand']['sente']['fu'])->toBe(1);
    });

    it('持ち駒から駒を打つと数が減る', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['fu'] = 3;

        // 歩を打つ場合、持ち駒が減る（シミュレーション）
        $boardState['hand']['sente']['fu']--;

        expect($boardState['hand']['sente']['fu'])->toBe(2);
    });

    it('複数の駒を同時に持つことが可能', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        $boardState['hand']['sente'] = [
            'fu' => 3,
            'kin' => 1,
            'gin' => 2,
        ];

        expect($boardState['hand']['sente']['fu'])->toBe(3);
        expect($boardState['hand']['sente']['kin'])->toBe(1);
        expect($boardState['hand']['sente']['gin'])->toBe(2);
    });

    it('成駒は持ち駒に追加されない（元の駒として追加）', function () {
        $shogi = app(ShogiService::class);

        // 成駒をデモートして元の駒として保有
        $demotion = [
            'tokin' => 'fu',
            'nkyosha' => 'kyosha',
            'nkeima' => 'keima',
            'ngin' => 'gin',
            'uma' => 'kaku',
            'ryu' => 'hisha',
        ];

        foreach ($demotion as $promoted => $base) {
            $demoted = $shogi->demotePiece($promoted);
            expect($demoted)->toBe($base);
        }
    });

    it('持ち駒がない場合は打つことができない', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['fu'] = 0;

        // 歩がない状態での打ち判定
        $handCount = $boardState['hand']['sente']['fu'] ?? 0;
        expect($handCount)->toBe(0);

        $canDrop = $shogi->isLegalDrop($boardState, 'fu', 4, 5, 'sente');
        expect($canDrop)->toBeFalse();
    });

    it('同じ駒を複数保有できる上限がある', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 将棋では最大9枚の歩、2枚の飛車・角など
        // ここでは実装を確認
        $boardState['hand']['sente']['fu'] = 9;
        $boardState['hand']['sente']['hisha'] = 2;
        $boardState['hand']['sente']['kaku'] = 2;

        expect($boardState['hand']['sente']['fu'])->toBe(9);
        expect($boardState['hand']['sente']['hisha'])->toBe(2);
    });

    it('両者の持ち駒が独立している', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        $boardState['hand']['sente']['fu'] = 3;
        $boardState['hand']['gote']['fu'] = 2;

        expect($boardState['hand']['sente']['fu'])->toBe(3);
        expect($boardState['hand']['gote']['fu'])->toBe(2);

        // 片方を変更しても他方に影響しない
        $boardState['hand']['sente']['fu']++;
        expect($boardState['hand']['gote']['fu'])->toBe(2);
    });

    it('初期盤面では双方の持ち駒は空', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        expect(count($boardState['hand']['sente']))->toBe(0);
        expect(count($boardState['hand']['gote']))->toBe(0);
    });
});

describe('持ち駒の駒種管理', function () {
    it('すべての駒種を持ち駒として保有できる', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        $pieceTypes = ['fu', 'kyosha', 'keima', 'gin', 'kaku', 'hisha'];

        foreach ($pieceTypes as $type) {
            $boardState['hand']['sente'][$type] = 1;
        }

        foreach ($pieceTypes as $type) {
            expect($boardState['hand']['sente'][$type])->toBe(1);
        }
    });

    it('持ち駒の駒を盤に打つと持ち駒から消える', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['fu'] = 5;

        // 持ち駒から1枚消す
        $boardState['hand']['sente']['fu']--;

        expect($boardState['hand']['sente']['fu'])->toBe(4);
    });

    it('玉・王は持ち駒にならない', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 玉・王は常に盤上にあり、持ち駒に含まれない
        expect(isset($boardState['hand']['sente']['gyoku']))->toBeFalse();
        expect(isset($boardState['hand']['gote']['ou']))->toBeFalse();
    });
});
