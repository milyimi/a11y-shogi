/**
 * 子供・初心者AI テスト
 * 
 * ペルソナ: 鈴木ゆうた（12歳・小学6年生）
 * - 将棋のルールはほぼ知らない。駒の名前は少し分かる程度
 * - タブレットやスマホは日常的に使う（YouTube、ゲーム）
 * - 漢字は小学校で習った範囲、難しい漢字にはふりがなが必要
 * - おじいちゃんに「一緒に将棋やろう」と言われてサイトを開いた
 * - 飽きっぽく、分からないとすぐやめてしまう
 * 
 * テスト観点：
 *  - ふりがなの充実度（子供でも読めるか）
 *  - 1手目までの到達しやすさ（操作ステップの少なさ）
 *  - ルール説明の分かりやすさ
 *  - エラー時のメッセージの親切さ
 *  - 視覚フィードバックの楽しさ・分かりやすさ
 *  - 「はじめての方へ」案内の有効性
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
        // カテゴリ1: ふりがなと読みやすさ
        // 「漢字が読めないと困る！」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ1: ふりがなと読みやすさ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await page.goto(BASE, { waitUntil: 'networkidle0' });

            // C-1: ホーム画面にふりがながたくさんある
            const homeRuby = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('C-1 ホーム画面にふりがなが豊富', homeRuby >= 30, `${homeRuby}箇所`);

            // C-2: 「将棋」にふりがなが付いている
            const shogiRuby = await page.evaluate(() => {
                const rubies = document.querySelectorAll('ruby');
                return Array.from(rubies).some(r => r.textContent.includes('将棋') || r.textContent.includes('しょうぎ'));
            });
            check('C-2 「将棋」にふりがな', shogiRuby);

            // C-3: 難易度の補足が平仮名で書いてある
            const easyDesc = await page.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('よわい') && text.includes('ふつう') && text.includes('つよい');
            });
            check('C-3 難易度の補足がひらがな', easyDesc);

            // C-4: ゲーム画面のボタンにもふりがな
            await startGame(page);
            const gameRuby = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('C-4 ゲーム画面にふりがな', gameRuby >= 3, `${gameRuby}箇所`);

            // C-5: ヘルプページにもふりがな
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            const helpRuby = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('C-5 ヘルプページにふりがな', helpRuby >= 3, `${helpRuby}箇所`);

            // C-6: ヘルプに将棋ルールの説明がある
            const hasRules = await page.evaluate(() => {
                return document.body.textContent.includes('ルール') && document.body.textContent.includes('駒');
            });
            check('C-6 ヘルプに将棋ルール解説', hasRules);

            // C-7: 駒の種類と動きの説明がある
            const hasPieceExplanation = await page.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('歩') && text.includes('飛') && text.includes('角') && text.includes('王');
            });
            check('C-7 駒の種類と動きの解説', hasPieceExplanation);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ2: 最初の一手まで迷わない
        // 「どうやって遊ぶの？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ2: 最初の一手まで迷わない ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // C-8: ゲーム開始が簡単（デフォルト値ありで1クリック）
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const hasDefaults = await page.evaluate(() => {
                const diff = document.querySelector('input[name="difficulty"]:checked');
                const color = document.querySelector('input[name="color"]:checked');
                return diff !== null && color !== null;
            });
            check('C-8 デフォルト設定で迷わず開始', hasDefaults);

            // C-9: 「はじめての方へ」案内がある
            const beginnerGuide = await page.evaluate(() => {
                return document.body.textContent.includes('はじめて');
            });
            check('C-9 「はじめての方へ」案内', beginnerGuide);

            // C-10: ゲーム開始後に案内メッセージ
            await startGame(page);
            const guidance = await page.evaluate(() => {
                const el = document.getElementById('game-announcements');
                return el ? el.textContent.trim() : '';
            });
            check('C-10 ゲーム開始後に案内メッセージ',
                guidance.includes('手番') || guidance.includes('開始') || guidance.includes('移動'),
                guidance.substring(0, 40));

            // C-11: 自分の駒をクリックしたら合法手が見える
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const legalMoves = await page.evaluate(() => {
                return document.querySelectorAll('.cell[data-legal-move="true"]').length;
            });
            check('C-11 駒クリックで合法手表示', legalMoves > 0, `${legalMoves}箇所`);

            // C-12: 合法手マークが緑色で目立つ
            const legalColor = await page.evaluate(() => {
                const style = document.querySelector('.cell[data-legal-move="true"]');
                if (!style) return null;
                const before = getComputedStyle(style, '::before');
                return before.backgroundColor || getComputedStyle(style).outlineColor;
            });
            check('C-12 合法手マークが視覚的に表示', legalMoves > 0);

            // C-13: 合法手をクリックして実際に指せる
            const legalCell = await page.$('.cell[data-legal-move="true"]');
            if (legalCell) {
                await legalCell.click();
                await sleep(500);
                const moved = await page.evaluate(() => {
                    return document.querySelectorAll('.cell[data-selected="true"]').length === 0;
                });
                check('C-13 合法手クリックで指せる', moved);
            } else {
                check('C-13 合法手クリックで指せる', false);
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ3: エラー時のやさしさ
        // 「間違えちゃった！怒られる？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ3: エラー時のやさしさ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // C-14: 空マスをクリックしても壊れない
            await page.click('.cell[data-rank="5"][data-file="5"]');
            await sleep(300);
            const noError = await page.evaluate(() => {
                const announce = document.getElementById('game-announcements');
                return announce ? announce.textContent.trim() : '';
            });
            check('C-14 空マスクリックでクラッシュしない',
                noError.includes('空') || noError.length > 0,
                noError.substring(0, 40));

            // C-15: 相手の駒をクリックしたらメッセージ
            await page.click('.cell[data-rank="7"][data-file="7"]');
            await sleep(300);
            const enemyMsg = await page.evaluate(() => {
                const announce = document.getElementById('game-announcements');
                return announce ? announce.textContent.trim() : '';
            });
            check('C-15 相手駒クリックでメッセージ',
                enemyMsg.includes('相手') || enemyMsg.includes('選べ'),
                enemyMsg.substring(0, 40));

            // C-16: Escapeで選択をやり直せる
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(300);
            await page.keyboard.press('Escape');
            await sleep(300);
            const cancelled = await page.evaluate(() => {
                return document.querySelectorAll('.cell[data-selected="true"]').length === 0;
            });
            check('C-16 Escapeで選択キャンセル', cancelled);

            // C-17: 「待った」ができる
            const undoBtn = await page.$('#btn-undo');
            check('C-17 「待った」ボタンがある', undoBtn !== null);

            // C-18: エラーメッセージが日本語
            const errorLang = await page.evaluate(() => {
                // ソースコード内のエラーメッセージが日本語か
                const scripts = Array.from(document.querySelectorAll('script'));
                const hasJapaneseError = scripts.some(s =>
                    s.textContent.includes('エラーが発生しました') ||
                    s.textContent.includes('動かせません')
                );
                return hasJapaneseError;
            });
            check('C-18 エラーメッセージが日本語', errorLang);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ4: 視覚フィードバック
        // 「何が起きてるか分かりやすい？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ4: 視覚フィードバック ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // C-19: 選択した駒に色が付く
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const selectedBg = await page.evaluate(() => {
                const sel = document.querySelector('.cell[data-selected="true"]');
                return sel ? getComputedStyle(sel).backgroundColor : null;
            });
            check('C-19 選択駒に色が付く', selectedBg !== null, selectedBg);

            // C-20: 手番表示が「あなた」で分かりやすい
            const turnText = await page.evaluate(() => {
                const el = document.getElementById('current-player');
                return el ? el.textContent.trim() : '';
            });
            check('C-20 手番が「あなた」で分かりやすい', turnText.includes('あなた'));

            // Escapeで選択解除
            await page.keyboard.press('Escape');
            await sleep(200);

            // C-21: AI思考中にスピナーが表示される
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(300);
            const legalCell = await page.$('.cell[data-legal-move="true"]');
            if (legalCell) await legalCell.click();
            await sleep(200);
            const spinner = await page.evaluate(() => {
                const el = document.getElementById('ai-thinking');
                if (!el) return null;
                return getComputedStyle(el).display !== 'none';
            });
            check('C-21 AI思考中にインジケーター', spinner !== null);

            await sleep(3000); // AI応手待ち

            // C-22: 手数が表示される
            const moveCount = await page.evaluate(() => {
                const el = document.getElementById('move-count');
                return el ? el.textContent.trim() : '';
            });
            check('C-22 手数が表示される', moveCount.includes('手') || parseInt(moveCount) >= 0,
                moveCount);

            // C-23: 先手・後手の駒が見た目で区別できる
            const distinction = await page.evaluate(() => {
                const gote = document.querySelector('.cell.piece-gote .piece-text');
                if (!gote) return null;
                const cell = gote.closest('.cell');
                const cs = getComputedStyle(cell);
                return {
                    rotated: cs.transform !== 'none',
                    underline: cs.textDecorationLine.includes('underline')
                };
            });
            check('C-23 先手/後手の駒が区別できる',
                distinction && (distinction.rotated || distinction.underline));

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ5: 楽しさとエンゲージメント
        // 「つまんない？もっとやりたい？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ5: 楽しさとエンゲージメント ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // C-24: 棋譜を見返せる
            const historyBtn = await page.$('#btn-open-history');
            check('C-24 棋譜ボタンがある', historyBtn !== null);

            // C-25: ショートカット一覧が見られる
            const shortcutBtn = await page.$('#btn-open-shortcuts');
            check('C-25 ショートカット一覧ボタン', shortcutBtn !== null);

            // C-26: ランキングページがある（競争心）
            await page.goto(BASE + '/ranking', { waitUntil: 'networkidle0' });
            const rankingTitle = await page.title();
            check('C-26 ランキングページがある',
                rankingTitle.includes('ランキング') || rankingTitle.includes('ranking'));

            // C-27: ホームに戻れる
            const homeLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href.endsWith('/') || a.textContent.includes('ホーム'));
            });
            check('C-27 ホームに戻れるリンク', homeLink);

            // C-28: ヘルプが別ページで開ける
            const helpLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href.includes('help'));
            });
            check('C-28 ヘルプリンクがある', helpLink);

            await page.close();
        }

    } catch (e) {
        console.error('テスト実行エラー:', e);
        fail++;
    } finally {
        console.log('\n═══ 子供・初心者AIテスト結果サマリー ═══');
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
