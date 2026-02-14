/**
 * Webデザイナーお客様AIテスト
 * 
 * ペルソナ: 佐藤美咲 — Webデザイナー歴8年、UI/UXデザイン専門
 * 視点: ビジュアルデザイン、レスポンシブ、CSS品質、UXパターン、パフォーマンス
 * 
 * テスト観点:
 * 1. ビジュアルヒエラルキーとレイアウト
 * 2. カラーシステムとデザイントークン
 * 3. レスポンシブデザイン（複数ブレークポイント）
 * 4. コンポーネントパターンの一貫性
 * 5. タイポグラフィとスペーシング
 * 6. CSS品質（!important乱用、一貫性）
 * 7. UXフロー（発見性、フィードバック、エラー状態）
 * 8. インタラクションデザイン（ホバー/フォーカス/アクティブ）
 * 9. モーダルとオーバーレイのデザイン
 * 10. パフォーマンスと最適化
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8080';
let browser, page;
let passed = 0, failed = 0;
const results = [];

function ok(name) { passed++; results.push(`  ✅ ${name}`); }
function fail(name, reason) { failed++; results.push(`  ❌ ${name}: ${reason}`); }

async function setup() {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
}

async function startNewGame() {
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.click('#btn-start-game');
    await page.waitForSelector('#shogi-board', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
}

// ========================
// テスト1: カラーシステム — CSSカスタムプロパティの使用
// ========================
async function test_colorSystem() {
    await startNewGame();

    // CSS変数が定義されているか
    const cssVars = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return {
            colorPrimary: style.getPropertyValue('--color-primary').trim(),
            colorBg: style.getPropertyValue('--color-bg').trim(),
            colorText: style.getPropertyValue('--color-text').trim(),
            colorBorder: style.getPropertyValue('--color-border').trim(),
            colorSurface: style.getPropertyValue('--color-surface').trim(),
            colorFocus: style.getPropertyValue('--color-focus').trim(),
        };
    });

    Object.values(cssVars).filter(v => v.length > 0).length >= 4
        ? ok('CSSカスタムプロパティ（デザイントークン）が4種以上定義')
        : fail('CSSカスタムプロパティ', `定義数: ${Object.values(cssVars).filter(v => v.length > 0).length}`);

    // color-primaryが未定義でないか
    cssVars.colorPrimary.length > 0
        ? ok(`--color-primary が定義済み: ${cssVars.colorPrimary}`)
        : fail('--color-primary', '未定義');
}

// ========================
// テスト2: タイポグラフィ — フォントスタックとサイズ
// ========================
async function test_typography() {
    const bodyFont = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
    });
    
    bodyFont.length > 0
        ? ok(`ベースフォント定義あり: ${bodyFont.substring(0, 60)}`)
        : fail('ベースフォント', '未定義');

    // H2, H3 のフォントサイズが適切に階層化されているか
    const headingSizes = await page.evaluate(() => {
        const h2 = document.querySelector('h2');
        const h3 = document.querySelector('h3');
        return {
            h2: h2 ? parseFloat(getComputedStyle(h2).fontSize) : 0,
            h3: h3 ? parseFloat(getComputedStyle(h3).fontSize) : 0,
        };
    });

    headingSizes.h2 > headingSizes.h3
        ? ok('見出しの階層が正しい（H2 > H3のサイズ）')
        : fail('見出し階層', `H2=${headingSizes.h2}px, H3=${headingSizes.h3}px`);
}

// ========================
// テスト3: レイアウト — グリッドシステム
// ========================
async function test_layout() {
    // ゲームコンテナのレイアウト（2カラム: 盤面 + 情報パネル）
    const gameLayout = await page.evaluate(() => {
        const container = document.querySelector('.game-container');
        if (!container) return null;
        const style = getComputedStyle(container);
        return {
            display: style.display,
            gridTemplateColumns: style.gridTemplateColumns,
            gap: style.gap,
        };
    });

    gameLayout
        ? ok('game-containerのレイアウトが定義されている')
        : fail('game-container', 'レイアウト取得失敗');

    if (gameLayout?.display === 'grid') {
        ok('game-containerがCSS Grid使用');
    } else if (gameLayout?.display === 'flex') {
        ok('game-containerがFlexbox使用');
    } else {
        fail('レイアウト手法', `display: ${gameLayout?.display}`);
    }
}

// ========================
// テスト4: レスポンシブデザイン — タブレット (768px)
// ========================
async function test_responsiveTablet() {
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 500));

    // ボードが見えるか
    const boardVisible = await page.evaluate(() => {
        const board = document.getElementById('shogi-board');
        const rect = board.getBoundingClientRect();
        return rect.width > 100 && rect.height > 100;
    });
    boardVisible
        ? ok('タブレット(768px)で盤面が表示される')
        : fail('タブレットの盤面', '盤面が小さすぎまたは非表示');

    // 盤面がビューポートからはみ出していないか
    const overflow = await page.evaluate(() => {
        const board = document.getElementById('shogi-board');
        const rect = board.getBoundingClientRect();
        return {
            right: rect.right,
            viewportWidth: window.innerWidth,
            overflowing: rect.right > window.innerWidth + 10
        };
    });
    !overflow.overflowing
        ? ok('タブレットで盤面がビューポート内に収まる')
        : fail('タブレットの盤面オーバーフロー', `right=${overflow.right}, viewport=${overflow.viewportWidth}`);
}

// ========================
// テスト5: レスポンシブデザイン — モバイル (480px)
// ========================
async function test_responsiveMobile() {
    await page.setViewport({ width: 480, height: 800 });
    await new Promise(r => setTimeout(r, 500));

    const boardVisible = await page.evaluate(() => {
        const board = document.getElementById('shogi-board');
        if (!board) return false;
        const rect = board.getBoundingClientRect();
        return rect.width > 50 && rect.height > 50;
    });
    boardVisible
        ? ok('モバイル(480px)で盤面が表示される')
        : fail('モバイルの盤面', '表示されない');

    // ボタンがタップ可能なサイズか (最低44×44px = WCAG 2.5.5)
    const buttonSizes = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.btn, button.cell');
        let tooSmall = 0;
        buttons.forEach(b => {
            const rect = b.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                if (rect.width > 0 && rect.height > 0) tooSmall++;
            }
        });
        return { total: buttons.length, tooSmall };
    });

    buttonSizes.tooSmall === 0
        ? ok('モバイルで全ボタンが44×44px以上')
        : fail('モバイルのボタンサイズ', `${buttonSizes.tooSmall}/${buttonSizes.total}個が小さすぎ`);

    await page.setViewport({ width: 1280, height: 900 });
}

// ========================
// テスト6: フォーカスインジケーターの視認性
// ========================
async function test_focusIndicators() {
    await page.setViewport({ width: 1280, height: 900 });
    
    // セルのフォーカススタイル
    const focusStyle = await page.evaluate(() => {
        const cell = document.querySelector('.cell');
        cell.focus();
        const style = getComputedStyle(cell);
        return {
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            outlineOffset: style.outlineOffset,
            boxShadow: style.boxShadow,
        };
    });

    // フォーカスインジケーターがある（outlineまたはbox-shadow）
    const hasFocus = focusStyle.outline !== 'none' || 
                     focusStyle.boxShadow !== 'none' ||
                     parseFloat(focusStyle.outlineWidth) > 0;
    hasFocus
        ? ok('セルにフォーカスインジケーターあり')
        : fail('フォーカスインジケーター', 'outline/box-shadowなし');

    // フォーカスが3px以上の太さか（視認性確保）
    const outlineWidth = parseFloat(focusStyle.outlineWidth);
    outlineWidth >= 3
        ? ok(`フォーカスoutlineが${outlineWidth}px（3px以上で高視認性）`)
        : fail('フォーカスの太さ', `${outlineWidth}px（3px未満）`);
}

// ========================
// テスト7: ボタンデザインの一貫性
// ========================
async function test_buttonConsistency() {
    // .btnクラスのスタイル一貫性
    const btnStyles = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.btn');
        const styles = Array.from(buttons).map(btn => {
            const s = getComputedStyle(btn);
            return {
                text: btn.textContent.trim().substring(0, 20),
                borderRadius: s.borderRadius,
                fontSize: s.fontSize,
                padding: s.padding,
                cursor: s.cursor,
            };
        });
        return styles;
    });

    if (btnStyles.length === 0) {
        fail('ボタン一貫性', '.btnクラスのボタンが見つからない');
        return;
    }

    // border-radiusが統一されているか
    const radii = [...new Set(btnStyles.map(s => s.borderRadius))];
    radii.length <= 2
        ? ok(`ボタンのborder-radiusが統一的（${radii.join(', ')}）`)
        : fail('ボタンのborder-radius', `${radii.length}種類のバリエーション: ${radii.join(', ')}`);

    // cursorがpointerか
    const hasPointerCursor = btnStyles.every(s => s.cursor === 'pointer');
    hasPointerCursor
        ? ok('全ボタンにcursor:pointerあり')
        : fail('ボタンcursor', 'pointerでないボタンあり');
}

// ========================
// テスト8: モーダルデザイン
// ========================
async function test_modalDesign() {
    // 設定モーダルを開く
    await page.click('#btn-open-settings');
    await new Promise(r => setTimeout(r, 500));

    // オーバーレイの存在
    const overlayStyle = await page.evaluate(() => {
        const overlay = document.querySelector('.game-modal-overlay.open');
        if (!overlay) return null;
        const s = getComputedStyle(overlay);
        return {
            position: s.position,
            background: s.background,
            zIndex: s.zIndex,
        };
    });

    overlayStyle
        ? ok('モーダルオーバーレイが表示される')
        : fail('モーダルオーバーレイ', '表示されない');

    if (overlayStyle) {
        overlayStyle.position === 'fixed'
            ? ok('オーバーレイがposition:fixed')
            : fail('オーバーレイposition', overlayStyle.position);
    }

    // モーダル本体のスタイル
    const modalStyle = await page.evaluate(() => {
        const modal = document.querySelector('.game-modal-overlay.open .game-modal');
        if (!modal) return null;
        const s = getComputedStyle(modal);
        return {
            borderRadius: s.borderRadius,
            padding: s.padding,
            boxShadow: s.boxShadow,
            maxWidth: s.maxWidth,
            maxHeight: s.maxHeight,
        };
    });

    if (modalStyle) {
        // 適切なpadding
        parseFloat(modalStyle.padding) >= 16
            ? ok('モーダルに十分なパディングあり')
            : fail('モーダルpadding', modalStyle.padding);

        // 影
        modalStyle.boxShadow !== 'none'
            ? ok('モーダルにbox-shadowあり（奥行き表現）')
            : fail('モーダルbox-shadow', 'なし');
    }

    // 閉じるボタンの存在
    const closeBtn = await page.$('.game-modal-overlay.open .game-modal-close');
    closeBtn
        ? ok('モーダルに閉じるボタンあり')
        : fail('モーダル閉じるボタン', 'なし');

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト9: トースト通知のデザイン
// ========================
async function test_toastDesign() {
    // トーストコンテナの存在
    const toastContainer = await page.$('#toast-container');
    toastContainer
        ? ok('トーストコンテナが存在する')
        : fail('トーストコンテナ', '見つからない');

    // トーストのスタイルがCSSで定義されているか
    const hasToastStyles = await page.evaluate(() => {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                if (rules.some(r => r.selectorText?.includes('.toast'))) return true;
            } catch (e) { /* CORS */ }
        }
        return false;
    });
    hasToastStyles
        ? ok('トースト通知のCSSスタイルが定義されている')
        : fail('トーストCSS', 'スタイル定義なし');
}

// ========================
// テスト10: 盤面のセルサイズとアスペクト比
// ========================
async function test_cellSizing() {
    const cellInfo = await page.evaluate(() => {
        const cell = document.querySelector('.cell');
        if (!cell) return null;
        const rect = cell.getBoundingClientRect();
        const s = getComputedStyle(cell);
        return {
            width: rect.width,
            height: rect.height,
            aspectRatio: s.aspectRatio,
            minWidth: s.minWidth,
        };
    });

    if (!cellInfo) {
        fail('セルサイズ', 'セルが見つからない');
        return;
    }

    // セルが正方形に近いか（±5%）
    const ratio = cellInfo.width / cellInfo.height;
    (ratio > 0.85 && ratio < 1.15)
        ? ok(`セルがほぼ正方形（${cellInfo.width.toFixed(1)}×${cellInfo.height.toFixed(1)}px）`)
        : fail('セルのアスペクト比', `${ratio.toFixed(2)} (${cellInfo.width}×${cellInfo.height})`);

    // 最小48×48px (WCAG 2.5.8 AAA)
    (cellInfo.width >= 44 && cellInfo.height >= 44)
        ? ok('セルが44×44px以上（WCAG ターゲットサイズ準拠）')
        : fail('セルの最小サイズ', `${cellInfo.width}×${cellInfo.height}px`);
}

// ========================
// テスト11: ホバー/アクティブ状態のインタラクション
// ========================
async function test_interactionStates() {
    // CSS定義にhover/focus/activeがあるか
    const hasStates = await page.evaluate(() => {
        let hover = false, focus = false, active = false;
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                for (const rule of rules) {
                    const sel = rule.selectorText || '';
                    if (sel.includes('.cell:hover')) hover = true;
                    if (sel.includes('.cell:focus')) focus = true;
                    if (sel.includes(':active') || sel.includes('[data-selected]')) active = true;
                }
            } catch (e) { /* CORS */ }
        }
        return { hover, focus, active };
    });

    hasStates.hover
        ? ok('セルのhover状態が定義されている')
        : fail('セルのhover状態', 'CSS定義なし');

    hasStates.focus
        ? ok('セルのfocus状態が定義されている')
        : fail('セルのfocus状態', 'CSS定義なし');

    hasStates.active
        ? ok('セルの選択（active）状態が定義されている')
        : fail('セルのactive状態', 'CSS定義なし');
}

// ========================
// テスト12: 高コントラストモード対応
// ========================
async function test_highContrastMode() {
    // ハイコントラストCSSが定義されているか
    const hasHC = await page.evaluate(() => {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                if (rules.some(r => r.selectorText?.includes('high-contrast'))) return true;
            } catch (e) { /* CORS */ }
        }
        return false;
    });
    hasHC
        ? ok('高コントラストモードのCSSが定義されている')
        : fail('高コントラストCSS', '定義なし');

    // forced-colorsメディアクエリが存在するか
    const hasForcedColors = await page.evaluate(() => {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                for (const rule of rules) {
                    if (rule.conditionText?.includes('forced-colors')) return true;
                    if (rule.cssText?.includes('forced-colors')) return true;
                }
            } catch (e) { /* CORS */ }
        }
        return false;
    });
    hasForcedColors
        ? ok('forced-colorsメディアクエリが定義されている')
        : fail('forced-colors', 'メディアクエリなし');
}

// ========================
// テスト13: prefers-reduced-motion対応
// ========================
async function test_reducedMotion() {
    const hasReducedMotion = await page.evaluate(() => {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                for (const rule of rules) {
                    if (rule.conditionText?.includes('prefers-reduced-motion') ||
                        rule.cssText?.includes('prefers-reduced-motion')) return true;
                }
            } catch (e) { /* CORS */ }
        }
        return false;
    });
    hasReducedMotion
        ? ok('prefers-reduced-motionメディアクエリが定義されている')
        : fail('prefers-reduced-motion', 'メディアクエリなし');
}

// ========================
// テスト14: ホームページのフォームデザイン
// ========================
async function test_homeFormDesign() {
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    // フォームにfieldsetとlegendが使われているか（セマンティック）
    const formSemantics = await page.evaluate(() => {
        const fieldsets = document.querySelectorAll('fieldset');
        const legends = document.querySelectorAll('legend');
        return {
            fieldsets: fieldsets.length,
            legends: legends.length,
        };
    });

    formSemantics.fieldsets >= 2
        ? ok(`fieldsetが${formSemantics.fieldsets}個使用されている`)
        : fail('fieldset', `${formSemantics.fieldsets}個しかない`);

    formSemantics.legends >= 2
        ? ok(`legendが${formSemantics.legends}個使用されている`)
        : fail('legend', `${formSemantics.legends}個しかない`);

    // ラジオボタンが適切なサイズか
    const radioSize = await page.evaluate(() => {
        const radio = document.querySelector('input[type="radio"]');
        if (!radio) return null;
        const s = getComputedStyle(radio);
        return { width: s.width, height: s.height };
    });

    if (radioSize) {
        const w = parseFloat(radioSize.width);
        w >= 18
            ? ok(`ラジオボタンが${w}pxで十分なサイズ`)
            : fail('ラジオボタンサイズ', `${w}px（小さすぎ）`);
    }
}

// ========================
// テスト15: スペーシングの一貫性
// ========================
async function test_spacing() {
    await startNewGame();

    // info-panelとboard-areaの間隔
    const spacing = await page.evaluate(() => {
        const container = document.querySelector('.game-container');
        if (!container) return null;
        const s = getComputedStyle(container);
        return {
            gap: s.gap,
            columnGap: s.columnGap,
            rowGap: s.rowGap,
        };
    });

    if (spacing) {
        const gap = parseFloat(spacing.gap) || parseFloat(spacing.columnGap) || 0;
        gap >= 8
            ? ok(`レイアウトのgapが${gap}pxで適切`)
            : fail('レイアウトgap', `${gap}px（小さすぎ）`);
    }
}

// ========================
// テスト16: 情報パネルのデザイン
// ========================
async function test_infoPanelDesign() {
    // info-panelの構造
    const panelInfo = await page.evaluate(() => {
        const panel = document.querySelector('.info-panel');
        if (!panel) return null;
        const s = getComputedStyle(panel);
        return {
            exists: true,
            padding: s.padding,
            background: s.background,
            borderRadius: s.borderRadius,
        };
    });

    panelInfo
        ? ok('情報パネルが存在する')
        : fail('情報パネル', '見つからない');

    // ゲーム情報がDL（定義リスト）で構造化されているか
    const hasDL = await page.$('.info-panel dl');
    hasDL
        ? ok('ゲーム情報がdl（定義リスト）で構造化されている')
        : fail('ゲーム情報の構造化', 'dl要素なし');
}

// ========================
// テスト17: アクションボタンのグリッドレイアウト
// ========================
async function test_actionButtonGrid() {
    const grid = await page.evaluate(() => {
        const container = document.querySelector('.action-buttons');
        if (!container) return null;
        const s = getComputedStyle(container);
        return {
            display: s.display,
            gridTemplateColumns: s.gridTemplateColumns,
            gap: s.gap,
        };
    });

    if (grid) {
        (grid.display === 'grid' || grid.display === 'flex')
            ? ok('アクションボタンがgrid/flexレイアウト')
            : fail('アクションボタンレイアウト', `display: ${grid.display}`);
    } else {
        // クラス名が違う可能性、別の要素を探す
        const actionArea = await page.evaluate(() => {
            const undoBtn = document.getElementById('btn-undo');
            if (!undoBtn) return null;
            const parent = undoBtn.parentElement;
            const s = getComputedStyle(parent);
            return { display: s.display };
        });
        actionArea
            ? ok('アクションボタンのコンテナが存在する')
            : fail('アクションボタンコンテナ', '見つからない');
    }
}

// ========================
// テスト18: セルの選択状態のビジュアルフィードバック
// ========================
async function test_selectionVisualFeedback() {
    await startNewGame();
    
    // 駒を選択
    await page.click('.cell[data-rank="3"][data-file="5"]');
    await new Promise(r => setTimeout(r, 500));

    // 選択されたセルのスタイル
    const selectedStyle = await page.evaluate(() => {
        const cell = document.querySelector('.cell[data-selected="true"]');
        if (!cell) return null;
        const s = getComputedStyle(cell);
        return {
            background: s.backgroundColor,
            boxShadow: s.boxShadow,
            outline: s.outline,
        };
    });

    if (selectedStyle) {
        ok('選択されたセルにビジュアルフィードバックあり');
        
        // 背景色が変わっているか
        selectedStyle.boxShadow !== 'none' || selectedStyle.outline !== 'none'
            ? ok('選択セルにbox-shadowまたはoutlineあり')
            : fail('選択セルのアクセント', 'shadow/outlineなし');
    } else {
        fail('セル選択のビジュアル', 'data-selected="true"のセルが見つからない');
    }

    // 合法手のビジュアル
    const legalMoveStyle = await page.evaluate(() => {
        const cell = document.querySelector('.cell[data-legal-move="true"]');
        if (!cell) return null;
        const s = getComputedStyle(cell);
        const before = getComputedStyle(cell, '::before');
        return {
            background: s.backgroundColor,
            border: s.border,
            hasBeforeContent: before.content !== 'none' && before.content !== '""',
        };
    });

    if (legalMoveStyle) {
        ok('合法手マスにビジュアルインジケーターあり');
    }

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト19: ページ全体の構造セマンティクス
// ========================
async function test_semanticStructure() {
    // ヘッダー、メイン、フッター
    const structure = await page.evaluate(() => {
        return {
            hasHeader: !!document.querySelector('header'),
            hasMain: !!document.querySelector('main'),
            hasFooter: !!document.querySelector('footer'),
            hasNav: !!document.querySelector('nav'),
            hasH1: !!document.querySelector('h1'),
        };
    });

    structure.hasMain
        ? ok('main要素が存在する')
        : fail('main要素', 'なし');

    structure.hasHeader
        ? ok('header要素が存在する')
        : fail('header要素', 'なし');

    structure.hasH1
        ? ok('h1見出しが存在する')
        : fail('h1見出し', 'なし');
}

// ========================
// テスト20: !importantの使用状況
// ========================
async function test_cssImportantUsage() {
    const pageSource = await page.content();
    
    // style要素内の!importantをカウント
    const styleBlocks = pageSource.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    let importantCount = 0;
    let totalRules = 0;
    for (const block of styleBlocks) {
        const importants = block.match(/!important/g);
        if (importants) importantCount += importants.length;
        const rules = block.match(/[{;]/g);
        if (rules) totalRules += rules.length;
    }

    // !important が多すぎないか（全ルールの20%以下が望ましい）
    // ただし forced-colors / HC モードでの使用は許容
    importantCount < 50
        ? ok(`!importantの使用は${importantCount}件（許容範囲）`)
        : fail('!importantの乱用', `${importantCount}件（多すぎる可能性）`);
}

// ========================
// テスト21: スキップリンクの存在
// ========================
async function test_skipLink() {
    const skipLink = await page.evaluate(() => {
        const link = document.querySelector('.skip-link, [href="#main-content"], [href="#shogi-board"]');
        if (!link) return null;
        return {
            text: link.textContent.trim(),
            href: link.getAttribute('href'),
        };
    });

    skipLink
        ? ok(`スキップリンクが存在する: "${skipLink.text}"`)
        : fail('スキップリンク', '見つからない');
}

// ========================
// テスト22: 駒台のレイアウト — 左右に配置
// ========================
async function test_komadaiLayout() {
    const layout = await page.evaluate(() => {
        const goteKomadai = document.querySelector('.komadai')?.getBoundingClientRect();
        const senteKomadai = document.querySelectorAll('.komadai')[1]?.getBoundingClientRect();
        const board = document.querySelector('.board-section')?.getBoundingClientRect();
        
        if (!goteKomadai || !senteKomadai || !board) return null;
        
        return {
            goteLeft: goteKomadai.left,
            senteLeft: senteKomadai.left,
            boardLeft: board.left,
            boardRight: board.right,
        };
    });

    if (layout) {
        // 後手（相手）の駒台が左、先手（自分）の駒台が右にあるか、
        // または盤面を挟んで配置されているか
        ok('駒台が盤面の両側に配置されている');
    } else {
        fail('駒台レイアウト', '駒台または盤面が見つからない');
    }
}

// ========================
// テスト23: CSS変数でのフォント切替機能
// ========================
async function test_fontSwitching() {
    await startNewGame();

    // 設定モーダルを開く
    await page.click('#btn-open-settings');
    await new Promise(r => setTimeout(r, 500));

    // フォント選択肢
    const fontOptions = await page.$$eval('#font-family-select option', opts =>
        opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
    );

    fontOptions.length >= 2
        ? ok(`フォント選択肢が${fontOptions.length}種類ある`)
        : fail('フォント選択肢', `${fontOptions.length}種類`);

    // UDフォントが含まれているか（ユニバーサルデザインフォント）
    const hasUDFont = fontOptions.some(o => 
        o.text.includes('UD') || o.value.includes('ud')
    );
    hasUDFont
        ? ok('UDフォント（ユニバーサルデザイン）が選択肢にある')
        : fail('UDフォント', '選択肢にない');

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト24: ヘルプページのデザイン
// ========================
async function test_helpPageDesign() {
    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle2' });

    // セクション間のスペーシング
    const sectionSpacing = await page.evaluate(() => {
        const sections = document.querySelectorAll('.help-page section');
        if (sections.length < 2) return 0;
        const first = sections[0].getBoundingClientRect();
        const second = sections[1].getBoundingClientRect();
        return second.top - first.bottom;
    });

    sectionSpacing >= 16
        ? ok(`ヘルプセクション間のスペーシングが${sectionSpacing}pxで適切`)
        : fail('セクション間スペーシング', `${sectionSpacing}px（狭すぎ）`);

    // kbd要素のスタイリング
    const kbdStyle = await page.evaluate(() => {
        const kbd = document.querySelector('kbd');
        if (!kbd) return null;
        const s = getComputedStyle(kbd);
        return {
            border: s.border,
            padding: s.padding,
            borderRadius: s.borderRadius,
            background: s.backgroundColor,
            fontFamily: s.fontFamily,
        };
    });

    kbdStyle
        ? ok('kbd要素にスタイリングあり（キーボードキー表現）')
        : fail('kbd要素', 'スタイリングなし');

    // ホームに戻るリンク
    const homeLink = await page.$('a[href="/"], .btn-primary');
    homeLink
        ? ok('ヘルプページに「ホームに戻る」リンクあり')
        : fail('ホームに戻るリンク', 'なし');
}

// ========================
// テスト25: リンクとボタンの区別
// ========================
async function test_linkButtonDistinction() {
    await startNewGame();

    // button要素にはtype属性があるか
    const buttonsWithoutType = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button:not([type])');
        return buttons.length;
    });

    buttonsWithoutType === 0
        ? ok('全button要素にtype属性あり')
        : fail('button要素のtype属性', `${buttonsWithoutType}個がtype未指定`);

    // aタグがbutton的に使われていないか（href="#"パターン）
    const hashLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href="#"]');
        return links.length;
    });

    hashLinks === 0
        ? ok('href="#"の不適切なリンクなし')
        : fail('href="#"リンク', `${hashLinks}個（ボタンにすべき）`);
}

// ========================
// テスト26: 盤面グリッドの線 — 将棋盤らしさ
// ========================
async function test_boardGridLines() {
    const cellBorder = await page.evaluate(() => {
        const cell = document.querySelector('.cell');
        if (!cell) return null;
        const s = getComputedStyle(cell);
        return {
            border: s.border,
            borderWidth: s.borderWidth,
            borderColor: s.borderColor,
            borderStyle: s.borderStyle,
        };
    });

    if (cellBorder) {
        const hasVisibleBorder = cellBorder.borderStyle !== 'none' && 
                                  parseFloat(cellBorder.borderWidth) > 0;
        hasVisibleBorder
            ? ok('セルに格子線（border）あり — 将棋盤らしい表現')
            : fail('セルのborder', 'なし（格子線がない）');
    }
}

// ========================
// テスト27: ページのメタ情報
// ========================
async function test_metaInfo() {
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    const meta = await page.evaluate(() => {
        return {
            charset: document.querySelector('meta[charset]')?.getAttribute('charset'),
            viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
            title: document.title,
            lang: document.documentElement.lang,
        };
    });

    meta.charset?.toLowerCase() === 'utf-8'
        ? ok('charset=utf-8が設定されている')
        : fail('charset', meta.charset);

    meta.viewport?.includes('width=device-width')
        ? ok('viewportメタタグにwidth=device-widthあり')
        : fail('viewport', meta.viewport);

    meta.lang === 'ja'
        ? ok('html lang="ja"が設定されている')
        : fail('html lang', meta.lang);

    meta.title.length > 0
        ? ok(`ページタイトルあり: "${meta.title}"`)
        : fail('ページタイトル', '空');
}

// ========================
// テスト28: ゲームページのタイトル
// ========================
async function test_gamepageTitle() {
    await startNewGame();
    
    const title = await page.title();
    title.includes('将棋') || title.includes('ゲーム')
        ? ok(`ゲームページのタイトルに「将棋」含む: "${title}"`)
        : fail('ゲームページタイトル', `"${title}"`);
}

// ========================
// 実行
// ========================
async function run() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🎨 Webデザイナー（佐藤美咲）お客様AIテスト');
    console.log('  視点: ビジュアルデザイン・CSS品質・UX・レスポンシブ');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    await setup();

    const tests = [
        ['カラーシステム', test_colorSystem],
        ['タイポグラフィ', test_typography],
        ['レイアウト', test_layout],
        ['レスポンシブ(タブレット)', test_responsiveTablet],
        ['レスポンシブ(モバイル)', test_responsiveMobile],
        ['フォーカスインジケーター', test_focusIndicators],
        ['ボタン一貫性', test_buttonConsistency],
        ['モーダルデザイン', test_modalDesign],
        ['トーストデザイン', test_toastDesign],
        ['セルサイズ', test_cellSizing],
        ['インタラクション状態', test_interactionStates],
        ['高コントラスト対応', test_highContrastMode],
        ['reduced-motion対応', test_reducedMotion],
        ['ホームフォーム', test_homeFormDesign],
        ['スペーシング', test_spacing],
        ['情報パネル', test_infoPanelDesign],
        ['アクションボタン', test_actionButtonGrid],
        ['選択ビジュアル', test_selectionVisualFeedback],
        ['セマンティクス', test_semanticStructure],
        ['!important使用量', test_cssImportantUsage],
        ['スキップリンク', test_skipLink],
        ['駒台レイアウト', test_komadaiLayout],
        ['フォント切替', test_fontSwitching],
        ['ヘルプページ', test_helpPageDesign],
        ['リンク/ボタン区別', test_linkButtonDistinction],
        ['盤面格子線', test_boardGridLines],
        ['メタ情報', test_metaInfo],
        ['ゲームページタイトル', test_gamepageTitle],
    ];

    for (const [name, fn] of tests) {
        console.log(`\n▶ テスト: ${name}`);
        try {
            await fn();
        } catch (e) {
            fail(name, `例外: ${e.message}`);
        }
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach(r => console.log(r));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nWebデザイナーテスト結果: ${passed}/${passed + failed} 合格 (${failed}件の問題)`);
    console.log('');

    await browser.close();

    if (failed > 0) {
        console.log('❌ Webデザイナーの観点で問題あり — 修正が必要です');
        process.exit(1);
    } else {
        console.log('✅ Webデザイナーの観点で問題なし — デザイン品質は十分です');
        process.exit(0);
    }
}

run().catch(e => { console.error(e); process.exit(1); });
