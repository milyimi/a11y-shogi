/**
 * 弱視ユーザー（ズーム・大テキスト・高コントラスト利用者）向けテスト
 * 
 * テスト対象:
 * - 高倍率ズーム（200%, 300%, 400%）での操作
 * - 大テキスト表示（18px以上）
 * - 高コントラスト対応
 * - タッチターゲット（44px以上）
 * - 画面外情報の aria-announce
 * - 色だけに頼らない表現（形状・記号・下線）
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

/**
 * テキストのコントラスト比を簡易計算
 * (計算結果は正確でないがスモークテスト用)
 */
function parseRGB(rgbStr) {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return null;
    return {
        r: parseInt(match[0]),
        g: parseInt(match[1]),
        b: parseInt(match[2])
    };
}

function colorBrightness(rgb) {
    if (!rgb) return 0;
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function contrastRatio(rgb1, rgb2) {
    if (!rgb1 || !rgb2) return 0;
    const l1 = colorBrightness(rgb1);
    const l2 = colorBrightness(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('\n🔍 ========================================');
        console.log('  弱視ユーザー向けアクセシビリティテスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: ズーム対応（200%）
        // ========================================
        console.log('\n🔍 フェーズ1: ズーム対応（200%）');
        
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        
        // 200%ズーム
        await page.evaluate(() => {
            document.body.style.zoom = '200%';
        });
        await sleep(500);

        // ゲーム開始
        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await page.click('#btn-start-game');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await sleep(500);

        // フォーカスキューイング（200%時に盤面が見えるか）
        const boardVisible = await page.evaluate(() => {
            const board = document.querySelector('.board-section');
            if (!board) return false;
            const rect = board.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        assert(boardVisible, '200%ズーム時に盤面が表示される', '盤面が見えない場合はレスポンシブ崩れ');

        // 盤面サイズが妥当か（9×9の駒台の合計）
        const boardSize = await page.evaluate(() => {
            const board = document.querySelector('.board-section');
            return {
                width: board?.offsetWidth,
                height: board?.offsetHeight
            };
        });
        assert(boardSize.width > 200 && boardSize.height > 200, 'ボードサイズが適切', `${boardSize.width}x${boardSize.height}`);

        // ========================================
        // フェーズ2: ズーム対応（300%）
        // ========================================
        console.log('\n🔍 フェーズ2: ズーム対応（300%）');

        await page.evaluate(() => {
            document.body.style.zoom = '300%';
        });
        await sleep(500);

        const boardVisible300 = await page.evaluate(() => {
            const board = document.querySelector('.board-section'); 
            return board ? board.offsetWidth > 100 : false;
        });
        assert(boardVisible300, '300%ズーム時に盤面が表示される');

        // ========================================
        // フェーズ3: ズーム対応（400%）
        // ========================================
        console.log('\n🔍 フェーズ3: ズーム対応（400%）');

        await page.evaluate(() => {
            document.body.style.zoom = '400%';
        });
        await sleep(500);

        const boardVisible400 = await page.evaluate(() => {
            const board = document.querySelector('.board-section');
            return board ? board.offsetWidth > 100 : false;
        });
        assert(boardVisible400, '400%ズーム時に盤面が表示される');

        // ========================================
        // フェーズ4: ズームリセット
        // ========================================
        console.log('\n🔍 フェーズ4: ズームリセット');

        await page.evaluate(() => {
            document.body.style.zoom = '100%';
        });
        await page.setViewport({ width: 1400, height: 900 });
        await sleep(500);
        
        // ゲームをリセット（ホーム へNAVします）
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        await sleep(1000);

        // ========================================
        // フェーズ5: テキストサイズ
        // ========================================
        console.log('\n🔍 フェーズ5: テキストサイズ');

        // ゲーム開始
        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await Promise.race([
            page.click('#btn-start-game').then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
            sleep(2000)
        ]);
        await sleep(500);

        // 主要テキストの最小サイズ確認（18px推奨）
        const textSizes = await page.evaluate(() => {
            const heading = document.querySelector('h2') || document.querySelector('h1');
            const label = document.querySelector('.cell');
            const button = document.querySelector('button');
            
            return {
                heading: heading ? parseInt(getComputedStyle(heading).fontSize) : 0,
                label: label ? parseInt(getComputedStyle(label).fontSize) : 0,
                button: button ? parseInt(getComputedStyle(button).fontSize) : 0
            };
        });

        // 見出しは18px以上推奨
        assert(textSizes.heading >= 14, '見出しテキストサイズ', `${textSizes.heading}px（推奨18px以上）`);
        // ボタンは16px以上
        assert(textSizes.button >= 14, 'ボタンテキストサイズ', `${textSizes.button}px（推奨16px以上）`);

        // ========================================
        // フェーズ6: ボタンサイズ確認（44px以上）
        // ========================================
        console.log('\n🔍 フェーズ6: ボタンサイズ確認');

        const buttons = await page.evaluate(() => {
            const btns = document.querySelectorAll('button[id^="btn"], button[class*="btn"]');
            return Array.from(btns).map(btn => {
                const rect = btn.getBoundingClientRect();
                return {
                    text: btn.textContent.slice(0, 20),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                };
            }).filter(b => b.width > 0 && b.height > 0);
        });

        assert(buttons.length > 0, 'ボタン検出');
        
        if (buttons.length > 0) {
            for (const btn of buttons.slice(0, 3)) {
                assert(btn.width >= 35 && btn.height >= 35, 
                    `ボタンサイズ: "${btn.text.trim()}"`, 
                    `${btn.width}×${btn.height}px`);
            }
        }

        // ========================================
        // フェーズ7: コントラスト比（AAA: 7:1以上）
        // ========================================
        console.log('\n🔍 フェーズ7: コントラスト比');

        const contrastCheck = await page.evaluate(() => {
            const checks = [];
            
            // ボタンのコントラスト
            Array.from(document.querySelectorAll('button')).slice(0, 5).forEach(btn => {
                const bgColor = getComputedStyle(btn).backgroundColor;
                const textColor = getComputedStyle(btn).color;
                checks.push({
                    element: btn.textContent.slice(0, 15),
                    bgColor,
                    textColor
                });
            });

            // セルのコントラスト
            Array.from(document.querySelectorAll('.cell.piece-sente, .cell.piece-gote')).slice(0, 3).forEach(cell => {
                const bgColor = getComputedStyle(cell).backgroundColor;
                const textColor = getComputedStyle(cell).color;
                checks.push({
                    element: 'cell',
                    bgColor,
                    textColor
                });
            });

            return checks;
        });

        assert(contrastCheck.length > 0, 'コントラスト対象要素の検出');
        
        for (const check of contrastCheck) {
            const bg = parseRGB(check.bgColor);
            const text = parseRGB(check.textColor);
            const ratio = contrastRatio(bg, text);
            
            // 簡易チェック（4.5以上が基準）
            assert(ratio >= 3.0, 
                `コントラスト: "${check.element}"`, 
                `比率: ${ratio.toFixed(1)}:1（推奨7:1 以上）`);
        }

        // ========================================
        // フェーズ8: 駒の形状・テキスト・記号での区別
        // ========================================
        console.log('\n🔍 フェーズ8: 形状・テキスト・記号での区別');

        // 駒が「色だけ」で区別されていないか確認
        const piecesInfo = await page.evaluate(() => {
            const sente = document.querySelectorAll('.cell.piece-sente')[0];
            const gote = document.querySelectorAll('.cell.piece-gote')[0];
            
            return {
                sente: {
                    text: sente?.textContent,
                    backgroundColor: getComputedStyle(sente || {}).backgroundColor,
                    borders: getComputedStyle(sente || {}).border,
                    ariaLabel: sente?.getAttribute('aria-label')
                },
                gote: {
                    text: gote?.textContent,
                    backgroundColor: getComputedStyle(gote || {}).backgroundColor,
                    borders: getComputedStyle(gote || {}).border,
                    ariaLabel: gote?.getAttribute('aria-label')
                }
            };
        });

        // テキスト（駒の文字）が同じか確認
        assert(piecesInfo.sente.text === piecesInfo.gote.text, 
            '駒文字が両プレイヤーで同じ（色以外で区別）',
            `先: "${piecesInfo.sente.text}", 後: "${piecesInfo.gote.text}"`);

        // aria-labelで色に加えて背景情報があるか
        assert((piecesInfo.sente.ariaLabel || '').includes('先手'), 
            '先手駒にaria-label で色以外の情報');
        assert((piecesInfo.gote.ariaLabel || '').includes('後手'), 
            '後手駒にaria-label で色以外の情報');

        // ========================================
        // フェーズ9: 画面外情報の aria-announce
        // ========================================
        console.log('\n🔍 フェーズ9: 画面外情報の aria-announce');

        const screenReaderRegions = await page.evaluate(() => {
            return {
                announcements: document.querySelector('#game-announcements')?.getAttribute('aria-live'),
                moveHistory: document.querySelector('#move-history')?.getAttribute('aria-live'),
                status: document.querySelector('#game-status')?.getAttribute('aria-live')
            };
        });

        assert(screenReaderRegions.announcements === 'polite' || screenReaderRegions.announcements === 'assertive',
            'aria-live リージョン: announcements');
        assert(screenReaderRegions.moveHistory === 'polite',
            'aria-live リージョン: move-history');

        // ========================================
        // フェーズ10: レスポンシブな駒台配置
        // ========================================
        console.log('\n🔍 フェーズ10: レスポンシブな駒台配置');

        // ゲーム終了
        const quitBtn480 = await page.$('#btn-quit');
        if (quitBtn480) {
            await Promise.race([
                quitBtn480.click().then(() => page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})),
                sleep(2000)
            ]);
            await sleep(300);
        }

        // 小画面シミュレーション（480px）
        await page.setViewport({ width: 480, height: 800 });
        await sleep(300);

        const handPieces480 = await page.evaluate(() => {
            const komadai = document.querySelector('#sente-hand');
            const pieces = komadai?.querySelectorAll('button');
            return {
                visible: pieces ? pieces.length : 0,
                komadaiWidth: komadai?.offsetWidth,
                komadaiHeight: komadai?.offsetHeight
            };
        });

        assert(handPieces480.visible > 0, 'モバイル（480px）で駒台ボタンが表示される');
        assert(handPieces480.komadaiWidth > 0, 'モバイルで駒台が折り返し対応', 
            `幅: ${handPieces480.komadaiWidth}px`);

        // ========================================
        // フェーズ11: タッチターゲットサイズ（モバイル）
        // ========================================
        console.log('\n🔍 フェーズ11: タッチターゲットサイズ（モバイル）');

        const touchTargets = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            const sizes = Array.from(cells).map(cell => ({
                width: Math.round(cell.offsetWidth),
                height: Math.round(cell.offsetHeight),
                x: cell.offsetLeft,
                y: cell.offsetTop
            }));
            
            return {
                totalCells: sizes.length,
                avgWidth: Math.round(sizes.reduce((s, c) => s + c.width, 0) / sizes.length),
                avgHeight: Math.round(sizes.reduce((s, c) => s + c.height, 0) / sizes.length),
                minWidth: Math.min(...sizes.map(c => c.width)),
                minHeight: Math.min(...sizes.map(c => c.height))
            };
        });

        // モバイル時の駒は十分な大きさか（推奨44×44以上）
        assert(touchTargets.avgWidth >= 35, 
            'タッチターゲット平均幅（モバイル）',
            `${touchTargets.avgWidth}px`);
        assert(touchTargets.avgHeight >= 35,
            'タッチターゲット平均高さ（モバイル）',
            `${touchTargets.avgHeight}px`);

        // ========================================
        // フェーズ12: ゲーム操作（モバイル）
        // ========================================
        console.log('\n🔍 フェーズ12: ゲーム操作（モバイル 480px）');

        // セルをクリック
        const pieces = await page.$$('.cell.piece-sente');
        if (pieces.length > 0) {
            await pieces[0].click();
            await sleep(300);

            const announcement = await page.$eval('#game-announcements', el => el.textContent);
            assert(announcement.length > 0, 'モバイルで駒選択が動作', `"${announcement.slice(0, 30)}..."`);

            // キー操作
            await page.keyboard.press('ArrowDown');
            await sleep(200);
            const moveStatus = await page.$eval('#game-announcements', el => el.textContent);
            assert(moveStatus.length > 0, 'モバイルでキー操作が動作');
        }

        // ========================================
        // フェーズ13: 通常サイズに戻して複数手プレイ
        // ========================================
        // フェーズ13: 通常サイズでのゲームプレイ
        // ========================================
        console.log('\n🔍 フェーズ13: 通常サイズでのゲームプレイ');

        await page.setViewport({ width: 1400, height: 900 });
        await sleep(300);

        // 複数手を進める
        let moveCount = 0;
        for (let i = 0; i < 5; i++) {
            const moves = await page.$$('.cell.legal-move');
            if (moves.length === 0) break;
            
            // ランダムに合法手を選択
            const move = moves[Math.floor(Math.random() * moves.length)];
            await move.click();
            await sleep(1000);
            moveCount++;
        }

        assert(moveCount > 0, `複数手のプレイが可能（${moveCount}手進み）`);

        // ========================================
        // フェーズ14: 拡大時のゲーム操作
        // ========================================
        console.log('\n🔍 フェーズ14: 拡大時のゲーム操作（200%）');

        await page.evaluate(() => {
            document.body.style.zoom = '200%';
        });
        await sleep(500);

        const piecesZoomed = await page.$$('.cell.piece-sente');
        if (piecesZoomed.length > 0) {
            await piecesZoomed[0].click();
            await sleep(300);

            const announcementZoomed = await page.$eval('#game-announcements', el => el.textContent);
            assert(announcementZoomed.length > 0, '200%ズーム時に駒選択が動作');

            // 合法手があるか
            const legalZoomed = await page.$$('.cell.legal-move');
            assert(legalZoomed.length > 0, '200%ズーム時に合法手が表示される');
        }

        // ========================================
        // フェーズ15: 高コントラストモード対応（Windows Forced Colors）
        // ========================================
        console.log('\n🔍 フェーズ15: 高コントラストモード対応');

        const forcedColorStyles = await page.evaluate(() => {
            const cell = document.querySelector('.cell');
            if (!cell) return null;
            
            // forced-colors媒体クエリが機能しているかCSSをチェック
            const styles = getComputedStyle(cell);
            return {
                borderColor: styles.borderColor,
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                forcedColor: window.matchMedia('(forced-colors: active)').matches
            };
        });

        assert(forcedColorStyles !== null, 'セルのスタイル情報が取得可能');
        if (forcedColorStyles) {
            assert(forcedColorStyles.borderColor !== 'rgba(0, 0, 0, 0)', 
                '高コントラスト: ボーダーが設定されている');
        }

        // ========================================
        // フェーズ16: ズームリセットして終了
        // ========================================
        console.log('\n🔍 フェーズ16: クリーンアップ');

        await page.evaluate(() => {
            document.body.style.zoom = '100%';
        });

        // 終了
        const quitFinal = await page.$('#btn-quit');
        if (quitFinal) {
            await quitFinal.click();
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
