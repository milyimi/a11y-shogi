<?php

use App\Models\GameSession;
use App\Services\ShogiService;
use Illuminate\Support\Str;

it('成り確定後に手番が切り替わる（回帰）', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();

    // 先手の歩を敵陣に置き、成れる状態にする
    $boardState['board'][7][5] = ['type' => 'fu', 'color' => 'sente'];
    $boardState['board'][3][5] = null;
    $boardState['turn'] = 'sente';

    $session = GameSession::create([
        'session_id' => Str::random(32),
        'status' => 'in_progress',
        'difficulty' => 'easy',
        // 人間を後手にしてAI手番処理を避ける
        'human_color' => 'gote',
        'current_board_position' => json_encode($boardState),
        'move_history' => [],
        'last_move_index' => 0,
        'total_moves' => 0,
        'human_moves_count' => 0,
        'ai_moves_count' => 0,
        'started_at' => now(),
        'elapsed_seconds' => 0,
        'browser_user_agent' => 'test',
        'ip_address' => '127.0.0.1',
    ]);

    $response = $this->postJson(route('game.promote', $session), [
        'rank' => 7,
        'file' => 5,
        'promote' => true,
    ]);

    $response->assertOk();
    $response->assertJson([ 'success' => true ]);

    $data = $response->json();

    expect($data['boardState']['turn'])->toBe('gote');
    expect($data['boardState']['board'][7][5]['type'])->toBe('tokin');
});

it('二歩は同じ筋の歩があると拒否される（回帰）', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();
    $boardState['hand']['sente']['fu'] = 1;

    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 5, 5, 'sente');

    expect($isLegal)->toBeFalse();
});

it('成歩がある筋には歩を打てる（回帰）', function () {
    $shogi = app(ShogiService::class);
    $boardState = $shogi->getInitialBoard();

    // 先手の5筋の歩を除去して二歩条件を回避
    $boardState['board'][3][5] = null;
    $boardState['board'][5][5] = ['type' => 'tokin', 'color' => 'gote'];
    $boardState['hand']['sente']['fu'] = 1;

    $isLegal = $shogi->isLegalDrop($boardState, 'fu', 6, 5, 'sente', true);

    expect($isLegal)->toBeTrue();
});
