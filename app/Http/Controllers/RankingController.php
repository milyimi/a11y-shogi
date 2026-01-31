<?php

namespace App\Http\Controllers;

use App\Models\Ranking;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\JsonResponse;

class RankingController extends Controller
{
    /**
     * ランキング一覧を表示
     */
    public function index(Request $request): View
    {
        $perPage = 20; // ページあたりのアイテム数
        $difficulty = $request->query('difficulty');
        
        $query = Ranking::with('gameSession')
            ->orderByDesc('score');
        
        if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'])) {
            $query->difficulty($difficulty);
        }
        
        $rankings = $query->paginate($perPage);
        
        return view('ranking.index', [
            'rankings' => $rankings,
            'currentDifficulty' => $difficulty,
            'difficulties' => ['easy' => '初級', 'medium' => '中級', 'hard' => '上級'],
        ]);
    }

    /**
     * 特定難易度のランキングを表示
     */
    public function byDifficulty(string $difficulty): View
    {
        if (!in_array($difficulty, ['easy', 'medium', 'hard'])) {
            abort(404, '指定された難易度が見つかりません。');
        }
        
        $perPage = 20;
        $rankings = Ranking::with('gameSession')
            ->difficulty($difficulty)
            ->orderByDesc('score')
            ->paginate($perPage);
        
        $difficultyNames = [
            'easy' => '初級',
            'medium' => '中級',
            'hard' => '上級',
        ];
        
        return view('ranking.index', [
            'rankings' => $rankings,
            'currentDifficulty' => $difficulty,
            'currentDifficultyName' => $difficultyNames[$difficulty],
            'difficulties' => $difficultyNames,
        ]);
    }

    /**
     * ランキング登録（ゲーム終了時）
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game_session_id' => 'required|exists:game_sessions,id',
            'nickname' => 'required|string|min:3|max:15',
        ]);
        
        // 既に登録済みかチェック
        $existing = Ranking::where('game_session_id', $validated['game_session_id'])->first();
        if ($existing) {
            return response()->json([
                'success' => false,
                'error' => 'already_registered',
                'message' => 'このゲームは既にランキングに登録されています。',
            ], 400);
        }
        
        // ゲームセッションからスコアを計算
        $gameSession = \App\Models\GameSession::findOrFail($validated['game_session_id']);
        
        if ($gameSession->status !== 'finished') {
            return response()->json([
                'success' => false,
                'error' => 'game_not_finished',
                'message' => 'ゲームが終了していません。',
            ], 400);
        }
        
        if ($gameSession->result !== 'win') {
            return response()->json([
                'success' => false,
                'error' => 'must_win',
                'message' => '勝利したゲームのみランキングに登録できます。',
            ], 400);
        }
        
        $score = Ranking::calculateScore(
            $gameSession->total_moves,
            $gameSession->elapsed_seconds
        );
        
        $ranking = Ranking::create([
            'game_session_id' => $validated['game_session_id'],
            'nickname' => $validated['nickname'],
            'difficulty' => $gameSession->difficulty,
            'score' => $score,
            'total_moves' => $gameSession->total_moves,
            'elapsed_seconds' => $gameSession->elapsed_seconds,
        ]);
        
        // 現在の順位を取得
        $rank = Ranking::where('difficulty', $ranking->difficulty)
            ->where('score', '>', $ranking->score)
            ->count() + 1;
        
        return response()->json([
            'success' => true,
            'data' => [
                'ranking' => $ranking,
                'rank' => $rank,
                'message' => "{$rank}位に登録されました！",
            ],
        ]);
    }
}
