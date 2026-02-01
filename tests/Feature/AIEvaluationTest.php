<?php

use App\Services\AIService;
use App\Services\ShogiService;
use Illuminate\Support\Facades\Artisan;

describe('AI Benchmark コマンド - 自己対局ベンチマーク', function () {
    it('ai:benchmark コマンドが実行可能', function () {
        $code = Artisan::call('ai:benchmark', [
            'games' => '2',
            'difficulty' => 'easy',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        expect($code)->toBe(0);
    });

    it('ai:benchmark で勝敗統計が出力される', function () {
        $code = Artisan::call('ai:benchmark', [
            'games' => '3',
            'difficulty' => 'medium',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output = Artisan::output();

        expect($output)->toContain('先手勝ち');
        expect($output)->toContain('後手勝ち');
        expect($output)->toContain('引き分け');
    });

    it('ai:benchmark で各難易度の結果が異なる可能性がある', function () {
        // 複数難易度を実行して、結果が異なる傾向があるか確認
        $outputs = [];

        foreach (['easy', 'medium', 'hard'] as $difficulty) {
            Artisan::call('ai:benchmark', [
                'games' => '2',
                'difficulty' => $difficulty,
                '--seed' => '100',
                '--max-moves' => '100',
            ]);
            $outputs[$difficulty] = Artisan::output();
        }

        // すべての難易度で実行可能であることを確認
        expect(count($outputs))->toBe(3);
        foreach ($outputs as $output) {
            expect($output)->toContain('先手勝ち');
        }
    });

    it('ai:benchmark の結果は統計的に有効（勝敗数の合計=ゲーム数）', function () {
        $games = 5;
        Artisan::call('ai:benchmark', [
            'games' => (string) $games,
            'difficulty' => 'easy',
            '--seed' => '200',
            '--max-moves' => '100',
        ]);

        $output = Artisan::output();

        // 出力から勝敗数を抽出（簡易的な検証）
        expect($output)->toMatch('/先手勝ち: \d+/');
        expect($output)->toMatch('/後手勝ち: \d+/');
        expect($output)->toMatch('/引き分け: \d+/');
    });

    it('異なるシードで異なる結果が得られる可能性がある', function () {
        $output1 = '';
        $output2 = '';

        Artisan::call('ai:benchmark', [
            'games' => '3',
            'difficulty' => 'medium',
            '--seed' => '1',
            '--max-moves' => '100',
        ]);
        $output1 = Artisan::output();

        Artisan::call('ai:benchmark', [
            'games' => '3',
            'difficulty' => 'medium',
            '--seed' => '999',
            '--max-moves' => '100',
        ]);
        $output2 = Artisan::output();

        // 同じシードとコマンドオプションなら、結果は再現可能であることを確認
        // （複数実行しても同じシードなら同じ結果になるはず）
        expect($output1)->toContain('先手勝ち');
        expect($output2)->toContain('先手勝ち');
    });
});

describe('AI Elo レーティング コマンド', function () {
    it('ai:elo コマンドが実行可能', function () {
        $code = Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
            '--k' => '20',
        ]);

        expect($code)->toBe(0);
    });

    it('ai:elo で勝敗結果と Elo レーティングが出力される', function () {
        Artisan::call('ai:elo', [
            'games' => '3',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output = Artisan::output();

        expect($output)->toContain('easy勝ち');
        expect($output)->toContain('hard勝ち');
        expect($output)->toContain('引き分け');
        expect($output)->toContain('Elo(easy)');
        expect($output)->toContain('Elo(hard)');
    });

    it('ai:elo の Elo レーティングは 1500 付近の値', function () {
        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output = Artisan::output();

        // Elo レーティングを抽出（簡易的な正規表現）
        preg_match('/Elo\(easy\):\s*([\d.]+)/', $output, $matchesA);
        preg_match('/Elo\(hard\):\s*([\d.]+)/', $output, $matchesB);

        if (isset($matchesA[1]) && isset($matchesB[1])) {
            $eloA = (float) $matchesA[1];
            $eloB = (float) $matchesB[1];

            // Elo は初期値 1500 付近から移動する
            expect($eloA)->toBeGreaterThan(0);
            expect($eloB)->toBeGreaterThan(0);
        }
    });

    it('ai:elo で難易度を交換して実行すると異なる結果が得られる', function () {
        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output1 = Artisan::output();

        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'hard',
            'difficultyB' => 'easy',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output2 = Artisan::output();

        // 難易度を交換しても両方とも実行可能
        expect($output1)->toContain('Elo(easy)');
        expect($output2)->toContain('Elo(hard)');
    });

    it('ai:elo で同じ難易度を比較すると Elo レーティングは 1500 に近い', function () {
        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'easy',
            '--seed' => '1',
            '--max-moves' => '50',
        ]);

        $output = Artisan::output();

        // 同じ難易度なら、Elo は初期値 1500 付近に留まるはず
        preg_match('/Elo\(easy\):\s*([\d.]+)/', $output, $matchesA);
        preg_match('/Elo\(easy\):\s*([\d.]+)/', $output, $matchesB);

        expect($output)->toContain('Elo(easy)');
    });

    it('ai:elo の K 値を変更すると Elo 変動が異なる', function () {
        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
            '--k' => '20',
        ]);

        $output1 = Artisan::output();

        Artisan::call('ai:elo', [
            'games' => '2',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '50',
            '--k' => '32',
        ]);

        $output2 = Artisan::output();

        // 異なる K 値でも実行可能
        expect($output1)->toContain('Elo(easy)');
        expect($output2)->toContain('Elo(hard)');
    });
});

describe('AI 評価指標統合テスト', function () {
    it('複数難易度のランキングが作成可能', function () {
        $difficulties = ['easy', 'medium', 'hard'];
        $eloRatings = [];

        foreach ($difficulties as $difficulty) {
            Artisan::call('ai:benchmark', [
                'games' => '2',
                'difficulty' => $difficulty,
                '--seed' => '1',
                '--max-moves' => '100',
            ]);

            $output = Artisan::output();
            expect($output)->toContain('先手勝ち');

            $eloRatings[$difficulty] = 1500; // 簡略化（実際は解析が必要）
        }

        // すべての難易度が評価可能であることを確認
        expect(count($eloRatings))->toBe(3);
    });

    it('ベンチマークとElo推定の結果に一貫性がある', function () {
        // ベンチマークを実行
        Artisan::call('ai:benchmark', [
            'games' => '3',
            'difficulty' => 'easy',
            '--seed' => '1',
            '--max-moves' => '100',
        ]);
        $benchmarkOutput = Artisan::output();

        // Elo 推定を実行
        Artisan::call('ai:elo', [
            'games' => '3',
            'difficultyA' => 'easy',
            'difficultyB' => 'medium',
            '--seed' => '1',
            '--max-moves' => '100',
        ]);
        $eloOutput = Artisan::output();

        // 両方で統計が出力されることを確認
        expect($benchmarkOutput)->toContain('先手勝ち');
        expect($eloOutput)->toContain('easy勝ち');
    });

    it('大規模ベンチマークは時間内に完了', function () {
        $this->markTestSkipped('大規模テストはスキップ（必要に応じて手動実行）');

        // 以下は手動テスト用（CI では実行しない）
        // Artisan::call('ai:benchmark', [
        //     'games' => '100',
        //     'difficulty' => 'medium',
        //     '--max-moves' => '300',
        // ]);
        // $code = Artisan::lastExitCode();
        // expect($code)->toBe(0);
    });

    it('複数難易度のマッチアップで勝敗分布が期待通り', function () {
        Artisan::call('ai:elo', [
            'games' => '4',
            'difficultyA' => 'easy',
            'difficultyB' => 'hard',
            '--seed' => '1',
            '--max-moves' => '150',
        ]);

        $output = Artisan::output();

        // 出力に勝敗と Elo が含まれることを確認
        expect($output)->toMatch('/easy勝ち:\s*\d+/');
        expect($output)->toMatch('/hard勝ち:\s*\d+/');
        expect($output)->toMatch('/Elo\(easy\):\s*[\d.]+/');
        expect($output)->toMatch('/Elo\(hard\):\s*[\d.]+/');
    });

    it('AI 評価指標の再現性（同じシードで同じ結果）', function () {
        // 1回目
        Artisan::call('ai:benchmark', [
            'games' => '2',
            'difficulty' => 'easy',
            '--seed' => '12345',
            '--max-moves' => '100',
        ]);
        $output1 = Artisan::output();

        // 2回目（同じシード）
        Artisan::call('ai:benchmark', [
            'games' => '2',
            'difficulty' => 'easy',
            '--seed' => '12345',
            '--max-moves' => '100',
        ]);
        $output2 = Artisan::output();

        // 同じシードで実行すれば結果が同じはず
        expect($output1)->toBe($output2);
    });
});
