<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Ranking extends Model
{
    protected $fillable = [
        'game_session_id',
        'nickname',
        'difficulty',
        'total_moves',
        'elapsed_seconds',
        'score',
    ];

    /**
     * ゲームセッションとのリレーション
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    /**
     * 難易度でフィルタリング
     */
    public function scopeDifficulty(Builder $query, string $difficulty): Builder
    {
        return $query->where('difficulty', $difficulty);
    }

    /**
     * スコア順でソート
     */
    public function scopeTopScores(Builder $query, int $limit = 100): Builder
    {
        return $query->orderBy('score', 'desc')->limit($limit);
    }

    /**
     * スコアを計算（手数が少なく、時間が短いほど高スコア）
     */
    public static function calculateScore(int $totalMoves, int $elapsedSeconds): int
    {
        // スコア = 10000 - (手数 * 50) - (秒数 / 10)
        // 手数の影響を大きく
        $movesPenalty = $totalMoves * 50;
        $timePenalty = (int)($elapsedSeconds / 10);
        
        return max(0, 10000 - $movesPenalty - $timePenalty);
    }
}
