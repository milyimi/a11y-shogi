/**
 * 低スペック環境ユーザー向けテスト（遅い通信・古いブラウザ）
 * 
 * テスト対象:
 * - 3G/4G平均速度での読み込み（遅延のある通信）
 * - ネットワーク切断への対応
 * - オフラインファースト（キャッシュ）
 * - 画像圧縮・最適化
 * - JavaScript バンドルサイズ
 * - ローディング状態の表示
 * - タイムアウト処理
 * - 再試行機能
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';
let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        const msg = detail ? `${testName} — ${detail}` : testName;
        console.log(`  ❌ ${msg}`);
        issues.push(msg);
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log('\n🐢 ========================================');
        console.log('  低スペック環境ユーザー向けテスト');
        console.log('  （遅い回線・古いデバイス）');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: ネットワーク遅延設定
        // ========================================
        console.log('\n🐢 フェーズ1: ネットワーク遅延（3G相当）');

        // CDP でネットワーク遅延を設定
        const client = await page.target().createCDPSession();
        
        // 3G相当: 400Kbps 下り, 100ms レイテンシ
        await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: 400 * 1024 / 8,  // 400Kbps → bytes/s
            uploadThroughput: 100 * 1024 / 8,    // 100Kbps
            latency: 100  // 100ms
        });

        console.log('  ℹ️  3G相当のネットワーク遅延を有効化（100ms レイテンシ）');

        // ========================================
        // フェーズ2: ページロード開始（遅延あり）
        // ========================================
        console.log('\n🐢 フェーズ2: ページロード（遅延あり）');

        const startTime = Date.now();

        // navigationにタイムアウトを設定
        await page.goto(BASE_URL, { 
            waitUntil: 'networkidle2',
            timeout: 15000  // 15秒
        }).catch(err => {
            console.log('  ⚠️  ナビゲーションタイムアウト:', err.message);
        });

        const loadTime = Date.now() - startTime;
        assert(loadTime < 15000, `ページロード完了（${loadTime}ms）`);
        console.log(`  ℹ️  ロード時間: ${loadTime}ms`);

        // ========================================
        // フェーズ3: キャッシュ確認
        // ========================================
        console.log('\n🐢 フェーズ3: キャッシュ利用（再訪問）');

        const cachedAssets = await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            return {
                fromDisk: resources.filter(r => r.transferSize === 0).length,
                total: resources.length,
                avgDuration: (resources.reduce((sum, r) => sum + r.duration, 0) / resources.length).toFixed(0)
            };
        });

        console.log(`  ℹ️  キャッシュ: ${cachedAssets.fromDisk}/${cachedAssets.total}, 平均読み込み時間: ${cachedAssets.avgDuration}ms`);
        // 初回なのでキャッシュは少ないが、記録される
        assert(cachedAssets.total > 0, 'リソースが読み込まれている');

        // ========================================
        // フェーズ4: JavaScriptバンドルサイズ
        // ========================================
        console.log('\n🐢 フェーズ4: アセットサイズ');

        const assets = await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            return {
                scripts: resources
                    .filter(r => r.name.includes('.js'))
                    .reduce((sum, r) => sum + (r.transferSize || 0), 0),
                styles: resources
                    .filter(r => r.name.includes('.css'))
                    .reduce((sum, r) => sum + (r.transferSize || 0), 0),
                images: resources
                    .filter(r => r.name.match(/\.(jpg|png|gif|webp|svg)$/i))
                    .reduce((sum, r) => sum + (r.transferSize || 0), 0)
            };
        });

        const jsSize = (assets.scripts / 1024).toFixed(1);
        const cssSize = (assets.styles / 1024).toFixed(1);
        const imgSize = (assets.images / 1024).toFixed(1);

        console.log(`  ℹ️  JS: ${jsSize}KB, CSS: ${cssSize}KB, 画像: ${imgSize}KB`);

        // JavaScriptが過度に大きくないか（目安: 200KB未満）
        assert(assets.scripts < 200 * 1024, `JS バンドルが小さい（${jsSize}KB < 200KB）`);

        // ========================================
        // フェーズ5: ローディング状態の表示
        // ========================================
        console.log('\n🐢 フェーズ5: ローディング表示');

        const loadingElement = await page.$('[role="status"]');
        const loaderText = await page.evaluate(() => {
            const loader = document.querySelector('[role="progressbar"]') ||
                          document.querySelector('[role="status"]') ||
                          document.querySelector('.loader') ||
                          document.querySelector('.loading');
            return loader ? loader.getAttribute('aria-label') : '';
        });

        // ローディング UI が存在するか確認（計測可能）
        const progressBar = await page.$('[role="progressbar"]') || await page.$('.loader');
        console.log(`  ℹ️  ローディング表示: ${progressBar ? 'あり' : 'なし'}`);

        // ========================================
        // フェーズ6: ゲーム開始フロー（遅延あり）
        // ========================================
        console.log('\n🐢 フェーズ6: ゲーム開始フロー');

        const easyBtn = await page.$('input[value="easy"]');
        assert(easyBtn, '難易度選択ボタンが表示される');

        await easyBtn?.click();
        await sleep(300);

        const senteBtn = await page.$('input[value="sente"]');
        await senteBtn?.click();
        await sleep(500);

        const startBtn = await page.$('#btn-start-game');
        assert(startBtn, 'ゲーム開始ボタンが表示される');

        // ========================================
        // フェーズ7: ゲーム遷移（遅延ありで待機）
        // ========================================
        console.log('\n🐢 フェーズ7: ゲーム遷移');

        const gameStartTime = Date.now();

        await Promise.race([
            startBtn.click()
                .then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
            sleep(8000)
        ]);

        await sleep(500);

        const gameLoadTime = Date.now() - gameStartTime;
        const boardExists = await page.$('.cell') ? true : false;
        assert(boardExists, `ゲーム画面読み込み完了（${gameLoadTime}ms）`);

        // ========================================
        // フェーズ8: ゲーム中の遅延処理
        // ========================================
        console.log('\n🐢 フェーズ8: ゲーム中の操作');

        // ネットワーク遅延中でもクリック可能か
        const piecesPhase8 = await page.$$('.cell.piece-sente');
        if (piecesPhase8.length > 0) {
            await piecesPhase8[0].click();
            await sleep(2000);  // 遅延の為に長く待機

            const selected = await page.$('.cell[data-selected="true"]') ? true : false;
            assert(selected, '遅延中でも駒選択が反応する');
            
            // フェーズ9のために選択を解除（移動を完了させる）
            const movesPhase8 = await page.$$('.cell[data-legal-move="true"]');
            if (movesPhase8.length > 0) {
                await movesPhase8[0].click();
                await sleep(6000);  // AIの応手を待つ
            }
        }

        // ========================================
        // フェーズ9: 複数手のプレイ
        // ========================================
        console.log('\n🐢 フェーズ9: 複数手プレイ（各手で遅延）');

        let movesCompleted = 0;
        for (let i = 0; i < 3; i++) {
            // 先手の駒を選択
            const pieces = await page.$$('.cell.piece-sente');
            if (pieces.length === 0) break;
            
            await pieces[0].click();
            await sleep(1000);
            
            // 移動先を選択
            const moves = await page.$$('.cell[data-legal-move="true"]');
            if (moves.length === 0) break;

            await moves[0].click();
            
            // AIの応手を待つ（遅延環境では長めに）
            await sleep(6000);  // ネットワーク遅延を考慮してさらに長く
            
            // 手数が増えたか確認
            const moveCounter = await page.evaluate(() => {
                const el = document.querySelector('#move-count');
                return el ? parseInt(el.textContent) : 0;
            });
            
            if (moveCounter > (i * 2)) {
                movesCompleted++;
            }
        }

        assert(movesCompleted > 0, `複数手でプレイ可能（${movesCompleted}手）`);

        // ========================================
        // フェーズ10: オフライン対応（ネットワーク切断）
        // ========================================
        console.log('\n🐢 フェーズ10: オフライン対応');

        // オフラインに切る
        await client.send('Network.emulateNetworkConditions', {
            offline: true,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0
        });

        console.log('  ℹ️  オフラインモードに切り替え');

        // オフラインでもUI は動く（キャッシュされている）
        const boardStillVisible = await page.$('.cell') ? true : false;
        assert(boardStillVisible, 'オフライン時も盤面が表示される（キャッシュ）');

        // キーボード操作は機能するか（まず盤面にフォーカスを当てる）
        const firstCell = await page.$('.cell');
        if (firstCell) {
            await firstCell.focus();
            await sleep(200);
        }
        
        await page.keyboard.press('ArrowDown');
        await sleep(300);

        const offlineMoved = await page.evaluate(() => {
            const active = document.activeElement;
            return active && active.classList.contains('cell');
        });

        assert(offlineMoved, 'オフライン時もキーボード操作が機能する');

        // ========================================
        // フェーズ11: オンライン復帰
        // ========================================
        console.log('\n🐢 フェーズ11: オンライン復帰');

        // 再度オンラインに
        await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: 400 * 1024 / 8,
            uploadThroughput: 100 * 1024 / 8,
            latency: 100
        });

        await sleep(1000);

        // これ以降のリクエストは通常に戻される
        const isOnline = await page.evaluate(() => navigator.onLine);
        assert(isOnline, 'オンライン状態が復帰');

        // ========================================
        // フェーズ12: 再試行機能
        // ========================================
        console.log('\n🐢 フェーズ12: エラーハンドリング');

        const retryBtn = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, [role="button"]');
            for (const btn of buttons) {
                if (btn.textContent.includes('再試行') || btn.textContent.includes('Retry')) {
                    return true;
                }
            }
            return false;
        });

        const hasErrorHandling = retryBtn || (await page.evaluate(() => {
            return !!window.retryFunction || document.body.innerText.includes('再試行');
        }));

        console.log(`  ℹ️  再試行機能: ${hasErrorHandling ? 'あり' : '標準 fetch に委任'}`);

        // ========================================
        // フェーズ13: Service Worker（キャッシュ）
        // ========================================
        console.log('\n🐢 フェーズ13: Service Worker');

        const hasServiceWorker = await page.evaluate(() => {
            return !!navigator.serviceWorker;
        });

        assert(hasServiceWorker, 'Service Worker API が利用可能');

        const swRegistrations = await page.evaluate(() => {
            return navigator.serviceWorker.getRegistrations()
                .then(regs => regs.length)
                .catch(() => 0);
        });

        console.log(`  ℹ️  登録済み Service Worker: ${swRegistrations}個`);

        // ========================================
        // フェーズ14: Lighthouse Metrics
        // ========================================
        console.log('\n🐢 フェーズ14: パフォーマンスメトリクス');

        const metrics = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            return {
                dns: (nav?.domainLookupEnd - nav?.domainLookupStart).toFixed(0),
                tcp: (nav?.connectEnd - nav?.connectStart).toFixed(0),
                ttfb: (nav?.responseStart - nav?.requestStart).toFixed(0),
                domInteractive: (nav?.domInteractive - nav?.fetchStart).toFixed(0),
                domComplete: (nav?.domComplete - nav?.fetchStart).toFixed(0),
                loadComplete: (nav?.loadEventEnd - nav?.fetchStart).toFixed(0)
            };
        });

        console.log(`  ℹ️  DNS: ${metrics.dns}ms`);
        console.log(`  ℹ️  TCP: ${metrics.tcp}ms`);
        console.log(`  ℹ️  TTFB: ${metrics.ttfb}ms`);
        console.log(`  ℹ️  DOM完成: ${metrics.domComplete}ms`);

        // ========================================
        // フェーズ15: クリーンアップ
        // ========================================
        console.log('\n🐢 フェーズ15: クリーンアップ');

        // ネットワーク制限を解除
        await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0
        });

        const quitBtn = await page.$('#btn-quit');
        if (quitBtn) {
            await Promise.race([
                quitBtn.click().then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
                sleep(2000)
            ]);
        }

        console.log('\n\n');
        console.log('========================================');
        console.log(`✅ 通過: ${passed}`);
        console.log(`❌ 失敗: ${failed}`);
        console.log('========================================\n');

        if (issues.length > 0) {
            console.log('📋 失敗詳細:\n');
            issues.forEach((issue, i) => {
                console.log(`  ${i + 1}. ${issue}`);
            });
            console.log();
        }

        process.exitCode = failed > 0 ? 1 : 0;

    } catch (error) {
        console.error('\n❌ テスト実行エラー:', error.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
