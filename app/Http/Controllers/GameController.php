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
                ]);
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
                    ]);
                }

                $targetPiece = $boardState['board'][$toRank][$toFile] ?? null;
                if ($targetPiece) {
                    \Log::info('[GameController::move] Drop rejected - occupied', [
                        'piece_type' => $pieceType,
                        'to_file' => $toFile,
                        'to_rank' => $toRank,
                        'current_turn' => $currentTurn,
                        'target_piece' => $targetPiece,
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'そのマスには駒があります',
                    ]);
                }

                $handCount = $boardState['hand'][$currentTurn][$pieceType] ?? 0;
                if ($handCount < 1) {
                    \Log::info('[GameController::move] Drop rejected - no hand', [
                        'piece_type' => $pieceType,
                        'to_file' => $toFile,
                        'to_rank' => $toRank,
                        'current_turn' => $currentTurn,
                        'hand' => $boardState['hand'][$currentTurn] ?? [],
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'その持ち駒がありません',
                    ]);
                }

                if (!$this->shogiService->isLegalDrop($boardState, $pieceType, $toRank, $toFile, $currentTurn)) {
                    if ($pieceType === 'fu') {
                        $filePieces = [];
                        for ($rank = 1; $rank <= 9; $rank++) {
                            $p = $boardState['board'][$rank][$toFile] ?? null;
                            if ($p) {
                                $filePieces[$rank] = $p['type'] . ':' . $p['color'];
                            }
                        }
                        \Log::info('[GameController::move] Pawn drop rejected - file state', [
                            'to_file' => $toFile,
                            'to_rank' => $toRank,
                            'current_turn' => $currentTurn,
                            'file_pieces' => $filePieces,
                        ]);
                    } else {
                        \Log::info('[GameController::move] Drop rejected - illegal', [
                            'piece_type' => $pieceType,
                            'to_file' => $toFile,
                            'to_rank' => $toRank,
                            'current_turn' => $currentTurn,
                        ]);
                    }
                    return response()->json([
                        'success' => false,
                        'message' => 'その場所には打てません',
                    ]);
                }

                $boardState['board'][$toRank][$toFile] = [
                    'type' => $pieceType,
                    'color' => $currentTurn,
                ];
                $boardState['hand'][$currentTurn][$pieceType]--;

                $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';

                // 棋譜に記録
                $dropPieceName = $this->shogiService->getPieceName($pieceType);
                $dropColorName = $currentTurn === 'sente' ? '先手' : '後手';
                $dropMoveDesc = "{$dropColorName}: {$toFile}の{$toRank}に{$dropPieceName}打";
                $moveHistory = $session->move_history;
                if (!is_array($moveHistory)) {
                    $moveHistory = is_string($moveHistory) ? (json_decode($moveHistory, true) ?? []) : [];
                }
                $moveHistory[] = $dropMoveDesc;
                $session->move_history = $moveHistory;

                $session->updateBoardPosition($boardState);
                $session->increment('total_moves');

                // 指し手と盤面状態を記録
                $this->saveMoveRecord(
                    $session,
                    $session->total_moves,
                    'human',
                    $pieceType,
                    $currentTurn,
                    null,
                    null,
                    $toRank,
                    $toFile,
                    true
                );
                $this->saveBoardState($session, $boardState, $session->total_moves);

                $opponentColor = $boardState['turn'];
                if ($this->shogiService->isCheckmate($boardState, $opponentColor)) {
                    $session->status = 'mate';
                    $session->winner = $currentTurn === $session->human_color ? 'human' : 'ai';
                    $session->winner_type = 'checkmate';
                    $this->gameService->updateElapsedTime($session);
                }

                $session->save();

                $gameState = $this->gameService->getGameState($session);

                // 王手判定
                $dropIsCheck = false;
                if ($session->status !== 'mate') {
                    $dropIsCheck = $this->shogiService->isKingInCheck($boardState, $opponentColor);
                }

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
                    'isCheck' => $dropIsCheck,
                    'elapsedSeconds' => $session->elapsed_seconds,
                    'piece' => [
                        'type' => $pieceType,
                        'color' => $currentTurn,
                    ],
                    'moveHistory' => $moveHistory,
                ];

                $isAITurn = $this->isAITurn($session, $boardState);

                if ($isAITurn && $session->status !== 'mate') {
                    \Log::info('[GameController::move] AI turn detected', [
                        'current_turn' => $boardState['turn'],
                        'difficulty' => $session->difficulty,
                    ]);
                    
                    $aiMove = $this->aiService->generateMove(
                        $boardState,
                        $session->difficulty,
                        $boardState['turn']
                    );

                    \Log::info('[GameController::move] AI move generated', [
                        'ai_move' => $aiMove ? 'generated' : 'null',
                    ]);

                    if ($aiMove) {
                        $aiCapturedPiece = $aiMove['capture']
                            ? ($boardState['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null)
                            : null;
                        $aiCapturedKing = $aiCapturedPiece && in_array($aiCapturedPiece['type'], ['gyoku', 'ou'], true);

                        $aiBoard = $this->executeMove($boardState, $aiMove);
                        $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';

                        $session->updateBoardPosition($aiBoard);
                        $session->increment('total_moves');

                        // AIの指し手と盤面状態を記録（drop route）
                        $aiPieceAfterDrop = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                        $this->saveMoveRecord(
                            $session,
                            $session->total_moves,
                            'ai',
                            $aiPieceAfterDrop ? $aiPieceAfterDrop['type'] : 'unknown',
                            $boardState['turn'],
                            $aiMove['from_rank'],
                            $aiMove['from_file'],
                            $aiMove['to_rank'],
                            $aiMove['to_file'],
                            false,
                            $aiCapturedPiece ? $aiCapturedPiece['type'] : null
                        );
                        $this->saveBoardState($session, $aiBoard, $session->total_moves);

                        if ($aiCapturedKing) {
                            $session->status = 'mate';
                            $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                            $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                            $session->winner_type = 'checkmate';
                            $this->gameService->updateElapsedTime($session);
                        } elseif ($this->shogiService->isCheckmate($aiBoard, $aiBoard['turn'])) {
                            $session->status = 'mate';
                            $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                            $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                            $session->winner_type = 'checkmate';
                            $this->gameService->updateElapsedTime($session);
                        }

                        $session->save();

                        // AIの棋譜を記録
                        $aiPiece = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                        $aiPieceName = $aiPiece ? $this->shogiService->getPieceName($aiPiece['type']) : '駒';
                        $aiColorName = ($boardState['turn'] === 'sente') ? '先手' : '後手';
                        $aiMoveDesc = "{$aiColorName}: {$aiMove['to_file']}の{$aiMove['to_rank']}に{$aiPieceName}";
                        if ($aiCapturedPiece) {
                            $aiCapName = $this->shogiService->getPieceName($aiCapturedPiece['type']);
                            $aiMoveDesc .= "（{$aiCapName}取り）";
                        }
                        $moveHistory[] = $aiMoveDesc;
                        $session->move_history = $moveHistory;
                        $session->save();

                        $response['aiMove'] = $aiMove;
                        $response['aiCapturedPiece'] = $aiCapturedPiece ? $aiCapturedPiece['type'] : null;
                        $response['boardState'] = $aiBoard;
                        $response['moveCount'] = $session->total_moves;
                        $response['currentPlayer'] = 'human';
                        $response['elapsedSeconds'] = $session->elapsed_seconds;
                        $response['moveHistory'] = $moveHistory;
                        $response['aiMoveDescription'] = sprintf(
                            '%dの%dから%dの%dに移動',
                            $aiMove['from_file'],
                            $aiMove['from_rank'],
                            $aiMove['to_file'],
                            $aiMove['to_rank']
                        );

                        // AI移動後の王手判定
                        if ($session->status !== 'mate') {
                            $response['isCheck'] = $this->shogiService->isKingInCheck($aiBoard, $aiBoard['turn']);
                        }
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
                ]);
            }
            
            // 指し手が合法か確認（新規追加）
            if (!$this->shogiService->isValidMove($boardState, $validated['from_rank'], $validated['from_file'], $validated['to_rank'], $validated['to_file'], $piece['color'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'その指し手は合法ではありません',
                ]);
            }
            
            // 移動先にある駒を取得（取られる駒）
            $capturedPiece = $boardState['board'][$validated['to_rank']][$validated['to_file']] ?? null;
            
            // 成り可能か確認（移動前にチェック）
            $canPromote = $this->shogiService->shouldPromote($boardState, $validated['from_rank'], $validated['from_file'], $validated['to_rank'], $validated['to_file']);
            
            // ボード状態を更新
            $boardState['board'][$validated['to_rank']][$validated['to_file']] = $piece;
            $boardState['board'][$validated['from_rank']][$validated['from_file']] = null;
            
            // 玉（王）を取った場合は即終了（持ち駒に追加しない）
            if ($capturedPiece && in_array($capturedPiece['type'], ['gyoku', 'ou'], true)) {
                $session->status = 'mate';
                $session->winner = $piece['color'] === $session->human_color ? 'human' : 'ai';
                $session->winner_type = 'checkmate';
                $this->gameService->updateElapsedTime($session);
            } elseif ($capturedPiece) {
                // 玉以外の駒を取った場合、持ち駒に追加
                $currentPlayerColor = $piece['color'];  // 駒を取った側
                $pieceType = $this->shogiService->demotePiece($capturedPiece['type']);
                
                if (!isset($boardState['hand'][$currentPlayerColor][$pieceType])) {
                    $boardState['hand'][$currentPlayerColor][$pieceType] = 0;
                }
                $boardState['hand'][$currentPlayerColor][$pieceType]++;
            }
            
            // 手番を交代（成り確認待ちの場合はpromote()側で切り替えるのでスキップ）
            if (!$canPromote) {
                $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';
            }
            
            // 棋譜に記録
            $pieceName = $this->shogiService->getPieceName($piece['type']);
            $colorName = $piece['color'] === 'sente' ? '先手' : '後手';
            $moveDesc = "{$colorName}: {$validated['to_file']}の{$validated['to_rank']}に{$pieceName}";
            if ($capturedPiece) {
                $capName = $this->shogiService->getPieceName($capturedPiece['type']);
                $moveDesc .= "（{$capName}取り）";
            }
            $moveHistory = $session->move_history;
            if (!is_array($moveHistory)) {
                $moveHistory = is_string($moveHistory) ? (json_decode($moveHistory, true) ?? []) : [];
            }
            $moveHistory[] = $moveDesc;
            $session->move_history = $moveHistory;

            // ゲームセッションを更新
            $session->updateBoardPosition($boardState);
            $session->increment('total_moves');

            // 指し手と盤面状態を記録
            $this->saveMoveRecord(
                $session,
                $session->total_moves,
                'human',
                $piece['type'],
                $piece['color'],
                $validated['from_rank'],
                $validated['from_file'],
                $validated['to_rank'],
                $validated['to_file'],
                false,
                $capturedPiece ? $capturedPiece['type'] : null,
                false,
                $isCheck ?? false
            );
            $this->saveBoardState($session, $boardState, $session->total_moves);
            
            // 人間の指し手後、相手が詰みか確認（王を取っていない場合のみ、成り確認中はスキップ）
            $opponentColor = $boardState['turn'] === 'sente' ? 'gote' : 'sente';
            if (!$canPromote && $session->status !== 'mate' && $this->shogiService->isCheckmate($boardState, $opponentColor)) {
                $session->status = 'mate';
                $session->winner = $piece['color'] === $session->human_color ? 'human' : 'ai';
                $session->winner_type = 'checkmate';
                $this->gameService->updateElapsedTime($session);
            }
            
            $session->save();
            
            $gameState = $this->gameService->getGameState($session);
            
            // 王手判定（移動後の盤面で相手が王手状態か）
            $isCheck = false;
            if ($session->status !== 'mate') {
                $checkTargetColor = $boardState['turn'] === 'sente' ? 'sente' : 'gote';
                if ($canPromote) {
                    $checkTargetColor = $piece['color'] === 'sente' ? 'gote' : 'sente';
                }
                $isCheck = $this->shogiService->isKingInCheck($boardState, $checkTargetColor);
            }

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
                'capturedPiece' => $capturedPiece ? $capturedPiece['type'] : null,
                'isCheck' => $isCheck,
                'elapsedSeconds' => $session->elapsed_seconds,
                'promotionTarget' => [
                    'rank' => $validated['to_rank'],
                    'file' => $validated['to_file'],
                ],
                'moveHistory' => $moveHistory,
            ];

            // AIの手番かチェック（ゲーム終了時はスキップ）
            $isAITurn = $this->isAITurn($session, $boardState);
            
            if ($isAITurn && !$canPromote && $session->status !== 'mate') {
                \Log::info('[GameController::move] AI turn detected', [
                    'current_turn' => $boardState['turn'],
                    'difficulty' => $session->difficulty
                ]);
                
                // AIの指し手を自動生成
                $aiMove = $this->aiService->generateMove(
                    $boardState,
                    $session->difficulty,
                    $boardState['turn']
                );
                
                if ($aiMove) {
                    \Log::info('[GameController::move] AI move generated', ['ai_move' => 'generated']);
                    
                    // AIの指し手が玉を取るかチェック（executeMove実行前）
                    $aiCapturedPiece = $aiMove['capture']
                        ? ($boardState['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null)
                        : null;
                    
                    \Log::info('[GameController::move] AI move analysis', [
                        'from' => "{$aiMove['from_file']}-{$aiMove['from_rank']}",
                        'to' => "{$aiMove['to_file']}-{$aiMove['to_rank']}",
                        'capture' => $aiMove['capture'] ?? false,
                        'captured_piece' => $aiCapturedPiece ? $aiCapturedPiece['type'] : null
                    ]);
                    
                    $aiCapturedKing = $aiCapturedPiece && in_array($aiCapturedPiece['type'], ['gyoku', 'ou'], true);
                    
                    if ($aiCapturedKing) {
                        \Log::info('[GameController::move] AI captured king!', [
                            'piece' => $aiCapturedPiece['type'],
                            'ai_color' => $boardState['turn']
                        ]);
                    }

                    // AIの指し手を実行
                    $aiBoard = $this->executeMove($boardState, $aiMove);
                    $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                    
                    // ゲームセッションを更新
                    $session->updateBoardPosition($aiBoard);
                    $session->increment('total_moves');

                    // AIの指し手と盤面状態を記録
                    $aiPieceAfterMove = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                    $this->saveMoveRecord(
                        $session,
                        $session->total_moves,
                        'ai',
                        $aiPieceAfterMove ? $aiPieceAfterMove['type'] : 'unknown',
                        $boardState['turn'],
                        $aiMove['from_rank'],
                        $aiMove['from_file'],
                        $aiMove['to_rank'],
                        $aiMove['to_file'],
                        false,
                        $aiCapturedPiece ? $aiCapturedPiece['type'] : null
                    );
                    $this->saveBoardState($session, $aiBoard, $session->total_moves);
                    
                    // AI の指し手後、人間が詰みか確認（王を取った場合は即終了）
                    if ($aiCapturedKing) {
                        \Log::info('[GameController::move] Game ending: AI captured king');
                        $session->status = 'mate';
                        $aiColor = $boardState['turn'];
                        $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                        $session->winner_type = 'checkmate';
                        $this->gameService->updateElapsedTime($session);
                    } elseif ($this->shogiService->isCheckmate($aiBoard, $aiBoard['turn'])) {
                        \Log::info('[GameController::move] Game ending: checkmate detected');
                        $session->status = 'mate';
                        $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                        $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                        $session->winner_type = 'checkmate';
                        $this->gameService->updateElapsedTime($session);
                    }
                    
                    $session->save();
                    
                    // AI の棋譜を記録
                    $aiPiece = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                    $aiPieceName = $aiPiece ? $this->shogiService->getPieceName($aiPiece['type']) : '駒';
                    $aiColorName = ($boardState['turn'] === 'sente') ? '先手' : '後手';
                    $aiMoveDesc = "{$aiColorName}: {$aiMove['to_file']}の{$aiMove['to_rank']}に{$aiPieceName}";
                    if ($aiCapturedPiece) {
                        $aiCapName = $this->shogiService->getPieceName($aiCapturedPiece['type']);
                        $aiMoveDesc .= "（{$aiCapName}取り）";
                    }
                    $moveHistory[] = $aiMoveDesc;
                    $session->move_history = $moveHistory;
                    $session->save();

                    // AI の指し手を記録
                    $response['aiMove'] = $aiMove;
                    $response['aiCapturedPiece'] = $aiCapturedPiece ? $aiCapturedPiece['type'] : null;
                    $response['boardState'] = $aiBoard;
                    $response['moveCount'] = $session->total_moves;
                    $response['currentPlayer'] = 'human'; // 人間のターンに戻す
                    $response['elapsedSeconds'] = $session->elapsed_seconds;
                    $response['moveHistory'] = $moveHistory;
                    $response['aiMoveDescription'] = sprintf(
                        '%dの%dから%dの%dに移動',
                        $aiMove['from_file'],
                        $aiMove['from_rank'],
                        $aiMove['to_file'],
                        $aiMove['to_rank']
                    );

                    // AI移動後の王手判定
                    if ($session->status !== 'mate') {
                        $response['isCheck'] = $this->shogiService->isKingInCheck($aiBoard, $aiBoard['turn']);
                    }
                }
            }

            return response()->json($response);
        } catch (\Exception $e) {
            \Log::error('Move error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ]);
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
     * 指し手を game_moves テーブルに記録
     */
    private function saveMoveRecord(
        GameSession $session,
        int $moveNumber,
        string $moveBy,
        string $pieceType,
        string $pieceColor,
        ?int $fromRank,
        ?int $fromFile,
        int $toRank,
        int $toFile,
        bool $isDrop = false,
        ?string $capturedPieceType = null,
        bool $isPromotion = false,
        bool $isCheck = false
    ): void {
        GameMove::create([
            'game_session_id' => $session->id,
            'move_number' => $moveNumber,
            'from_position' => $isDrop ? 'hand' : "{$fromFile}-{$fromRank}",
            'to_position' => "{$toFile}-{$toRank}",
            'piece_type' => $pieceType,
            'piece_color' => $pieceColor,
            'is_capture' => $capturedPieceType !== null,
            'captured_piece_type' => $capturedPieceType,
            'is_promotion' => $isPromotion,
            'is_check' => $isCheck,
            'move_by' => $moveBy,
        ]);
    }

    /**
     * 盤面状態を board_states テーブルに保存
     */
    private function saveBoardState(GameSession $session, array $boardState, int $moveNumber): void
    {
        BoardState::create([
            'game_session_id' => $session->id,
            'move_number' => $moveNumber,
            'board_position' => json_encode($boardState),
            'captured_pieces_sente' => $boardState['hand']['sente'] ?? [],
            'captured_pieces_gote' => $boardState['hand']['gote'] ?? [],
            'is_check' => $this->shogiService->isKingInCheck($boardState, $boardState['turn']),
        ]);
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
        
        \Log::info('[GameController::executeMove] Executing move', [
            'from' => "{$move['from_file']}-{$move['from_rank']}",
            'to' => "{$move['to_file']}-{$move['to_rank']}",
            'piece' => $piece ? $piece['type'] : 'null',
            'captured' => $capturedPiece ? $capturedPiece['type'] : 'null',
            'current_turn' => $boardState['turn']
        ]);
        
        $boardState['board'][$move['to_rank']][$move['to_file']] = $piece;
        $boardState['board'][$move['from_rank']][$move['from_file']] = null;
        
        // AIの成り処理（promote: true が設定されている場合）
        if (!empty($move['promote'])) {
            $promotedType = $this->shogiService->promotePiece($piece['type']);
            $boardState['board'][$move['to_rank']][$move['to_file']]['type'] = $promotedType;
            \Log::info('[GameController::executeMove] AI promotion applied', [
                'from_type' => $piece['type'],
                'to_type' => $promotedType,
                'position' => "{$move['to_file']}-{$move['to_rank']}",
            ]);
        }
        
        // 玉以外の駒を取った場合のみ持ち駒に追加
        if ($capturedPiece && !in_array($capturedPiece['type'], ['gyoku', 'ou'], true)) {
            $pieceType = $this->shogiService->demotePiece($capturedPiece['type']);
            
            if (!isset($boardState['hand'][$boardState['turn']][$pieceType])) {
                $boardState['hand'][$boardState['turn']][$pieceType] = 0;
            }
            $boardState['hand'][$boardState['turn']][$pieceType]++;
        } elseif ($capturedPiece && in_array($capturedPiece['type'], ['gyoku', 'ou'], true)) {
            \Log::warning('[GameController::executeMove] KING CAPTURED!', [
                'king_type' => $capturedPiece['type'],
                'captured_by' => $boardState['turn'],
                'from' => "{$move['from_file']}-{$move['from_rank']}",
                'to' => "{$move['to_file']}-{$move['to_rank']}"
            ]);
        }
        
        return $boardState;
    }

    /**
     * AIが先手（プレイヤーが後手選択時）のAI初手を実行
     */
    public function aiFirstMove(GameSession $session): JsonResponse
    {
        try {
            if ($session->status !== 'in_progress') {
                return response()->json(['success' => false, 'message' => 'ゲームは終了しています。']);
            }

            $boardState = $session->getBoardPosition();

            // AIのターンでなければ拒否
            if (!$this->isAITurn($session, $boardState)) {
                return response()->json(['success' => false, 'message' => 'AIの手番ではありません。']);
            }

            // 既に手が指されている場合は拒否（二重実行防止）
            if ($session->total_moves > 0) {
                return response()->json(['success' => false, 'message' => 'AIは既に初手を指しています。']);
            }

            $aiMove = $this->aiService->generateMove(
                $boardState,
                $session->difficulty,
                $boardState['turn']
            );

            if (!$aiMove) {
                return response()->json(['success' => false, 'message' => 'AIが手を生成できませんでした。']);
            }

            $aiCapturedPiece = $aiMove['capture']
                ? ($boardState['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null)
                : null;

            $aiBoard = $this->executeMove($boardState, $aiMove);
            $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';

            $session->updateBoardPosition($aiBoard);
            $session->increment('total_moves');

            // 指し手記録
            $aiPieceAfterDrop = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
            $this->saveMoveRecord(
                $session,
                $session->total_moves,
                'ai',
                $aiPieceAfterDrop ? $aiPieceAfterDrop['type'] : 'unknown',
                $boardState['turn'],
                $aiMove['from_rank'],
                $aiMove['from_file'],
                $aiMove['to_rank'],
                $aiMove['to_file'],
                false,
                $aiCapturedPiece ? $aiCapturedPiece['type'] : null
            );
            $this->saveBoardState($session, $aiBoard, $session->total_moves);

            // 棋譜記録
            $aiPiece = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
            $aiPieceName = $aiPiece ? $this->shogiService->getPieceName($aiPiece['type']) : '駒';
            $aiColorName = ($boardState['turn'] === 'sente') ? '先手' : '後手';
            $aiMoveDesc = "{$aiColorName}: {$aiMove['to_file']}の{$aiMove['to_rank']}に{$aiPieceName}";
            if ($aiCapturedPiece) {
                $aiCapName = $this->shogiService->getPieceName($aiCapturedPiece['type']);
                $aiMoveDesc .= "（{$aiCapName}取り）";
            }
            $moveHistory = $session->move_history;
            if (is_string($moveHistory)) $moveHistory = json_decode($moveHistory, true) ?? [];
            if (!is_array($moveHistory)) $moveHistory = [];
            $moveHistory[] = $aiMoveDesc;
            $session->move_history = $moveHistory;
            $session->save();

            return response()->json([
                'success' => true,
                'aiMove' => $aiMove,
                'aiCapturedPiece' => $aiCapturedPiece ? $aiCapturedPiece['type'] : null,
                'boardState' => $aiBoard,
                'moveCount' => $session->total_moves,
                'currentPlayer' => 'human',
                'moveHistory' => $moveHistory,
                'aiMoveDescription' => sprintf(
                    '%dの%dから%dの%dに移動',
                    $aiMove['from_file'], $aiMove['from_rank'],
                    $aiMove['to_file'], $aiMove['to_rank']
                ),
            ]);
        } catch (\Exception $e) {
            \Log::error('[GameController::aiFirstMove] Error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'エラーが発生しました。']);
        }
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
                ]);
            }

            // 対AI戦では、AIの手＋人間の手をセットで戻す
            // 最後の手がAIの手なら、その前の人間の手も一緒に戻す
            $movesToUndo = 1;
            $secondLastMove = null;
            if ($lastMove->move_by === 'ai') {
                $secondLastMove = GameMove::where('game_session_id', $session->id)
                    ->where('move_number', '<', $lastMove->move_number)
                    ->orderBy('move_number', 'desc')
                    ->first();
                if ($secondLastMove && $secondLastMove->move_by === 'human') {
                    $movesToUndo = 2;
                }
            }

            // 戻す先のmove_number を決定
            $targetMoveNumber = $lastMove->move_number - $movesToUndo;

            // 戻す先のボード状態を取得
            $previousBoardState = null;
            if ($targetMoveNumber > 0) {
                $previousBoardState = BoardState::where('game_session_id', $session->id)
                    ->where('move_number', '<=', $targetMoveNumber)
                    ->orderBy('move_number', 'desc')
                    ->first();
            }

            if (!$previousBoardState) {
                // 初期状態に戻す
                $boardState = $this->shogiService->getInitialBoard();
                $boardState['turn'] = 'sente';
                $boardState['hand'] = ['sente' => [], 'gote' => []];
            } else {
                $boardState = json_decode($previousBoardState->board_position, true);
            }

            // 棋譜から戻す手数分のエントリを削除
            $moveHistory = $session->move_history;
            if (!is_array($moveHistory)) {
                $moveHistory = is_string($moveHistory) ? (json_decode($moveHistory, true) ?? []) : [];
            }
            for ($i = 0; $i < $movesToUndo; $i++) {
                if (!empty($moveHistory)) {
                    array_pop($moveHistory);
                }
            }
            $session->move_history = $moveHistory;

            // ゲームセッションを更新
            $session->updateBoardPosition($boardState);
            $session->total_moves = max(0, $session->total_moves - $movesToUndo);
            $session->save();

            // 指し手を削除（戻す手数分）
            GameMove::where('game_session_id', $session->id)
                ->where('move_number', '>', $targetMoveNumber)
                ->delete();

            // ボード状態の履歴を削除
            BoardState::where('game_session_id', $session->id)
                ->where('move_number', '>', $targetMoveNumber)
                ->delete();

            $undoMessage = $movesToUndo === 2 ? '二手前に戻しました（AIの手＋あなたの手）' : '一手前に戻しました';

            return response()->json([
                'success' => true,
                'message' => $undoMessage,
                'boardState' => $boardState,
            ]);
        } catch (\Exception $e) {
            \Log::error('Undo error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ]);
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
            $this->gameService->updateElapsedTime($session);
            $session->save();

            return response()->json([
                'success' => true,
                'message' => '投了しました',
                'status' => $session->status,
                'winner' => $session->winner,
                'moveCount' => $session->total_moves,
                'elapsedSeconds' => $session->elapsed_seconds,
            ]);
        } catch (\Exception $e) {
            \Log::error('Resign error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ]);
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
            $session->elapsed_seconds = 0;
            $session->started_at = now();
            $session->status = 'in_progress';
            $session->winner = null;
            $session->move_history = [];
            $session->save();

            // 指し手の履歴を削除
            GameMove::where('game_session_id', $session->id)->delete();

            // ボード状態の履歴を削除
            BoardState::where('game_session_id', $session->id)->delete();

            // このセッションの古いランキング登録を削除（リセット後に再度登録可能にする）
            \App\Models\Ranking::where('game_session_id', $session->id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'ゲームをリセットしました',
                'boardState' => $boardState,
            ]);
        } catch (\Exception $e) {
            \Log::error('Reset error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ]);
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
                ]);
            }

            // 成り可能か確認
            if (!$this->shogiService->canPromote($piece['type'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'この駒は成ることができません',
                ]);
            }

            // 成りを確定
            if ($validated['promote']) {
                $promotedType = $this->shogiService->promotePiece($piece['type']);
                $boardState['board'][$validated['rank']][$validated['file']]['type'] = $promotedType;
                $message = $this->shogiService->getPieceName($piece['type']) . 'が' . $this->shogiService->getPromotedPieceName($promotedType) . 'に成りました';
            } else {
                $message = '成らないことを選択しました';
            }

            // 手番を切り替え（move()側ではcanPromote時にスキップしているのでここで切り替える）
            $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';
            
            \Log::info('[GameController::promote] 成り処理完了', [
                'promote' => $validated['promote'],
                'piece' => $piece['type'],
                'turn_after' => $boardState['turn'],
                'human_color' => $session->human_color,
            ]);

            // ボード状態を更新
            $session->updateBoardPosition($boardState);

            // 棋譜に成り情報を追加
            $moveHistory = $session->move_history;
            if (!is_array($moveHistory)) {
                $moveHistory = is_string($moveHistory) ? (json_decode($moveHistory, true) ?? []) : [];
            }
            // 最後の棋譜エントリを更新（成り情報を追記）
            if (!empty($moveHistory) && $validated['promote']) {
                $lastIdx = count($moveHistory) - 1;
                $moveHistory[$lastIdx] .= '（成）';
            }
            $session->move_history = $moveHistory;
            $session->save();

            // AIの手番になった場合、AIに指させる
            $aiMove = null;
            if ($boardState['turn'] !== $session->human_color) {
                \Log::info('[GameController::promote] AI turn detected after promotion', [
                    'current_turn' => $boardState['turn'],
                    'difficulty' => $session->difficulty,
                ]);
                
                $aiMove = $this->aiService->generateMove(
                    $boardState,
                    $session->difficulty,
                    $boardState['turn']
                );

                \Log::info('[GameController::promote] AI move generated', [
                    'ai_move' => $aiMove ? 'generated' : 'null',
                ]);

                if ($aiMove) {
                    \Log::info('[GameController::promote] AI move details', [
                        'from' => "{$aiMove['from_file']}-{$aiMove['from_rank']}",
                        'to' => "{$aiMove['to_file']}-{$aiMove['to_rank']}",
                        'capture' => $aiMove['capture'] ?? false,
                    ]);

                    $aiCapturedPiece = $aiMove['capture']
                        ? ($boardState['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null)
                        : null;
                    $aiCapturedKing = $aiCapturedPiece && in_array($aiCapturedPiece['type'], ['gyoku', 'ou'], true);

                    $aiBoard = $this->executeMove($boardState, $aiMove);
                    $aiBoard['turn'] = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';

                    $session->updateBoardPosition($aiBoard);
                    $session->increment('total_moves');

                    // AIの指し手と盤面状態を記録（promote route）
                    $aiPieceAfterPromote = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                    $this->saveMoveRecord(
                        $session,
                        $session->total_moves,
                        'ai',
                        $aiPieceAfterPromote ? $aiPieceAfterPromote['type'] : 'unknown',
                        $boardState['turn'],
                        $aiMove['from_rank'],
                        $aiMove['from_file'],
                        $aiMove['to_rank'],
                        $aiMove['to_file'],
                        false,
                        $aiCapturedPiece ? $aiCapturedPiece['type'] : null
                    );
                    $this->saveBoardState($session, $aiBoard, $session->total_moves);

                    if ($aiCapturedKing) {
                        $session->status = 'mate';
                        $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                        $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                        $session->winner_type = 'checkmate';
                        $this->gameService->updateElapsedTime($session);
                    } elseif ($this->shogiService->isCheckmate($aiBoard, $aiBoard['turn'])) {
                        $session->status = 'mate';
                        $aiColor = $aiBoard['turn'] === 'sente' ? 'gote' : 'sente';
                        $session->winner = $aiColor === $session->human_color ? 'human' : 'ai';
                        $session->winner_type = 'checkmate';
                        $this->gameService->updateElapsedTime($session);
                    }

                    $session->save();

                    // AIの棋譜を記録
                    $aiPieceAfter = $aiBoard['board'][$aiMove['to_rank']][$aiMove['to_file']] ?? null;
                    $aiPieceName = $aiPieceAfter ? $this->shogiService->getPieceName($aiPieceAfter['type']) : '駒';
                    $aiColorName = ($boardState['turn'] !== $session->human_color) ? ($session->human_color === 'sente' ? '後手' : '先手') : ($session->human_color === 'sente' ? '先手' : '後手');
                    $aiMoveDesc = "{$aiColorName}: {$aiMove['to_file']}の{$aiMove['to_rank']}に{$aiPieceName}";
                    if ($aiCapturedPiece) {
                        $aiCapName = $this->shogiService->getPieceName($aiCapturedPiece['type']);
                        $aiMoveDesc .= "（{$aiCapName}取り）";
                    }
                    $moveHistory[] = $aiMoveDesc;
                    $session->move_history = $moveHistory;
                    $session->save();

                    $boardState = $aiBoard;
                }
            }

            $gameState = $this->gameService->getGameState($session);

            return response()->json([
                'success' => true,
                'message' => $message,
                'boardState' => $boardState,
                'piece' => $piece,
                'aiMove' => $aiMove,
                'moveCount' => $gameState['moveCount'],
                'currentPlayer' => $gameState['currentPlayer'],
                'humanColor' => $session->human_color,
                'status' => $gameState['status'],
                'winner' => $gameState['winner'],
                'moveHistory' => $session->move_history ?? [],
            ]);
        } catch (\Exception $e) {
            \Log::error('Promote error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * ゲームを一時停止してホームに戻る
     */
    public function quit(GameSession $session)
    {
        // 経過時間を保存（ステータスはin_progressのまま維持）
        $this->gameService->updateElapsedTime($session);
        $session->save();

        if (request()->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'ゲームを中断しました',
                'redirect' => '/',
            ]);
        }

        return redirect('/');
    }}