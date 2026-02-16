#!/usr/bin/env node
/**
 * AIペルソナテスト実行スクリプト
 * 
 * 全AIペルソナテストを順序実行する
 * 
 * Usage:
 *   node tests/scripts/run-ai-tests.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, '..');

const tests = [
    {
        name: '🤖 障害者AIペルソナ Wave 1',
        file: 'customer-ai/test-diverse.mjs',
        timeout: 120000,
    },
    {
        name: '🤖 障害者AIペルソナ Wave 2',
        file: 'customer-ai/test-diverse2.mjs',
        timeout: 120000,
    },
    {
        name: '🤖 障害者AIペルソナ Wave 3',
        file: 'customer-ai/test-diverse3.mjs',
        timeout: 120000,
    },
    {
        name: '🤖 加齢による見えにくさAI',
        file: 'customer-ai/test-senior.mjs',
        timeout: 120000,
    },
    {
        name: '🤖 子供・初心者AI',
        file: 'customer-ai/test-child.mjs',
        timeout: 60000,
    },
    {
        name: '🤖 UXリサーチャーAI',
        file: 'customer-ai/test-ux.mjs',
        timeout: 60000,
    },
    {
        name: '🤖 教育者AI',
        file: 'customer-ai/test-teacher.mjs',
        timeout: 60000,
    },
    {
        name: '🤖 モバイルユーザーAI',
        file: 'customer-ai/test-mobile.mjs',
        timeout: 90000,
    },
    {
        name: '🎌 棋士AIペルソナ',
        file: 'expert-ai/test-kishi.mjs',
        timeout: 90000,
    },
    {
        name: '🎨 WebデザイナーAI',
        file: 'expert-ai/test-designer.mjs',
        timeout: 90000,
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
    console.log('║      AIペルソナテスト実行スイート              ║');
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
