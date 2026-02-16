#!/usr/bin/env node
/**
 * アクセシビリティテスト実行スクリプト
 * 
 * 全アクセシビリティテストを順序実行する
 * 
 * Usage:
 *   node tests/scripts/run-a11y-tests.mjs    # 順序実行
 *   node tests/scripts/run-a11y-tests.mjs --parallel  # 並列実行（試験的）
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, '..', 'accessibility');

const tests = [
    {
        name: '🎯 全盲ユーザー対局シミュレーション',
        file: 'blind-user-playtest.mjs',
        timeout: 120000,
    },
    {
        name: '🎯 全盲者拡張テスト',
        file: 'blind-user-extended.mjs',
        timeout: 90000,
    },
    {
        name: '🎯 弱視者対局シミュレーション',
        file: 'low-vision-test.mjs',
        timeout: 120000,
    },
    {
        name: '🎯 WCAG AAA色対比テスト',
        file: 'contrast-test.mjs',
        timeout: 60000,
    },
    {
        name: '🎯 周辺視野喪失ユーザーテスト',
        file: 'peripheral-vision-loss-test.mjs',
        timeout: 60000,
    },
    {
        name: '🎯 パーキンソン病ユーザーテスト',
        file: 'parkinsons-test.mjs',
        timeout: 60000,
    },
    {
        name: '🎯 低スペック環境テスト',
        file: 'lowspec-network-test.mjs',
        timeout: 150000,
    },
    {
        name: '🎯 色覚異常ユーザーテスト',
        file: 'color-blind-test.mjs',
        timeout: 60000,
    },
];

let totalPassed = 0;
let totalFailed = 0;
const failedTests = [];

async function runTest(test) {
    return new Promise((resolve) => {
        console.log(`\n${test.name}`);
        console.log('─'.repeat(50));

        const testPath = path.join(testsDir, test.file);
        const proc = spawn('node', [testPath], {
            stdio: 'inherit',
            timeout: test.timeout,
        });

        const timeoutHandle = setTimeout(() => {
            proc.kill();
            console.error(`⏱️  タイムアウト: ${test.name}`);
            totalFailed++;
            failedTests.push(test.name);
            resolve();
        }, test.timeout);

        proc.on('exit', (code) => {
            clearTimeout(timeoutHandle);
            if (code === 0) {
                totalPassed++;
            } else {
                totalFailed++;
                failedTests.push(test.name);
            }
            resolve();
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutHandle);
            console.error(`❌ エラー: ${test.name}`, err.message);
            totalFailed++;
            failedTests.push(test.name);
            resolve();
        });
    });
}

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     アクセシビリティテスト実行スイート          ║');
    console.log('╚════════════════════════════════════════════════╝');

    const startTime = Date.now();

    // 順序実行
    for (const test of tests) {
        await runTest(test);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n\n╔════════════════════════════════════════════════╗');
    console.log('║                    実行完了                     ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`\n✅ 成功: ${totalPassed}/${tests.length}`);
    if (totalFailed > 0) {
        console.log(`❌ 失敗: ${totalFailed}`);
        console.log('\n失敗したテスト:');
        failedTests.forEach((test) => {
            console.log(`  - ${test}`);
        });
    }
    console.log(`\n⏱️  実行時間: ${elapsed}秒\n`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
