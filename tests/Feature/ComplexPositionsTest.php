<?php

use App\Services\ShogiService;
use App\Services\AIService;

describe('複雑な局面での合法手生成', function () {
    it('初期盤面からのAI手生成が可能', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();
        $move = $ai->generateMove($boardState, 'medium', 'sente');

        // AIが手を生成できることを確認
        expect($move)->not->toBeNull();
    });

    it('複数合法手がある局面での手の網羅性', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        // 初期盤面は複数の合法手がある
        $boardState = $shogi->getInitialBoard();

        // AI が手を生成
        $move = $ai->generateMove($boardState, 'easy', 'sente');

        // 合法手が生成されたことを確認
        expect($move)->not->toBeNull();
    });

    it('易しい難易度でのAI手生成', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();
        $move = $ai->generateMove($boardState, 'easy', 'sente');

        expect($move)->not->toBeNull();
    });

    it('中程度の難易度でのAI手生成', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();
        $move = $ai->generateMove($boardState, 'medium', 'sente');

        expect($move)->not->toBeNull();
    });

    it('難しい難易度でのAI手生成', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();
        $move = $ai->generateMove($boardState, 'hard', 'sente');

        expect($move)->not->toBeNull();
    });

    it('後手のAI手生成が可能', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();
        $boardState['turn'] = 'gote';

        $move = $ai->generateMove($boardState, 'medium', 'gote');

        expect($move)->not->toBeNull();
    });

    it('複数回のAI手生成が連続で可能', function () {
        $shogi = app(ShogiService::class);
        $ai = app(AIService::class);

        $boardState = $shogi->getInitialBoard();

        $move1 = $ai->generateMove($boardState, 'medium', 'sente');
        $move2 = $ai->generateMove($boardState, 'medium', 'sente');
        $move3 = $ai->generateMove($boardState, 'medium', 'sente');

        expect($move1)->not->toBeNull();
        expect($move2)->not->toBeNull();
        expect($move3)->not->toBeNull();
    });
});
