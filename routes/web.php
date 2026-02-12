<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\GameController;
use App\Http\Controllers\RankingController;
use App\Models\GameSession;

// ホーム画面
Route::get('/', [GameController::class, 'home'])->name('home');

// ゲーム関連
Route::prefix('game')->name('game.')->group(function () {
    Route::post('/start', [GameController::class, 'start'])->name('start');
    Route::get('/{session}', [GameController::class, 'show'])->name('show');
    Route::post('/{session}/move', [GameController::class, 'move'])->name('move');
    Route::post('/{session}/ai-first-move', [GameController::class, 'aiFirstMove'])->name('aiFirstMove');
    Route::post('/{session}/promote', [GameController::class, 'promote'])->name('promote');
    Route::post('/{session}/undo', [GameController::class, 'undo'])->name('undo');
    Route::post('/{session}/resign', [GameController::class, 'resign'])->name('resign');
    Route::post('/{session}/quit', [GameController::class, 'quit'])->name('quit');
    Route::get('/{session}/state', [GameController::class, 'state'])->name('state');
    Route::post('/{session}/reset', [GameController::class, 'reset'])->name('reset');
});

// セッション関連
Route::prefix('session')->name('session.')->group(function () {
    Route::get('/status', [GameController::class, 'sessionStatus'])->name('status');
    Route::post('/extend', [GameController::class, 'extendSession'])->name('extend');
});

// ランキング関連
Route::prefix('ranking')->name('ranking.')->group(function () {
    Route::post('/register', [RankingController::class, 'register'])->name('register');
    Route::get('/', [RankingController::class, 'index'])->name('index');
    Route::get('/{difficulty}', [RankingController::class, 'byDifficulty'])->name('difficulty');
});

// ヘルプページ
Route::get('/help', [GameController::class, 'help'])->name('help');

// デバッグ用（ローカル環境のみ）: 手駒を付与
if (app()->environment('local')) {
    Route::post('/debug/seed-hand/{session}', function (GameSession $session, Request $request) {
        $validated = $request->validate([
            'color' => 'required|in:sente,gote',
            'piece_type' => 'required|string',
            'count' => 'sometimes|integer|min:1|max:20',
        ]);

        $boardState = $session->getBoardPosition();
        $color = $validated['color'];
        $pieceType = $validated['piece_type'];
        $count = $validated['count'] ?? 1;

        if (!isset($boardState['hand'][$color])) {
            $boardState['hand'][$color] = [];
        }

        $boardState['hand'][$color][$pieceType] = ($boardState['hand'][$color][$pieceType] ?? 0) + $count;

        $session->updateBoardPosition($boardState);
        $session->save();

        return response()->json([
            'success' => true,
            'boardState' => $boardState,
        ]);
    })->name('debug.seed-hand');

    Route::post('/debug/clear-all', function () {
        DB::table('rankings')->delete();
        DB::table('board_states')->delete();
        DB::table('game_moves')->delete();
        DB::table('game_sessions')->delete();

        return response()->json([
            'success' => true,
            'message' => 'cleared',
        ]);
    })->name('debug.clear-all');

    Route::post('/debug/mate/{session}', function (GameSession $session, Request $request) {
        $board = [];
        for ($rank = 1; $rank <= 9; $rank++) {
            $board[$rank] = [];
            for ($file = 1; $file <= 9; $file++) {
                $board[$rank][$file] = null;
            }
        }

        // 後手玉（詰み位置）
        $board[9][9] = ['type' => 'gyoku', 'color' => 'gote'];

        // 先手の配置（詰みの形）
        $board[7][8] = ['type' => 'gyoku', 'color' => 'sente'];
        $board[8][8] = ['type' => 'kin', 'color' => 'sente'];
        $board[7][9] = ['type' => 'hisha', 'color' => 'sente'];

        $boardState = [
            'format' => 'shogi_standard',
            'version' => '1.0',
            'board' => $board,
            'hand' => [
                'sente' => [],
                'gote' => [],
            ],
            'turn' => 'sente',
        ];

        $totalMoves = (int) $request->input('total_moves', 0);
        $elapsedSeconds = (int) $request->input('elapsed_seconds', 0);
        $elapsedSeconds = max(0, $elapsedSeconds);

        $session->status = 'in_progress';
        $session->winner = null;
        $session->winner_type = null;
        $session->move_history = [];
        $session->total_moves = max(0, $totalMoves);
        $session->elapsed_seconds = $elapsedSeconds;
        $session->started_at = $elapsedSeconds > 0 ? now()->subSeconds($elapsedSeconds) : $session->started_at;
        $session->save();

        $session->updateBoardPosition($boardState);

        return response()->json([
            'success' => true,
            'boardState' => $boardState,
        ]);
    })->name('debug.mate');
}
