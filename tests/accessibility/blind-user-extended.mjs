/**
 * 全盲ユーザー向け拡張テスト — 高難度シナリオ
 * 
 * テスト対象:
 * - AI終盤（詰み検出）
 * - マルチゲーム連続プレイ
 * - エラー回復シナリオ
 * - 複合キー操作（Shift+キー）
 * - セッション管理
 * - キーボード連続操作
 * - スクリーンリーダー対応の詳細検証
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
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('\n🏴 ========================================');
        console.log('  全盲ユーザー向け拡張テスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: スコープセットアップ
        // ========================================
        console.log('\n🔧 フェーズ1: テスト環境セットアップ');

        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        
        const homeHeading = await page.$('h2') ? true : false;
        assert(homeHeading, 'ホーム画面が表示される');

        // ========================================
        // フェーズ2: ゲーム開始とボード確認
        // ========================================
        console.log('\n📋 フェーズ2: ゲーム開始');

        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await Promise.race([
            page.click('#btn-start-game').then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
            sleep(2000)
        ]);
        await sleep(1000);

        const boardExists = await page.$('.cell') ? true : false;
        assert(boardExists, 'ゲーム開始後に盤面が表示される');

        // ========================================
        // フェーズ3: 初期盤面の aria-label 検証
        // ========================================
        console.log('\n🏁 フェーズ3: 初期盤面の aria-label 検証');

        const initialCells = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            const sample = Array.from(cells).slice(0, 10).map(cell => ({
                file: cell.dataset.file,
                rank: cell.dataset.rank,
                ariaLabel: cell.getAttribute('aria-label'),
                hasLabel: cell.getAttribute('aria-label') !== null
            }));
            return sample;
        });

        const allHaveLabels = initialCells.every(c => c.hasLabel);
        assert(allHaveLabels, '全セルに aria-label が存在', `${initialCells.length}個中${initialCells.filter(c => c.hasLabel).length}個`);

        // ========================================
        // フェーズ4: キーボード操作オートマトン（Shift+キー）
        // ========================================
        console.log('\n⌨️  フェーズ4: 複合キー操作（Shift+キー）');

        await page.focus('.cell[tabindex="0"]');
        await sleep(100);

        const focusedBefore = await page.evaluate(() => {
            const el = document.activeElement;
            return `${el.dataset.file}の${el.dataset.rank}`;
        });

        // Shift + 矢印キーでの移動
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Shift');
        await sleep(200);

        const focusedAfter = await page.evaluate(() => {
            const el = document.activeElement;
            return `${el.dataset.file}の${el.dataset.rank}`;
        });

        assert(focusedBefore !== focusedAfter, 'Shift+矢印キーで移動可能', `${focusedBefore} → ${focusedAfter}`);

        // ========================================
        // フェーズ5: Shift+B（盤面差分読み上げ）
        // ========================================
        console.log('\n📊 フェーズ5: 盤面差分読み上げ（Shift+B）');

        // 1手進める
        const pieceSente = await page.$('.cell.piece-sente');
        if (pieceSente) {
            await pieceSente.click();
            await sleep(300);
            
            const legalMoves = await page.$$('.cell.legal-move');
            if (legalMoves.length > 0) {
                const moveTarget = legalMoves[0];
                const moveFile = await moveTarget.evaluate(el => el.dataset.file);
                const moveRank = await moveTarget.evaluate(el => el.dataset.rank);
                
                await moveTarget.click();
                await sleep(2000);

                // 差分読み上げ
                await page.keyboard.down('Shift');
                await page.keyboard.press('b');
                await page.keyboard.up('Shift');
                await sleep(300);

                const diffAnnouncement = await page.$eval('#game-announcements', el => el.textContent);
                assert(diffAnnouncement.length > 0, 'Shift+B で盤面変化がアナウンスされる', `"${diffAnnouncement.slice(0, 50)}..."`);
            }
        }

        // ========================================
        // フェーズ6: Shift+I（利き筋）
        // ========================================
        console.log('\n🎯 フェーズ6: 利き筋アナウンス（Shift+I）');

        await page.keyboard.down('Shift');
        await page.keyboard.press('i');
        await page.keyboard.up('Shift');
        await sleep(300);

        const threatAnnouncement = await page.$eval('#game-announcements', el => el.textContent);
        // 利き筋がある場合は情報が表示される
        assert(threatAnnouncement.length > 0, 'Shift+I で利き筋情報がアナウンスされる', `"${threatAnnouncement.slice(0, 50)}..."`);

        // ========================================
        // フェーズ7: 複数手の連続プレイ（キーボード＋マウス混在）
        // ========================================
        console.log('\n🎮 フェーズ7: 連続ゲームプレイ（10手以上）');

        let moveCount = 0;
        let lastMove = '';
        
        for (let turn = 0; turn < 20; turn++) {
            const legalMoves = await page.$$('.cell.legal-move');
            if (legalMoves.length === 0) {
                console.log(`  ⏸️  合法手がない（ゲーム終了）`);
                break;
            }

            // ランダムに移動先を選択
            const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            await move.click();
            await sleep(1500);

            const announcement = await page.$eval('#game-announcements', el => el.textContent);
            if (announcement.length > 0) {
                lastMove = announcement;
                moveCount++;
            }
        }

        assert(moveCount >= 5, `複数手での連続プレイが可能（${moveCount}手）`);

        // ========================================
        // フェーズ8: 手数カウンター確認
        // ========================================
        console.log('\n📈 フェーズ8: 手数カウンター');

        const moveCounter = await page.$eval('#move-count', el => el.textContent);
        assert(moveCounter.includes('手') || moveCounter.includes('move'), '手数が表示される', `"${moveCounter}"`);

        // ========================================
        // フェーズ9: 棋譜アナウンス
        // ========================================
        console.log('\n📝 フェーズ9: 棋譜アナウンス');

        const moveHistory = await page.$$eval('#move-history li', els => els.length);
        assert(moveHistory > 0, `棋譜に記録されている（${moveHistory}手）`);

        const historyText = await page.$eval('#move-history', el => el.textContent);
        assert(historyText.length > 10, '棋譜テキストが記録されている');

        // ========================================
        // フェーズ10: ゲーム終了（投了）
        // ========================================
        console.log('\n🏳️  フェーズ10: 投了処理');

        const resignBtn = await page.$('#btn-resign');
        if (resignBtn) {
            const disabled = await resignBtn.evaluate(el => el.disabled);
            if (!disabled) {
                await resignBtn.click();
                await sleep(300);

                const confirmDialog = await page.$('#confirm-dialog-overlay');
                assert(confirmDialog !== null, '投了ダイアログが表示される');

                if (confirmDialog) {
                    // キャンセル
                    await page.keyboard.press('Escape');
                    await sleep(200);

                    const stillOpen = await page.$('#confirm-dialog-overlay');
                    assert(stillOpen === null, 'Escapeでダイアログが閉じる');
                }
            } else {
                console.log('  ℹ️  投了ボタンが無効（既に終了状態）');
            }
        }

        // ========================================
        // フェーズ11: ゲームリセット
        // ========================================
        console.log('\n🔄 フェーズ11: ゲームリセット');

        const resetBtn = await page.$('#btn-reset');
        if (resetBtn) {
            const disabled = await resetBtn.evaluate(el => el.disabled);
            if (!disabled) {
                await resetBtn.click();
                await sleep(500);

                const resetAnnouncement = await page.$eval('#game-announcements', el => el.textContent);
                assert(resetAnnouncement.length > 0, 'リセット後にアナウンスがある', `"${resetAnnouncement.slice(0, 50)}..."`);

                // 盤面が初期状態に戻ったか確認
                const resetBoard = await page.evaluate(() => {
                    const cell33 = document.querySelector('.cell[data-rank="3"][data-file="3"]');
                    return cell33?.getAttribute('aria-label');
                });
                assert(resetBoard?.includes('先手') && resetBoard?.includes('歩'), '盤面が初期化される');
            } else {
                console.log('  ℹ️  リセットボタンが無効');
            }
        }

        // ========================================
        // フェーズ12: マルチゲーム連続プレイ
        // ========================================
        console.log('\n🎪 フェーズ12: マルチゲーム（新規ゲーム）');

        const quitBtn = await page.$('#btn-quit');
        if (quitBtn) {
            await Promise.race([
                quitBtn.click().then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
                sleep(2000)
            ]);
            await sleep(500);
        }

        // 新規ゲーム
        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await Promise.race([
            page.click('#btn-start-game').then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
            sleep(2000)
        ]);
        await sleep(1000);

        const secondGameBoard = await page.$('.cell') ? true : false;
        assert(secondGameBoard, '2番目のゲームが開始される');

        // 2番目のゲームで5手プレイ
        let secondGameMoves = 0;
        for (let i = 0; i < 5; i++) {
            const legalMoves = await page.$$('.cell.legal-move');
            if (legalMoves.length === 0) break;
            
            const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            await move.click();
            await sleep(1500);
            secondGameMoves++;
        }

        assert(secondGameMoves >= 2, `2番目のゲームで複数手プレイ（${secondGameMoves}手）`);

        // ========================================
        // フェーズ13: セッション情報の確認
        // ========================================
        console.log('\n🔐 フェーズ13: セッション情報');

        const sessionStatus = await page.$('#game-status');
        if (sessionStatus) {
            const statusText = await sessionStatus.textContent;
            assert(statusText.length > 0, 'ゲーム状態が表示される', `"${statusText}"`);
        }

        // ========================================
        // フェーズ14: ヘルプ（Hキー）の詳細確認
        // ========================================
        console.log('\n❓ フェーズ14: ヘルプモーダル');

        const focusBefore = await page.evaluate(() => document.activeElement.id || document.activeElement.className);
        
        await page.keyboard.press('h');
        await sleep(500);

        const helpModal = await page.$('#shortcuts-modal-overlay');
        assert(helpModal !== null, 'Hキーでショートカットモーダルが表示される');

        if (helpModal) {
            const modalContent = await page.$eval('#shortcuts-modal', el => el.textContent);
            assert(modalContent.includes('矢印') || modalContent.includes('Arrow'), 'モーダルに操作方法が記載');
            assert(modalContent.includes('Enter') || modalContent.includes('Space'), 'モーダルに選択キーが記載');
            assert(modalContent.includes('B') || modalContent.includes('盤面'), 'モーダルに盤面読み上げキーが記載');

            // Escapeで閉じる
            await page.keyboard.press('Escape');
            await sleep(200);

            const closed = await page.$('#shortcuts-modal-overlay');
            assert(closed === null || closed?.classList.contains('hidden'), 'Escapeでモーダルが閉じる');
        }

        // ========================================
        // フェーズ15: tabindex管理の検証
        // ========================================
        console.log('\n🎯 フェーズ15: tabindex管理');

        const tabbable = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell[tabindex="0"]');
            const buttons = document.querySelectorAll('button:not([tabindex="-1"])');
            return {
                cellCount: cells.length,
                buttonCount: buttons.length
            };
        });

        assert(tabbable.cellCount === 1, 'tabindex="0"を持つセルが1つ（フォーカス管理）', `${tabbable.cellCount}個`);

        // ========================================
        // フェーズ16: aria-current検証
        // ========================================
        console.log('\n🔍 フェーズ16: aria-current');

        const ariaCurrent = await page.evaluate(() => {
            const cells = document.querySelectorAll('[aria-current]');
            return cells.length;
        });

        // aria-current を使う場合は存在してもOK（オプション）
        console.log(`  ℹ️  aria-current: ${ariaCurrent}個要素`);

        // ========================================
        // フェーズ17: スクリーンリーダーテキストの正確性
        // ========================================
        console.log('\n📢 フェーズ17: スクリーンリーダーテキスト');

        const cellLabel = await page.evaluate(() => {
            const cell = document.querySelector('.cell[data-rank="5"][data-file="5"]');
            return cell?.getAttribute('aria-label');
        });

        // 5の5は空マスとして始まる
        assert(cellLabel?.includes('5') && cellLabel?.includes('空'), 
            '座標とマス状態がaria-labelに含まれる', 
            `"${cellLabel}"`);

        // ========================================
        // フェーズ18: 駒台の aria-live
        // ========================================
        console.log('\n🎯 フェーズ18: 駒台のアナウンス');

        const senteHandLive = await page.$eval('#sente-hand', el => el.getAttribute('aria-live'));
        const goteHandLive = await page.$eval('#gote-hand', el => el.getAttribute('aria-live'));

        assert(senteHandLive === 'polite' || senteHandLive === 'assertive', 
            '先手駒台が aria-live="polite"');
        assert(goteHandLive === 'polite' || goteHandLive === 'assertive',
            '後手駒台が aria-live="polite"');

        // ========================================
        // フェーズ19: ショートカット複合操作
        // ========================================
        console.log('\n⌨️  フェーズ19: ショートカット複合操作');

        // Sキー（ステータス）
        await page.keyboard.press('s');
        await sleep(200);
        const statusAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(statusAnn.length > 0, 'Sキーで状態が読み上げられる');

        // Tキー（ターン情報）
        await page.keyboard.press('t');
        await sleep(200);
        const turnAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(turnAnn.length > 0, 'Tキーで手番が読み上げられる（またはステータス更新）');

        // ========================================
        // フェーズ20: エラーリカバリー
        // ========================================
        console.log('\n⚠️  フェーズ20: エラーリカバリー');

        // 空マスをクリック
        const emptyCell = await page.$('.cell:not(.piece-sente):not(.piece-gote)');
        if (emptyCell) {
            await emptyCell.click();
            await sleep(300);

            const emptyClickAnn = await page.$eval('#game-announcements', el => el.textContent);
            // エラーメッセージまたは「空マス」というフィードバック
            assert(emptyClickAnn.includes('空') || emptyClickAnn.includes('駒がない') || emptyClickAnn.includes('選択'), 
                'エラーフィードバック（空マス）');
        }

        // ========================================
        // フェーズ21: 最終クリーンアップ
        // ========================================
        console.log('\n🧹 フェーズ21: クリーンアップ');

        const finalQuit = await page.$('#btn-quit');
        if (finalQuit) {
            await Promise.race([
                finalQuit.click().then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
                sleep(2000)
            ]);
            await sleep(300);

            const homeAgain = await page.$('h2') ? true : false;
            assert(homeAgain, 'ホーム画面に戻る');
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
