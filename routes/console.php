<?php

use App\Services\AIService;
use App\Services\ShogiService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ai:benchmark {games=20} {difficulty=easy} {--max-moves=200} {--seed=1}', function () {
    $games = (int) $this->argument('games');
    $difficulty = (string) $this->argument('difficulty');
    $maxMoves = (int) $this->option('max-moves');
    $seed = (int) $this->option('seed');

    $aiService = app(AIService::class);
    $shogiService = app(ShogiService::class);

    $results = [
        'sente' => 0,
        'gote' => 0,
        'draw' => 0,
    ];

    $applyMove = function (array $boardState, array $move, string $turn) use ($shogiService): array {
        if ($move['is_drop'] ?? false) {
            $boardState['board'][$move['to_rank']][$move['to_file']] = [
                'type' => $move['piece_type'],
                'color' => $turn,
            ];

            if (!isset($boardState['hand'][$turn][$move['piece_type']])) {
                $boardState['hand'][$turn][$move['piece_type']] = 0;
            }
            $boardState['hand'][$turn][$move['piece_type']]--;

            return $boardState;
        }

        $piece = $boardState['board'][$move['from_rank']][$move['from_file']];
        $capturedPiece = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;

        $boardState['board'][$move['to_rank']][$move['to_file']] = $piece;
        $boardState['board'][$move['from_rank']][$move['from_file']] = null;

        if ($capturedPiece) {
            $capturedType = $shogiService->demotePiece($capturedPiece['type']);
            if (!isset($boardState['hand'][$turn][$capturedType])) {
                $boardState['hand'][$turn][$capturedType] = 0;
            }
            $boardState['hand'][$turn][$capturedType]++;
        }

        return $boardState;
    };

    $this->info("AI benchmark: difficulty={$difficulty}, games={$games}, maxMoves={$maxMoves}, seed={$seed}");

    for ($i = 0; $i < $games; $i++) {
        mt_srand($seed + $i);

        $boardState = $shogiService->getInitialBoard();
        $boardState['turn'] = 'sente';
        $boardState['hand'] = ['sente' => [], 'gote' => []];

        $winner = null;

        for ($moveIndex = 1; $moveIndex <= $maxMoves; $moveIndex++) {
            $turn = $boardState['turn'];
            $move = $aiService->generateMove($boardState, $difficulty, $turn);

            if (!$move) {
                $winner = $turn === 'sente' ? 'gote' : 'sente';
                break;
            }

            $boardState = $applyMove($boardState, $move, $turn);
            $boardState['turn'] = $turn === 'sente' ? 'gote' : 'sente';

            if ($shogiService->isCheckmate($boardState, $boardState['turn'])) {
                $winner = $turn;
                break;
            }
        }

        if ($winner === null) {
            $results['draw']++;
        } else {
            $results[$winner]++;
        }
    }

    $this->newLine();
    $this->info('結果:');
    $this->line('  先手勝ち: ' . $results['sente']);
    $this->line('  後手勝ち: ' . $results['gote']);
    $this->line('  引き分け: ' . $results['draw']);
})->purpose('AI自己対局ベンチマーク（公開仕様ベース）');

Artisan::command('ai:elo {games=50} {difficultyA=easy} {difficultyB=hard} {--max-moves=200} {--seed=1} {--k=20}', function () {
    $games = (int) $this->argument('games');
    $difficultyA = (string) $this->argument('difficultyA');
    $difficultyB = (string) $this->argument('difficultyB');
    $maxMoves = (int) $this->option('max-moves');
    $seed = (int) $this->option('seed');
    $k = (int) $this->option('k');

    $aiService = app(AIService::class);
    $shogiService = app(ShogiService::class);

    $ratingA = 1500.0;
    $ratingB = 1500.0;

    $applyMove = function (array $boardState, array $move, string $turn) use ($shogiService): array {
        if ($move['is_drop'] ?? false) {
            $boardState['board'][$move['to_rank']][$move['to_file']] = [
                'type' => $move['piece_type'],
                'color' => $turn,
            ];

            if (!isset($boardState['hand'][$turn][$move['piece_type']])) {
                $boardState['hand'][$turn][$move['piece_type']] = 0;
            }
            $boardState['hand'][$turn][$move['piece_type']]--;

            return $boardState;
        }

        $piece = $boardState['board'][$move['from_rank']][$move['from_file']];
        $capturedPiece = $boardState['board'][$move['to_rank']][$move['to_file']] ?? null;

        $boardState['board'][$move['to_rank']][$move['to_file']] = $piece;
        $boardState['board'][$move['from_rank']][$move['from_file']] = null;

        if ($capturedPiece) {
            $capturedType = $shogiService->demotePiece($capturedPiece['type']);
            if (!isset($boardState['hand'][$turn][$capturedType])) {
                $boardState['hand'][$turn][$capturedType] = 0;
            }
            $boardState['hand'][$turn][$capturedType]++;
        }

        return $boardState;
    };

    $expectedScore = function (float $ra, float $rb): float {
        return 1 / (1 + pow(10, ($rb - $ra) / 400));
    };

    $this->info("AI Elo: {$difficultyA} vs {$difficultyB}, games={$games}, maxMoves={$maxMoves}, seed={$seed}");

    $results = [
        'A_win' => 0,
        'B_win' => 0,
        'draw' => 0,
    ];

    for ($i = 0; $i < $games; $i++) {
        mt_srand($seed + $i);

        $boardState = $shogiService->getInitialBoard();
        $boardState['turn'] = 'sente';
        $boardState['hand'] = ['sente' => [], 'gote' => []];

        $aColor = $i % 2 === 0 ? 'sente' : 'gote';
        $bColor = $aColor === 'sente' ? 'gote' : 'sente';

        $winner = null;

        for ($moveIndex = 1; $moveIndex <= $maxMoves; $moveIndex++) {
            $turn = $boardState['turn'];
            $difficulty = $turn === $aColor ? $difficultyA : $difficultyB;

            $move = $aiService->generateMove($boardState, $difficulty, $turn);
            if (!$move) {
                $winner = $turn === 'sente' ? 'gote' : 'sente';
                break;
            }

            $boardState = $applyMove($boardState, $move, $turn);
            $boardState['turn'] = $turn === 'sente' ? 'gote' : 'sente';

            if ($shogiService->isCheckmate($boardState, $boardState['turn'])) {
                $winner = $turn;
                break;
            }
        }

        $scoreA = 0.5;
        if ($winner !== null) {
            if ($winner === $aColor) {
                $results['A_win']++;
                $scoreA = 1.0;
            } else {
                $results['B_win']++;
                $scoreA = 0.0;
            }
        } else {
            $results['draw']++;
        }

        $expectedA = $expectedScore($ratingA, $ratingB);
        $expectedB = 1 - $expectedA;

        $ratingA += $k * ($scoreA - $expectedA);
        $ratingB += $k * ((1 - $scoreA) - $expectedB);
    }

    $this->newLine();
    $this->info('結果:');
    $this->line("  {$difficultyA}勝ち: {$results['A_win']}");
    $this->line("  {$difficultyB}勝ち: {$results['B_win']}");
    $this->line("  引き分け: {$results['draw']}");
    $this->line("  Elo({$difficultyA}): " . round($ratingA, 1));
    $this->line("  Elo({$difficultyB}): " . round($ratingB, 1));
})->purpose('AI難易度のElo推定（自己対局）');
