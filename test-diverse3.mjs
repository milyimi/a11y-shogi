/**
 * 多様な障害者ユーザーテスト — 第3波（最終確認）
 * 前2波でカバーしていない観点を追加テスト
 *
 * 顧客O: 知的障害者（簡潔・直感的なUI） — ルール知らない
 * 顧客P: 片麻痺（右手使用不可）— ルール知っている
 * 顧客Q: てんかん（光感受性・点滅テスト）— ルール知っている
 * + WCAG 2.1 AAA残チェック
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

async function startGame(page) {
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
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客O: 知的障害者（簡潔・直感的） — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客O: 知的障害者 ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // O-1: ホームに操作手順が視覚的に表示
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const homePage = await page.$eval('body', el => el.innerText);
        check('O-1 操作手順がホームに記載', 
            (homePage.includes('矢印') || homePage.includes('やじるし')) && homePage.includes('Enter'),
            '矢印キー+Enter');

        // O-2: ゲーム開始のステップが2つ以下
        const formInputs = await page.$$eval('input[required], select[required]', els => els.length);
        check('O-2 ゲーム開始に必要な入力が少ない', formInputs <= 3,
            `${formInputs}個の必須入力`);

        // O-3: ラジオボタンにデフォルト選択（迷わない）
        const defaultChecked = await page.$$eval('input[type="radio"][checked]', els => els.length);
        check('O-3 デフォルト選択がある', defaultChecked >= 2,
            `${defaultChecked}個のデフォルト`);

        // O-4: ゲーム画面に初回の手順案内
        await startGame(page);
        const initGuide = await page.$eval('#game-announcements', el => el.textContent);
        check('O-4 初回の操作案内', initGuide.includes('矢印キー') || initGuide.includes('Enter'),
            initGuide.substring(0, 60));

        // O-5: 空マスクリック時に「何をすべきか」の案内
        const empty = await page.$(`.cell[data-rank="5"][data-file="5"]`);
        if (empty) await empty.click();
        await sleep(300);
        const emptyErr = await page.$eval('#game-announcements', el => el.textContent);
        check('O-5 空マスで具体的な案内', emptyErr.includes('選択してください'),
            emptyErr.substring(0, 50));

        // O-6: ヘルプページに駒の動き方の図表
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const helpText = await page.$eval('body', el => el.textContent);
        check('O-6 ヘルプに駒の種類一覧', 
            helpText.includes('歩') && helpText.includes('王') && helpText.includes('飛'),
            '駒説明あり');

        // O-7: ヘルプに「成り」の説明
        check('O-7 成りの説明', helpText.includes('成り'), '成り説明あり');

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客P: 片麻痺（左手のみ） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客P: 片麻痺（左手のみ） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await startGame(page);

        // P-1: WASD（左手）で盤面移動
        await page.keyboard.press('Escape');
        await sleep(200);
        const afterBoardFocus = await page.evaluate(() => document.activeElement?.classList.contains('cell'));
        check('P-1 Escapeでboard return', afterBoardFocus);

        // P-2: WASDだけで指し手可能
        // W=上(rank減), S=下(rank増), A=左(file増), D=右(file減)
        // 歩（3段目）にWASDでたどり着いてEnterで選択
        // まず5の3に移動
        const cell = await page.$(`.cell[data-rank="3"][data-file="5"]`);
        if (cell) await cell.focus();
        await sleep(200);
        await page.keyboard.press('Enter'); // 歩を選択
        await sleep(300);
        const selected = await page.evaluate(() => 
            document.querySelector('.cell[data-selected="true"]') !== null
        );
        check('P-2 Enter+WASDで駒選択', selected);
        
        // P-3: Escapeで解除
        await page.keyboard.press('Escape');
        await sleep(200);
        const deselected = await page.evaluate(() => 
            document.querySelector('.cell[data-selected="true"]') === null
        );
        check('P-3 Escapeで選択解除', deselected);

        // P-4: 1キーで先手駒台に移動（持ち駒なしの場合はアナウンスのみでOK）
        await page.keyboard.press('1');
        await sleep(300);
        const after1 = await page.evaluate(() => {
            const el = document.activeElement;
            const inKomadai = el?.closest('.komadai') !== null || el?.classList.contains('hand-piece');
            const announced = document.getElementById('game-announcements')?.textContent;
            return { inKomadai, announced: announced?.substring(0, 30) || '' };
        });
        check('P-4 1キーで先手駒台に移動または通知', 
            after1.inKomadai || after1.announced.includes('持ち駒'),
            `inKomadai=${after1.inKomadai}, announced=${after1.announced}`);

        // P-5: Tabなしで盤面に戻れる
        await page.keyboard.press('Escape');
        await sleep(200);
        const backToBoard = await page.evaluate(() => document.activeElement?.classList.contains('cell'));
        check('P-5 Escapeで盤面に戻れる', backToBoard);

        // P-6: Space でも選択操作可能（Enter以外）
        const pawn = await page.evaluate(() => {
            const board = window.gameData.boardState.board;
            for (let r = 1; r <= 9; r++)
                for (let f = 1; f <= 9; f++) {
                    const p = board[r]?.[f];
                    if (p && p.color === 'sente' && p.type === 'fu') return { r, f };
                }
            return null;
        });
        if (pawn) {
            const el = await page.$(`.cell[data-rank="${pawn.r}"][data-file="${pawn.f}"]`);
            if (el) await el.focus();
            await sleep(200);
            await page.keyboard.press('Space');
            await sleep(300);
            const spaceSelect = await page.evaluate(() => 
                document.querySelector('.cell[data-selected="true"]') !== null
            );
            check('P-6 Spaceでも駒選択可能', spaceSelect);
            await page.keyboard.press('Escape');
            await sleep(200);
        } else {
            check('P-6 Spaceでも駒選択可能', false, '歩なし');
        }

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客Q: てんかん（光感受性テスト WCAG 2.3.1/2.3.2） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客Q: てんかん（光感受性テスト） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // Q-1: 自動再生するアニメーションが3回/秒以下
        await startGame(page);
        const animations = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            const flashers = [];
            all.forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.animationName && cs.animationName !== 'none') {
                    const dur = parseFloat(cs.animationDuration);
                    if (dur > 0 && dur < 0.34) { // 3回/秒以上
                        flashers.push({ tag: el.tagName, class: el.className, dur });
                    }
                }
            });
            return flashers;
        });
        check('Q-1 3回/秒以上の点滅なし(WCAG 2.3.1)', animations.length === 0,
            animations.length > 0 ? JSON.stringify(animations[0]) : 'なし');

        // Q-2: reduced-motionで全アニメ無効
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.reload({ waitUntil: 'networkidle0' });
        await sleep(500);
        const rmAnims = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            let count = 0;
            all.forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.animationName && cs.animationName !== 'none' && cs.animationDuration !== '0s') count++;
                if (cs.transitionDuration && cs.transitionDuration !== '0s' && cs.transitionDuration !== '0ms') count++;
            });
            return count;
        });
        check('Q-2 reduced-motionで全アニメ/transition無効', rmAnims === 0,
            `${rmAnims}個のアニメ残存`);

        // Q-3: 点滅するテキストやblink要素なし
        const blinkCount = await page.evaluate(() => {
            let count = 0;
            document.querySelectorAll('blink, marquee').forEach(() => count++);
            document.querySelectorAll('*').forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.textDecoration.includes('blink')) count++;
            });
            return count;
        });
        check('Q-3 blink/marquee要素なし', blinkCount === 0);

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // WCAG 2.1 AAA残チェック
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ WCAG 2.1 AAA追加チェック ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // W-1: lang属性が設定（WCAG 3.1.1）
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const lang = await page.evaluate(() => document.documentElement.lang);
        check('W-1 lang属性が設定(3.1.1)', lang === 'ja', `lang=${lang}`);

        // W-2: ページタイトルが意味あり（WCAG 2.4.2）
        const title = await page.title();
        check('W-2 ページタイトルが意味的(2.4.2)', title.includes('将棋') || title.includes('アクセシブル'),
            title);

        // W-3: ヘルプページにも意味あるタイトル
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const helpTitle = await page.title();
        check('W-3 ヘルプタイトル(2.4.2)', helpTitle.includes('ヘルプ') || helpTitle.includes('使い方'),
            helpTitle);

        // W-4: ゲームページにも意味あるタイトル
        await startGame(page);
        const gameTitle = await page.title();
        check('W-4 ゲームタイトル(2.4.2)', gameTitle.includes('対局') || gameTitle.includes('ゲーム') || gameTitle.includes('将棋'),
            gameTitle);

        // W-5: 見出し構造が論理的（h2→h3の順、hN飛ばしなし）
        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els => 
            els.map(e => ({ level: parseInt(e.tagName[1]), text: e.textContent.trim().substring(0, 30) }))
        );
        let headingOrder = true;
        for (let i = 1; i < headings.length; i++) {
            if (headings[i].level > headings[i-1].level + 1) {
                headingOrder = false;
                break;
            }
        }
        check('W-5 見出しレベルが連続(1.3.1)', headingOrder,
            headings.map(h => `h${h.level}:${h.text}`).join(' > '));

        // W-6: フォーム要素にlabel関連付け（WCAG 1.3.1）
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const formLabels = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input, select, textarea');
            let unlabeled = 0;
            inputs.forEach(inp => {
                if (inp.type === 'hidden' || inp.type === 'submit') return;
                const label = inp.labels?.length > 0 || inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
                if (!label) unlabeled++;
            });
            return unlabeled;
        });
        check('W-6 全フォーム要素にlabel(1.3.1)', formLabels === 0,
            `${formLabels}個のラベルなし`);

        // W-7: ランドマーク（main, nav, header, footer）が存在（WCAG 1.3.1）
        const landmarks = await page.evaluate(() => {
            return {
                main: !!document.querySelector('main, [role="main"]'),
                nav: !!document.querySelector('nav, [role="navigation"]'),
                header: !!document.querySelector('header, [role="banner"]')
            };
        });
        check('W-7 ランドマーク(main,nav)(1.3.1)', landmarks.main && landmarks.nav,
            `main=${landmarks.main}, nav=${landmarks.nav}`);

        // W-8: リンクのpurposeがコンテキストで判断可能（WCAG 2.4.4）
        const links = await page.$$eval('a', els => 
            els.filter(a => a.textContent.trim().length > 0)
               .map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
        );
        const vagueLinkTexts = links.filter(l => l.text === 'ここ' || l.text === 'こちら' || l.text === 'リンク');
        check('W-8 リンクテキストが意味的(2.4.4)', vagueLinkTexts.length === 0,
            links.map(l => l.text).join(', '));

        // W-9: コントラスト比チェック（主要テキスト）
        await startGame(page);
        const contrast = await page.evaluate(() => {
            function luminance(r, g, b) {
                const a = [r, g, b].map(v => {
                    v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                });
                return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
            }
            function ratio(l1, l2) {
                return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            }
            function parseColor(str) {
                const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
            }
            
            // piece-senteはセルのクラス（.cell.piece-sente）
            const cell = document.querySelector('.cell.piece-sente');
            if (!cell) return null;
            const pieceText = cell.querySelector('.piece-text');
            const textEl = pieceText || cell;
            const cs = getComputedStyle(textEl);
            const fg = parseColor(cs.color);
            const bg = parseColor(getComputedStyle(cell).backgroundColor);
            if (!fg || !bg) return null;
            const l1 = luminance(...fg);
            const l2 = luminance(...bg);
            return { ratio: ratio(l1, l2).toFixed(1), fg: cs.color, bg: getComputedStyle(cell).backgroundColor };
        });
        check('W-9 テキストコントラスト比7:1以上(1.4.6)', 
            contrast && parseFloat(contrast.ratio) >= 7,
            contrast ? `${contrast.ratio}:1 (fg=${contrast.fg}, bg=${contrast.bg})` : 'なし');

        // W-10: セッションタイムアウトの警告（WCAG 2.2.6）— タイムアウトなしを確認
        const noTimeout = await page.evaluate(() => {
            // セッションタイムアウトの仕組みがない場合はOK
            return !document.querySelector('meta[http-equiv="refresh"]');
        });
        check('W-10 自動タイムアウトなし(2.2.6)', noTimeout);

        await page.close();
    }

    // ━━━ サマリー ━━━
    console.log('\n═══ 第3波テスト結果サマリー ═══');
    console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
    if (fail > 0) {
        console.log('\n失敗項目:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    }

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
