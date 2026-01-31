<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;
use App\Http\Controllers\RankingController;

// ホーム画面
Route::get('/', [GameController::class, 'home'])->name('home');

// ゲーム関連
Route::prefix('game')->name('game.')->group(function () {
    Route::post('/start', [GameController::class, 'start'])->name('start');
    Route::get('/{session}', [GameController::class, 'show'])->name('show');
    Route::post('/{session}/move', [GameController::class, 'move'])->name('move');
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
