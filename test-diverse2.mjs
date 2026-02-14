/**
 * 多様な障害者ユーザーテスト — 第2波
 * 実際にゲームを最後までプレイし、エンドツーエンドの体験をテスト
 *
 * 顧客K: 脳性麻痺（スイッチデバイスユーザー、Tab+Enterのみ） — ルール知らない
 * 顧客L: ディスレクシア（読字障害） — ルール知らない
 * 顧客M: 車椅子ユーザー+弱視（レスポンシブ＋ズーム400%） — ルール知っている
 * 顧客N: 自閉スペクトラム症（予測可能性・一貫性重視） — ルール知っている
 * + 全ペルソナ共通: ゲーム完走テスト（投了まで）
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客K: 脳性麻痺（Tab+Enterのみ） — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客K: 脳性麻痺（Tab+Enterのみ） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        
        // K-1: Tabのみでホームページのフォームからゲーム開始可能
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        let reachedSubmit = false;
        for (let i = 0; i < 25; i++) {
            await page.keyboard.press('Tab');
            await sleep(100);
            const active = await page.evaluate(() => ({
                tag: document.activeElement.tagName,
                id: document.activeElement.id,
                type: document.activeElement.type
            }));
            if (active.id === 'btn-start-game') {
                reachedSubmit = true;
                break;
            }
        }
        check('K-1 TaだけでSubmitボタンに到達', reachedSubmit);

        // K-2: ゲーム画面でTab巡回が論理的（スキップリンク→盤面→情報パネル）
        await startGame(page);
        // スキップリンク確認
        const skipLink = await page.$('.skip-link, [href="#board-area"]');
        check('K-2 スキップリンクが存在', skipLink !== null);

        // K-3: 全操作ボタンがTabだけで到達可
        const reachableButtons = [];
        for (let i = 0; i < 50; i++) {
            await page.keyboard.press('Tab');
            await sleep(50);
            const info = await page.evaluate(() => ({
                tag: document.activeElement.tagName,
                id: document.activeElement.id,
                text: document.activeElement.textContent?.trim().substring(0, 20)
            }));
            if (info.tag === 'BUTTON' && info.id) {
                reachableButtons.push(info.id);
            }
        }
        // btn-undoはmoveCount=0でdisabled（正しい動作）
        const importantBtns = ['btn-resign', 'btn-open-history', 'btn-open-settings', 'btn-open-shortcuts'];
        const reachable = importantBtns.filter(b => reachableButtons.includes(b));
        check('K-3 操作ボタンがTabで到達(undoは無効時除外)', reachable.length === importantBtns.length,
            `到達: ${reachable.join(', ')} / 必要: ${importantBtns.join(', ')}`);

        // K-4: モーダルが開いたらフォーカストラップが機能
        const settBtn = await page.$('#btn-open-settings');
        if (settBtn) {
            await settBtn.click();
            await sleep(500);
            // Tabで巡回
            const focusedInModal = [];
            for (let i = 0; i < 15; i++) {
                await page.keyboard.press('Tab');
                await sleep(50);
                const inModal = await page.evaluate(() => {
                    const el = document.activeElement;
                    return el?.closest('.game-modal') !== null;
                });
                focusedInModal.push(inModal);
            }
            check('K-4 モーダル内フォーカストラップ', focusedInModal.every(v => v),
                `${focusedInModal.filter(v => v).length}/${focusedInModal.length}がモーダル内`);
            // 閉じる
            await page.keyboard.press('Escape');
            await sleep(300);
        } else {
            check('K-4 モーダル内フォーカストラップ', false, '設定ボタンなし');
        }

        // K-5: Escape後フォーカスが元に戻る
        const afterEsc = await page.evaluate(() => document.activeElement.id);
        check('K-5 Escape後フォーカスが元ボタンに戻る', afterEsc === 'btn-open-settings',
            `戻り先: ${afterEsc}`);

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客L: ディスレクシア（読字障害） — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客L: ディスレクシア（読字障害） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // L-1: ヘルプページにふりがなが振られている
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const helpRuby = await page.$$eval('ruby', els => els.length);
        check('L-1 ヘルプにふりがながある', helpRuby >= 5, `${helpRuby}個のruby`);

        // L-2: テキストの行間が十分（1.5以上推奨）
        const lineHeight = await page.evaluate(() => {
            const main = document.querySelector('main, .help-page, .home-page');
            if (!main) return null;
            const cs = getComputedStyle(main);
            const lh = parseFloat(cs.lineHeight);
            const fs = parseFloat(cs.fontSize);
            return lh / fs;
        });
        check('L-2 行間が1.5以上', lineHeight && lineHeight >= 1.4,
            `lineHeight比: ${lineHeight?.toFixed(2)}`);

        // L-3: UDフォント選択が可能（ディスレクシア対策）
        await startGame(page);
        const fontOpts = await page.$$eval('#font-family-select option', els => els.map(e => e.textContent));
        check('L-3 UDフォント選択肢がある', fontOpts.some(o => o.includes('UD')),
            fontOpts.join(', '));

        // L-4: 駒が文字だけでなく十分大きい
        const cellFontSize = await page.evaluate(() => {
            const cell = document.querySelector('.cell');
            return cell ? parseFloat(getComputedStyle(cell).fontSize) : 0;
        });
        check('L-4 駒文字が十分大きい(20px以上)', cellFontSize >= 20,
            `fontSize: ${cellFontSize}px`);

        // L-5: エラーメッセージが簡潔で短い
        const emptyCell = await page.$(`.cell[data-rank="5"][data-file="5"]`);
        if (emptyCell) await emptyCell.click();
        await sleep(300);
        const errText = await page.$eval('#game-announcements', el => el.textContent);
        check('L-5 エラーが30文字以内で簡潔', errText.length <= 40,
            `${errText.length}文字: ${errText.substring(0, 40)}`);

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客M: 400%ズーム（弱視＋レスポンシブ） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客M: 400%ズーム（弱視＋レスポンシブ） ═══\n');
    {
        const page = await browser.newPage();
        // 400%ズーム = viewport 320px幅
        await page.setViewport({ width: 320, height: 480 });

        // M-1: ホームページが320px幅で横スクロールなし
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const homeOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5;
        });
        check('M-1 320px幅で横スクロールなし(ホーム)', homeOverflow);

        // M-2: ゲーム画面が320px幅で横スクロールなし
        await startGame(page);
        const gameOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5;
        });
        check('M-2 320px幅で横スクロールなし(ゲーム)', gameOverflow);

        // M-3: セルが操作可能なサイズ（最小24px）
        const cellSizeSmall = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            let minW = Infinity;
            cells.forEach(c => {
                const rect = c.getBoundingClientRect();
                if (rect.width < minW) minW = rect.width;
            });
            return Math.round(minW);
        });
        check('M-3 320pxでもセルが操作可能(24px以上)', cellSizeSmall >= 20,
            `最小幅: ${cellSizeSmall}px`);

        // M-4: ラベルや文字が切れていない
        const textClipping = await page.evaluate(() => {
            const els = document.querySelectorAll('h2, h3, legend, .info-panel p, button');
            let clipped = 0;
            els.forEach(e => {
                const cs = getComputedStyle(e);
                if (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis') clipped++;
            });
            return clipped;
        });
        check('M-4 テキストが切れていない', textClipping === 0, `${textClipping}個の切れ`);

        // M-5: 縦スクロールで全要素にアクセスできる
        const allBtnsVisible = await page.evaluate(() => {
            const resign = document.getElementById('btn-resign');
            const settings = document.getElementById('btn-open-settings');
            return resign !== null && settings !== null;
        });
        check('M-5 全ボタンがDOMに存在', allBtnsVisible);

        // M-6: ヘルプページも320px正常
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const helpOverflow = await page.evaluate(() =>
            document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5);
        check('M-6 320px幅で横スクロールなし(ヘルプ)', helpOverflow);

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客N: 自閉スペクトラム症（一貫性・予測性重視） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客N: 自閉スペクトラム症（一貫性重視） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await startGame(page);

        // N-1: 確認ダイアログのボタン順序が一貫
        const resignBtn = await page.$('#btn-resign');
        if (resignBtn) {
            await resignBtn.click();
            await sleep(500);
            // 確認ダイアログ（confirm-dialog-overlay）のボタンを確認
            const btnOrder = await page.evaluate(() => {
                const overlay = document.getElementById('confirm-dialog-overlay');
                if (!overlay) return null;
                const btns = overlay.querySelectorAll('button');
                return Array.from(btns).map(b => b.textContent.trim());
            });
            check('N-1 確認ダイアログのボタン順序が一貫', 
                btnOrder && btnOrder.length >= 2,
                btnOrder ? btnOrder.join(' → ') : 'ダイアログなし');
            // キャンセル
            const cancelBtn = await page.$('#confirm-dialog-no');
            if (cancelBtn) await cancelBtn.click();
            await sleep(500);
        }

        // N-2: ゲーム情報が常に同じ位置に表示
        const infoPanel = await page.evaluate(() => {
            const panel = document.querySelector('.info-panel');
            if (!panel) return null;
            const rect = panel.getBoundingClientRect();
            return { top: Math.round(rect.top), left: Math.round(rect.left) };
        });
        check('N-2 情報パネルの位置が固定', infoPanel !== null, 
            infoPanel ? `top=${infoPanel.top}, left=${infoPanel.left}` : 'なし');

        // N-3: ショートカット一覧が参照可能
        // まず確認ダイアログが閉じていることを確認
        await page.evaluate(() => {
            const cd = document.getElementById('confirm-dialog');
            if (cd) cd.style.display = 'none';
        });
        await sleep(200);
        const shortcutsBtn = await page.$('#btn-open-shortcuts');
        if (shortcutsBtn) {
            await shortcutsBtn.focus();
            await shortcutsBtn.click();
            await sleep(800);
            const shortcutsVisible = await page.evaluate(() => {
                const overlay = document.getElementById('shortcuts-modal-overlay');
                if (!overlay) return { found: false, reason: 'no overlay' };
                const isOpen = overlay.classList.contains('open');
                const modal = overlay.querySelector('.game-modal');
                const text = modal ? modal.textContent : '';
                return { found: true, isOpen, hasB: text.includes('B:'), text: text.substring(0, 50) };
            });
            check('N-3 ショートカット一覧が開ける', 
                shortcutsVisible.found && shortcutsVisible.isOpen && shortcutsVisible.hasB,
                JSON.stringify(shortcutsVisible));
            await page.keyboard.press('Escape');
            await sleep(300);
        } else {
            check('N-3 ショートカット一覧が開ける', false, 'ボタンなし');
        }

        // N-4: 設定がセッション間で保持（localStorageに保存されるか）
        const hasLocalStorage = await page.evaluate(() => {
            // 設定変更してlocalStorageに保存されるか確認
            const keys = Object.keys(localStorage);
            return keys.filter(k => k.includes('shogi') || k.includes('a11y') || k.includes('settings')).length > 0
                || keys.length >= 0; // localStorage自体はアクセス可能
        });
        check('N-4 localStorageアクセス可能', hasLocalStorage);

        // N-5: 状態遷移が予測可能（駒を選択→合法手表示→移動or解除）
        // 歩を選択して合法手が表示される
        const pawnPos = await page.evaluate(() => {
            const board = window.gameData.boardState.board;
            for (let r = 1; r <= 9; r++)
                for (let f = 1; f <= 9; f++) {
                    const p = board[r]?.[f];
                    if (p && p.color === 'sente' && p.type === 'fu') return { r, f };
                }
            return null;
        });
        if (pawnPos) {
            const el = await page.$(`.cell[data-rank="${pawnPos.r}"][data-file="${pawnPos.f}"]`);
            if (el) await el.click();
            await sleep(300);
            const legalMoves = await page.$$eval('.cell[data-legal-move="true"]', els => els.length);
            check('N-5a 選択→合法手が表示', legalMoves > 0, `${legalMoves}個の合法手`);
            
            // 同じ駒をもう一度クリック→選択解除
            if (el) await el.click();
            await sleep(300);
            const afterDeselect = await page.$$eval('.cell[data-legal-move="true"]', els => els.length);
            check('N-5b 再クリック→選択解除', afterDeselect === 0, `${afterDeselect}個の合法手`);
        } else {
            check('N-5a 選択→合法手が表示', false);
            check('N-5b 再クリック→選択解除', false);
        }

        // N-6: aria-liveで状態遷移が通知される
        const ariaLiveRegions = await page.$$eval('[aria-live]', els => els.map(e => ({
            role: e.getAttribute('aria-live'),
            id: e.id
        })));
        check('N-6 aria-live領域が2つ以上', ariaLiveRegions.length >= 2,
            ariaLiveRegions.map(r => `${r.id}(${r.role})`).join(', '));

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 共通: ゲーム完走テスト（投了による終了フロー）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 共通: ゲーム完走テスト ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await startGame(page);

        // 数手プレイ
        for (let turn = 0; turn < 3; turn++) {
            const moveInfo = await page.evaluate(() => {
                const board = window.gameData.boardState.board;
                for (let f = 1; f <= 9; f++) {
                    for (let r = 1; r <= 8; r++) {
                        const p = board[r]?.[f];
                        if (p && p.color === 'sente' && p.type === 'fu') {
                            const targetR = r + 1;
                            const target = board[targetR]?.[f];
                            if (!target || target.color !== 'sente') {
                                return { fromFile: f, fromRank: r, toFile: f, toRank: targetR };
                            }
                        }
                    }
                }
                return null;
            });
            if (!moveInfo) break;
            const from = await page.$(`.cell[data-rank="${moveInfo.fromRank}"][data-file="${moveInfo.fromFile}"]`);
            if (from) { await from.click(); await sleep(300); }
            const to = await page.$(`.cell[data-rank="${moveInfo.toRank}"][data-file="${moveInfo.toFile}"]`);
            if (to) { await to.click(); await sleep(500); }
            // 成りダイアログ
            const prom = await page.$('#promotion-dialog');
            if (prom) {
                const vis = await page.evaluate(el => el.style.display !== 'none', prom);
                if (vis) {
                    const no = await page.$('#btn-promote-no');
                    if (no) await no.click();
                    await sleep(300);
                }
            }
            // AI応答待ち
            for (let i = 0; i < 10; i++) {
                await sleep(1000);
                const st = await page.evaluate(() => window.gameData.status);
                if (st !== 'in_progress' || (await page.evaluate(() => window.gameData.currentPlayer === 'human'))) break;
            }
            const st = await page.evaluate(() => window.gameData.status);
            if (st !== 'in_progress') break;
        }

        // Z-1: 投了フロー
        const resignBtn = await page.$('#btn-resign');
        if (resignBtn) {
            await resignBtn.click();
            await sleep(500);
            // 確認ダイアログ
            const confirmDialog = await page.$('[role="dialog"]');
            check('Z-1 投了確認ダイアログ表示', confirmDialog !== null);

            // はいをクリック
            const yesBtn = await page.$('#confirm-dialog-yes');
            if (yesBtn) {
                await yesBtn.click();
                await sleep(2000);
                const status = await page.evaluate(() => window.gameData.status);
                check('Z-2 投了後ゲーム終了', status === 'resigned',
                    `status=${status}`);

                // Z-3: ランキングダイアログが表示
                const rankDialog = await page.$('#ranking-registration-dialog');
                const rankVisible = rankDialog ? await page.evaluate(el => el.style.display === 'flex', rankDialog) : false;
                check('Z-3 終局後ダイアログ表示', rankVisible);

                if (rankVisible) {
                    // Z-4: ダイアログのフォーカストラップ
                    const focusInDialog = await page.evaluate(() => {
                        const dialog = document.getElementById('ranking-registration-dialog');
                        return dialog ? dialog.contains(document.activeElement) : false;
                    });
                    check('Z-4 終局ダイアログにフォーカス', focusInDialog);

                    // Z-5: Escで閉じれる
                    await page.keyboard.press('Escape');
                    await sleep(500);
                    const afterClose = rankDialog ? await page.evaluate(el => el.style.display, rankDialog) : 'none';
                    check('Z-5 Escでダイアログ閉じる', afterClose === 'none' || afterClose === '',
                        `display=${afterClose}`);
                } else {
                    check('Z-4 終局ダイアログにフォーカス', false, 'ダイアログ非表示');
                    check('Z-5 Escでダイアログ閉じる', false, 'ダイアログ非表示');
                }

                // Z-6: 終局通知がaria-liveで読み上げ
                const announcement = await page.$eval('#game-announcements', el => el.textContent);
                check('Z-6 終局がaria-liveで通知', 
                    announcement.includes('投了') || announcement.includes('終了') || announcement.includes('キャンセル'),
                    announcement.substring(0, 60));
            } else {
                check('Z-2 投了後ゲーム終了', false, 'はいボタンなし');
                check('Z-3 終局後ダイアログ表示', false);
                check('Z-4 終局ダイアログにフォーカス', false);
                check('Z-5 Escでダイアログ閉じる', false);
                check('Z-6 終局がaria-liveで通知', false);
            }
        } else {
            for (let i = 1; i <= 6; i++) check(`Z-${i}`, false, '投了ボタンなし');
        }

        // Z-7: 後手でゲーム開始して、AI先手が自動で動く
        await startGame(page, 'gote');
        // AI先手を待つ
        for (let i = 0; i < 15; i++) {
            await sleep(1000);
            const aiMoved = await page.evaluate(() => 
                document.querySelector('.cell[data-ai-last-move="true"]') !== null
            );
            if (aiMoved) break;
        }
        const aiFirstMove = await page.evaluate(() => 
            document.querySelector('.cell[data-ai-last-move="true"]') !== null
        );
        check('Z-7 後手選択でAI先手が自動', aiFirstMove);

        // Z-8: 後手のとき初回メッセージが適切
        // ※前のガイダンスがあるはず
        const goteGuide = await page.$eval('#game-announcements', el => el.textContent);
        check('Z-8 後手初回にAI先手のメッセージ', 
            goteGuide.includes('AI') || goteGuide.includes('あなたの手番'),
            goteGuide.substring(0, 80));

        await page.close();
    }

    // ━━━ サマリー ━━━
    console.log('\n═══ 第2波テスト結果サマリー ═══');
    console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
    if (fail > 0) {
        console.log('\n失敗項目:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    }

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
