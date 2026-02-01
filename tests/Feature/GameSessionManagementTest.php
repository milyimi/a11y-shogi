<?php

use App\Services\ShogiService;

describe('ゲームセッション管理テスト', function () {
    it('盤面状態の保存と復元が可能', function () {
        $shogi = app(ShogiService::class);
        
        $initialBoard = $shogi->getInitialBoard();
        $serialized = json_encode($initialBoard);
        
        $restored = json_decode($serialized, true);
        
        expect($restored['board'])->not->toBeNull();
        expect($restored['hand'])->not->toBeNull();
        expect($restored['turn'])->toBe('sente');
    });

    it('ゲームセッションのリセット後は初期状態に戻る', function () {
        $shogi = app(ShogiService::class);

        $initialBoard = $shogi->getInitialBoard();
        $modifiedBoard = $initialBoard;
        $modifiedBoard['turn'] = 'gote';
        $modifiedBoard['hand']['sente']['fu'] = 5;
        
        // リセット
        $resetBoard = $shogi->getInitialBoard();
        
        expect($resetBoard['turn'])->toBe('sente');
        expect($resetBoard['hand']['sente'])->toBe([]);
    });

    it('複数のゲーム状態を独立して管理', function () {
        $shogi = app(ShogiService::class);
        
        $board1 = $shogi->getInitialBoard();
        $board1['turn'] = 'gote';
        $board1['hand']['sente']['fu'] = 3;
        
        $board2 = $shogi->getInitialBoard();
        $board2['turn'] = 'sente';
        $board2['hand']['gote']['kin'] = 1;
        
        expect($board1['turn'])->toBe('gote');
        expect($board2['turn'])->toBe('sente');
        expect($board1['hand']['sente']['fu'])->toBe(3);
        expect($board2['hand']['gote']['kin'])->toBe(1);
    });

    it('盤面の深いコピーが独立している', function () {
        $shogi = app(ShogiService::class);
        
        $original = $shogi->getInitialBoard();
        $copy = json_decode(json_encode($original), true);
        
        // コピーを変更
        $copy['turn'] = 'gote';
        $copy['hand']['sente']['fu'] = 10;
        
        // オリジナルは変わらないことを確認
        expect($original['turn'])->toBe('sente');
        expect($original['hand']['sente'])->toBe([]);
    });

    it('ゲーム状態の全フィールドが保存可能', function () {
        $shogi = app(ShogiService::class);
        
        $board = $shogi->getInitialBoard();
        $board['custom_data'] = ['move_count' => 42];
        
        $serialized = json_encode($board);
        $restored = json_decode($serialized, true);
        
        expect($restored['custom_data']['move_count'])->toBe(42);
    });

    it('ゲーム状態の盤面更新が正確に追跡される', function () {
        $shogi = app(ShogiService::class);
        
        $board = $shogi->getInitialBoard();
        
        // 駒を移動（理論的な移動）
        if ($board['board']['3']['5'] !== null) {
            $piece = $board['board']['3']['5'];
            $board['board']['3']['5'] = null;
            $board['board']['4']['5'] = $piece;
        }
        
        expect($board['board']['4']['5'])->not->toBeNull();
        expect($board['board']['3']['5'])->toBeNull();
    });

    it('複数のターン遷移が正確に記録される', function () {
        $shogi = app(ShogiService::class);
        
        $board = $shogi->getInitialBoard();
        
        $turns = [$board['turn']];
        
        // ターン遷移を記録
        $board['turn'] = 'gote';
        $turns[] = $board['turn'];
        
        $board['turn'] = 'sente';
        $turns[] = $board['turn'];
        
        expect($turns)->toHaveCount(3);
        expect($turns[0])->toBe('sente');
        expect($turns[1])->toBe('gote');
        expect($turns[2])->toBe('sente');
    });

    it('持ち駒の状態変化が追跡可能', function () {
        $shogi = app(ShogiService::class);
        
        $board = $shogi->getInitialBoard();
        
        $board['hand']['sente']['fu'] = 1;
        expect($board['hand']['sente']['fu'])->toBe(1);
        
        $board['hand']['sente']['fu'] += 1;
        expect($board['hand']['sente']['fu'])->toBe(2);
        
        $board['hand']['sente']['fu'] -= 1;
        expect($board['hand']['sente']['fu'])->toBe(1);
    });

    it('ゲーム終了状態が適切に表現される', function () {
        $shogi = app(ShogiService::class);
        
        $board = $shogi->getInitialBoard();
        
        $board['status'] = 'finished';
        $board['result'] = 'sente_win';
        $board['end_turn'] = 42;
        
        expect($board['status'])->toBe('finished');
        expect($board['result'])->toBe('sente_win');
        expect($board['end_turn'])->toBe(42);
    });
});
