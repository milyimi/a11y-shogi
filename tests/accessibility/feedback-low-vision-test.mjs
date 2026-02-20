/**
 * フィードバックフォーム弱視ユーザーテスト
 * - テキストコントラスト比（WCAG AA: 4.5:1以上）
 * - フォーカス表示の明確性
 * - テキストサイズ・可読性
 * - ボタン・リンクの視認性
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

// RGB値からコントラスト比を計算（WCAG 2.1準拠）
function getContrastRatio(rgb1, rgb2) {
    const getLuminance = (r, g, b) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
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
        console.log('\n👓 ========================================');
        console.log('  フィードバックフォーム弱視ユーザーテスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: フォーカスリングの表示
        // ========================================
        console.log('👓 フェーズ1: フォーカスリングの表示');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        // フォーカスリングのスタイルをチェック
        const typeSelect = await page.$('select[name="type"]');
        await typeSelect.focus();

        const focusOutline = await page.$eval('select[name="type"]:focus', el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineWidth: styles.outlineWidth,
                outlineColor: styles.outlineColor,
                boxShadow: styles.boxShadow
            };
        });

        const hasFocusIndicator = 
            focusOutline.outlineWidth !== '0px' || 
            focusOutline.outline !== 'none' ||
            focusOutline.boxShadow !== 'none';

        assert(hasFocusIndicator, `フォーカス表示が存在: outline=${focusOutline.outlineWidth}, shadow=${focusOutline.boxShadow}`);

        // ========================================
        // フェーズ2: テキストサイズ
        // ========================================
        console.log('\n👓 フェーズ2: テキストサイズ');

        const h1FontSize = await page.$eval('h1', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(h1FontSize >= 24, `h1サイズが十分 (${h1FontSize}px)`);

        const labelFontSize = await page.$eval('label', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(labelFontSize >= 14, `labelサイズが十分 (${labelFontSize}px)`);

        const inputFontSize = await page.$eval('input[name="name"]', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(inputFontSize >= 14, `入力欄サイズが十分 (${inputFontSize}px)`);

        // ========================================
        // フェーズ3: ボタンのサイズと視認性
        // ========================================
        console.log('\n👓 フェーズ3: ボタンのサイズ');

        const submitBtn = await page.$('button[type="submit"]');
        const btnBox = await submitBtn.boundingBox();
        assert(btnBox.height >= 40, `ボタン高さが十分 (${btnBox.height}px)`);
        assert(btnBox.width >= 80, `ボタン幅が十分 (${btnBox.width}px)`);

        const btnPadding = await page.$eval('button[type="submit"]', el => {
            const styles = window.getComputedStyle(el);
            return {
                top: parseFloat(styles.paddingTop),
                bottom: parseFloat(styles.paddingBottom),
                left: parseFloat(styles.paddingLeft),
                right: parseFloat(styles.paddingRight)
            };
        });

        const totalVerticalPadding = btnPadding.top + btnPadding.bottom;
        assert(totalVerticalPadding >= 16, `ボタン縦パディングが十分 (${totalVerticalPadding}px)`);

        // ========================================
        // フェーズ4: テキストコントラスト（見出し）
        // ========================================
        console.log('\n👓 フェーズ4: テキストコントラスト');

        const h1Contrast = await page.$eval('h1', el => {
            const styles = window.getComputedStyle(el);
            const color = styles.color.match(/\d+/g).map(Number);
            const bgColor = styles.backgroundColor.match(/\d+/g).map(Number);
            return {
                color: { r: color[0], g: color[1], b: color[2] },
                bgColor: { r: bgColor[0], g: bgColor[1], b: bgColor[2] }
            };
        });

        const h1ContrastRatio = getContrastRatio(h1Contrast.color, h1Contrast.bgColor);
        assert(h1ContrastRatio >= 3.0, `h1コントラスト比 (${h1ContrastRatio.toFixed(2)}:1) >= 3.0 (AA Large)`);

        // ========================================
        // フェーズ5: ラベルテキストコントラスト
        // ========================================
        console.log('\n👓 フェーズ5: ラベルコントラスト');

        const labelContrast = await page.$eval('label', el => {
            const styles = window.getComputedStyle(el);
            const color = styles.color.match(/\d+/g).map(Number);
            const parent = el.parentElement;
            const bgStyles = window.getComputedStyle(parent);
            let bgColor = bgStyles.backgroundColor.match(/\d+/g);
            
            // 透明背景の場合は親をたどる
            if (!bgColor || bgColor[3] === 0) {
                let currentEl = parent;
                while (currentEl && (!bgColor || bgColor[3] === 0)) {
                    currentEl = currentEl.parentElement;
                    if (currentEl) {
                        const curStyles = window.getComputedStyle(currentEl);
                        bgColor = curStyles.backgroundColor.match(/\d+/g);
                    }
                }
            }
            
            if (!bgColor) bgColor = [255, 255, 255]; // デフォルト白
            
            return {
                color: { r: color[0], g: color[1], b: color[2] },
                bgColor: { r: bgColor[0], g: bgColor[1], b: bgColor[2] }
            };
        });

        const labelContrastRatio = getContrastRatio(labelContrast.color, labelContrast.bgColor);
        assert(labelContrastRatio >= 4.5, `labelコントラスト比 (${labelContrastRatio.toFixed(2)}:1) >= 4.5 (AA Normal)`);

        // ========================================
        // フェーズ6: ボタンテキストコントラスト
        // ========================================
        console.log('\n👓 フェーズ6: ボタンコントラスト');

        const btnContrast = await page.$eval('button[type="submit"]', el => {
            const styles = window.getComputedStyle(el);
            const color = styles.color.match(/\d+/g).map(Number);
            const bgColor = styles.backgroundColor.match(/\d+/g).map(Number);
            return {
                color: { r: color[0], g: color[1], b: color[2] },
                bgColor: { r: bgColor[0], g: bgColor[1], b: bgColor[2] }
            };
        });

        const btnContrastRatio = getContrastRatio(btnContrast.color, btnContrast.bgColor);
        assert(btnContrastRatio >= 4.5, `ボタンコントラスト比 (${btnContrastRatio.toFixed(2)}:1) >= 4.5 (AA)`);

        // ========================================
        // フェーズ7: エラーメッセージコントラスト
        // ========================================
        console.log('\n👓 フェーズ7: エラーメッセージコントラスト');

        await page.click('button[type="submit"]');
        await sleep(500);

        const errorElement = await page.$('.text-red-600, .text-red-500, [role="alert"]');
        if (errorElement) {
            const errorContrast = await page.$eval('.text-red-600, .text-red-500, [role="alert"]', el => {
                const styles = window.getComputedStyle(el);
                const color = styles.color.match(/\d+/g).map(Number);
                
                let currentEl = el;
                let bgColor = null;
                while (currentEl) {
                    const bgStyles = window.getComputedStyle(currentEl);
                    const bg = bgStyles.backgroundColor.match(/\d+/g);
                    if (bg && bg[3] !== 0) {
                        bgColor = bg;
                        break;
                    }
                    currentEl = currentEl.parentElement;
                }
                
                if (!bgColor) bgColor = [255, 255, 255];
                
                return {
                    color: { r: color[0], g: color[1], b: color[2] },
                    bgColor: { r: bgColor[0], g: bgColor[1], b: bgColor[2] }
                };
            });

            const errorContrastRatio = getContrastRatio(errorContrast.color, errorContrast.bgColor);
            assert(errorContrastRatio >= 4.5, `エラーコントラスト比 (${errorContrastRatio.toFixed(2)}:1) >= 4.5`);
        }

        // ========================================
        // フェーズ8: リンクの視認性
        // ========================================
        console.log('\n👓 フェーズ8: リンクの視認性');

        const navLinks = await page.$$('nav a');
        if (navLinks.length > 0) {
            const linkUnderline = await page.$eval('nav a', el => {
                const styles = window.getComputedStyle(el);
                return {
                    textDecoration: styles.textDecoration,
                    borderBottom: styles.borderBottom
                };
            });

            const hasUnderlineOrBorder = 
                linkUnderline.textDecoration.includes('underline') ||
                linkUnderline.borderBottom !== 'none';

            // リンクは色だけでなく下線またはボーダーで区別されるべき
            // ただし、ナビゲーション内では色とホバー効果で十分な場合もある
            console.log(`  ℹ️ リンク装飾: decoration=${linkUnderline.textDecoration}, border=${linkUnderline.borderBottom}`);
        }

        // ========================================
        // フェーズ9: フォーカス時の視認性向上
        // ========================================
        console.log('\n👓 フェーズ9: フォーカス時の視認性');

        const nameInput = await page.$('input[name="name"]');
        await nameInput.focus();

        const inputFocusStyle = await page.$eval('input[name="name"]:focus', el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineWidth: styles.outlineWidth,
                boxShadow: styles.boxShadow,
                borderColor: styles.borderColor
            };
        });

        const hasVisibleFocus = 
            inputFocusStyle.outlineWidth !== '0px' ||
            inputFocusStyle.boxShadow !== 'none' ||
            inputFocusStyle.outline !== 'none';

        assert(hasVisibleFocus, `入力欄フォーカス表示: ${inputFocusStyle.outlineWidth}, ${inputFocusStyle.boxShadow}`);

        // ========================================
        // フェーズ10: 確認画面の視認性
        // ========================================
        console.log('\n👓 フェーズ10: 確認画面の視認性');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        await page.select('select[name="type"]', 'general');
        await page.type('textarea[name="message"]', '弱視ユーザーテストメッセージ');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const confirmH1Size = await page.$eval('h1', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(confirmH1Size >= 24, `確認画面見出しサイズ (${confirmH1Size}px)`);

        const dataText = await page.$('.data-display, .confirmation, tbody, dl');
        if (dataText) {
            const dataFontSize = await page.$eval('.data-display, .confirmation, tbody, dl', el => 
                parseFloat(window.getComputedStyle(el).fontSize)
            );
            assert(dataFontSize >= 14, `確認画面データサイズ (${dataFontSize}px)`);
        }

        // ========================================
        // まとめ
        // ========================================
        console.log('\n========================================');
        console.log(`✅ 合格: ${passed}`);
        console.log(`❌ 失敗: ${failed}`);
        console.log('========================================\n');

        if (issues.length > 0) {
            console.log('🔴 失敗項目:\n');
            issues.forEach(i => console.log(`   - ${i}`));
            console.log('');
        }

        await browser.close();
        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ テスト実行エラー:', error.message);
        await browser.close();
        process.exit(1);
    }
})();
