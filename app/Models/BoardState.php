<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoardState extends Model
{
    protected $fillable = [
        'game_session_id',
        'move_number',
        'board_position',
        'captured_pieces_sente',
        'captured_pieces_gote',
        'is_check',
        'is_checkmate',
        'is_stalemate',
    ];

    protected $casts = [
        'captured_pieces_sente' => 'array',
        'captured_pieces_gote' => 'array',
        'is_check' => 'boolean',
        'is_checkmate' => 'boolean',
        'is_stalemate' => 'boolean',
    ];

    /**
     * ゲームセッションとのリレーション
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }
}
