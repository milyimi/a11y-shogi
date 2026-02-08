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
        $sessionId = session()->getId();
        
        // 既存のゲームがあれば削除
        // （session_id が UNIQUE のため同セッションで複数レコードを持てない）
        GameSession::where('session_id', $sessionId)
            ->delete();
        
        $initialBoard = $this->shogiService->getInitialBoard();
        
        return GameSession::create([
            'session_id' => $sessionId,
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
            ->whereIn('status', ['in_progress', 'mate', 'draw', 'resigned'])
            ->latest()
            ->first();
    }

    /**
     * ゲーム状態を取得
     */
    public function getGameState(GameSession $game): array
    {
        $currentPlayer = $this->getCurrentPlayer($game);
        \Log::info('[GameService::getGameState]', [
            'total_moves' => $game->total_moves,
            'human_color' => $game->human_color,
            'currentPlayer' => $currentPlayer,
        ]);
        
        // move_historyを明示的に配列として取得
        $moveHistory = $game->move_history;
        if (is_string($moveHistory)) {
            $moveHistory = json_decode($moveHistory, true) ?? [];
        }
        if (!is_array($moveHistory)) {
            $moveHistory = [];
        }
        
        return [
            'sessionId' => $game->session_id,
            'status' => $game->status,
            'difficulty' => $game->difficulty,
            'humanColor' => $game->human_color,
            'currentPlayer' => $currentPlayer,
            'boardState' => $game->getBoardPosition(),
            'moveHistory' => $moveHistory,
            'moveCount' => $game->total_moves,
            'elapsedSeconds' => $game->elapsed_seconds,
                'winner' => $game->winner,
                'winnerType' => $game->winner_type,
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
            $game->elapsed_seconds = (int) now()->diffInSeconds($game->started_at, true);
            $game->save();
        }
    }
}
