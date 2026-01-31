<?php

namespace App\Services;

use App\Models\GameSession;
use Illuminate\Support\Str;

class GameService
{
    public function __construct(
        private ShogiService $shogiService
    ) {}

    /**
     * 新規ゲームを作成
     */
    public function createGame(string $difficulty, string $humanColor = 'sente'): GameSession
    {
        $initialBoard = $this->shogiService->getInitialBoard();
        
        return GameSession::create([
            'session_id' => session()->getId(),
            'difficulty' => $difficulty,
            'human_color' => $humanColor,
            'current_board_position' => json_encode($initialBoard),
            'move_history' => [],
            'status' => 'in_progress',
            'started_at' => now(),
            'browser_user_agent' => request()->userAgent(),
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * セッションIDから現在のゲームを取得
     */
    public function getCurrentGame(): ?GameSession
    {
        return GameSession::where('session_id', session()->getId())
            ->where('status', 'in_progress')
            ->latest()
            ->first();
    }

    /**
     * ゲーム状態を取得
     */
    public function getGameState(GameSession $game): array
    {
        return [
            'sessionId' => $game->session_id,
            'status' => $game->status,
            'difficulty' => $game->difficulty,
            'currentPlayer' => $this->getCurrentPlayer($game),
            'boardState' => $game->getBoardPosition(),
            'moveHistory' => $game->move_history,
            'moveCount' => $game->total_moves,
            'elapsedSeconds' => $game->elapsed_seconds,
        ];
    }

    /**
     * 現在のプレイヤーを判定
     */
    private function getCurrentPlayer(GameSession $game): string
    {
        // 手数が偶数なら先手、奇数なら後手
        $isEvenMove = $game->total_moves % 2 === 0;
        
        if ($game->human_color === 'sente') {
            return $isEvenMove ? 'human' : 'ai';
        } else {
            return $isEvenMove ? 'ai' : 'human';
        }
    }

    /**
     * 経過時間を更新
     */
    public function updateElapsedTime(GameSession $game): void
    {
        if ($game->started_at) {
            $game->elapsed_seconds = now()->diffInSeconds($game->started_at);
            $game->save();
        }
    }
}
