/**
 * Webデザイナー AI視点のテスト
 * 
 * UI/UX・CSS設計・レスポンシブ・配色・タイポグラフィ・
 * コンポーネント一貫性・ビジュアル品質を厳しく評価する。
 */
import puppeteer from 'puppeteer';
const BASE = 'http://localhost:8080';
const results = [];
let pass = 0, fail = 0;

function check(label, ok, detail = '') {
    const status = ok ? '✅' : '❌';
    results.push({ label, ok, detail });
    if (ok) pass++; else fail++;
    console.log(`${status} ${label}${detail ? ' — ' + detail : ''}`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('\n═══ WebデザイナーAI: UI/UXデザイン品質チェック ═══\n');

    // ========== ホームページ ==========
    console.log('--- ホームページ ---');
    const homePage = await browser.newPage();
    await homePage.setViewport({ width: 1280, height: 900 });
    await homePage.goto(BASE, { waitUntil: 'networkidle0' });

    // D-1: CSS Custom Properties の一貫性
    const cssVars = await homePage.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const vars = {};
        const keys = [
            '--color-text', '--color-bg', '--color-focus',
            '--color-border', '--color-link', '--color-surface',
            '--color-btn-bg', '--color-btn-text'
        ];
        keys.forEach(k => {
            vars[k] = root.getPropertyValue(k).trim();
        });
        const allSet = Object.values(vars).every(v => v.length > 0);
        return { vars, allSet };
    });
    check('D-1 CSSカスタムプロパティが全て定義済み', cssVars.allSet);

    // D-2: ボタンのmin-height 44px（WCAG AAA タッチターゲット）
    const btnSizes = await homePage.evaluate(() => {
        const btns = document.querySelectorAll('button, .btn, [role="button"]');
        const tooSmall = [];
        btns.forEach(b => {
            const rect = b.getBoundingClientRect();
            const cs = getComputedStyle(b);
            if (rect.height < 44 && cs.display !== 'none' && rect.width > 0) {
                tooSmall.push(`${b.textContent.trim().substring(0,20)}: ${Math.round(rect.height)}px`);
            }
        });
        return tooSmall;
    });
    check('D-2 全ボタンのタッチターゲット≧44px', btnSizes.length === 0,
        btnSizes.length > 0 ? btnSizes.join('; ') : '全てOK');

    // D-3: フォーカスインジケータが全てのインタラクティブ要素にCSS定義されている
    const focusCheck = await homePage.evaluate(() => {
        // CSS定義チェック: input:focus / button:focus 等のルールが存在するか
        const focusSelectors = new Set();
        [...document.styleSheets].forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.selectorText && rule.selectorText.includes(':focus')) {
                        const parts = rule.selectorText.split(',').map(s => s.trim());
                        parts.forEach(p => {
                            if (p.includes('input') || p.includes('button') || p.includes('a') ||
                                p.includes('select') || p.includes('textarea')) {
                                if (rule.style.outline || rule.style.outlineWidth || rule.style.boxShadow) {
                                    focusSelectors.add(p);
                                }
                            }
                        });
                    }
                });
            } catch (e) {}
        });
        
        // 実要素テスト: ボタンとリンクのフォーカス確認
        const noFocus = [];
        document.querySelectorAll('a[href], button:not(input[type="radio"]):not(input[type="checkbox"])').forEach(el => {
            if (el.tabIndex < 0 || el.offsetWidth === 0) return;
            el.focus();
            const cs = getComputedStyle(el);
            const hasOutline = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px';
            const hasBoxShadow = cs.boxShadow && cs.boxShadow !== 'none';
            if (!hasOutline && !hasBoxShadow) {
                noFocus.push(el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''));
            }
        });

        // inputのfocusはCSS定義で確認（プログラム的focusではブラウザがradioのoutlineを抑制）
        const hasInputFocusRule = [...focusSelectors].some(s => s.includes('input'));
        if (!hasInputFocusRule) noFocus.push('INPUT(no CSS rule)');
        
        return noFocus;
    });
    check('D-3 フォーカスインジケータの存在', focusCheck.length === 0,
        focusCheck.length > 0 ? focusCheck.join('; ') : '全てOK');

    // D-4: フォームのfieldsetにlegendがある
    const fieldsetLegend = await homePage.evaluate(() => {
        const fieldsets = document.querySelectorAll('fieldset');
        const missing = [];
        fieldsets.forEach((fs, i) => {
            const legend = fs.querySelector('legend');
            if (!legend || !legend.textContent.trim()) missing.push(`fieldset[${i}]`);
        });
        return { total: fieldsets.length, missing };
    });
    check('D-4 全fieldsetにlegendあり', fieldsetLegend.missing.length === 0,
        `${fieldsetLegend.total}件中${fieldsetLegend.missing.length}件不足`);

    // D-5: line-heightが1.5以上（WCAG AAA 行間）
    const lineHeights = await homePage.evaluate(() => {
        const texts = document.querySelectorAll('p, li, label, span');
        const bad = [];
        texts.forEach(t => {
            const cs = getComputedStyle(t);
            if (cs.display === 'none' || t.textContent.trim().length === 0) return;
            const fs = parseFloat(cs.fontSize);
            const lh = parseFloat(cs.lineHeight);
            if (lh / fs < 1.5 && t.closest('button') === null) {
                bad.push(`${t.tagName}.${t.className?.split(' ')[0] || ''}:lh=${(lh/fs).toFixed(2)}`);
            }
        });
        return bad.slice(0, 5);
    });
    check('D-5 テキストのline-height≧1.5', lineHeights.length === 0,
        lineHeights.length > 0 ? lineHeights.join('; ') : '全てOK');

    // D-6: インラインstyle属性の過剰使用チェック
    const inlineStyles = await homePage.evaluate(() => {
        const allEls = document.querySelectorAll('[style]');
        return allEls.length;
    });
    check('D-6 インラインstyleの数が適切（<30）', inlineStyles < 30,
        `${inlineStyles}個`);

    await homePage.close();

    // ========== ゲームページ ==========
    console.log('\n--- ゲームページ ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        document.querySelector('input[name="difficulty"][value="easy"]').checked = true;
        document.querySelector('input[name="color"][value="sente"]').checked = true;
    });
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);
    await sleep(1500);

    // D-7: 盤面セルのアスペクト比が正方形
    const cellAspect = await page.evaluate(() => {
        const cell = document.querySelector('.cell');
        if (!cell) return null;
        const rect = cell.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height), ratio: (rect.width / rect.height).toFixed(2) };
    });
    check('D-7 盤面セルが正方形（aspect-ratio: 1）',
        cellAspect && Math.abs(cellAspect.w - cellAspect.h) <= 2,
        cellAspect ? `${cellAspect.w}×${cellAspect.h} (ratio: ${cellAspect.ratio})` : 'セルなし');

    // D-8: 盤面の配色が将棋盤らしい木目色
    const boardColor = await page.evaluate(() => {
        const cell = document.querySelector('.cell');
        if (!cell) return null;
        const cs = getComputedStyle(cell);
        return cs.backgroundColor;
    });
    check('D-8 盤面色が将棋盤の木目色', boardColor && boardColor.includes('230'),
        boardColor);

    // D-9: グリッドレイアウトの使用確認
    const gridLayout = await page.evaluate(() => {
        const container = document.querySelector('.game-container');
        if (!container) return null;
        return getComputedStyle(container).display;
    });
    check('D-9 ゲームコンテナがgridレイアウト', gridLayout === 'grid', gridLayout);

    // D-10: z-index管理 - モーダルが最上位
    const zIndexes = await page.evaluate(() => {
        const modal = document.querySelector('.game-modal-overlay');
        const toast = document.querySelector('.toast');
        const tooltip = document.querySelector('[data-tooltip]');
        return {
            modal: modal ? getComputedStyle(modal).zIndex : 'N/A',
            // tooltipのz-indexはCSSルールから
        };
    });
    check('D-10 モーダルのz-indexが適切', zIndexes.modal !== 'auto' && parseInt(zIndexes.modal) >= 1000,
        `modal: ${zIndexes.modal}`);

    // D-11: フォントサイズの段階的スケール
    const fontScale = await page.evaluate(() => {
        const sizes = new Set();
        document.querySelectorAll('h1, h2, h3, h4, p, span, button, dt, dd').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none') return;
            sizes.add(Math.round(parseFloat(cs.fontSize)));
        });
        return [...sizes].sort((a, b) => a - b);
    });
    check('D-11 フォントサイズのスケール（3段階以上）', fontScale.length >= 3,
        fontScale.join(', ') + 'px');

    // D-12: ボタンの一貫したスタイル（.btn クラス使用）
    const btnConsistency = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const noBtnClass = [];
        buttons.forEach(b => {
            // 盤面セル・駒台の駒・モーダル閉じ・コントラスト等は除外
            if (b.classList.contains('cell') || b.classList.contains('game-modal-close') ||
                b.classList.contains('hand-piece') || b.classList.contains('contrast-toggle') ||
                b.type === 'submit' || b.closest('.game-modal') ||
                b.id === 'btn-start-game') return;
            if (!b.className.includes('btn')) {
                noBtnClass.push(b.textContent.trim().substring(0, 20));
            }
        });
        return noBtnClass;
    });
    check('D-12 ボタンに一貫したCSSクラス使用', btnConsistency.length === 0,
        btnConsistency.length > 0 ? btnConsistency.join('; ') : '全てOK');

    // D-13: 色のコントラスト比（通常テキスト vs 背景 ≧ 7:1 AAA）
    const contrastCheck = await page.evaluate(() => {
        function luminance(r, g, b) {
            [r, g, b] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        function contrast(rgb1, rgb2) {
            const l1 = luminance(...rgb1);
            const l2 = luminance(...rgb2);
            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);
            return (lighter + 0.05) / (darker + 0.05);
        }
        function parseColor(str) {
            const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
        }

        const issues = [];
        const textEls = document.querySelectorAll('h1, h2, h3, p, span, button .text, dt, dd, label, li');
        textEls.forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (el.textContent.trim().length === 0) return;
            const fg = parseColor(cs.color);
            // 背景色の取得は親の重なりがあるので近似
            let bg = parseColor(cs.backgroundColor);
            if (!bg || (bg[0] === 0 && bg[1] === 0 && bg[2] === 0 && cs.backgroundColor.includes('0)'))) {
                bg = [255, 255, 255]; // 透明→白想定
            }
            if (!fg || !bg) return;
            const ratio = contrast(fg, bg);
            const fs = parseFloat(cs.fontSize);
            const threshold = fs >= 18.66 ? 4.5 : 7; // 大文字はAA, 小文字はAAA
            if (ratio < threshold) {
                issues.push(`${el.tagName}("${el.textContent.trim().substring(0,15)}"): ${ratio.toFixed(1)}:1 < ${threshold}:1`);
            }
        });
        return issues.slice(0, 5);
    });
    check('D-13 テキストコントラスト比 AAA準拠', contrastCheck.length === 0,
        contrastCheck.length > 0 ? contrastCheck.join('; ') : '全てOK');

    // D-14: アニメーション — prefers-reduced-motion対応
    const reducedMotionCSS = await page.evaluate(() => {
        const sheets = [...document.styleSheets];
        let found = false;
        sheets.forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.conditionText && rule.conditionText.includes('reduced-motion')) {
                        found = true;
                    }
                });
            } catch (e) { /* cross-origin */ }
        });
        return found;
    });
    check('D-14 prefers-reduced-motion対応CSS', reducedMotionCSS);

    // D-15: forced-colors（高コントラスト）メディアクエリ対応
    const forcedColorsCSS = await page.evaluate(() => {
        const sheets = [...document.styleSheets];
        let found = false;
        sheets.forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.conditionText && rule.conditionText.includes('forced-colors')) {
                        found = true;
                    }
                });
            } catch (e) { /* cross-origin */ }
        });
        return found;
    });
    check('D-15 forced-colors メディアクエリ対応', forcedColorsCSS);

    // D-16: ヘッダーの構造（h1 → h2 → h3の順序）
    const headingOrder = await page.evaluate(() => {
        const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent.trim().substring(0, 30),
            hidden: h.classList.contains('sr-only')
        }));
        let prevLevel = 0;
        const skips = [];
        headings.forEach(h => {
            if (h.level > prevLevel + 1 && prevLevel > 0) {
                skips.push(`${h.text}: h${prevLevel}→h${h.level}(skip)`);
            }
            prevLevel = h.level;
        });
        return { headings, skips };
    });
    check('D-16 見出しレベルの順序（スキップなし）', headingOrder.skips.length === 0,
        headingOrder.skips.length > 0 ? headingOrder.skips.join('; ') : `${headingOrder.headings.length}件OK`);

    // ========== レスポンシブ テスト ==========
    console.log('\n--- レスポンシブデザイン ---');

    // D-17: タブレット (768px)
    await page.setViewport({ width: 768, height: 1024 });
    await sleep(500);
    const tabletLayout = await page.evaluate(() => {
        const container = document.querySelector('.game-container');
        if (!container) return null;
        const cs = getComputedStyle(container);
        const boardCell = document.querySelector('.cell');
        const cellRect = boardCell ? boardCell.getBoundingClientRect() : null;
        return {
            display: cs.display,
            columns: cs.gridTemplateColumns,
            cellSize: cellRect ? Math.round(cellRect.width) : 0,
            overflow: document.documentElement.scrollWidth > 768
        };
    });
    check('D-17 タブレット表示（768px）でレイアウト崩れなし',
        tabletLayout && !tabletLayout.overflow,
        tabletLayout ? `columns: ${tabletLayout.columns}, overflow: ${tabletLayout.overflow}` : 'N/A');

    // D-18: スマホ (375px)
    await page.setViewport({ width: 375, height: 812 });
    await sleep(500);
    const mobileLayout = await page.evaluate(() => {
        const container = document.querySelector('.game-container');
        if (!container) return null;
        const cs = getComputedStyle(container);
        const cellSize = document.querySelector('.cell')?.getBoundingClientRect().width;
        return {
            display: cs.display,
            columns: cs.gridTemplateColumns,
            cellSize: cellSize ? Math.round(cellSize) : 0,
            overflow: document.documentElement.scrollWidth > 375
        };
    });
    check('D-18 スマホ表示（375px）で横スクロールなし',
        mobileLayout && !mobileLayout.overflow,
        mobileLayout ? `cell: ${mobileLayout.cellSize}px, overflow: ${mobileLayout.overflow}` : 'N/A');

    // D-19: 400%ズーム（320px相当）
    await page.setViewport({ width: 320, height: 568 });
    await sleep(500);
    const zoomLayout = await page.evaluate(() => {
        return {
            overflow: document.documentElement.scrollWidth > 320,
            btnsVisible: document.querySelectorAll('.action-buttons .btn').length > 0
        };
    });
    check('D-19 400%ズーム（320px）で表示可能', 
        zoomLayout && !zoomLayout.overflow,
        `overflow: ${zoomLayout?.overflow}`);

    // 標準に戻す
    await page.setViewport({ width: 1280, height: 900 });
    await sleep(300);

    // ========== ビジュアル品質チェック ==========
    console.log('\n--- ビジュアル品質 ---');

    // D-20: スペーシングの一貫性（gap, margin, padding）
    const spacingCheck = await page.evaluate(() => {
        const gaps = new Set();
        const gapEls = document.querySelectorAll('.action-buttons, .hand-pieces, .nav-links, .game-info');
        gapEls.forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.gap) gaps.add(cs.gap);
        });
        return [...gaps];
    });
    check('D-20 スペーシングに整合性（≦4種）', spacingCheck.length <= 4,
        spacingCheck.join(', '));

    // D-21: border-radiusの一貫性
    const borderRadii = await page.evaluate(() => {
        const radii = new Set();
        document.querySelectorAll('.btn, .cell, .game-modal, .toast, .hand-piece, .komadai').forEach(el => {
            const cs = getComputedStyle(el);
            radii.add(cs.borderRadius);
        });
        return [...radii];
    });
    check('D-21 border-radiusの一貫性（≦5種）', borderRadii.length <= 5,
        borderRadii.join(', '));

    // D-22: ダークモード/ハイコントラスト切替がスムーズ
    const contrastToggleExists = await page.$('.contrast-toggle');
    check('D-22 コントラスト切替ボタン存在', contrastToggleExists !== null);

    if (contrastToggleExists) {
        await contrastToggleExists.click();
        await sleep(300);
        const hcActive = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        check('D-22b ハイコントラストモード切替動作', hcActive);
        
        // HC中の色チェック
        const hcColors = await page.evaluate(() => {
            const cs = getComputedStyle(document.documentElement);
            return {
                bg: cs.getPropertyValue('--color-bg').trim(),
                text: cs.getPropertyValue('--color-text').trim()
            };
        });
        check('D-22c HC時の背景が暗色', hcColors.bg === '#1A1A1A', hcColors.bg);
        check('D-22d HC時のテキストが明色', hcColors.text === '#F0F0F0', hcColors.text);

        // 元に戻す
        await contrastToggleExists.click();
        await sleep(300);
    }

    // D-23: モーダルのオーバーレイとアニメーション
    const histBtn = await page.$('#btn-open-history');
    if (histBtn) {
        await histBtn.click();
        await sleep(500);
        const modalLayout = await page.evaluate(() => {
            const overlay = document.querySelector('.game-modal-overlay.open');
            if (!overlay) return null;
            const cs = getComputedStyle(overlay);
            const dialog = overlay.querySelector('.game-modal');
            const dcs = dialog ? getComputedStyle(dialog) : null;
            return {
                position: cs.position,
                hasBackdrop: cs.backgroundColor.includes('0.') || cs.backgroundColor.includes('rgba'),
                dialogPadding: dcs?.padding,
                dialogBg: dcs?.backgroundColor,
                maxHeight: dcs?.maxHeight,
                overflowY: dcs?.overflowY
            };
        });
        check('D-23a モーダルがfixed positionで全画面', 
            modalLayout && modalLayout.position === 'fixed');
        check('D-23b モーダルに半透明の背景', modalLayout?.hasBackdrop);
        
        await page.keyboard.press('Escape');
        await sleep(300);
    }

    // D-24: トーストの位置と表示
    const toastCSS = await page.evaluate(() => {
        // .toast要素のCSSを確認（存在しない場合はCSSルールから）
        const sheets = [...document.styleSheets];
        let found = false;
        sheets.forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.selectorText === '.toast' || rule.selectorText?.includes('.toast')) {
                        if (rule.style?.position === 'fixed') found = true;
                    }
                });
            } catch (e) {}
        });
        return found;
    });
    check('D-24 トーストがfixed positionで定義', toastCSS);

    // D-25: 将棋盤のアスペクト比 — 正方形に近い（将棋盤は縦長ではない）
    const boardAspect = await page.evaluate(() => {
        const board = document.querySelector('.shogi-board');
        if (!board) return null;
        const rect = board.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height), ratio: (rect.width / rect.height).toFixed(2) };
    });
    check('D-25 将棋盤が概ね正方形', 
        boardAspect && Math.abs(boardAspect.w - boardAspect.h) / boardAspect.w < 0.15,
        boardAspect ? `${boardAspect.w}×${boardAspect.h} (ratio: ${boardAspect.ratio})` : 'N/A');

    // D-26: 駒台（komadai）のレイアウト
    const komadaiLayout = await page.evaluate(() => {
        const komadais = document.querySelectorAll('.komadai');
        const good = [];
        komadais.forEach(k => {
            const cs = getComputedStyle(k);
            good.push({
                display: cs.display,
                hasBorder: cs.borderStyle !== 'none',
                hasPadding: parseFloat(cs.padding) > 0
            });
        });
        return good;
    });
    check('D-26 駒台のスタイルが適切', 
        komadaiLayout.every(k => k.hasBorder && k.hasPadding),
        komadaiLayout.map(k => `border:${k.hasBorder},padding:${k.hasPadding}`).join('; '));

    // D-27: セマンティックHTML — landmarks使用
    const landmarks = await page.evaluate(() => {
        return {
            header: document.querySelector('header') !== null,
            main: document.querySelector('main') !== null || document.querySelector('[role="main"]') !== null,
            footer: document.querySelector('footer') !== null,
            nav: document.querySelector('nav') !== null
        };
    });
    check('D-27 セマンティックLandmark（header/main/footer）',
        landmarks.header && (landmarks.main) && landmarks.footer,
        JSON.stringify(landmarks));

    // D-28: hover/focus状態のビジュアル変化が十分（CSS定義チェック）
    const hoverFocusChange = await page.evaluate(() => {
        // CSSルールから.btn:focusのoutline定義を確認
        const sheets = [...document.styleSheets];
        let hasOutlineRule = false;
        sheets.forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.selectorText && rule.selectorText.includes('.btn') &&
                        rule.selectorText.includes('focus')) {
                        if (rule.style.outline || rule.style.outlineWidth) {
                            hasOutlineRule = true;
                        }
                    }
                });
            } catch (e) {}
        });
        // 動的テスト: ボタンにフォーカスして実際にoutlineが適用されるか
        const btn = document.querySelector('.btn');
        if (btn) {
            btn.focus();
            const cs = getComputedStyle(btn);
            const hasVisibleOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
            return { hasOutlineRule, hasVisibleOutline, outline: cs.outline };
        }
        return { hasOutlineRule, hasVisibleOutline: false, outline: 'N/A' };
    });
    check('D-28 ボタンfocus時にoutline定義',
        hoverFocusChange && (hoverFocusChange.hasOutlineRule || hoverFocusChange.hasVisibleOutline),
        hoverFocusChange ? `rule: ${hoverFocusChange.hasOutlineRule}, visible: ${hoverFocusChange.hasVisibleOutline}` : 'N/A');

    // D-29: ページ全体のmax-width制限
    const maxWidth = await page.evaluate(() => {
        const container = document.querySelector('.container');
        return container ? getComputedStyle(container).maxWidth : 'N/A';
    });
    check('D-29 コンテナにmax-width設定', maxWidth !== 'none' && maxWidth !== 'N/A',
        maxWidth);

    // D-30: 画面サイズ間のブレークポイント確認
    const breakpoints = await page.evaluate(() => {
        const sheets = [...document.styleSheets];
        const bps = new Set();
        sheets.forEach(ss => {
            try {
                [...ss.cssRules].forEach(rule => {
                    if (rule.conditionText && rule.conditionText.includes('max-width')) {
                        const m = rule.conditionText.match(/max-width:\s*(\d+)/);
                        if (m) bps.add(parseInt(m[1]));
                    }
                });
            } catch (e) {}
        });
        return [...bps].sort((a, b) => a - b);
    });
    check('D-30 レスポンシブブレークポイント（3以上）', breakpoints.length >= 3,
        breakpoints.join(', ') + 'px');

    await page.close();

    // ========== ヘルプページ ==========
    console.log('\n--- ヘルプページ ---');
    const helpPage = await browser.newPage();
    await helpPage.setViewport({ width: 1280, height: 900 });
    await helpPage.goto(BASE + '/help', { waitUntil: 'networkidle0' });

    // D-31: 目次やセクション構造
    const helpSections = await helpPage.evaluate(() => {
        const headings = [...document.querySelectorAll('h2, h3, h4')];
        return headings.map(h => ({ level: h.tagName, text: h.textContent.trim().substring(0, 40) }));
    });
    check('D-31 ヘルプページのセクション構造（5以上）', helpSections.length >= 5,
        `${helpSections.length}セクション`);

    // D-32: 長いページのスクロール可能性・レイアウト
    const helpScrollable = await helpPage.evaluate(() => {
        return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    check('D-32 ヘルプページがスクロール可能（十分なコンテンツ）', helpScrollable);

    // D-33: skipLink の存在
    const skipLink = await helpPage.$('.skip-link');
    check('D-33 スキップリンクが存在', skipLink !== null);

    await helpPage.close();

    // ━━━ サマリー ━━━
    console.log('\n═══ WebデザイナーAIテスト結果サマリー ═══');
    console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
    if (fail > 0) {
        console.log('\n失敗項目:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    }

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
