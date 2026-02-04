<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ExternalAIService
{
    /**
     * python-shogiのAIから指し手を取得
     */
    public function generateMove(array $boardState, int $depth = 3): ?array
    {
        try {
            // PHP盤面をJSON形式で変換
            $boardJson = json_encode($boardState);
            
            // python-shogiのAIスクリプトを実行
            $command = sprintf(
                'python3 %s %s %d 2>&1',
                escapeshellarg(base_path('ai_engine.py')),
                escapeshellarg($boardJson),
                $depth
            );
            
            $output = shell_exec($command);
            $result = json_decode($output, true);
            
            if (!$result || !$result['success']) {
                Log::warning('ExternalAI returned error', [
                    'error' => $result['error'] ?? 'Unknown error',
                    'output' => $output,
                ]);
                return null;
            }
            
            return $result['move'] ?? null;
        } catch (\Exception $e) {
            Log::error('ExternalAI error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }
}
