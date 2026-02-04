<?php

namespace App\Console\Commands;

use App\Services\AIService;
use App\Services\ShogiService;
use App\Services\ExternalAIService;
use Illuminate\Console\Command;

class AIMatchCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:match {games=1} {--php-depth=3} {--external-depth=3} {--max-moves=300} {--seed=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'PHPのAIと外部AI（python-shogi）の対局';

    /**
     * Execute the console command.
     */
    public function handle(AIService $aiService, ShogiService $shogiService, ExternalAIService $externalAI)
    {
        $games = (int) $this->argument('games');
        $phpDepth = (int) $this->option('php-depth');
        $externalDepth = (int) $this->option('external-depth');
        $maxMoves = (int) $this->option('max-moves');
        $seed = $this->option('seed') ? (int) $this->option('seed') : null;

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

        $this->info("PHP AI vs External AI（python-shogi）");
        $this->info("Games: {$games}, PHP Depth: {$phpDepth}, External Depth: {$externalDepth}");
        $this->newLine();

        for ($i = 1; $i <= $games; $i++) {
            $this->info("ゲーム {$i}/{$games} 開始...");

            $boardState = $shogiService->getInitialBoard();
            $moves = 0;
            $winner = null;
            $endReason = null;

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
                    $move = $externalAI->generateMove($boardState, $externalDepth);
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
                if ($moves > 200 && $this->isSennichite($boardState)) {
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
     * 千日手判定（簡易版）
     */
    private function isSennichite(array $boardState): bool
    {
        // 簡略化のため、この関数では常にfalseを返す
        // 実装時には、履歴を保持して判定する
        return false;
    }
}

