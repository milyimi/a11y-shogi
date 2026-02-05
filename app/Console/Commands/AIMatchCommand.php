<?php

namespace App\Console\Commands;

use App\Services\AIService;
use App\Services\ShogiService;
use App\Services\ExternalAIService;
use App\Services\UsiEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class AIMatchCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:match {games=1} {--php-depth=3} {--external-depth=3} {--max-moves=300} {--seed=} {--k=20} {--save-log=} {--external=python} {--usi-path=} {--sennichite=4} {--sennichite-min-moves=24}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'PHPのAIと外部AI（python-shogi）の対局';

    /**
     * Execute the console command.
     */
    public function handle(AIService $aiService, ShogiService $shogiService, ExternalAIService $externalAI, UsiEngineService $usiEngine)
    {
        $games = (int) $this->argument('games');
        $phpDepth = (int) $this->option('php-depth');
        $externalDepth = (int) $this->option('external-depth');
        $maxMoves = (int) $this->option('max-moves');
        $seed = $this->option('seed') ? (int) $this->option('seed') : null;
        $k = (int) $this->option('k');
        $saveLog = $this->option('save-log');
        $externalType = (string) $this->option('external');
        $usiPath = $this->option('usi-path');
        $sennichiteThreshold = (int) $this->option('sennichite');
        $sennichiteMinMoves = (int) $this->option('sennichite-min-moves');

        if ($seed) {
            mt_srand($seed);
        }

        $results = [
            'php_win' => 0,
            'external_win' => 0,
            'draw' => 0,
            'total_moves' => 0,
            'games' => [],
        ];

        $elo = [
            'php' => 1500.0,
            'external' => 1500.0,
        ];

        $externalLabel = $externalType === 'usi' ? 'USI Engine' : 'python-shogi';
        if ($externalType === 'usi' && !$usiPath) {
            $this->error('USIエンジンを使うには --usi-path を指定してください。');
            return 1;
        }

        $this->info("PHP AI vs External AI（{$externalLabel}）");
        $this->info("Games: {$games}, PHP Depth: {$phpDepth}, External Depth: {$externalDepth}");
        $this->newLine();

        for ($i = 1; $i <= $games; $i++) {
            $this->info("ゲーム {$i}/{$games} 開始...");

            $boardState = $shogiService->getInitialBoard();
            $moves = 0;
            $winner = null;
            $endReason = null;
            $positionCounts = [];
            $initialHash = $this->hashPosition($boardState);
            $positionCounts[$initialHash] = 1;

            while ($moves < $maxMoves) {
                $currentColor = $boardState['turn'];
                $aiName = $currentColor === 'sente' ? 'PHP' : 'External';

                // 合法手を取得
                $possibleMoves = $aiService->getPossibleMoves($boardState, $currentColor);
                if (empty($possibleMoves)) {
                    $winner = $currentColor === 'sente' ? 'External' : 'PHP';
                    $endReason = 'checkmate';
                    break;
                }

                // AIの指し手を取得
                $move = null;
                if ($currentColor === 'sente') {
                    $move = $aiService->generateMove($boardState, 'hard');
                } else {
                    if ($externalType === 'usi') {
                        $move = $usiEngine->generateMove($boardState, $externalDepth, $usiPath);
                    } else {
                        $move = $externalAI->generateMove($boardState, $externalDepth);
                    }
                }

                if (!$move) {
                    $winner = $currentColor === 'sente' ? 'External' : 'PHP';
                    $endReason = 'no_move_available';
                    break;
                }

                // 盤面を更新
                $boardState = $this->executeMove($boardState, $move, $currentColor, $shogiService);
                $moves++;

                // 詰みチェック
                $enemyColor = $currentColor === 'sente' ? 'gote' : 'sente';
                if ($shogiService->isCheckmate($boardState, $enemyColor)) {
                    $winner = $aiName;
                    $endReason = 'checkmate';
                    break;
                }

                // 千日手チェック
                $hash = $this->hashPosition($boardState);
                $positionCounts[$hash] = ($positionCounts[$hash] ?? 0) + 1;
                if ($sennichiteThreshold > 0 && $moves >= $sennichiteMinMoves && $positionCounts[$hash] >= $sennichiteThreshold) {
                    $winner = 'draw';
                    $endReason = 'sennichite';
                    break;
                }
            }

            if ($moves >= $maxMoves) {
                $winner = 'draw';
                $endReason = 'max_moves_reached';
            }

            // 結果を記録
            if ($winner === 'PHP') {
                $results['php_win']++;
            } elseif ($winner === 'External') {
                $results['external_win']++;
            } else {
                $results['draw']++;
            }

            // Elo更新
            [$elo['php'], $elo['external']] = $this->updateElo($elo['php'], $elo['external'], $winner, $k);

            $results['total_moves'] += $moves;
            $results['games'][] = [
                'game' => $i,
                'winner' => $winner,
                'moves' => $moves,
                'reason' => $endReason,
            ];

            $this->line("  結果: {$winner} 勝 ({$moves} 手, {$endReason})");
        }

        // 統計を表示
        $this->newLine();
        $this->info('=== 対局結果統計 ===');
        $this->line("PHP勝ち: {$results['php_win']}");
        $this->line("External勝ち: {$results['external_win']}");
        $this->line("引き分け: {$results['draw']}");
        $this->line("平均手数: " . round($results['total_moves'] / $games, 2));

        // PHP勝率
        if ($games > 0) {
            $phpWinRate = ($results['php_win'] / $games) * 100;
            $this->line("PHP勝率: {$phpWinRate}%");
        }

            $this->newLine();
            $this->info('=== Elo レーティング ===');
            $this->line('Elo(PHP): ' . round($elo['php'], 2));
            $this->line('Elo(External): ' . round($elo['external'], 2));

            if ($saveLog !== null) {
                $logName = $saveLog ?: ('ai_match_' . now()->format('Ymd_His') . '.json');
                $logPath = 'ai_matches/' . $logName;
                $payload = [
                    'meta' => [
                        'games' => $games,
                        'php_depth' => $phpDepth,
                        'external_depth' => $externalDepth,
                        'max_moves' => $maxMoves,
                        'seed' => $seed,
                        'k' => $k,
                        'timestamp' => now()->toIso8601String(),
                    ],
                    'results' => $results,
                    'elo' => [
                        'php' => round($elo['php'], 2),
                        'external' => round($elo['external'], 2),
                    ],
                ];

                Storage::disk('local')->put($logPath, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                $this->line('ログ保存: ' . storage_path('app/' . $logPath));
            }

        return 0;
    }

    /**
     * 指し手を実行してボード状態を更新
     */
    private function executeMove(array $boardState, array $move, string $color, ShogiService $shogiService): array
    {
        $isDrop = $move['is_drop'] ?? false;

        if ($isDrop) {
            $toRank = $move['to_rank'];
            $toFile = $move['to_file'];
            $pieceType = $move['piece_type'];

            // 盤面構造を確保
            if (!isset($boardState['board'][$toRank])) {
                $boardState['board'][$toRank] = [];
            }

            // 持ち駒から駒を減らす
            if (isset($boardState['hand'][$color][$pieceType])) {
                $boardState['hand'][$color][$pieceType]--;
                if ($boardState['hand'][$color][$pieceType] <= 0) {
                    unset($boardState['hand'][$color][$pieceType]);
                }
            }

            // 駒を盤に配置
            $boardState['board'][$toRank][$toFile] = [
                'type' => $pieceType,
                'color' => $color,
            ];
        } else {
            $fromRank = $move['from_rank'];
            $fromFile = $move['from_file'];
            $toRank = $move['to_rank'];
            $toFile = $move['to_file'];

            // 盤面構造を確保
            if (!isset($boardState['board'][$fromRank][$fromFile])) {
                return $boardState;  // 駒がない場合はスキップ
            }

            $piece = $boardState['board'][$fromRank][$fromFile];

            // 移動先の盤面構造を確保
            if (!isset($boardState['board'][$toRank])) {
                $boardState['board'][$toRank] = [];
            }

            // 取られる駒を確認
            $capturedPiece = $boardState['board'][$toRank][$toFile] ?? null;
            if ($capturedPiece) {
                $demotedType = $shogiService->demotePiece($capturedPiece['type']);
                if (!isset($boardState['hand'][$color])) {
                    $boardState['hand'][$color] = [];
                }
                if (!isset($boardState['hand'][$color][$demotedType])) {
                    $boardState['hand'][$color][$demotedType] = 0;
                }
                $boardState['hand'][$color][$demotedType]++;
            }

            // 駒を移動
            $boardState['board'][$toRank][$toFile] = $piece;
            $boardState['board'][$fromRank][$fromFile] = null;

            // 成り判定
            if ($move['promote'] ?? false) {
                $piece['type'] = $shogiService->promotePiece($piece['type']);
                $boardState['board'][$toRank][$toFile] = $piece;
            }
        }

        // 手番を切り替え
        $boardState['turn'] = $color === 'sente' ? 'gote' : 'sente';

        return $boardState;
    }

    /**
     * 局面ハッシュを作成
     */
    private function hashPosition(array $boardState): string
    {
        $data = [
            'board' => $boardState['board'] ?? [],
            'hand' => $boardState['hand'] ?? ['sente' => [], 'gote' => []],
            'turn' => $boardState['turn'] ?? 'sente',
        ];

        return hash('sha256', json_encode($data));
    }

    /**
     * Eloレーティングを更新
     */
    private function updateElo(float $phpRating, float $externalRating, string $winner, int $k): array
    {
        $phpScore = 0.5;
        if ($winner === 'PHP') {
            $phpScore = 1.0;
        } elseif ($winner === 'External') {
            $phpScore = 0.0;
        }

        $externalScore = 1.0 - $phpScore;

        $phpExpected = 1 / (1 + pow(10, ($externalRating - $phpRating) / 400));
        $externalExpected = 1 / (1 + pow(10, ($phpRating - $externalRating) / 400));

        $phpRating = $phpRating + $k * ($phpScore - $phpExpected);
        $externalRating = $externalRating + $k * ($externalScore - $externalExpected);

        return [$phpRating, $externalRating];
    }
}

