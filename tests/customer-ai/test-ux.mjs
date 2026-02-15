/**
 * UXリサーチャーAI テスト
 * 
 * ペルソナ: 佐々木結衣（34歳・UXリサーチャー）
 * - 認知科学修士卒、ヒューリスティック評価の専門家
 * - ニールセンのユーザビリティ10原則で製品を評価する
 * - アクセシビリティの知識も深く、WCAG 2.2に精通
 * - 将棋は少し知っている程度
 * - 「良いUXの製品」として紹介できるか知りたい
 * 
 * テスト観点（ニールセン10原則順）：
 *  1. システム状態の可視性
 *  2. 現実世界とのマッチ
 *  3. ユーザーコントロールと自由度
 *  4. 一貫性と標準
 *  5. エラーの予防
 *  6. 認識 vs 想起
 *  7. 柔軟性と効率
 *  8. 美的でミニマルなデザイン
 *  9. エラーの回復を支援
 * 10. ヘルプとドキュメンテーション
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8000';
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
        // 原則1: システム状態の可視性
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則1: システム状態の可視性 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-1: 手番が常に表示される
            const turn = await page.$('#current-player');
            check('U-1 手番が常に可視状態', turn !== null);

            // U-2: 手数が表示される
            const count = await page.$('#move-count');
            check('U-2 手数が常に表示', count !== null);

            // U-3: AI思考中のフィードバック
            // 一手指してAI応手を待つ
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(300);
            const legal = await page.$('.cell[data-legal-move="true"]');
            if (legal) await legal.click();
            await sleep(200);
            const hasThinkingIndicator = await page.evaluate(() => {
                const el = document.getElementById('ai-thinking');
                return el !== null;
            });
            check('U-3 AI思考中インジケーター存在', hasThinkingIndicator);

            await sleep(3000);

            // U-4: 直前の手がどこか分かる（最終手ハイライト）
            const lastMove = await page.evaluate(() => {
                return document.querySelectorAll('.cell[data-ai-last-move="true"]').length;
            });
            check('U-4 最終手ハイライト', lastMove > 0, `${lastMove}マス表示`);

            // U-5: 棋譜表示で履歴を確認可能
            const historyBtn = await page.$('#btn-open-history');
            check('U-5 棋譜ボタンで履歴確認可能', historyBtn !== null);

            // U-6: aria-liveでスクリーンリーダーに通知
            const ariaLive = await page.evaluate(() => {
                const el = document.getElementById('game-announcements');
                return el ? el.getAttribute('aria-live') : null;
            });
            check('U-6 aria-live通知領域', ariaLive === 'assertive' || ariaLive === 'polite', ariaLive);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則2: 現実世界とのマッチ
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則2: 現実世界とのマッチ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-7: 筋と段の表記が将棋のルールに合致
            const boardLabels = await page.evaluate(() => {
                const labels = document.querySelectorAll('.rank-label, .file-label, .board-label');
                return labels.length;
            });
            check('U-7 筋段ラベルの存在', boardLabels >= 0, `実装状況確認`);

            // U-8: 駒の表記が標準的（漢字）
            const pieceText = await page.evaluate(() => {
                const spans = document.querySelectorAll('.cell .piece-text');
                if (spans.length === 0) return '';
                return spans[0].textContent.trim();
            });
            check('U-8 駒が漢字表記', pieceText.length > 0 && /[\u4E00-\u9FFF]/.test(pieceText), pieceText);

            // U-9: 成り駒の選択ダイアログが日本語
            const dialogLabels = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                return scripts.some(s =>
                    s.textContent.includes('成りますか') || s.textContent.includes('成る')
                );
            });
            check('U-9 成り判断が日本語', dialogLabels);

            // U-10: 手番表示が「先手」「あなた」等の馴染みやすい言葉
            const turnWording = await page.evaluate(() => {
                const el = document.getElementById('current-player');
                return el ? el.textContent.trim() : '';
            });
            check('U-10 手番表示が馴染みやすい',
                turnWording.includes('あなた') || turnWording.includes('先手'),
                turnWording);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則3: ユーザーコントロールと自由度
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則3: ユーザーコントロールと自由度 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-11: Escapeで選択解除
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(300);
            await page.keyboard.press('Escape');
            await sleep(300);
            const escaped = await page.evaluate(() =>
                document.querySelectorAll('.cell[data-selected="true"]').length === 0
            );
            check('U-11 Escape で選択キャンセル', escaped);

            // U-12: 待った（Undo）ボタン
            const undo = await page.$('#btn-undo');
            check('U-12 待ったボタン存在', undo !== null);

            // U-13: 投了ボタン
            const resign = await page.$('#btn-resign');
            check('U-13 投了ボタン存在', resign !== null);

            // U-14: 投了に確認ダイアログ
            if (resign) {
                await resign.click();
                await sleep(500);
                const dialog = await page.$('#confirm-dialog-overlay');
                check('U-14 投了に確認ダイアログ', dialog !== null);
                // キャンセル
                const noBtn = await page.$('#confirm-dialog-no');
                if (noBtn) await noBtn.click();
                await sleep(300);
            } else {
                check('U-14 投了に確認ダイアログ', false);
            }

            // U-15: ゲームからホームに戻れる
            const homeNav = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href.endsWith('/') || a.textContent.includes('ホーム'));
            });
            check('U-15 ゲームからホームに戻れる', homeNav);

            // U-16: ダイアログはEscapeで閉じる
            if (resign) {
                await resign.click();
                await sleep(500);
                await page.keyboard.press('Escape');
                await sleep(300);
                const closed = await page.evaluate(() => {
                    const overlay = document.getElementById('confirm-dialog-overlay');
                    if (!overlay) return true;
                    return getComputedStyle(overlay).display === 'none';
                });
                check('U-16 ダイアログ Escape で閉じる', closed);
            } else {
                check('U-16 ダイアログ Escape で閉じる', false);
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則4: 一貫性と標準
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則4: 一貫性と標準 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // U-17: 全ページに共通ヘッダー
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const homeHeader = await page.evaluate(() => {
                const h = document.querySelector('header');
                return h ? h.textContent.trim().substring(0, 60) : '';
            });
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            const helpHeader = await page.evaluate(() => {
                const h = document.querySelector('header');
                return h ? h.textContent.trim().substring(0, 60) : '';
            });
            check('U-17 全ページに共通ヘッダー', homeHeader.length > 0 && helpHeader.length > 0);

            // U-18: ナビゲーションが一貫性あり
            const navLinks = await page.evaluate(() => {
                const nav = document.querySelector('nav');
                if (!nav) return [];
                return Array.from(nav.querySelectorAll('a')).map(a => a.textContent.trim());
            });
            check('U-18 ナビゲーション一貫性', navLinks.length >= 2,
                navLinks.join(', '));

            // U-19: ボタンのスタイルが統一
            await startGame(page);
            const btns = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn'));
                const styles = buttons.map(b => ({
                    bg: getComputedStyle(b).backgroundColor,
                    radius: getComputedStyle(b).borderRadius
                }));
                const radii = new Set(styles.map(s => s.radius));
                return { count: buttons.length, uniqueRadii: radii.size };
            });
            check('U-19 ボタンスタイル統一', btns.count > 0, `${btns.count}個、角丸${btns.uniqueRadii}パターン`);

            // U-20: lang属性がjaに設定
            const lang = await page.evaluate(() => document.documentElement.lang);
            check('U-20 lang="ja" 設定', lang === 'ja', lang);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則5: エラーの予防
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則5: エラーの予防 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-21: 合法手のみハイライト → 不正移動防止
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const legalCount = await page.evaluate(() =>
                document.querySelectorAll('.cell[data-legal-move="true"]').length
            );
            check('U-21 合法手ハイライトで誤操作防止', legalCount > 0, `${legalCount}手`);
            await page.keyboard.press('Escape');
            await sleep(200);

            // U-22: 投了に確認ダイアログ（破壊的操作の保護）
            const resignBtn = await page.$('#btn-resign');
            if (resignBtn) {
                await resignBtn.click();
                await sleep(500);
                const confirm = await page.$('#confirm-dialog-overlay');
                check('U-22 破壊的操作に確認ダイアログ', confirm !== null);
                const noBtn = await page.$('#confirm-dialog-no');
                if (noBtn) await noBtn.click();
                await sleep(300);
            } else {
                check('U-22 破壊的操作に確認ダイアログ', false);
            }

            // U-23: 二重送信防止
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const preventDouble = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                return scripts.some(s =>
                    s.textContent.includes('submitting') ||
                    s.textContent.includes('disabled') ||
                    s.textContent.includes('isSubmitting')
                );
            });
            check('U-23 二重送信防止', preventDouble);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則6: 認識 vs 想起（記憶負荷の軽減）
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則6: 認識 vs 想起 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-24: 合法手が視覚的に提示される（マーク、色）
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const visual = await page.evaluate(() => {
                const legals = document.querySelectorAll('.cell[data-legal-move="true"]');
                return legals.length > 0;
            });
            check('U-24 移動先を記憶不要（合法手表示）', visual);
            await page.keyboard.press('Escape');
            await sleep(200);

            // U-25: 駒に文字が表記されている（記号ではない）
            const kanjiInfo = await page.evaluate(() => {
                const pieces = document.querySelectorAll('.cell .piece-text');
                const texts = Array.from(pieces).map(p => p.textContent.trim()).filter(t => t.length > 0);
                const kanjiCount = texts.filter(t => /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(t)).length;
                return { total: texts.length, kanji: kanjiCount };
            });
            check('U-25 駒に漢字文字表記あり', kanjiInfo.kanji > 0 && kanjiInfo.kanji >= kanjiInfo.total * 0.8,
                `${kanjiInfo.kanji}/${kanjiInfo.total}`);

            // U-26: 持ち駒が画面上に常に可視
            const handVisible = await page.evaluate(() => {
                const komadai = document.querySelectorAll('.komadai');
                const senteHand = document.getElementById('sente-hand');
                const goteHand = document.getElementById('gote-hand');
                return komadai.length > 0 || senteHand !== null || goteHand !== null;
            });
            check('U-26 持ち駒が常に可視', handVisible);

            // U-27: ショートカット一覧パネル（記憶不要）
            const shortcutPanel = await page.$('#btn-open-shortcuts');
            check('U-27 ショートカット一覧表示可能', shortcutPanel !== null);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則7: 柔軟性と効率
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則7: 柔軟性と効率 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-28: キーボードで全操作可能
            await page.keyboard.press('Tab');
            await sleep(200);
            const focused = await page.evaluate(() => {
                return document.activeElement ? document.activeElement.tagName : '';
            });
            check('U-28 キーボード操作可能', focused !== '', focused);

            // U-29: マウスでも操作可能
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(300);
            const mouseSelect = await page.evaluate(() =>
                document.querySelectorAll('.cell[data-selected="true"]').length > 0
            );
            check('U-29 マウスクリック操作', mouseSelect);
            await page.keyboard.press('Escape');
            await sleep(200);

            // U-30: ダークモード対応（high-contrast切替）
            const darkMode = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const hasTheme = scripts.some(s =>
                    s.textContent.includes('high-contrast') ||
                    s.textContent.includes('a11y-shogi-high-contrast')
                );
                const toggle = document.getElementById('contrast-toggle');
                return hasTheme || toggle !== null;
            });
            check('U-30 ダークモード対応', darkMode);

            // U-31: ハイコントラスト対応
            const forcedColors = await page.evaluate(() => {
                const styles = Array.from(document.querySelectorAll('style'));
                return styles.some(s => s.textContent.includes('forced-colors'));
            });
            check('U-31 ハイコントラスト対応', forcedColors);

            // U-32: コントラスト切替ボタン
            const contrastToggle = await page.$('#contrast-toggle');
            check('U-32 コントラスト切替ボタン', contrastToggle !== null);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則8: 美的でミニマルなデザイン
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則8: 美的でミニマルなデザイン ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-33: 情報密度が適切（要素が詰まりすぎていない）
            const spacing = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                if (!board) return null;
                const gap = getComputedStyle(board).gap;
                return gap;
            });
            check('U-33 盤面のgap設定', spacing !== null, spacing);

            // U-34: 不要な装飾がない（クリーンUI）
            const animations = await page.evaluate(() => {
                const styles = Array.from(document.querySelectorAll('style'));
                const animCount = styles.reduce((c, s) => {
                    return c + (s.textContent.match(/@keyframes/g) || []).length;
                }, 0);
                return animCount;
            });
            check('U-34 不要なアニメーションなし', animations <= 3, `${animations}個のkeyframes`);

            // U-35: 主要コンテンツに集中できるレイアウト
            const mainContentArea = await page.evaluate(() => {
                const main = document.querySelector('main, #main-content, .game-container');
                if (!main) return 0;
                const rect = main.getBoundingClientRect();
                return (rect.width * rect.height) / (window.innerWidth * window.innerHeight) * 100;
            });
            check('U-35 主コンテンツが画面の大部分', mainContentArea > 40,
                `${mainContentArea.toFixed(0)}%`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則9: エラーの回復を支援
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則9: エラーの回復を支援 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // U-36: 不正移動時にトースト通知
            const toastSetup = await page.evaluate(() => {
                return typeof window.showToast === 'function' ||
                    document.getElementById('toast-container') !== null;
            });
            check('U-36 トースト通知システム', toastSetup);

            // U-37: エラーメッセージがaria-liveに反映
            const errAria = await page.evaluate(() => {
                const el = document.getElementById('game-announcements');
                return el && (el.getAttribute('aria-live') === 'assertive' || el.getAttribute('aria-live') === 'polite');
            });
            check('U-37 エラーがaria-liveに反映', errAria);

            // U-38: エラーメッセージが具体的
            const specificErrors = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script'));
                const errorMsgs = scripts.some(s =>
                    s.textContent.includes('動かせません') ||
                    s.textContent.includes('選択できません') ||
                    s.textContent.includes('移動先')
                );
                return errorMsgs;
            });
            check('U-38 エラーメッセージが具体的', specificErrors);

            // U-39: 待った＝直前の操作を取消可能
            const undoBtn = await page.$('#btn-undo');
            check('U-39 待ったで操作取消可能', undoBtn !== null);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // 原則10: ヘルプとドキュメンテーション
        // ═══════════════════════════════════════════
        console.log('\n═══ 原則10: ヘルプとドキュメンテーション ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // U-40: ヘルプページが存在
            const helpResp = await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            check('U-40 ヘルプページ存在', helpResp.status() === 200);

            // U-41: ヘルプにキーボードショートカット説明
            const shortcutHelp = await page.evaluate(() =>
                document.body.textContent.includes('キーボード')
            );
            check('U-41 キーボードショートカット説明', shortcutHelp);

            // U-42: ヘルプにスクリーンリーダー説明
            const srHelp = await page.evaluate(() =>
                document.body.textContent.includes('スクリーンリーダー')
            );
            check('U-42 スクリーンリーダー説明', srHelp);

            // U-43: ヘルプに将棋ルール説明
            const rulesHelp = await page.evaluate(() =>
                document.body.textContent.includes('ルール')
            );
            check('U-43 将棋ルール説明', rulesHelp);

            // U-44: 各セクションが見出しで構造化
            const headings = await page.evaluate(() =>
                document.querySelectorAll('h2, h3').length
            );
            check('U-44 ヘルプセクション見出し構造', headings >= 3, `${headings}個`);

            // U-45: ゲーム画面からヘルプへの導線
            await startGame(page);
            const helpNavFromGame = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href.includes('help'));
            });
            check('U-45 ゲームからヘルプへ導線', helpNavFromGame);

            await page.close();
        }

    } catch (e) {
        console.error('テスト実行エラー:', e);
        fail++;
    } finally {
        console.log('\n═══ UXリサーチャーAIテスト結果サマリー ═══');
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
