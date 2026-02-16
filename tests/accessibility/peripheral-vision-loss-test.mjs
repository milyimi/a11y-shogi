/**
 * 周辺視野喪失ユーザー（中心視野のみ）向けテスト
 * 
 * テスト対象:
 * - 画面中央部分のみ有効（周囲視野がない状態）
 * - viewportを中央寄りに制限
 * - 画面外情報へのaria-announce依存度
 * - フォーカス管理（画面外フォーカスの通知）
 * - スクリーンリーダー対応（視覚的補助なし）
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
        console.log('\n👁️  ========================================');
        console.log('  周辺視野喪失ユーザー向けテスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: 視野制限設定（中央のみ 600x600）
        // ========================================
        console.log('\n👁️  フェーズ1: 視野制限シミュレーション');

        await page.setViewport({ width: 1200, height: 900 });
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        await sleep(1000);

        // 中央領域のみが「見える」という仮定でCSS overlay を適用
        const vignetteCss = `
            html::before {
                content: '';
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: radial-gradient(circle at center, transparent 25%, rgba(0,0,0,0.95) 100%);
                pointer-events: none;
                z-index: -1;
            }
        `;
        
        // 代わりにJavaScriptで周辺視野喪失をシミュレート
        await page.evaluate(() => {
            // CSSを注入
            const style = document.createElement('style');
            style.textContent = `
                /* 周辺視野喪失シミュレーション */
                body.peripheral-vision-loss::before {
                    content: '';
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.9) 100%);
                    pointer-events: none;
                    z-index: 9998;
                }
            `;
            document.head.appendChild(style);
            document.body.classList.add('peripheral-vision-loss');
        });

        const hasPeripheralVignetteCSS = await page.evaluate(() => {
            return document.body.classList.contains('peripheral-vision-loss');
        });
        assert(hasPeripheralVignetteCSS, '周辺視野喪失CSSが適用');

        // ========================================
        // フェーズ2: 画面中央がアクセス可能か
        // ========================================
        console.log('\n👁️  フェーズ2: 画面中央のアクセス性');

        const viewportCenter = await page.evaluate(() => {
            const h2 = document.querySelector('h2');
            if (!h2) return { visible: false };
            
            const rect = h2.getBoundingClientRect();
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            
            // 中央 ±300px に対象がこるかチェック
            const inCenter = Math.abs(rect.left + rect.width/2 - screenCenterX) < 300 &&
                            Math.abs(rect.top + rect.height/2 - screenCenterY) < 300;
            
            return {
                visible: inCenter,
                centerX: rect.left + rect.width/2,
                centerY: rect.top + rect.height/2,
                screenCenterX,
                screenCenterY
            };
        });

        assert(viewportCenter.visible, '見出しが画面中央にある', 
            `中央 ±300px: ${JSON.stringify(viewportCenter)}`);

        // ========================================
        // フェーズ3: ゲーム開始（aria-announce依存）
        // ========================================
        console.log('\n👁️  フェーズ3: ゲーム画面でのaria-announce');

        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await Promise.race([
            page.click('#btn-start-game').then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
            sleep(2000)
        ]);
        await sleep(500);

        // 盤面が表示されたか
        const boardVisible = await page.$('.cell') ? true : false;
        assert(boardVisible, 'ゲーム盤面が表示される');

        // ========================================
        // フェーズ4: aria-label（キーボード + スクリーンリーダー頼み）
        // ========================================
        console.log('\n👁️  フェーズ4: aria-label の完全性');

        const cellLabels = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            return Array.from(cells).map(cell => ({
                hasAriaLabel: cell.hasAttribute('aria-label'),
                ariaLabel: cell.getAttribute('aria-label')
            })).filter(c => c.hasAriaLabel);
        });

        assert(cellLabels.length === 81, '全81セルにaria-label', `${cellLabels.length}個`);

        // 初期盤面の重要なセルをチェック
        const importantCells = ['5の5', '9の9', '1の1'];
        for (const cellPos of importantCells) {
            const cellLabel = await page.evaluate((pos) => {
                const cells = document.querySelectorAll('.cell');
                for (const cell of cells) {
                    const label = cell.getAttribute('aria-label') || '';
                    if (label.includes(pos)) return label;
                }
                return '';
            }, cellPos);

            assert(cellLabel.length > 0, `セル位置 "${cellPos}" にaria-label`, `"${cellLabel}"`);
        }

        // ========================================
        // フェーズ5: キーボード操作（視覚情報なし）
        // ========================================
        console.log('\n👁️  フェーズ5: キーボード走査（視覚情報なし）');

        await page.focus('.cell[tabindex="0"]');
        await page.keyboard.press('ArrowDown');
        await sleep(200);

        const announced = await page.$eval('#game-announcements', el => el.textContent);
        assert(announced.length > 0, 'キーボード移動がアナウンスされる', `"${announced.slice(0, 50)}..."`);

        // ========================================
        // フェーズ6: 駒選択（視覚フィードバック不可）
        // ========================================
        console.log('\n👁️  フェーズ6: 駒選択のアナウンス');

        const pieces = await page.$$('.cell.piece-sente');
        if (pieces.length > 0) {
            await pieces[0].click();
            await sleep(300);

            const selectAnn = await page.$eval('#game-announcements', el => el.textContent);
            assert(selectAnn.includes('選択'), '駒選択がアナウンスされる');
            assert(selectAnn.includes('移動先'), '移動先選択を促すアナウンス');
        }

        // ========================================
        // フェーズ7: Shift+B（盤面全体読み上げ）
        // ========================================
        console.log('\n👁️  フェーズ7: 盤面差分読み上げ（視覚外の情報取得）');

        await page.keyboard.down('Shift');
        await page.keyboard.press('b');
        await page.keyboard.up('Shift');
        await sleep(300);

        const boardAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(boardAnn.includes('盤面') || boardAnn.length > 100, '盤面情報が詳細に読み上げられる');

        // ========================================
        // フェーズ8: 手番・状態読み上げ（視覚指示なし）
        // ========================================
        console.log('\n👁️  フェーズ8: ゲーム状態のアナウンス');

        await page.keyboard.press('s');
        await sleep(300);

        const statusAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(statusAnn.includes('手番') || statusAnn.includes('先手') || statusAnn.includes('後手'),
            'ゲーム状態が読み上げられる', `"${statusAnn.slice(0, 60)}..."`);

        // ========================================
        // フェーズ9: aria-live リージョンの重要性
        // ========================================
        console.log('\n👁️  フェーズ9: aria-live の assertive/polite');

        const ariaLiveRegions = await page.evaluate(() => {
            return {
                announcements: document.querySelector('#game-announcements')?.getAttribute('aria-live'),
                status: document.querySelector('#game-status')?.getAttribute('aria-live'),
                moveHistory: document.querySelector('#move-history')?.getAttribute('aria-live')
            };
        });

        assert(ariaLiveRegions.announcements === 'assertive',
            'announcements は assertive（即座読み上げ）');
        assert(ariaLiveRegions.status === 'polite' || ariaLiveRegions.status === 'assertive',
            'status は polite または assertive');

        // ========================================
        // フェーズ10: 複数手の連続プレイ
        // ========================================
        console.log('\n👁️  フェーズ10: 複数手プレイ（視覚フィードバックなし）');

        let moveCount = 0;
        for (let i = 0; i < 5; i++) {
            const moves = await page.$$('.cell[data-legal-move="true"]');
            if (moves.length === 0) break;

            const move = moves[0];
            await move.click();
            await sleep(1500);
            moveCount++;
        }

        assert(moveCount > 0, `複数手でプレイ可能（${moveCount}手）`);

        // ========================================
        // フェーズ11: 盤面外フォーカスの通知
        // ========================================
        console.log('\n👁️  フェーズ11: 画面外フォーカスの検出');

        // ボタンなど盤面外をタブで移動
        await page.keyboard.press('Tab');
        await sleep(300);

        const focusedElement = await page.evaluate(() => {
            const active = document.activeElement;
            const rect = active.getBoundingClientRect();
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            
            const isOutsideCenter = Math.abs(rect.left + rect.width/2 - screenCenterX) > 300 ||
                                   Math.abs(rect.top + rect.height/2 - screenCenterY) > 300;
            
            return {
                tagName: active.tagName,
                isOutsideCenter,
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            };
        });

        // 画面外フォーカスでもaria-labelで識別可能
        if (focusedElement.isOutsideCenter) {
            const focused = await page.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.slice(0, 20));
            assert(focused.length > 0, '画面外フォーカスでも識別可能');
        } else {
            console.log('  ℹ️  フォーカスが中央内にとどまった');
        }

        // ========================================
        // フェーズ12: ショートカットモーダルへのアクセス
        // ========================================
        console.log('\n👁️  フェーズ12: ショートカットヘルプ（視覚外）');

        await page.keyboard.press('h');
        await sleep(500);

        const modalOpen = await page.$('#shortcuts-modal-overlay') ? true : false;
        assert(modalOpen, 'Hキーでショートカットモーダル表示');

        if (modalOpen) {
            const modalContent = await page.$eval('#shortcuts-modal', el => el.textContent);
            assert(modalContent.includes('矢印') || modalContent.includes('方向'),
                'モーダルにキーボード操作説明');

            // Escapeで閉じる
            await page.keyboard.press('Escape');
            await sleep(300);
        }

        // ========================================
        // フェーズ13: レスポンシブ縮小（視野さらに狭い）
        // ========================================
        console.log('\n👁️  フェーズ13: 小画面での周辺視野喪失');

        await page.setViewport({ width: 480, height: 800 });
        await sleep(300);

        const boardSmall = await page.$('.cell') ? true : false;
        assert(boardSmall, 'モバイル（480px）でも盤面が表示される');

        // スクリーンリーダー依存性が高まるか
        const ariaOnSmall = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            const labeled = Array.from(cells).filter(c => c.hasAttribute('aria-label')).length;
            return {
                totalCells: cells.length,
                labeledCells: labeled,
                coverage: (labeled / cells.length * 100).toFixed(1)
            };
        });

        assert(ariaOnSmall.coverage >= 100, 'モバイルで全セルにaria-label', `${ariaOnSmall.coverage}%`);

        // ========================================
        // フェーズ14: 通常サイズに戻す
        // ========================================
        console.log('\n👁️  フェーズ14: クリーンアップ');

        await page.setViewport({ width: 1200, height: 900 });
        await sleep(300);

        const quitBtn = await page.$('#btn-quit');
        if (quitBtn) {
            await Promise.race([
                quitBtn.click().then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
                sleep(2000)
            ]);
            await sleep(300);
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
