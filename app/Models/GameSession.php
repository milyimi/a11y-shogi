<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GameSession extends Model
{
    protected $fillable = [
        'session_id',
        'status',
        'winner',
        'winner_type',
        'difficulty',
        'human_color',
        'current_board_position',
        'move_history',
        'last_move_index',
        'total_moves',
        'human_moves_count',
        'ai_moves_count',
        'started_at',
        'finished_at',
        'elapsed_seconds',
        'browser_user_agent',
        'ip_address',
    ];

    protected $casts = [
        'move_history' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    /**
     * 指し手履歴とのリレーション
     */
    public function moves(): HasMany
    {
        return $this->hasMany(GameMove::class);
    }

    /**
     * 局面履歴とのリレーション
     */
    public function boardStates(): HasMany
    {
        return $this->hasMany(BoardState::class);
    }

    /**
     * ランキングとのリレーション
     */
    public function ranking(): HasOne
    {
        return $this->hasOne(Ranking::class);
    }

    /**
     * ゲームが終了しているか
     */
    public function isFinished(): bool
    {
        return in_array($this->status, ['mate', 'draw', 'resigned']);
    }

    /**
     * 現在の盤面をJSONとして取得
     */
    public function getBoardPosition(): array
    {
        return json_decode($this->current_board_position, true) ?? [];
    }

    /**
     * 盤面を更新
     */
    public function updateBoardPosition(array $position): void
    {
        $this->current_board_position = json_encode($position);
        $this->save();
    }
}
