<?php

use App\Services\ShogiService;

it('二歩は禁止される', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();
    $boardState['hand']['sente']['fu'] = 1;

    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 5, 5, 'sente');

    expect($isLegal)->toBeFalse();
})->group('smoke');

it('成駒がある列でも歩は打てる（成駒は二歩対象外）', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();

    // 先手の5筋の歩を除去して二歩条件を満たさないようにする
    $boardState['board'][3][5] = null;

    // 5筋に後手の「と」を配置
    $boardState['board'][5][5] = ['type' => 'tokin', 'color' => 'gote'];

    $boardState['hand']['sente']['fu'] = 1;

    // 打ち歩詰め判定をスキップして純粋に二歩判定のみ確認
    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 6, 5, 'sente', true);

    expect($isLegal)->toBeTrue();
});

it('同色のと金がある筋でも歩は打てる（打ち歩詰め判定込み）', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();

    // 先手の5筋の歩を除去して二歩条件を満たさないようにする
    $boardState['board'][3][5] = null;

    // 5筋に先手の「と」を配置
    $boardState['board'][5][5] = ['type' => 'tokin', 'color' => 'sente'];

    $boardState['hand']['sente']['fu'] = 1;

    // 打ち歩詰め判定を含めて確認
    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 6, 5, 'sente', false);

    expect($isLegal)->toBeTrue();
});

it('歩は最奥段に打てない', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();
    $boardState['hand']['sente']['fu'] = 1;

    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 9, 5, 'sente');

    expect($isLegal)->toBeFalse();
});

it('成駒は捕獲時に元の駒へ戻る', function () {
    $shogi = app(ShogiService::class);

    expect($shogi->demotePiece('tokin'))->toBe('fu');
    expect($shogi->demotePiece('nkyosha'))->toBe('kyosha');
    expect($shogi->demotePiece('nkeima'))->toBe('keima');
    expect($shogi->demotePiece('ngin'))->toBe('gin');
    expect($shogi->demotePiece('uma'))->toBe('kaku');
    expect($shogi->demotePiece('ryu'))->toBe('hisha');
    expect($shogi->demotePiece('fu'))->toBe('fu');
});

it('桂は最奥2段に打てない', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();
    $boardState['hand']['sente']['keima'] = 1;

    // 各ランクを空けてテストする
    $boardState['board'][9][5] = null;
    $boardState['board'][8][5] = null;
    $boardState['board'][7][5] = null;

    $isLegalRank9 = $shogi->isLegalDrop($boardState, 'keima', 9, 5, 'sente');
    $isLegalRank8 = $shogi->isLegalDrop($boardState, 'keima', 8, 5, 'sente');
    $isLegalRank7 = $shogi->isLegalDrop($boardState, 'keima', 7, 5, 'sente');

    expect($isLegalRank9)->toBeFalse();
    expect($isLegalRank8)->toBeFalse();
    expect($isLegalRank7)->toBeTrue();
});

it('香は最奥段に打てない', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();
    $boardState['hand']['sente']['kyosha'] = 1;

    // 各ランクを空けてテストする
    $boardState['board'][9][5] = null;
    $boardState['board'][8][5] = null;

    $isLegalRank9 = $shogi->isLegalDrop($boardState, 'kyosha', 9, 5, 'sente');
    $isLegalRank8 = $shogi->isLegalDrop($boardState, 'kyosha', 8, 5, 'sente');

    expect($isLegalRank9)->toBeFalse();
    expect($isLegalRank8)->toBeTrue();
});

it('歩は敵陣で成れる対象になり得る', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();

    // 先手の歩を敵陣（7段）に配置して、敵陣内での移動で成り判定を行う
    // 敵陣は7,8,9段なので、7段から6段への移動は敵陣外への移動となる
    // 代わりに敵陣内での移動（例：8段から7段）を確認
    $boardState['board']['8']['5'] = ['type' => 'fu', 'color' => 'sente'];
    $boardState['board']['3']['5'] = null;

    // 敵陣内（8段）から敵陣内（7段）への移動で成り判定
    $canPromote = $shogi->shouldPromote($boardState, 8, 5, 7, 5);

    expect($canPromote)->toBeTrue();
});

it('成れない駒は成り判定で弾かれる', function () {
    $shogi = app(ShogiService::class);

    expect($shogi->canPromote('kin'))->toBeFalse();
    expect($shogi->canPromote('gyoku'))->toBeFalse();
});
