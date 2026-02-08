<?php

namespace App\Console\Commands;

use App\Services\AIService;
use App\Services\ShogiService;
use Illuminate\Console\Command;

class EngineBattle extends Command
{
    protected $signature = 'battle {--games=2 : 対局数} {--sf-level=3 : Fairy-Stockfishのレベル(1-20)} {--difficulty=hard : AI難易度(easy/medium/hard)} {--sf-time=200 : SF思考時間(ms)}';
    protected $description = '自作AI vs Fairy-Stockfish 対戦テスト';

    private ShogiService $shogiService;
    private AIService $aiService;

    private const FAIRY_SF_PATH = '/usr/games/fairy-stockfish';
    private const MAX_MOVES = 300;

    // SFEN ↔ 内部形式の変換テーブル
    private const PIECE_USI_TO_INTERNAL = [
        'P' => 'fu', 'L' => 'kyosha', 'N' => 'keima', 'S' => 'gin',
        'G' => 'kin', 'B' => 'kaku', 'R' => 'hisha',
    ];
    
    private const PIECE_INTERNAL_TO_USI = [
        'fu' => 'P', 'kyosha' => 'L', 'keima' => 'N', 'gin' => 'S',
        'kin' => 'G', 'kaku' => 'B', 'hisha' => 'R',
    ];

    private const PROMOTE_MAP = [
        'fu' => 'tokin', 'kyosha' => 'nkyosha', 'keima' => 'nkeima',
        'gin' => 'ngin', 'kaku' => 'uma', 'hisha' => 'ryu',
    ];
    private const DEMOTE_MAP = [
        'tokin' => 'fu', 'nkyosha' => 'kyosha', 'nkeima' => 'keima',
        'ngin' => 'gin', 'uma' => 'kaku', 'ryu' => 'hisha',
    ];
    
    private const PIECE_NAMES = [
        'fu' => '歩', 'kyosha' => '香', 'keima' => '桂', 'gin' => '銀', 'kin' => '金',
        'kaku' => '角', 'hisha' => '飛', 'gyoku' => '玉', 'ou' => '王',
        'tokin' => 'と', 'nkyosha' => '杏', 'nkeima' => '圭', 'ngin' => '全',
        'uma' => '馬', 'ryu' => '龍',
    ];

    public function __construct(ShogiService $shogiService, AIService $aiService)
    {
        parent::__construct();
        $this->shogiService = $shogiService;
        $this->aiService = $aiService;
    }

    public function handle(): int
    {
        $numGames = (int) $this->option('games');
        $sfLevel = (int) $this->option('sf-level');
        $difficulty = $this->option('difficulty');
        $sfTime = (int) $this->option('sf-time');

        $this->info('');
        $this->info('┌─────────────────────────────────────┐');
        $this->info('│       将棋AI 強さ測定テスト         │');
        $this->info('├─────────────────────────────────────┤');
        $this->info(sprintf('│ 対局数       : %4d                  │', $numGames));
        $this->info(sprintf('│ SF Skill Lv  : %4d                  │', $sfLevel));
        $this->info(sprintf('│ 自作AI難易度 : %4s                  │', $difficulty));
        $this->info(sprintf('│ SF思考時間   : %4dms                │', $sfTime));
        $this->info('└─────────────────────────────────────┘');

        $results = ['ai_win' => 0, 'sf_win' => 0, 'draw' => 0];
        $totalMoves = [];

        for ($i = 0; $i < $numGames; $i++) {
            // 先後交代
            if ($i % 2 === 0) {
                $sfColor = 'sente';
                $aiColor = 'gote';
            } else {
                $sfColor = 'gote';
                $aiColor = 'sente';
            }

            [$result, $moves] = $this->runGame($sfColor, $aiColor, $difficulty, $sfLevel, $sfTime);
            $results[$result]++;
            $totalMoves[] = $moves;

            $tags = ['ai_win' => '○ 自作AI勝利', 'sf_win' => '● SF勝利', 'draw' => '△ 引き分け'];
            $this->info("  → {$tags[$result]} ({$moves}手)");
        }

        $avgMoves = count($totalMoves) > 0 ? array_sum($totalMoves) / count($totalMoves) : 0;
        $winRate = $numGames > 0 ? $results['ai_win'] / $numGames * 100 : 0;

        $this->info('');
        $this->info('┌─────────────────────────────────────┐');
        $this->info('│           最 終 結 果               │');
        $this->info('├─────────────────────────────────────┤');
        $this->info(sprintf('│ 自作AI勝利   : %4d                  │', $results['ai_win']));
        $this->info(sprintf('│ SF勝利       : %4d                  │', $results['sf_win']));
        $this->info(sprintf('│ 引き分け     : %4d                  │', $results['draw']));
        $this->info(sprintf('│ 自作AI勝率   : %5.1f%%                │', $winRate));
        $this->info(sprintf('│ 平均手数     : %5.1f                │', $avgMoves));
        $this->info('└─────────────────────────────────────┘');

        return 0;
    }

    private function runGame(string $sfColor, string $aiColor, string $difficulty, int $sfLevel, int $sfTime): array
    {
        $sfLabel = "SF(Lv{$sfLevel})";
        $aiLabel = "自作AI({$difficulty})";

        $this->info('');
        $this->info(str_repeat('─', 55));
        $this->info("  {$sfLabel} [{$sfColor}]  vs  {$aiLabel} [{$aiColor}]");
        $this->info(str_repeat('─', 55));

        $engine = $this->startEngine($sfLevel, $sfTime);
        $boardState = $this->getInitialBoardState();
        $movesUSI = [];
        $moveNum = 0;

        try {
            while ($moveNum < self::MAX_MOVES) {
                $current = $boardState['turn'];
                $moveNum++;

                if ($current === $sfColor) {
                    // Fairy-Stockfish の手
                    $usi = $this->getEngineMove($engine, $movesUSI);
                    if (!$usi) {
                        $this->info("  {$moveNum}. {$sfLabel} 投了!");
                        return ['ai_win', $moveNum];
                    }

                    $move = $this->usiToMove($usi, $boardState, $sfColor);
                    $jp = $this->moveToJapanese($move, $sfColor);
                    $boardState = $this->applyMove($boardState, $move, $sfColor);
                    $movesUSI[] = $usi;

                    if (!$this->findKing($boardState['board'], $aiColor)) {
                        $this->error(sprintf("  %3d. %s  ← 玉取得！ %s勝利", $moveNum, $jp, $sfLabel));
                        return ['sf_win', $moveNum];
                    }

                    $label = sprintf("  %3d. [SF] %s  (usi: %s)", $moveNum, $jp, $usi);
                } else {
                    // 自作AI の手
                    $move = $this->aiService->generateMove($boardState, $difficulty, $aiColor);
                    if (!$move) {
                        $this->info("  {$moveNum}. {$aiLabel} 投了 (手なし)");
                        return ['sf_win', $moveNum];
                    }

                    $jp = $this->moveToJapanese($move, $aiColor);
                    $usi = $this->moveToUSI($move);
                    $boardState = $this->applyMove($boardState, $move, $aiColor);
                    $movesUSI[] = $usi;

                    if (!$this->findKing($boardState['board'], $sfColor)) {
                        $this->info(sprintf("  %3d. %s  ← 玉取得！ %s勝利", $moveNum, $jp, $aiLabel));
                        return ['ai_win', $moveNum];
                    }

                    $label = sprintf("  %3d. [AI] %s  (usi: %s)", $moveNum, $jp, $usi);
                }
                
                if ($moveNum <= 60 || $moveNum % 20 === 0) {
                    $this->line($label);
                }
            }

            $this->warn("  " . self::MAX_MOVES . "手で引き分け");
            return ['draw', $moveNum];
        } finally {
            $this->closeEngine($engine);
        }
    }

    // ========== エンジン管理 ==========

    private function startEngine(int $skillLevel, int $moveTime): array
    {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(self::FAIRY_SF_PATH, $descriptors, $pipes);
        if (!is_resource($process)) {
            throw new \RuntimeException('Fairy-Stockfish の起動に失敗');
        }

        stream_set_blocking($pipes[1], true);

        $engine = ['process' => $process, 'pipes' => $pipes, 'move_time' => $moveTime];

        $this->sendEngine($engine, 'usi');
        $this->waitFor($engine, 'usiok');
        $this->sendEngine($engine, 'setoption name UCI_Variant value shogi');
        $this->sendEngine($engine, "setoption name Skill Level value {$skillLevel}");
        $this->sendEngine($engine, 'isready');
        $this->waitFor($engine, 'readyok');

        return $engine;
    }

    private function sendEngine(array &$engine, string $cmd): void
    {
        fwrite($engine['pipes'][0], $cmd . "\n");
        fflush($engine['pipes'][0]);
    }

    private function waitFor(array &$engine, string $expected): string
    {
        $maxAttempts = 1000;
        $i = 0;
        while ($i++ < $maxAttempts) {
            $line = trim(fgets($engine['pipes'][1]));
            if (str_starts_with($line, $expected)) {
                return $line;
            }
        }
        throw new \RuntimeException("Engine response timeout waiting for: {$expected}");
    }

    private function getEngineMove(array &$engine, array $movesUSI): ?string
    {
        if (!empty($movesUSI)) {
            $this->sendEngine($engine, 'position startpos moves ' . implode(' ', $movesUSI));
        } else {
            $this->sendEngine($engine, 'position startpos');
        }
        $this->sendEngine($engine, "go movetime {$engine['move_time']}");

        $maxAttempts = 5000;
        $i = 0;
        while ($i++ < $maxAttempts) {
            $line = trim(fgets($engine['pipes'][1]));
            if (str_starts_with($line, 'bestmove')) {
                $parts = explode(' ', $line);
                $move = $parts[1] ?? null;
                if ($move === 'resign' || $move === '(none)') {
                    return null;
                }
                return $move;
            }
        }
        return null;
    }

    private function closeEngine(array &$engine): void
    {
        try {
            $this->sendEngine($engine, 'quit');
        } catch (\Throwable $e) {
        }
        foreach ($engine['pipes'] as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }
        proc_close($engine['process']);
    }

    // ========== 盤面管理 ==========

    private function getInitialBoardState(): array
    {
        $data = $this->shogiService->getInitialBoard();
        
        // getInitialBoard の返り値形式に応じて調整
        if (isset($data['board'])) {
            $hand = $data['hand'] ?? ['sente' => [], 'gote' => []];
            if (!is_array($hand) || array_is_list($hand ?? [])) {
                $hand = ['sente' => [], 'gote' => []];
            }
            foreach (['sente', 'gote'] as $c) {
                if (!isset($hand[$c]) || !is_array($hand[$c]) || array_is_list($hand[$c] ?? [])) {
                    $hand[$c] = [];
                }
            }
            return [
                'board' => $data['board'],
                'hand' => $hand,
                'turn' => $data['turn'] ?? 'sente',
            ];
        }
        
        return [
            'board' => $data,
            'hand' => ['sente' => [], 'gote' => []],
            'turn' => 'sente',
        ];
    }

    private function applyMove(array $boardState, array $move, string $color): array
    {
        $board = $boardState['board'];
        $hand = $boardState['hand'];

        // 持ち駒のサニタイズ
        foreach (['sente', 'gote'] as $c) {
            if (!isset($hand[$c]) || !is_array($hand[$c]) || (is_array($hand[$c]) && array_is_list($hand[$c]))) {
                $hand[$c] = [];
            }
        }

        if (!empty($move['is_drop'])) {
            // 駒打ち
            $pt = $move['piece_type'];
            $board[$move['to_rank']][$move['to_file']] = ['type' => $pt, 'color' => $color];
            if (isset($hand[$color][$pt]) && $hand[$color][$pt] > 0) {
                $hand[$color][$pt]--;
            }
        } else {
            $fr = $move['from_rank'];
            $ff = $move['from_file'];
            $tr = $move['to_rank'];
            $tf = $move['to_file'];

            $piece = $board[$fr][$ff] ?? null;
            if (!$piece) {
                // デバッグ: なぜ駒がないか
                $this->error("[applyMove] No piece at {$ff}-{$fr}! Color: {$color}, Turn: {$boardState['turn']}");
                // turnは切り替えて返す（ゲームを壊さないように）
                $boardState['turn'] = $boardState['turn'] === 'sente' ? 'gote' : 'sente';
                return $boardState;
            }

            // 駒取り
            $target = $board[$tr][$tf] ?? null;
            if ($target && !in_array($target['type'], ['gyoku', 'ou'])) {
                $capType = self::DEMOTE_MAP[$target['type']] ?? $target['type'];
                $hand[$color][$capType] = ($hand[$color][$capType] ?? 0) + 1;
            }

            // 成り
            $pt = $piece['type'];
            if (!empty($move['promote']) && isset(self::PROMOTE_MAP[$pt])) {
                $pt = self::PROMOTE_MAP[$pt];
            }

            $board[$tr][$tf] = ['type' => $pt, 'color' => $color];
            $board[$fr][$ff] = null;
        }

        return [
            'board' => $board,
            'hand' => $hand,
            'turn' => $boardState['turn'] === 'sente' ? 'gote' : 'sente',
        ];
    }

    private function findKing(array $board, string $color): ?array
    {
        for ($r = 1; $r <= 9; $r++) {
            for ($f = 1; $f <= 9; $f++) {
                $p = $board[$r][$f] ?? null;
                if ($p && $p['color'] === $color && in_array($p['type'], ['gyoku', 'ou'])) {
                    return ['rank' => $r, 'file' => $f];
                }
            }
        }
        return null;
    }

    // ========== USI 変換 ==========

    private function usiToMove(string $usi, array $boardState, string $color): array
    {
        // USI座標 → アプリ座標の変換:
        // app_rank = 10 - usi_rank (段が逆)
        // app_file = 10 - usi_file (筋が逆)
        
        // 駒打ち: P*5e
        if (str_contains($usi, '*')) {
            $pChar = strtoupper($usi[0]);
            $usi_file = (int) $usi[2];
            $usi_rank = ord($usi[3]) - ord('a') + 1;
            $tf = 10 - $usi_file;
            $tr = 10 - $usi_rank;
            return [
                'from_rank' => null, 'from_file' => null,
                'to_rank' => $tr, 'to_file' => $tf,
                'piece_type' => self::PIECE_USI_TO_INTERNAL[$pChar] ?? 'fu',
                'is_drop' => true, 'capture' => false,
            ];
        }

        // 通常移動: 7g7f or 7g7f+
        $promote = str_ends_with($usi, '+');
        $s = rtrim($usi, '+');
        $usi_ff = (int) $s[0];
        $usi_fr = ord($s[1]) - ord('a') + 1;
        $usi_tf = (int) $s[2];
        $usi_tr = ord($s[3]) - ord('a') + 1;
        
        $ff = 10 - $usi_ff;
        $fr = 10 - $usi_fr;
        $tf = 10 - $usi_tf;
        $tr = 10 - $usi_tr;

        $piece = $boardState['board'][$fr][$ff] ?? null;
        $pt = $piece ? $piece['type'] : 'fu';
        $target = $boardState['board'][$tr][$tf] ?? null;

        return [
            'from_rank' => $fr, 'from_file' => $ff,
            'to_rank' => $tr, 'to_file' => $tf,
            'piece_type' => $pt,
            'capture' => $target !== null,
            'promote' => $promote,
        ];
    }

    private function moveToUSI(array $move): string
    {
        if (!empty($move['is_drop'])) {
            $pc = self::PIECE_INTERNAL_TO_USI[$move['piece_type']] ?? 'P';
            $usi_file = 10 - $move['to_file'];
            $usi_rank = 10 - $move['to_rank'];
            $tr = chr(ord('a') + $usi_rank - 1);
            return "{$pc}*{$usi_file}{$tr}";
        }

        $usi_ff = 10 - $move['from_file'];
        $usi_fr = 10 - $move['from_rank'];
        $usi_tf = 10 - $move['to_file'];
        $usi_tr = 10 - $move['to_rank'];
        
        $fr = chr(ord('a') + $usi_fr - 1);
        $tr = chr(ord('a') + $usi_tr - 1);
        $usi = "{$usi_ff}{$fr}{$usi_tf}{$tr}";
        if (!empty($move['promote'])) {
            $usi .= '+';
        }
        return $usi;
    }

    private function moveToJapanese(array $move, string $color): string
    {
        $pt = $move['piece_type'] ?? '?';
        $name = self::PIECE_NAMES[$pt] ?? $pt;
        $tf = $move['to_file'];
        $tr = $move['to_rank'];
        $prefix = $color === 'sente' ? '☗' : '☖';

        if (!empty($move['is_drop'])) {
            return "{$prefix}{$tf}{$tr}{$name}打";
        }

        $ff = $move['from_file'] ?? '?';
        $fr = $move['from_rank'] ?? '?';
        $promo = !empty($move['promote']) ? '成' : '';
        $cap = !empty($move['capture']) ? '×' : '';
        return "{$prefix}{$ff}{$fr}{$name}→{$tf}{$tr}{$cap}{$promo}";
    }
}
