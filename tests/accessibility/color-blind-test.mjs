#!/usr/bin/env node
/**
 * 色覚異常ユーザー向けアクセシビリティテスト
 * 
 * 【対象ペルソナ】
 * - 1型色覚（Protanopia・赤色盲）: 赤色が見えにくい
 * - 2型色覚（Deuteranopia・緑色盲）: 緑色が見えにくい
 * - 3型色覚（Tritanopia・青色盲）: 青色が見えにくい
 * 
 * 【確認項目】
 * 1. 駒の区別が色以外の方法でも可能か（aria-label、テキスト）
 * 2. 選択状態が色以外でも判別できるか（data-selected属性）
 * 3. 合法手表示が色以外でも判別できるか（data-legal-move属性）
 * 4. ゲーム状態が色以外でも判別できるか
 * 5. エラーメッセージが色以外でも判別できるか
 */

import puppeteer from 'puppeteer';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// グローバルテスト結果管理
const testResults = {
    passed: 0,
    failed: 0,
    failedTests: [],
};

// アサーション
function assert(condition, message) {
    if (!condition) {
        console.log(`  ❌ ${message}`);
        testResults.failed++;
        testResults.failedTests.push(message);
    } else {
        console.log(`  ✅ ${message}`);
        testResults.passed++;
    }
}

// 色覚異常シミュレーションフィルター
const colorBlindFilters = {
    protanopia: `
        grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(300%) brightness(90%);
    `,
    deuteranopia: `
        grayscale(100%) sepia(100%) hue-rotate(20deg) saturate(250%) brightness(95%);
    `,
    tritanopia: `
        grayscale(100%) sepia(100%) hue-rotate(180deg) saturate(200%) brightness(100%);
    `,
};

async function runColorBlindTests() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // ========================================
        // フェーズ1: ホームページ読み込み
        // ========================================
        console.log('🎨 フェーズ1: ホームページ読み込み');
        await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle2', timeout: 10000 });

        const title = await page.title();
        assert(title.includes('将棋'), 'ページタイトルが正しく表示される');

        // ========================================
        // フェーズ2: 1型色覚（赤色盲）シミュレーション
        // ========================================
        console.log('\n🎨 フェーズ2: 1型色覚（赤色盲）シミュレーション');

        await page.addStyleTag({
            content: `
                html {
                    filter: ${colorBlindFilters.protanopia}
                }
            `,
        });

        // テキストが読める
        const homeText = await page.evaluate(() => {
            const h1 = document.querySelector('h1, h2');
            return h1 ? h1.textContent.trim() : '';
        });
        assert(homeText.length > 0, '赤色盲でもテキストが読める');

        // ゲーム開始ボタンが見つかる（色以外の要素で判別）
        const startBtn = await page.$('#btn-start-game');
        assert(startBtn !== null, '赤色盲でもゲーム開始ボタンが判別できる');

        // ========================================
        // フェーズ3: ゲーム画面で駒の区別テスト
        // ========================================
        console.log('\n🎨 フェーズ3: ゲーム画面で駒の区別');

        await startBtn.click();
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
            sleep(8000)
        ]);
        await sleep(500);

        // 先手の駒と後手の駒がaria-labelで区別できる
        const pieceLabels = await page.evaluate(() => {
            const sentePiece = document.querySelector('.piece-sente');
            const gotePiece = document.querySelector('.piece-gote');
            return {
                sente: sentePiece ? sentePiece.getAttribute('aria-label') : null,
                gote: gotePiece ? gotePiece.getAttribute('aria-label') : null,
            };
        });

        assert(
            pieceLabels.sente && pieceLabels.sente.includes('先手'),
            '赤色盲でも先手の駒がaria-labelで区別できる'
        );
        assert(
            pieceLabels.gote && pieceLabels.gote.includes('後手'),
            '赤色盲でも後手の駒がaria-labelで区別できる'
        );

        // 駒を選択して合法手が表示される（data属性で判別）
        const sentePieces = await page.$$('.cell.piece-sente');
        if (sentePieces.length > 0) {
            await sentePieces[0].click();
            await sleep(500);

            const legalMoves = await page.$$('.cell[data-legal-move="true"]');
            assert(
                legalMoves.length > 0,
                '赤色盲でも合法手がdata属性で判別できる'
            );

            // 選択状態もdata属性で判別
            const selectedCell = await page.$('.cell[data-selected="true"]');
            assert(
                selectedCell !== null,
                '赤色盲でも選択状態がdata属性で判別できる'
            );
            
            // 選択を解除（次のテストのため）
            await sentePieces[0].click();
            await sleep(300);
        }

        // ========================================
        // フェーズ4: 2型色覚（緑色盲）シミュレーション
        // ========================================
        console.log('\n🎨 フェーズ4: 2型色覚（緑色盲）シミュレーション');

        await page.addStyleTag({
            content: `
                html {
                    filter: ${colorBlindFilters.deuteranopia} !important;
                }
            `,
        });

        // 盤面が表示される
        const cellsCount = await page.$$eval('.cell', cells => cells.length);
        assert(cellsCount === 81, '緑色盲でも盤面（81マス）が正しく表示される');

        // 手数カウンターが読める
        const moveCount = await page.evaluate(() => {
            const el = document.querySelector('#move-count');
            return el ? el.textContent.trim() : '';
        });
        assert(moveCount !== '', '緑色盲でも手数カウンターが読める');

        // ボタンがテキストで判別できる
        const undoButtonText = await page.evaluate(() => {
            const btn = document.querySelector('#btn-undo');
            if (!btn) return '';
            // rubyタグ内のテキストも含めて取得
            const text = btn.textContent || btn.innerText || '';
            return text.replace(/\s+/g, ' ').trim();
        });
        assert(
            undoButtonText.length > 0,
            '緑色盲でもボタンがテキストで判別できる'
        );

        // ========================================
        // フェーズ5: 3型色覚（青色盲）シミュレーション
        // ========================================
        console.log('\n🎨 フェーズ5: 3型色覚（青色盲）シミュレーション');

        await page.addStyleTag({
            content: `
                html {
                    filter: ${colorBlindFilters.tritanopia} !important;
                }
            `,
        });

        // ナビゲーション要素が判別できる
        const navLinks = await page.$$eval('nav a, .navbar a, header a', links =>
            links.map(link => link.textContent.trim()).filter(text => text.length > 0)
        );
        assert(
            navLinks.length > 0,
            '青色盲でもナビゲーション要素が判別できる'
        );

        // ゲーム状態が文字で表示される
        const gameStatus = await page.evaluate(() => {
            const statusEl = document.querySelector('[role="status"], .game-status, #game-announcements');
            return statusEl ? statusEl.textContent.trim() : '';
        });
        assert(
            gameStatus !== '',
            '青色盲でもゲーム状態がテキストで判別できる'
        );

        // ========================================
        // フェーズ6: コントラスト比確認（全色覚異常共通）
        // ========================================
        console.log('\n🎨 フェーズ6: コントラスト比確認');

        // テキスト要素のコントラストが十分か（簡易チェック）
        const textContrast = await page.evaluate(() => {
            const texts = Array.from(document.querySelectorAll('p, h1, h2, h3, button, a, label'));
            let sufficientCount = 0;
            
            texts.forEach(el => {
                const style = window.getComputedStyle(el);
                const color = style.color;
                const bgColor = style.backgroundColor;
                
                // rgba(0,0,0,0) は透明なので親要素の背景を考慮すべきだが簡易版
                if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
                    sufficientCount++;
                }
            });
            
            return {
                total: texts.length,
                withBackground: sufficientCount,
            };
        });

        assert(
            textContrast.total > 0,
            `テキスト要素が存在する（${textContrast.total}個）`
        );

        // ========================================
        // フェーズ7: アイコンとテキストの併用確認
        // ========================================
        console.log('\n🎨 フェーズ7: アイコンとテキストの併用');

        // ボタンにaria-labelまたはテキストがある
        const buttonAccessibility = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const accessible = buttons.filter(btn => {
                const hasText = btn.textContent.trim().length > 0;
                const hasAriaLabel = btn.hasAttribute('aria-label');
                const hasAriaLabelledBy = btn.hasAttribute('aria-labelledby');
                return hasText || hasAriaLabel || hasAriaLabelledBy;
            });
            return {
                total: buttons.length,
                accessible: accessible.length,
            };
        });

        const accessibilityRate = buttonAccessibility.total > 0
            ? (buttonAccessibility.accessible / buttonAccessibility.total) * 100
            : 100;

        assert(
            accessibilityRate === 100,
            `全てのボタンにテキストまたはaria-labelがある（${accessibilityRate.toFixed(0)}%）`
        );

        // ========================================
        // フェーズ8: エラー表示の色以外の手段確認
        // ========================================
        console.log('\n🎨 フェーズ8: エラー表示');

        // エラー領域がrole="alert"またはaria-live属性を持つか
        const errorRegions = await page.evaluate(() => {
            const alerts = document.querySelectorAll('[role="alert"], [aria-live]');
            return alerts.length;
        });

        assert(
            errorRegions > 0,
            'エラー通知領域がWAI-ARIA属性で実装されている'
        );

        // ========================================
        // フェーズ9: フォーカス表示の確認
        // ========================================
        console.log('\n🎨 フェーズ9: フォーカス表示');

        // 最初のセルにフォーカスを当てる
        const firstCell = await page.$('.cell');
        if (firstCell) {
            await firstCell.focus();
            await sleep(200);

            const hasFocusIndicator = await page.evaluate(() => {
                const activeEl = document.activeElement;
                if (!activeEl) return false;

                const style = window.getComputedStyle(activeEl);
                const pseudo = window.getComputedStyle(activeEl, ':focus');
                
                // outline, border, box-shadowのいずれかが設定されているか
                const hasOutline = style.outline !== 'none' && style.outlineWidth !== '0px';
                const hasBorder = parseInt(style.borderWidth) > 0;
                const hasBoxShadow = style.boxShadow !== 'none';
                
                return hasOutline || hasBorder || hasBoxShadow;
            });

            assert(
                hasFocusIndicator,
                'フォーカス表示が色以外の視覚要素で判別できる'
            );
        }

        // ========================================
        // フェーズ10: 移動のテスト（色以外の情報で操作可能か）
        // ========================================
        console.log('\n🎨 フェーズ10: キーボード操作でゲームプレイ');

        // 駒のあるセルを探してフォーカス
        const pieceCell = await page.$('.cell.piece-sente');
        if (pieceCell) {
            await pieceCell.focus();
            await sleep(200);
            await page.keyboard.press('Enter');
            await sleep(500);

            // 合法手が表示されたか
            const legalMovesAfterKeyboard = await page.$$('.cell[data-legal-move="true"]');
            assert(
                legalMovesAfterKeyboard.length > 0,
                'キーボード操作でも合法手が表示される（色に依存しない）'
            );
        } else {
            console.log('  ℹ️  駒が見つからないためスキップ');
        }

        // ========================================
        // フェーズ11: クリーンアップ
        // ========================================
        console.log('\n🎨 フェーズ11: クリーンアップ');
        // フィルターを解除
        await page.addStyleTag({
            content: `
                html {
                    filter: none !important;
                }
            `,
        });

    } catch (error) {
        console.error('\n❌ エラー発生:', error.message);
        testResults.failed++;
    } finally {
        await browser.close();
    }

    // ========================================
    // 結果サマリー
    // ========================================
    console.log('\n\n========================================');
    console.log(`✅ 通過: ${testResults.passed}`);
    console.log(`❌ 失敗: ${testResults.failed}`);
    console.log('========================================');

    if (testResults.failed > 0) {
        console.log('\n📋 失敗詳細:\n');
        testResults.failedTests.forEach((test, index) => {
            console.log(`  ${index + 1}. ${test}`);
        });
    }

    process.exit(testResults.failed > 0 ? 1 : 0);
}

// 実行
runColorBlindTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
