<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
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
    Route::post('/{session}/promote', [GameController::class, 'promote'])->name('promote');
    Route::post('/{session}/undo', [GameController::class, 'undo'])->name('undo');
    Route::post('/{session}/resign', [GameController::class, 'resign'])->name('resign');
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
}
