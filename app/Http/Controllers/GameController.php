<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Services\GameService;
use App\Services\AIService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\JsonResponse;

class GameController extends Controller
{
    public function __construct(
        private GameService $gameService,
        private AIService $aiService
    ) {}

    /**
     * ホーム画面を表示
     */
    public function home(): View
    {
        $currentGame = $this->gameService->getCurrentGame();
        
        return view('home', [
            'hasActiveGame' => $currentGame !== null,
            'currentGame' => $currentGame,
        ]);
    }

    /**
     * 新規ゲームを開始
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'difficulty' => 'required|in:easy,medium,hard',
            'color' => 'sometimes|in:sente,gote',
        ]);

        $game = $this->gameService->createGame(
            $validated['difficulty'],
            $validated['color'] ?? 'sente'
        );

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'data' => $this->gameService->getGameState($game),
            ]);
        }

        return redirect()->route('game.show', ['session' => $game->id]);
    }

    /**
     * ゲーム画面を表示
     */
    public function show(GameSession $session): View
    {
        $this->gameService->updateElapsedTime($session);
        
        return view('game.show', [
            'game' => $session,
            'gameState' => $this->gameService->getGameState($session),
        ]);
    }

    /**
     * ゲーム状態を取得（JSON）
     */
    public function state(GameSession $session): JsonResponse
    {
        $this->gameService->updateElapsedTime($session);
        
        return response()->json([
            'success' => true,
            'data' => $this->gameService->getGameState($session),
        ]);
    }

    /**
     * セッション状態を取得（タイムアウト警告用）
     */
    public function sessionStatus(): JsonResponse
    {
        $expiresAt = now()->addMinutes(config('session.lifetime', 120));
        $remainingMinutes = now()->diffInMinutes($expiresAt);
        $warningThreshold = 5;

        return response()->json([
            'success' => true,
            'data' => [
                'sessionId' => session()->getId(),
                'expiresAt' => $expiresAt->toIso8601String(),
                'remainingMinutes' => $remainingMinutes,
                'warningThreshold' => $warningThreshold,
                'shouldWarn' => $remainingMinutes <= $warningThreshold,
                'message' => $remainingMinutes <= $warningThreshold 
                    ? "セッションがあと{$remainingMinutes}分で期限切れになります。延長しますか？" 
                    : null,
            ],
        ]);
    }

    /**
     * セッションを延長
     */
    public function extendSession(): JsonResponse
    {
        $newExpiry = now()->addMinutes(120);
        
        return response()->json([
            'success' => true,
            'data' => [
                'sessionId' => session()->getId(),
                'expiresAt' => $newExpiry->toIso8601String(),
                'extendedMinutes' => 120,
                'message' => 'セッションを延長しました。',
            ],
        ]);
    }

    /**
     * ヘルプページを表示
     */
    public function help(): View
    {
        return view('help');
    }

    /**
     * 指し手を処理（後で実装）
     */
    public function move(Request $request, GameSession $session): JsonResponse
    {
        $validated = $request->validate([
            'from_file' => 'required|integer|between:1,9',
            'from_rank' => 'required|integer|between:1,9',
            'to_file' => 'required|integer|between:1,9',
            'to_rank' => 'required|integer|between:1,9',
        ]);

        try {
            // 現在のボード状態を取得
            $boardState = $session->getBoardPosition();
            
            // 移動元の駒を確認
            $piece = $boardState['board'][$validated['from_rank']][$validated['from_file']] ?? null;
            
            if (!$piece) {
                return response()->json([
                    'success' => false,
                    'message' => '移動元に駒がありません',
                ], 400);
            }
            
            // 移動先が同じマスでないか確認
            if ($validated['from_file'] === $validated['to_file'] && 
                $validated['from_rank'] === $validated['to_rank']) {
                return response()->json([
                    'success' => false,
                    'message' => '同じマスには移動できません',
                ], 400);
            }
            
            // 移動先にある駒を取得（取られる駒）
            $capturedPiece = $boardState['board'][$validated['to_rank']][$validated['to_file']] ?? null;
            
            // ボード状態を更新
            $boardState['board'][$validated['to_rank']][$validated['to_file']] = $piece;
            $boardState['board'][$validated['from_rank']][$validated['from_file']] = null;
            
            // 駒を取った場合、持ち駒に追加
            if ($capturedPiece) {
                $opponentColor = $piece['color'] === 'sente' ? 'sente' : 'gote';
                $pieceType = $capturedPiece['type'];
                
                if (!isset($boardState['hand'][$opponentColor][$pieceType])) {
                    $boardState['hand'][$opponentColor][$pieceType] = 0;
                }
                $boardState['hand'][$opponentColor][$pieceType]++;
            }
            
            // 手番を交代
            $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';
            
            // ゲームセッションを更新
            $session->updateBoardPosition($boardState);
            $session->increment('total_moves');
            $session->save();
            
            // 新しいゲーム状態を返す
            $gameState = $this->gameService->getGameState($session);
            
            $response = [
                'success' => true,
                'message' => '駒を移動しました',
                'boardState' => $boardState,
                'moveCount' => $gameState['moveCount'],
                'currentPlayer' => $gameState['currentPlayer'],
                'humanColor' => $session->human_color,
            ];

            // AIの手番かチェック
            $isAITurn = $this->isAITurn($session, $boardState);
            
            if ($isAITurn) {
                // AIの指し手を自動生成
                $aiMove = $this->aiService->generateMove(
                    $boardState,
                    $session->difficulty,
                    $boardState['turn']
                );
                
                if ($aiMove) {
                    // AIの指し手を実行
                    $aiBoard = $this->executeMove($boardState, $aiMove);
                    $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                    
                    // ゲームセッションを更新
                    $session->updateBoardPosition($aiBoard);
                    $session->increment('total_moves');
                    $session->save();
                    
                    // AI の指し手を記録
                    $response['aiMove'] = $aiMove;
                    $response['boardState'] = $aiBoard;
                    $response['moveCount'] = $session->total_moves;
                    $response['currentPlayer'] = 'human'; // 人間のターンに戻す
                    $response['aiMoveDescription'] = sprintf(
                        '%dの%dから%dの%dに移動',
                        $aiMove['from_file'],
                        $aiMove['from_rank'],
                        $aiMove['to_file'],
                        $aiMove['to_rank']
                    );
                }
            }

            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * AIのターンかチェック
     */
    private function isAITurn(GameSession $session, array $boardState): bool
    {
        $currentTurn = $boardState['turn'];
        $humanColor = $session->human_color;
        
        return $currentTurn !== $humanColor;
    }

    /**
     * 指し手を実行してボード状態を更新
     */
    private function executeMove(array $boardState, array $move): array
    {
        // ドロップ（打ち込み）の場合
        if ($move['is_drop'] ?? false) {
            $boardState['board'][$move['to_rank']][$move['to_file']] = [
                'type' => $move['piece_type'],
                'color' => $boardState['turn'],
            ];
            
            // 持ち駒から減らす
            $boardState['hand'][$boardState['turn']][$move['piece_type']]--;
            
            return $boardState;
        }

        // 通常の移動
        $piece = $boardState['board'][$move['from_rank']][$move['from_file']];
        $capturedPiece = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;
        
        $boardState['board'][$move['to_rank']][$move['to_file']] = $piece;
        $boardState['board'][$move['from_rank']][$move['from_file']] = null;
        
        // 駒を取った場合
        if ($capturedPiece) {
            $pieceType = $capturedPiece['type'];
            
            if (!isset($boardState['hand'][$boardState['turn']][$pieceType])) {
                $boardState['hand'][$boardState['turn']][$pieceType] = 0;
            }
            $boardState['hand'][$boardState['turn']][$pieceType]++;
        }
        
        return $boardState;
    }

    /**
     * 棋譜を戻す（後で実装）
     */
    public function undo(GameSession $session): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'not_implemented',
            'message' => '戻す機能は実装中です。',
        ], 501);
    }

    /**
     * 投了（後で実装）
     */
    public function resign(GameSession $session): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'not_implemented',
            'message' => '投了機能は実装中です。',
        ], 501);
    }

    /**
     * 局面をリセット（後で実装）
     */
    public function reset(GameSession $session): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'not_implemented',
            'message' => 'リセット機能は実装中です。',
        ], 501);
    }
}
