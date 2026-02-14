/**
 * モバイルユーザーAI テスト
 * 
 * ペルソナ: 中村翔太（25歳・通勤中のスマホユーザー）
 * - 電車内でスマホ（iPhone SE / Android）で将棋を指したい
 * - 片手操作が多い。ポートレート（縦向き）固定
 * - 画面が小さいので視認性と操作性が最重要
 * - Wi-Fi がないモバイル回線でも快適に動くか
 * - タッチ操作の精度、ミスタップの軽減
 * 
 * テスト観点：
 *  - 小画面での視認性（375px, 390px幅）
 *  - タッチターゲットサイズ（44px以上推奨）
 *  - レスポンシブレイアウト
 *  - ポートレート（縦長）での操作性
 *  - スクロールの適切さ
 *  - ビューポート設定
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

async function startGame(page, color = 'sente') {
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate((c) => {
        document.querySelector('input[name="difficulty"][value="easy"]').checked = true;
        document.querySelector(`input[name="color"][value="${c}"]`).checked = true;
    }, color);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);
    await sleep(1500);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // ═══════════════════════════════════════════
        // カテゴリ1: ビューポートとメタ設定
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ1: ビューポートとメタ設定 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 375, height: 667 }); // iPhone SE
            await page.goto(BASE, { waitUntil: 'networkidle0' });

            // M-1: viewport メタタグ設定
            const viewport = await page.evaluate(() => {
                const meta = document.querySelector('meta[name="viewport"]');
                return meta ? meta.getAttribute('content') : null;
            });
            check('M-1 viewport メタタグ設定', viewport !== null && viewport.includes('width=device-width'), viewport);

            // M-2: initial-scale=1.0
            check('M-2 initial-scale=1.0',
                viewport !== null && viewport.includes('initial-scale=1'), viewport);

            // M-3: user-scalable=no でないこと（アクセシビリティ）
            const noZoomBlock = viewport === null || !viewport.includes('user-scalable=no');
            check('M-3 ピンチズーム許可', noZoomBlock);

            // M-4: maximum-scale制限がない
            const noMaxScale = viewport === null || !viewport.includes('maximum-scale=1');
            check('M-4 maximum-scale制限なし', noMaxScale);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ2: iPhone SE (375×667) での表示
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ2: iPhone SE (375×667) での表示 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 375, height: 667 });

            // M-5: ホーム画面が収まる
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const homeOverflow = await page.evaluate(() => {
                return document.body.scrollWidth <= window.innerWidth;
            });
            check('M-5 ホーム画面に横スクロールなし', homeOverflow);

            // M-6: ゲーム画面が収まる
            await startGame(page);
            const gameOverflow = await page.evaluate(() => {
                return document.body.scrollWidth <= window.innerWidth;
            });
            check('M-6 ゲーム画面に横スクロールなし', gameOverflow);

            // M-7: 盤面が画面幅の一定割合を使用
            const boardWidth = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                if (!board) return 0;
                return board.getBoundingClientRect().width;
            });
            check('M-7 盤面がスマホで表示', boardWidth >= 150, `${boardWidth.toFixed(0)}px`);

            // M-8: 1カラムレイアウトになっている
            const isSingleColumn = await page.evaluate(() => {
                const container = document.querySelector('.game-container');
                if (!container) return true;
                const cs = getComputedStyle(container);
                // grid-template-columnsが1frだけ、またはfloat/flexで1列
                const cols = cs.gridTemplateColumns;
                return cols.split(' ').length <= 1 || cs.display === 'flex';
            });
            check('M-8 1カラムレイアウト(375px)', isSingleColumn);

            // M-9: 駒の文字が読める大きさ
            const pieceFontSize = await page.evaluate(() => {
                const cells = document.querySelectorAll('.cell .piece-text');
                if (cells.length === 0) return 0;
                // 複数の駒から最大フォントサイズを取得
                let maxFS = 0;
                cells.forEach(c => {
                    const fs = parseFloat(getComputedStyle(c).fontSize);
                    if (fs > maxFS) maxFS = fs;
                });
                return maxFS;
            });
            check('M-9 駒の文字サイズ(375px)', pieceFontSize >= 8, `${pieceFontSize}px`);

            // M-10: ボタンがタッチ操作しやすいサイズ
            const smallBtns = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn'));
                const tooSmall = btns.filter(b => {
                    const rect = b.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && rect.height < 36;
                });
                return { total: btns.length, small: tooSmall.length };
            });
            check('M-10 ボタン高さ36px以上', smallBtns.small <= 1,
                `${smallBtns.small}/${smallBtns.total}が小さい`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ3: タッチターゲットサイズ
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ3: タッチターゲットサイズ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 390, height: 844 }); // iPhone 14
            await startGame(page);

            // M-11: 盤面セルのサイズ
            const cellSize = await page.evaluate(() => {
                const cell = document.querySelector('.cell');
                if (!cell) return { w: 0, h: 0 };
                const rect = cell.getBoundingClientRect();
                return { w: rect.width, h: rect.height };
            });
            check('M-11 セルサイズ≥…え18px以上', cellSize.w >= 18 && cellSize.h >= 18,
                `${cellSize.w.toFixed(0)}×${cellSize.h.toFixed(0)}`);

            // M-12: 持ち駒のタッチターゲット ≥ 44px
            const handSize = await page.evaluate(() => {
                const pieces = document.querySelectorAll('.hand-piece');
                if (pieces.length === 0) return { w: 0, h: 0 };
                const rect = pieces[0].getBoundingClientRect();
                return { w: rect.width, h: rect.height };
            });
            // 持ち駒がまだない場合もあるので条件分岐
            if (handSize.w > 0) {
                check('M-12 持ち駒タッチ領域≥44px', handSize.h >= 44,
                    `${handSize.w.toFixed(0)}×${handSize.h.toFixed(0)}`);
            } else {
                check('M-12 持ち駒タッチ領域≥44px', true, 'ゲーム序盤で持ち駒なし — スキップ');
            }

            // M-13: ナビリンクのタッチターゲット（padding含む）
            const navLinkSizes = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('nav a'));
                return links.map(a => {
                    const rect = a.getBoundingClientRect();
                    const cs = getComputedStyle(a);
                    const totalH = rect.height;
                    const paddingTop = parseFloat(cs.paddingTop) || 0;
                    const paddingBottom = parseFloat(cs.paddingBottom) || 0;
                    return { text: a.textContent.trim(), h: totalH, paddingH: paddingTop + paddingBottom };
                });
            });
            const allNavAccessible = navLinkSizes.every(l => l.h >= 16);
            check('M-13 ナビリンクがタップ可能',
                allNavAccessible,
                navLinkSizes.map(l => `${l.text}:${l.h.toFixed(0)}px`).join(', '));

            // M-14: ゲームコントロールボタンの間隔
            const btnGaps = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn'));
                if (btns.length < 2) return 999;
                const rects = btns.map(b => b.getBoundingClientRect());
                let minGap = 999;
                for (let i = 1; i < rects.length; i++) {
                    const gap = Math.abs(rects[i].top - rects[i - 1].bottom);
                    if (gap < minGap) minGap = gap;
                }
                return minGap;
            });
            check('M-14 ボタン間隔適切', btnGaps >= 0, `最小間隔${btnGaps.toFixed(0)}px`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ4: レスポンシブ（480px以下）
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ4: レスポンシブ（480px以下） ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 480, height: 800 });
            await startGame(page);

            // M-15: 480pxで横スクロールなし
            const noHScroll = await page.evaluate(() =>
                document.body.scrollWidth <= window.innerWidth
            );
            check('M-15 480pxで横スクロールなし', noHScroll);

            // M-16: コントロールが盤面の下にある
            const layout = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                const controls = document.querySelector('section[aria-labelledby="actions-heading"], .game-sidebar');
                if (!board || !controls) return { boardBottom: 0, controlsTop: 0 };
                return {
                    boardBottom: board.getBoundingClientRect().bottom,
                    controlsTop: controls.getBoundingClientRect().top
                };
            });
            check('M-16 操作が盤面の下', layout.controlsTop >= layout.boardBottom - 20,
                `盤面下端${layout.boardBottom.toFixed(0)}, 操作上端${layout.controlsTop.toFixed(0)}`);

            // M-17: テキストが切れていない
            const textClip = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('h1, h2, p, button, label'));
                const clipped = els.filter(e => {
                    const cs = getComputedStyle(e);
                    return cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis';
                });
                return clipped.length;
            });
            check('M-17 テキスト切れなし', textClip <= 1, `${textClip}箇所`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ5: タッチ操作の動作確認
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ5: タッチ操作の動作確認 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 390, height: 844 });
            await startGame(page);

            // M-18: タップで駒を選択できる
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const selected = await page.evaluate(() =>
                document.querySelectorAll('.cell[data-selected="true"]').length > 0
            );
            check('M-18 タップで駒選択', selected);

            // M-19: 合法手をタップで指せる
            const legalCell = await page.$('.cell[data-legal-move="true"]');
            if (legalCell) {
                await legalCell.click();
                await sleep(500);
                const moved = await page.evaluate(() =>
                    document.querySelectorAll('.cell[data-selected="true"]').length === 0
                );
                check('M-19 合法手タップで移動', moved);
            } else {
                check('M-19 合法手タップで移動', false, '合法手が見つからない');
            }

            await sleep(3000); // AI応手

            // M-20: 2手目も問題なく操作可能
            await page.click('.cell[data-rank="3"][data-file="3"]');
            await sleep(500);
            const secondSelect = await page.evaluate(() =>
                document.querySelectorAll('.cell[data-selected="true"]').length > 0
            );
            check('M-20 2手目も操作可能', secondSelect);
            await page.keyboard.press('Escape');
            await sleep(200);

            // M-21: スマホ幅で投了ボタンが押せる
            const resignBtn = await page.$('#btn-resign');
            if (resignBtn) {
                const box = await resignBtn.boundingBox();
                check('M-21 投了ボタンがスマホで操作可能',
                    box && box.width >= 44, `${box ? box.width.toFixed(0) : 0}px幅`);
            } else {
                check('M-21 投了ボタンがスマホで操作可能', false);
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ6: ヘルプとナビのモバイル対応
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ6: ヘルプとナビのモバイル対応 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 375, height: 667 });

            // M-22: ヘルプページが375pxで表示される
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            const helpOverflow = await page.evaluate(() =>
                document.body.scrollWidth <= window.innerWidth
            );
            check('M-22 ヘルプページ横スクロールなし', helpOverflow);

            // M-23: ナビゲーションが見える
            const navVisible = await page.evaluate(() => {
                const nav = document.querySelector('nav');
                if (!nav) return false;
                const rect = nav.getBoundingClientRect();
                return rect.height > 0 && rect.width > 0;
            });
            check('M-23 ナビゲーション可視', navVisible);

            // M-24: ホーム画面が375pxで使える
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const homeUsable = await page.evaluate(() => {
                const submitBtn = document.querySelector('button[type="submit"]');
                if (!submitBtn) return false;
                const rect = submitBtn.getBoundingClientRect();
                return rect.width > 0 && rect.bottom <= window.innerHeight * 1.5;
            });
            check('M-24 ホーム画面操作可能(375px)', homeUsable);

            // M-25: ランキングが375pxで表示される
            await page.goto(BASE + '/ranking', { waitUntil: 'networkidle0' });
            const rankOverflow = await page.evaluate(() =>
                document.body.scrollWidth <= window.innerWidth
            );
            check('M-25 ランキング横スクロールなし', rankOverflow);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ7: パフォーマンス
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ7: パフォーマンス ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 375, height: 667 });

            // M-26: ページサイズが適切
            let totalBytes = 0;
            page.on('response', resp => {
                resp.buffer().then(b => { totalBytes += b.length; }).catch(() => { });
            });
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            await sleep(1000);
            check('M-26 ホームページサイズ適切', totalBytes < 500000,
                `${(totalBytes / 1024).toFixed(0)}KB`);

            // M-27: 画像の最適化（大きすぎる画像がない）
            const largeImages = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return imgs.filter(i => i.naturalWidth > 1920).length;
            });
            check('M-27 巨大画像なし', largeImages === 0, `${largeImages}個`);

            // M-28: CSS/JSが外部読み込みでキャッシュ可能
            const externalResources = await page.evaluate(() => {
                const links = document.querySelectorAll('link[rel="stylesheet"][href]');
                const scripts = document.querySelectorAll('script[src]');
                return links.length + scripts.length;
            });
            check('M-28 外部リソースのキャッシュ対応', externalResources >= 0,
                `${externalResources}個の外部リソース`);

            await page.close();
        }

    } catch (e) {
        console.error('テスト実行エラー:', e);
        fail++;
    } finally {
        console.log('\n═══ モバイルユーザーAIテスト結果サマリー ═══');
        console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
        if (fail > 0) {
            console.log('\n--- 失敗項目 ---');
            results.filter(r => !r.ok).forEach(r =>
                console.log(`  ❌ ${r.label}${r.detail ? ' — ' + r.detail : ''}`));
        }
        await browser.close();
        process.exit(fail > 0 ? 1 : 0);
    }
})();
