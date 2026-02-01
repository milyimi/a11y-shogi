<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Models\GameMove;
use App\Models\BoardState;
use App\Services\GameService;
use App\Services\AIService;
use App\Services\ShogiService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\JsonResponse;

class GameController extends Controller
{
    public function __construct(
        private GameService $gameService,
        private AIService $aiService,
        private ShogiService $shogiService
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
        // 一時停止中のゲームを再開
        if ($session->status === 'paused') {
            $session->status = 'in_progress';
            $session->save();
        }
        
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
        $isDrop = $request->boolean('is_drop');
        \Log::info('[GameController::move] Request received', [
            'is_drop' => $isDrop,
            'all_data' => $request->all(),
        ]);

        if ($isDrop) {
            $validated = $request->validate([
                'to_file' => 'required|integer|between:1,9',
                'to_rank' => 'required|integer|between:1,9',
                'piece_type' => 'required|string',
            ]);
            $validated['is_drop'] = true;
        } else {
            $validated = $request->validate([
                'from_file' => 'required|integer|between:1,9',
                'from_rank' => 'required|integer|between:1,9',
                'to_file' => 'required|integer|between:1,9',
                'to_rank' => 'required|integer|between:1,9',
            ]);
            $validated['is_drop'] = false;
        }

        try {
            if ($session->status !== 'in_progress') {
                return response()->json([
                    'success' => false,
                    'message' => 'ゲームは終了しています。',
                ], 400);
            }
            // 現在のボード状態を取得
            $boardState = $session->getBoardPosition();

            if (!empty($validated['is_drop'])) {
                $pieceType = $validated['piece_type'];
                $toRank = $validated['to_rank'];
                $toFile = $validated['to_file'];
                $currentTurn = $boardState['turn'];
                
                \Log::info('[GameController::move] Processing drop', [
                    'piece_type' => $pieceType,
                    'to_file' => $toFile,
                    'to_rank' => $toRank,
                    'current_turn' => $currentTurn,
                    'hand' => $boardState['hand'],
                ]);

                if ($currentTurn !== $session->human_color) {
                    return response()->json([
                        'success' => false,
                        'message' => 'あなたの手番ではありません',
                    ], 400);
                }

                $targetPiece = $boardState['board'][$toRank][$toFile] ?? null;
                if ($targetPiece) {
                    return response()->json([
                        'success' => false,
                        'message' => 'そのマスには駒があります',
                    ], 400);
                }

                $handCount = $boardState['hand'][$currentTurn][$pieceType] ?? 0;
                if ($handCount < 1) {
                    return response()->json([
                        'success' => false,
                        'message' => 'その持ち駒がありません',
                    ], 400);
                }

                if (!$this->shogiService->isLegalDrop($boardState, $pieceType, $toRank, $toFile, $currentTurn)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'その場所には打てません',
                    ], 400);
                }

                $boardState['board'][$toRank][$toFile] = [
                    'type' => $pieceType,
                    'color' => $currentTurn,
                ];
                $boardState['hand'][$currentTurn][$pieceType]--;

                $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';

                $session->updateBoardPosition($boardState);
                $session->increment('total_moves');

                $opponentColor = $boardState['turn'];
                if ($this->shogiService->isCheckmate($boardState, $opponentColor)) {
                    $session->status = 'mate';
                    $session->winner = $currentTurn === $session->human_color ? 'human' : 'ai';
                    $session->winner_type = 'checkmate';
                    $this->gameService->updateElapsedTime($session);
                }

                $session->save();

                $gameState = $this->gameService->getGameState($session);

                $response = [
                    'success' => true,
                    'message' => '駒を打ちました',
                    'boardState' => $boardState,
                    'moveCount' => $gameState['moveCount'],
                    'currentPlayer' => $gameState['currentPlayer'],
                    'humanColor' => $session->human_color,
                    'status' => $gameState['status'],
                    'winner' => $gameState['winner'],
                    'canPromote' => false,
                    'piece' => [
                        'type' => $pieceType,
                        'color' => $currentTurn,
                    ],
                ];

                $isAITurn = $this->isAITurn($session, $boardState);

                if ($isAITurn) {
                    $aiMove = $this->aiService->generateMove(
                        $boardState,
                        $session->difficulty,
                        $boardState['turn']
                    );

                    if ($aiMove) {
                        $aiBoard = $this->executeMove($boardState, $aiMove);
                        $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';

                        $session->updateBoardPosition($aiBoard);
                        $session->increment('total_moves');

                        if ($this->shogiService->isCheckmate($aiBoard, $aiBoard['turn'])) {
                            $session->status = 'mate';
                            $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                            $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                            $session->winner_type = 'checkmate';
                            $this->gameService->updateElapsedTime($session);
                        }

                        $session->save();

                        $response['aiMove'] = $aiMove;
                        $response['boardState'] = $aiBoard;
                        $response['moveCount'] = $session->total_moves;
                        $response['currentPlayer'] = 'human';
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
            }
            
            // 移動元の駒を確認
            $piece = $boardState['board'][$validated['from_rank']][$validated['from_file']] ?? null;
            
            if (!$piece) {
                return response()->json([
                    'success' => false,
                    'message' => '移動元に駒がありません',
                ], 400);
            }
            
            // 指し手が合法か確認（新規追加）
            if (!$this->shogiService->isValidMove($boardState, $validated['from_rank'], $validated['from_file'], $validated['to_rank'], $validated['to_file'], $piece['color'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'その指し手は合法ではありません',
                ], 400);
            }
            
            // 移動先にある駒を取得（取られる駒）
            $capturedPiece = $boardState['board'][$validated['to_rank']][$validated['to_file']] ?? null;
            
            // 成り可能か確認（移動前にチェック）
            $canPromote = $this->shogiService->shouldPromote($boardState, $validated['from_rank'], $validated['from_file'], $validated['to_rank'], $validated['to_file']);
            
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
            
            // 人間の指し手後、相手が詰みか確認
            $opponentColor = $boardState['turn'];
            if ($this->shogiService->isCheckmate($boardState, $opponentColor)) {
                $session->status = 'mate';
                $session->winner = $piece['color'] === $session->human_color ? 'human' : 'ai';
                $session->winner_type = 'checkmate';
                $this->gameService->updateElapsedTime($session);
            }
            
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
                'status' => $gameState['status'],
                'winner' => $gameState['winner'],
                'canPromote' => $canPromote,
                'piece' => $piece,
                'promotionTarget' => [
                    'rank' => $validated['to_rank'],
                    'file' => $validated['to_file'],
                ],
            ];

            // AIの手番かチェック
            $isAITurn = $this->isAITurn($session, $boardState);
            
            if ($isAITurn && !$canPromote) {
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
                    
                    // AI の指し手後、人間が詰みか確認
                    if ($this->shogiService->isCheckmate($aiBoard, $aiBoard['turn'])) {
                        $session->status = 'mate';
                        $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                        $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                        $session->winner_type = 'checkmate';
                        $this->gameService->updateElapsedTime($session);
                    }
                    
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
     * 棋譜を戻す（一手前に戻す）
     */
    public function undo(GameSession $session): JsonResponse
    {
        try {
            // 最後の指し手を取得
            $lastMove = GameMove::where('game_session_id', $session->id)
                ->orderBy('move_number', 'desc')
                ->first();

            if (!$lastMove) {
                return response()->json([
                    'success' => false,
                    'message' => '戻す指し手がありません',
                ], 400);
            }

            // 一つ前のボード状態を取得
            $previousBoardState = BoardState::where('game_session_id', $session->id)
                ->where('move_index', '<', $lastMove->move_number - 1)
                ->orderBy('move_index', 'desc')
                ->first();

            if (!$previousBoardState) {
                // 初期状態に戻す
                $boardState = $this->shogiService->getInitialBoard();
                $boardState['turn'] = 'sente';
                $boardState['hand'] = ['sente' => [], 'gote' => []];
            } else {
                $boardState = json_decode($previousBoardState->position_json, true);
            }

            // ゲームセッションを更新
            $session->updateBoardPosition($boardState);
            $session->total_moves = max(0, $session->total_moves - 1);
            $session->save();

            // 最後の指し手を削除
            $lastMove->delete();

            // ボード状態の履歴を削除
            BoardState::where('game_session_id', $session->id)
                ->where('move_index', '>=', $lastMove->move_number)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => '一手前に戻しました',
                'boardState' => $boardState,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 投了（後で実装）
     */
    public function resign(GameSession $session): JsonResponse
    {
        try {
            $session->status = 'resigned';
            $session->winner = 'ai';
            $session->winner_type = 'resignation';
            $session->finished_at = now();
            $session->save();

            return response()->json([
                'success' => true,
                'message' => '投了しました',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ゲームをリセット（最初の状態に戻す）
     */
    public function reset(GameSession $session): JsonResponse
    {
        try {
            // 初期盤面を取得
            $boardState = $this->shogiService->getInitialBoard();
            $boardState['turn'] = 'sente';
            $boardState['hand'] = ['sente' => [], 'gote' => []];

            // ゲームセッションをリセット
            $session->updateBoardPosition($boardState);
            $session->total_moves = 0;
            $session->status = 'in_progress';
            $session->save();

            // 指し手の履歴を削除
            GameMove::where('game_session_id', $session->id)->delete();

            // ボード状態の履歴を削除
            BoardState::where('game_session_id', $session->id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'ゲームをリセットしました',
                'boardState' => $boardState,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 駒を成る（成り確定）
     */
    public function promote(Request $request, GameSession $session): JsonResponse
    {
        $validated = $request->validate([
            'rank' => 'required|integer|between:1,9',
            'file' => 'required|integer|between:1,9',
            'promote' => 'required|boolean',
        ]);

        try {
            $boardState = $session->getBoardPosition();
            $piece = $boardState['board'][$validated['rank']][$validated['file']] ?? null;

            if (!$piece) {
                return response()->json([
                    'success' => false,
                    'message' => '指定位置に駒がありません',
                ], 400);
            }

            // 成り可能か確認
            if (!$this->shogiService->canPromote($piece['type'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'この駒は成ることができません',
                ], 400);
            }

            // 成りを確定
            if ($validated['promote']) {
                $promotedType = $this->shogiService->promotePiece($piece['type']);
                $boardState['board'][$validated['rank']][$validated['file']]['type'] = $promotedType;
                $message = $this->shogiService->getPieceName($piece['type']) . 'が' . $this->shogiService->getPromotedPieceName($promotedType) . 'に成りました';
            } else {
                $message = '成らないことを選択しました';
            }

            // ボード状態を更新
            $session->updateBoardPosition($boardState);
            $session->save();

            return response()->json([
                'success' => true,
                'message' => $message,
                'boardState' => $boardState,
                'piece' => $piece,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ゲームを一時停止してホームに戻る
     */
    public function quit(GameSession $session)
    {
        // ゲーム状態を「一時停止」に更新（後で再開可能）
        $session->status = 'paused';
        $session->save();

        if (request()->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'ゲームを一時停止しました',
                'redirect' => '/',
            ]);
        }

        return redirect('/');
    }}