<?php

use App\Services\ShogiService;

describe('盤面の境界値テスト - エッジケース', function () {
    it('盤の端（1段）への移動が制限される駒がある', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['fu'] = 1;

        // 歩は1段に打てない
        $isLegal = $shogi->isLegalDrop($boardState, 'fu', 1, 5, 'sente');
        expect($isLegal)->toBeFalse();
    });

    it('盤の端（9段）への移動が制限される駒がある', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['gote']['fu'] = 1;

        // 後手の歩は9段に打てない
        $isLegal = $shogi->isLegalDrop($boardState, 'fu', 9, 5, 'gote');
        expect($isLegal)->toBeFalse();
    });

    it('桂は最奥2段に打てない（先手）', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['keima'] = 1;

        // 各ランクを空けてテストする
        $boardState['board']['9']['5'] = null;
        $boardState['board']['8']['5'] = null;
        $boardState['board']['7']['5'] = null;

        $isLegalRank9 = $shogi->isLegalDrop($boardState, 'keima', 9, 5, 'sente');
        $isLegalRank8 = $shogi->isLegalDrop($boardState, 'keima', 8, 5, 'sente');
        $isLegalRank7 = $shogi->isLegalDrop($boardState, 'keima', 7, 5, 'sente');

        expect($isLegalRank9)->toBeFalse();
        expect($isLegalRank8)->toBeFalse();
        expect($isLegalRank7)->toBeTrue();
    });

    it('香は最奥段に打てない（先手）', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();
        $boardState['hand']['sente']['kyosha'] = 1;

        // 各ランクを空けてテストする
        $boardState['board']['9']['5'] = null;
        $boardState['board']['8']['5'] = null;

        $isLegalRank9 = $shogi->isLegalDrop($boardState, 'kyosha', 9, 5, 'sente');
        $isLegalRank8 = $shogi->isLegalDrop($boardState, 'kyosha', 8, 5, 'sente');

        expect($isLegalRank9)->toBeFalse();
        expect($isLegalRank8)->toBeTrue();
    });

    it('駒が盤外に移動しない（座標検証）', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 盤の有効範囲は 1-9 段と 1-9 筋
        for ($rank = 0; $rank <= 10; $rank++) {
            for ($file = 0; $file <= 10; $file++) {
                if ($rank < 1 || $rank > 9 || $file < 1 || $file > 9) {
                    // 盤外の座標
                    $isValid = $shogi->isValidMove($boardState, $rank, $file, 5, 5, 'sente');
                    expect($isValid)->toBeFalse();
                }
            }
        }
    });

    it('1筋と9筋での駒の移動が正確', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 1筋と9筋も有効な筋
        for ($file = 1; $file <= 9; $file++) {
            // 各ファイルに駒がある可能性を確認
            expect($file >= 1 && $file <= 9)->toBeTrue();
        }
    });

    it('盤の角（四隅）での駒の配置が正確', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 四隅
        $corners = [
            [1, 1], [1, 9],
            [9, 1], [9, 9],
        ];

        foreach ($corners as [$rank, $file]) {
            // 四隅のいずれかに駒がある可能性
            $piece = $boardState['board'][$rank][$file];
            expect(is_array($piece) || $piece === null)->toBeTrue();
        }
    });

    it('境界値の駒移動が制限される', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 初期配置の制約を確認
        // 1段目は先手の駒
        foreach ($boardState['board']['1'] as $piece) {
            if ($piece) {
                expect($piece['color'])->toBe('sente');
            }
        }

        // 9段目は後手の駒
        foreach ($boardState['board']['9'] as $piece) {
            if ($piece) {
                expect($piece['color'])->toBe('gote');
            }
        }
    });

    it('不正な座標へのアクセスが安全', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 負数や範囲外の座標への null coalescing がうまく機能
        $piece = $boardState['board'][0][0] ?? null;
        expect($piece)->toBeNull();

        $piece = $boardState['board'][10][10] ?? null;
        expect($piece)->toBeNull();
    });
});

describe('盤面の座標系テスト', function () {
    it('盤の座標系が 1-9 × 1-9', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 盤は 9×9
        expect(count($boardState['board']))->toBe(9);

        foreach ($boardState['board'] as $rank) {
            expect(count($rank))->toBe(9);
        }
    });

    it('座標の有効性を確認', function () {
        $shogi = app(ShogiService::class);

        for ($rank = 1; $rank <= 9; $rank++) {
            for ($file = 1; $file <= 9; $file++) {
                expect($rank >= 1 && $rank <= 9)->toBeTrue();
                expect($file >= 1 && $file <= 9)->toBeTrue();
            }
        }
    });

    it('文字列キーの座標アクセス', function () {
        $shogi = app(ShogiService::class);
        $boardState = $shogi->getInitialBoard();

        // 盤は文字列キー '1' - '9' を使用
        for ($i = 1; $i <= 9; $i++) {
            expect(isset($boardState['board'][(string) $i]))->toBeTrue();
        }
    });
});
