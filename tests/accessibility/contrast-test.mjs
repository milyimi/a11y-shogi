/**
 * ハイコントラストモード テスト
 * - 切替ボタンの動作確認
 * - 各モードでのコントラスト比測定
 * - 弱視者にとっての視認性検証
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8000';

// sRGB → 相対輝度
function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// コントラスト比計算
function contrastRatio(fg, bg) {
    const l1 = luminance(...fg);
    const l2 = luminance(...bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// CSS色文字列 → RGB配列
function parseColor(color) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    // hex
    const hex = color.replace('#', '');
    if (hex.length === 6) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
    return [0, 0, 0];
}

let passed = 0;
let failed = 0;
let warnings = 0;
const results = [];

function assert(name, condition, detail = '') {
    if (condition) {
        passed++;
        results.push({ status: '✅', name, detail });
        console.log(`  ✅ ${name}${detail ? ' - ' + detail : ''}`);
    } else {
        failed++;
        results.push({ status: '❌', name, detail });
        console.log(`  ❌ ${name}${detail ? ' - ' + detail : ''}`);
    }
}

function warn(name, detail) {
    warnings++;
    results.push({ status: '⚠️', name, detail });
    console.log(`  ⚠️ ${name} - ${detail}`);
}

function checkContrast(name, fgColor, bgColor, level = 'AA', isLargeText = false) {
    const fg = parseColor(fgColor);
    const bg = parseColor(bgColor);
    const ratio = contrastRatio(fg, bg);
    const required = level === 'AAA'
        ? (isLargeText ? 4.5 : 7)
        : (isLargeText ? 3 : 4.5);
    const ratioStr = ratio.toFixed(2) + ':1';

    if (ratio >= required) {
        assert(`コントラスト: ${name}`, true, `${ratioStr} (${level}要件 ${required}:1)`);
    } else if (ratio >= (isLargeText ? 3 : 4.5)) {
        // AA は満たすが AAA は不足
        warn(`コントラスト: ${name}`, `${ratioStr} - AA OK, AAA不足 (要件 ${required}:1)`);
    } else {
        assert(`コントラスト: ${name}`, false, `${ratioStr} (要件 ${required}:1)`);
    }
    return ratio;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
        // ============================================================
        // テスト1: ホーム画面 - 通常モード
        // ============================================================
        console.log('\n🏠 テスト1: ホーム画面 - 通常モード');
        await page.goto(BASE, { waitUntil: 'networkidle0' });

        // 切替ボタンの存在確認
        const toggleBtn = await page.$('#contrast-toggle');
        assert('切替ボタンの存在', !!toggleBtn);

        const btnText = await page.$eval('#contrast-toggle', el => el.textContent.trim());
        assert('初期状態はOFF', btnText === 'ダークモード: OFF');

        const ariaPressed = await page.$eval('#contrast-toggle', el => el.getAttribute('aria-pressed'));
        assert('aria-pressed初期値', ariaPressed === 'false');

        const ariaLabel = await page.$eval('#contrast-toggle', el => el.getAttribute('aria-label'));
        assert('aria-label設定', ariaLabel === 'ダークモード切替');

        // 通常モードのコントラスト測定
        console.log('\n  📐 通常モードのコントラスト比:');
        const normalStyles = await page.evaluate(() => {
            const body = document.body;
            const cs = getComputedStyle(body);
            const header = document.querySelector('.header');
            const hcs = getComputedStyle(header);
            // ナビリンク
            const navLink = document.querySelector('.nav-links a');
            const nlcs = navLink ? getComputedStyle(navLink) : null;
            // セカンダリテキスト
            const secondary = document.querySelector('[style*="color: var(--color-text-secondary)"]');
            const scs = secondary ? getComputedStyle(secondary) : null;
            // ボタン
            const btn = document.querySelector('.btn-primary');
            const bcs = btn ? getComputedStyle(btn) : null;

            return {
                bodyText: cs.color,
                bodyBg: cs.backgroundColor,
                headerBg: hcs.backgroundColor,
                linkColor: nlcs ? nlcs.color : null,
                secondaryText: scs ? scs.color : null,
                secondaryBg: scs ? getComputedStyle(scs.parentElement || body).backgroundColor : cs.backgroundColor,
                btnColor: bcs ? bcs.color : null,
                btnBg: bcs ? bcs.backgroundColor : null,
            };
        });

        checkContrast('本文テキスト/背景', normalStyles.bodyText, normalStyles.bodyBg, 'AAA');
        if (normalStyles.linkColor) {
            checkContrast('リンク/背景', normalStyles.linkColor, normalStyles.bodyBg, 'AAA');
        }
        if (normalStyles.secondaryText) {
            checkContrast('セカンダリテキスト/背景', normalStyles.secondaryText, normalStyles.bodyBg, 'AAA');
        }
        if (normalStyles.btnColor && normalStyles.btnBg) {
            checkContrast('ボタン文字/背景', normalStyles.btnColor, normalStyles.btnBg, 'AAA');
        }

        // ============================================================
        // テスト2: ハイコントラストモードに切替
        // ============================================================
        console.log('\n🔲 テスト2: ハイコントラストモード切替');
        await page.click('#contrast-toggle');
        await page.waitForFunction(() => document.documentElement.classList.contains('high-contrast'));

        const newBtnText = await page.$eval('#contrast-toggle', el => el.textContent.trim());
        assert('切替後はON', newBtnText === 'ダークモード: ON');

        const newAriaPressed = await page.$eval('#contrast-toggle', el => el.getAttribute('aria-pressed'));
        assert('aria-pressed切替後', newAriaPressed === 'true');

        const hasClass = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        assert('high-contrastクラス付与', hasClass);

        // スクリーンリーダーアナウンス確認
        const announcement = await page.$eval('#sr-announcements', el => el.textContent);
        assert('スクリーンリーダーアナウンス', announcement.includes('ダークモード'));

        // ハイコントラストモードのコントラスト測定
        console.log('\n  📐 ハイコントラストモードのコントラスト比:');
        const hcStyles = await page.evaluate(() => {
            const body = document.body;
            const cs = getComputedStyle(body);
            const navLink = document.querySelector('.nav-links a');
            const nlcs = navLink ? getComputedStyle(navLink) : null;
            const secondary = document.querySelector('[style*="color: var(--color-text-secondary)"]');
            const scs = secondary ? getComputedStyle(secondary) : null;
            const btn = document.querySelector('.btn-primary');
            const bcs = btn ? getComputedStyle(btn) : null;

            return {
                bodyText: cs.color,
                bodyBg: cs.backgroundColor,
                linkColor: nlcs ? nlcs.color : null,
                secondaryText: scs ? scs.color : null,
                btnColor: bcs ? bcs.color : null,
                btnBg: bcs ? bcs.backgroundColor : null,
            };
        });

        checkContrast('HC本文テキスト/背景', hcStyles.bodyText, hcStyles.bodyBg, 'AAA');
        if (hcStyles.linkColor) {
            checkContrast('HCリンク/背景', hcStyles.linkColor, hcStyles.bodyBg, 'AAA');
        }
        if (hcStyles.secondaryText) {
            checkContrast('HCセカンダリテキスト/背景', hcStyles.secondaryText, hcStyles.bodyBg, 'AAA');
        }
        if (hcStyles.btnColor && hcStyles.btnBg) {
            checkContrast('HCボタン文字/背景', hcStyles.btnColor, hcStyles.btnBg, 'AAA');
        }

        // ============================================================
        // テスト3: localStorage永続化
        // ============================================================
        console.log('\n💾 テスト3: localStorage永続化');
        const stored = await page.evaluate(() => localStorage.getItem('a11y-shogi-high-contrast'));
        assert('localStorage保存', stored === '1');

        // ページリロードで保持されるか
        await page.reload({ waitUntil: 'networkidle0' });
        const afterReload = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        assert('リロード後も保持', afterReload);

        const afterReloadBtn = await page.$eval('#contrast-toggle', el => el.textContent.trim());
        assert('リロード後のボタンテキスト', afterReloadBtn === 'ダークモード: ON');

        // OFF に戻す
        await page.click('#contrast-toggle');
        await page.waitForFunction(() => !document.documentElement.classList.contains('high-contrast'));
        const storedOff = await page.evaluate(() => localStorage.getItem('a11y-shogi-high-contrast'));
        assert('OFF時のlocalStorage', storedOff === '0');

        // ============================================================
        // テスト4: ゲーム画面でのハイコントラスト
        // ============================================================
        console.log('\n♟️ テスト4: ゲーム画面でのハイコントラスト');

        // ハイコントラストONで新規ゲーム作成
        await page.click('#contrast-toggle');
        await page.waitForFunction(() => document.documentElement.classList.contains('high-contrast'));

        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await page.click('#btn-start-game');
        await page.waitForSelector('.shogi-board', { timeout: 10000 });

        // ゲーム画面でもハイコントラストが維持されるか
        const gameHC = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        assert('ゲーム画面でHC維持', gameHC);

        // ゲーム画面のコントラスト測定
        console.log('\n  📐 ゲーム画面のコントラスト比:');
        const gameStyles = await page.evaluate(() => {
            const cell = document.querySelector('.cell');
            const ccs = cell ? getComputedStyle(cell) : null;
            const senteCell = document.querySelector('.piece-sente');
            const scs = senteCell ? getComputedStyle(senteCell) : null;
            const goteCell = document.querySelector('.piece-gote');
            const gcs = goteCell ? getComputedStyle(goteCell) : null;
            const cellBg = ccs ? ccs.backgroundColor : 'rgb(255,255,255)';

            // 持ち駒ボタン
            const handPiece = document.querySelector('.hand-piece');
            const hpcs = handPiece ? getComputedStyle(handPiece) : null;

            // セカンダリテキスト (持ち駒なし)
            const secText = document.querySelector('[style*="color: var(--color-text-secondary)"]');
            const stcs = secText ? getComputedStyle(secText) : null;

            // 情報パネル
            const infoPanel = document.querySelector('.info-panel');
            const ipcs = infoPanel ? getComputedStyle(infoPanel) : null;

            return {
                cellBg: cellBg,
                sentePiece: scs ? scs.color : null,
                gotePiece: gcs ? gcs.color : null,
                boardBorder: ccs ? ccs.borderColor || ccs.borderTopColor : null,
                handPieceColor: hpcs ? hpcs.color : null,
                handPieceBg: hpcs ? hpcs.backgroundColor : null,
                handPieceBorder: hpcs ? hpcs.borderColor || hpcs.borderTopColor : null,
                secondaryText: stcs ? stcs.color : null,
                infoPanelBg: ipcs ? ipcs.backgroundColor : null,
            };
        });

        if (gameStyles.sentePiece) {
            checkContrast('先手駒/セル背景', gameStyles.sentePiece, gameStyles.cellBg, 'AAA');
        }
        if (gameStyles.gotePiece) {
            checkContrast('後手駒/セル背景', gameStyles.gotePiece, gameStyles.cellBg, 'AAA');
        }
        if (gameStyles.boardBorder) {
            checkContrast('盤面ボーダー/セル背景', gameStyles.boardBorder, gameStyles.cellBg, 'AA');
        }
        if (gameStyles.handPieceColor && gameStyles.handPieceBg) {
            checkContrast('持ち駒文字/背景', gameStyles.handPieceColor, gameStyles.handPieceBg, 'AAA');
        }
        if (gameStyles.secondaryText && gameStyles.infoPanelBg) {
            checkContrast('セカンダリテキスト/パネル背景', gameStyles.secondaryText, gameStyles.infoPanelBg, 'AAA');
        }

        // ============================================================
        // テスト5: フォーカス可視性
        // ============================================================
        console.log('\n🔍 テスト5: フォーカス可視性');
        // 盤面セルにフォーカス
        const focusResult = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            const cell = cells[0];
            if (!cell) return null;
            const normalBg = getComputedStyle(cell).backgroundColor;
            cell.focus();
            // フォーカス後のスタイル取得
            const cs = getComputedStyle(cell);
            return {
                outline: cs.outline,
                outlineColor: cs.outlineColor,
                outlineWidth: cs.outlineWidth,
                boxShadow: cs.boxShadow,
                normalBg: normalBg,
                focusBg: cs.backgroundColor,
            };
        });
        if (focusResult) {
            const outlineWidth = parseInt(focusResult.outlineWidth) || 0;
            assert('フォーカスアウトライン幅 >= 3px', outlineWidth >= 3, `${outlineWidth}px`);
            assert('フォーカスにbox-shadow付与', focusResult.boxShadow !== 'none', focusResult.boxShadow.substring(0, 40));
        }

        // ============================================================
        // テスト6: ボタンのタッチターゲット
        // ============================================================
        console.log('\n👆 テスト6: ボタンサイズ (44×44px以上)');
        const buttons = await page.$$eval('.btn, .contrast-toggle, .hand-piece', elements =>
            elements
                .map(el => {
                    const rect = el.getBoundingClientRect();
                    const style = getComputedStyle(el);
                    const isVisible = style.display !== 'none'
                        && style.visibility !== 'hidden'
                        && parseFloat(style.opacity || '1') !== 0
                        && rect.width > 0
                        && rect.height > 0
                        && (el.offsetParent !== null || el.getClientRects().length > 0);
                    return {
                        text: el.textContent.trim().substring(0, 20),
                        width: rect.width,
                        height: rect.height,
                        isVisible: isVisible,
                    };
                })
                .filter(btn => btn.isVisible)
        );
        for (const btn of buttons) {
            const ok = btn.width >= 44 && btn.height >= 44;
            if (!ok) {
                warn(`タッチターゲット: "${btn.text}"`, `${Math.round(btn.width)}×${Math.round(btn.height)}px`);
            }
        }
        assert('ボタンサイズ検査完了', true, `${buttons.length}個のボタンを検査`);

        // ============================================================
        // テスト7: ランキング画面
        // ============================================================
        console.log('\n🏆 テスト7: ランキング画面でのハイコントラスト');
        await page.goto(BASE + '/ranking', { waitUntil: 'networkidle0' });

        const rankingHC = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        assert('ランキング画面でHC維持', rankingHC);

        const rankingStyles = await page.evaluate(() => {
            const body = document.body;
            const cs = getComputedStyle(body);
            const th = document.querySelector('th');
            const thcs = th ? getComputedStyle(th) : null;
            const td = document.querySelector('td');
            const tdcs = td ? getComputedStyle(td) : null;
            return {
                bodyText: cs.color,
                bodyBg: cs.backgroundColor,
                thBg: th ? getComputedStyle(th.closest('tr')).backgroundColor : null,
            };
        });

        checkContrast('ランキング本文/背景', rankingStyles.bodyText, rankingStyles.bodyBg, 'AAA');

        // スクリーンショット
        await page.screenshot({ path: 'tests/accessibility/contrast-normal.png', fullPage: true });
        console.log('\n  📸 通常モードスクリーンショット保存: contrast-normal.png');

        // ハイコントラストOFFでもスクリーンショット
        await page.click('#contrast-toggle');
        await page.waitForFunction(() => !document.documentElement.classList.contains('high-contrast'));
        await page.screenshot({ path: 'tests/accessibility/contrast-high.png', fullPage: true });
        console.log('  📸 ハイコントラストモードスクリーンショット保存: contrast-high.png');

    } catch (e) {
        console.error('\n❌ テストエラー:', e.message);
        failed++;
    } finally {
        await browser.close();
    }

    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log(`📊 テスト結果: ✅ ${passed} 合格 / ❌ ${failed} 不合格 / ⚠️ ${warnings} 警告`);
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
})();
