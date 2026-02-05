<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class UsiEngineService
{
    private ?string $enginePath = null;

    public function __construct(?string $enginePath = null)
    {
        $this->enginePath = $enginePath;
    }

    public function setEnginePath(string $enginePath): void
    {
        $this->enginePath = $enginePath;
    }

    public function generateMove(array $boardState, int $depth = 3, ?string $enginePath = null, ?string $variant = null, ?int $movetime = null): ?array
    {
        $path = $enginePath ?? $this->enginePath;
        if (!$path) {
            Log::warning('USI engine path not provided');
            return null;
        }

        $sfen = $this->boardStateToSfen($boardState);
        if (!$sfen) {
            Log::warning('Failed to build SFEN for USI engine');
            return null;
        }

        $process = $this->startProcess($path);
        if (!$process) {
            return null;
        }

        [$proc, $stdin, $stdout] = $process;

        try {
            $this->write($stdin, "usi\n");
            $this->readUntil($stdout, 'usiok', 2.0);

            if ($variant) {
                $this->write($stdin, "setoption name Variant value {$variant}\n");
                $this->write($stdin, "setoption name UCI_Variant value {$variant}\n");
            }

            $this->write($stdin, "isready\n");
            $this->readUntil($stdout, 'readyok', 2.0);

            $this->write($stdin, "position sfen {$sfen}\n");
            
            if ($movetime !== null) {
                $this->write($stdin, "go movetime {$movetime}\n");
            } else {
                $this->write($stdin, "go depth {$depth}\n");
            }

            $bestMoveLine = $this->readUntil($stdout, 'bestmove', 5.0);
            if (!$bestMoveLine) {
                $this->write($stdin, "quit\n");
                $this->closeProcess($proc, $stdin, $stdout);
                return null;
            }

            $this->write($stdin, "quit\n");
            $this->closeProcess($proc, $stdin, $stdout);

            return $this->usiMoveToPhp($bestMoveLine);
        } catch (\Throwable $e) {
            Log::error('USI engine error', ['error' => $e->getMessage()]);
            $this->closeProcess($proc, $stdin, $stdout);
            return null;
        }
    }

    private function startProcess(string $path): ?array
    {
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $proc = proc_open($path, $descriptorSpec, $pipes);
        if (!is_resource($proc)) {
            Log::warning('Failed to start USI engine process');
            return null;
        }

        stream_set_blocking($pipes[0], true);
        stream_set_blocking($pipes[1], true);

        return [$proc, $pipes[0], $pipes[1]];
    }

    private function closeProcess($proc, $stdin, $stdout): void
    {
        if (is_resource($stdin)) {
            fclose($stdin);
        }
        if (is_resource($stdout)) {
            fclose($stdout);
        }
        if (is_resource($proc)) {
            proc_terminate($proc);
        }
    }

    private function write($stdin, string $command): void
    {
        fwrite($stdin, $command);
        fflush($stdin);
    }

    private function readUntil($stdout, string $needle, float $timeoutSeconds): ?string
    {
        $start = microtime(true);
        $buffer = '';

        while ((microtime(true) - $start) < $timeoutSeconds) {
            $line = fgets($stdout);
            if ($line === false) {
                usleep(20000);
                continue;
            }

            $buffer .= $line;
            if (str_contains($line, $needle)) {
                return trim($line);
            }
        }

        Log::warning('USI engine timeout', ['needle' => $needle, 'buffer' => $buffer]);
        return null;
    }

    private function boardStateToSfen(array $boardState): ?string
    {
        if (!isset($boardState['board'])) {
            return null;
        }

        $boardString = '';
        for ($rank = 9; $rank >= 1; $rank--) {
            $empty = 0;
            for ($file = 1; $file <= 9; $file++) {
                $piece = $boardState['board'][(string) $rank][(string) $file] ?? null;
                if ($piece) {
                    if ($empty > 0) {
                        $boardString .= $empty;
                        $empty = 0;
                    }
                    $boardString .= $this->pieceToUsi($piece['type'], $piece['color']);
                } else {
                    $empty++;
                }
            }
            if ($empty > 0) {
                $boardString .= $empty;
            }
            if ($rank > 1) {
                $boardString .= '/';
            }
        }

        $turn = ($boardState['turn'] ?? 'sente') === 'sente' ? 'b' : 'w';

        $handString = $this->handToUsi($boardState['hand'] ?? ['sente' => [], 'gote' => []]);
        if ($handString === '') {
            $handString = '-';
        }

        return $boardString . ' ' . $turn . ' ' . $handString . ' 1';
    }

    private function handToUsi(array $hand): string
    {
        $order = ['R','B','G','S','N','L','P'];
        $result = '';

        foreach (['sente' => true, 'gote' => false] as $color => $isSente) {
            foreach ($order as $symbol) {
                $type = $this->usiPieceToType($symbol);
                $count = $hand[$color][$type] ?? 0;
                if ($count > 0) {
                    $pieceSymbol = $isSente ? $symbol : strtolower($symbol);
                    $result .= $count > 1 ? $count . $pieceSymbol : $pieceSymbol;
                }
            }
        }

        return $result;
    }

    private function pieceToUsi(string $type, string $color): string
    {
        $map = [
            'fu' => 'P',
            'kyosha' => 'L',
            'keima' => 'N',
            'gin' => 'S',
            'kin' => 'G',
            'kaku' => 'B',
            'hisha' => 'R',
            'gyoku' => 'K',
            'ou' => 'K',
            'tokin' => '+P',
            'nkyosha' => '+L',
            'nkeima' => '+N',
            'ngin' => '+S',
            'uma' => '+B',
            'ryu' => '+R',
        ];

        $symbol = $map[$type] ?? 'P';
        if ($color === 'gote') {
            $symbol = strtolower($symbol);
        }

        return $symbol;
    }

    private function usiMoveToPhp(string $bestMoveLine): ?array
    {
        if (!preg_match('/bestmove\s+(\S+)/', $bestMoveLine, $matches)) {
            return null;
        }

        $move = $matches[1];
        if ($move === 'resign' || $move === 'win') {
            return null;
        }

        if (preg_match('/^([PLNSGBRK])\*([1-9])([a-i])$/', $move, $dropMatch)) {
            $pieceType = $this->usiPieceToType($dropMatch[1]);
            $toFile = (int) $dropMatch[2];
            $toRank = $this->usiRankToBoardRank($dropMatch[3]);

            return [
                'is_drop' => true,
                'to_file' => $toFile,
                'to_rank' => $toRank,
                'piece_type' => $pieceType,
            ];
        }

        if (preg_match('/^([1-9])([a-i])([1-9])([a-i])(\+)?$/', $move, $moveMatch)) {
            $fromFile = (int) $moveMatch[1];
            $fromRank = $this->usiRankToBoardRank($moveMatch[2]);
            $toFile = (int) $moveMatch[3];
            $toRank = $this->usiRankToBoardRank($moveMatch[4]);
            $promote = !empty($moveMatch[5]);

            return [
                'is_drop' => false,
                'from_file' => $fromFile,
                'from_rank' => $fromRank,
                'to_file' => $toFile,
                'to_rank' => $toRank,
                'promote' => $promote,
            ];
        }

        return null;
    }

    private function usiRankToBoardRank(string $usiRank): int
    {
        $index = ord($usiRank) - ord('a');
        return 9 - $index;
    }

    private function usiPieceToType(string $symbol): string
    {
        return match ($symbol) {
            'P' => 'fu',
            'L' => 'kyosha',
            'N' => 'keima',
            'S' => 'gin',
            'G' => 'kin',
            'B' => 'kaku',
            'R' => 'hisha',
            'K' => 'ou',
            default => 'fu',
        };
    }
}
