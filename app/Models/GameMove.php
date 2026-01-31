<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameMove extends Model
{
    protected $fillable = [
        'game_session_id',
        'move_number',
        'from_position',
        'to_position',
        'piece_type',
        'piece_color',
        'is_capture',
        'captured_piece_type',
        'is_promotion',
        'is_check',
        'move_by',
        'ai_evaluation',
        'ai_depth',
        'move_time_ms',
    ];

    protected $casts = [
        'is_capture' => 'boolean',
        'is_promotion' => 'boolean',
        'is_check' => 'boolean',
    ];

    /**
     * ゲームセッションとのリレーション
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }
}
