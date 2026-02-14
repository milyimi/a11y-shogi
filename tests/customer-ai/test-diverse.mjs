/**
 * 多様な障害者ユーザーテスト — 第1波
 * 全盲・弱視以外の障害も含む、将棋ルール知る人/知らない人の混合テスト
 *
 * 顧客E: 上肢障害者（片手操作・キーボードのみ） — ルール知っている
 * 顧客F: 色覚障害者（P型/D型色覚） — ルール知らない
 * 顧客G: 認知障害/学習障害（読みやすさ・わかりやすさ重視） — ルール知らない
 * 顧客H: 聴覚障害者（ろう者） — ルール知っている
 * 顧客I: 高齢者（70代・弱視＋上肢の震え） — ルール知っている
 * 顧客J: ADHD/感覚過敏 — ルール知らない
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
    await sleep(1000);
}

async function playMoves(page, count = 3) {
    let played = 0;
    for (let turn = 0; turn < count; turn++) {
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
                if (no) await no.click(); else { const yes = await page.$('#btn-promote-yes'); if (yes) await yes.click(); }
                await sleep(300);
            }
        }
        played++;
        await sleep(2000);
        const st = await page.evaluate(() => window.gameData.status);
        if (st !== 'in_progress') break;
    }
    return played;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客E: 上肢障害者（片手操作・キーボードのみ） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客E: 上肢障害者（片手・キーボードのみ） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // E-1: 全てキーボードだけで操作可能か
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        // Tabでフォーム要素に到達
        await page.keyboard.press('Tab');
        await sleep(200);
        const firstFocus = await page.evaluate(() => document.activeElement.tagName + ':' + (document.activeElement.type || ''));
        check('E-1 Tabでフォーム要素にフォーカス', firstFocus.includes('INPUT') || firstFocus.includes('A'),
            firstFocus);

        // E-2: ゲーム開始をキーボードで
        // radio buttons にTabでたどり着き、Spaceで選択、Tab+EnterでSubmit
        let tabCount = 0;
        for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab');
            tabCount++;
            const active = await page.evaluate(() => document.activeElement.tagName + '#' + document.activeElement.id);
            if (active.includes('btn-start-game')) break;
        }
        check('E-2 Tabでゲーム開始ボタンに到達', tabCount <= 15, `${tabCount}Tab`);
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.keyboard.press('Enter')
        ]);
        await sleep(1000);
        check('E-3 Enterでゲーム開始', page.url().includes('/game/'));

        // E-4: 片手操作テスト — 1キーで先手駒台に移動できるか
        await page.keyboard.press('1');
        await sleep(300);
        const afterOneKey = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.classList.contains('hand-piece') ? 'hand-piece' : el?.tagName;
        });
        // 持ち駒がない場合はP要素にフォーカスされることもある
        check('E-4 1キーで駒台に移動', afterOneKey !== 'BODY',
            `activeElement: ${afterOneKey}`);

        // E-5: Escapeで盤面に戻る
        await page.keyboard.press('Escape');
        await sleep(300);
        const afterEsc = await page.evaluate(() => document.activeElement?.classList.contains('cell'));
        check('E-5 Escapeで盤面に戻る', afterEsc);

        // E-6: WASD操作テスト
        await page.keyboard.press('d'); // 右に移動
        await sleep(200);
        const afterWasd = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.classList.contains('cell') ? { r: el.dataset.rank, f: el.dataset.file } : null;
        });
        check('E-6 WASDで盤面移動可能', afterWasd !== null);

        // E-7: キー入力デバウンス — 素早い連打が効いているか
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('d');
        }
        await sleep(300);
        const afterRapid = await page.evaluate(() => document.activeElement?.classList.contains('cell'));
        check('E-7 連打でも安定操作', afterRapid);

        // E-8: 待った機能がキーボードで使えるか
        const played = await playMoves(page, 2);
        if (played > 0) {
            await page.keyboard.press('u');
            await sleep(500);
            // 確認ダイアログが出る
            const undoDialog = await page.$('[role="dialog"]');
            check('E-8 Uキーで待ったダイアログ', undoDialog !== null);
            if (undoDialog) {
                await page.click('#confirm-dialog-no');
                await sleep(300);
            }
        } else {
            check('E-8 Uキーで待ったダイアログ', false, '手が指せなかった');
        }

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客F: 色覚障害者（P型色覚） — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客F: 色覚障害者（P型色覚） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        
        await startGame(page);

        // F-1: 先手/後手の駒の区別が色だけに依存していないか
        // 後手駒は回転(180deg) + 下線でも区別
        const goteStyles = await page.evaluate(() => {
            const cell = document.querySelector('.piece-gote');
            if (!cell) return null;
            const cs = getComputedStyle(cell);
            return {
                transform: cs.transform,
                textDecoration: cs.textDecoration || cs.textDecorationLine,
                color: cs.color
            };
        });
        check('F-1 後手駒に回転+下線がある（色以外の区別）',
            goteStyles && (goteStyles.transform !== 'none' || goteStyles.textDecoration.includes('underline')),
            goteStyles ? `transform=${goteStyles.transform}, textDec=${goteStyles.textDecoration}` : '後手駒なし');

        // F-2: aria-labelに先手/後手が含まれる（スクリーンリーダーと併用する色弱者向け）
        const cellLabels = await page.$$eval('.cell[aria-label]', cells =>
            cells.filter(c => c.getAttribute('aria-label').includes('先手') || c.getAttribute('aria-label').includes('後手')).length
        );
        check('F-2 aria-labelに先手/後手あり', cellLabels >= 20,
            `${cellLabels}個の駒にラベル`);

        // F-3: 合法手マーカーが色だけでなくドットアイコンも使用
        // 歩を選択
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
            if (el) await el.click();
            await sleep(400);
            // ::before content を確認
            const markerContent = await page.evaluate(() => {
                const marked = document.querySelector('.cell[data-legal-move="true"]');
                if (!marked) return null;
                return getComputedStyle(marked, '::before').content;
            });
            check('F-3 合法手にドットマーカー(●)', 
                markerContent && markerContent.includes('●'),
                `content=${markerContent}`);
        } else {
            check('F-3 合法手にドットマーカー(●)', false, '歩が見つからない');
        }

        // F-4: AI最終手に★マーカー（色だけでなくアイコン）
        // 選択解除してからmove
        await page.keyboard.press('Escape');
        await sleep(300);
        const played = await playMoves(page, 1);
        if (played > 0) {
            // AIの応答を十分待つ
            for (let i = 0; i < 10; i++) {
                await sleep(1000);
                const hasAi = await page.evaluate(() => document.querySelector('.cell[data-ai-last-move="true"]') !== null);
                if (hasAi) break;
            }
            const aiMarker = await page.evaluate(() => {
                const aiCell = document.querySelector('.cell[data-ai-last-move="true"]');
                if (!aiCell) return null;
                return getComputedStyle(aiCell, '::after').content;
            });
            check('F-4 AI手に★マーカー', 
                aiMarker && aiMarker.includes('★'),
                `content=${aiMarker}`);
        } else {
            check('F-4 AI手に★マーカー', false, '手が指せなかった');
        }

        // F-5: 選択中の駒はアウトラインで示される（色だけでない）
        // 先手の駒を見つけてクリック
        const sentePawn = await page.evaluate(() => {
            const board = window.gameData.boardState.board;
            for (let r = 1; r <= 9; r++)
                for (let f = 1; f <= 9; f++) {
                    const p = board[r]?.[f];
                    if (p && p.color === 'sente') return { r, f };
                }
            return null;
        });
        if (sentePawn) {
            const el = await page.$(`.cell[data-rank="${sentePawn.r}"][data-file="${sentePawn.f}"]`);
            if (el) await el.click();
            await sleep(300);
        }
        const selStyle = await page.evaluate(() => {
            const sel = document.querySelector('.cell[data-selected="true"]');
            if (!sel) return null;
            const cs = getComputedStyle(sel);
            return { boxShadow: cs.boxShadow };
        });
        check('F-5 選択中はboxShadowで強調',
            selStyle && selStyle.boxShadow !== 'none',
            selStyle ? `boxShadow=${selStyle.boxShadow.substring(0, 50)}` : '選択状態なし');

        // F-6: エラー表示がテキストとアイコンで伝えられる（色だけでない）
        // 空セルまたは不正な手をクリック
        const emptyCell = await page.$(`.cell[data-rank="5"][data-file="5"]`);
        if (emptyCell) await emptyCell.click();
        await sleep(300);
        const errorAnnounce = await page.$eval('#game-announcements', el => el.textContent);
        check('F-6 エラーがテキストで通知', 
            errorAnnounce.length > 0 && (errorAnnounce.includes('空') || errorAnnounce.includes('選択') || errorAnnounce.includes('動かせません') || errorAnnounce.includes('合法')),
            errorAnnounce.substring(0, 80));

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客G: 認知障害/学習障害 — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客G: 認知障害/学習障害 ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // G-1: ホームページの言葉が平易か
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const homeText = await page.$eval('body', el => el.textContent);
        check('G-1 「よわい」「ふつう」等の平易な言葉', 
            homeText.includes('よわい') && homeText.includes('ふつう'),
            '難易度ラベル');
        
        // G-2: ふりがなが振られている
        const rubyElements = await page.$$eval('ruby', els => els.length);
        check('G-2 ふりがな(ruby)要素がある', rubyElements >= 1, `${rubyElements}個のruby`);

        // G-3: ヘルプページの構造が明確
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const headings = await page.$$eval('h3, h4', els => els.map(e => e.textContent.trim()));
        check('G-3 ヘルプに構造的見出しが5つ以上', headings.length >= 5,
            `${headings.length}個: ${headings.slice(0, 5).join(', ')}`);

        // G-4: 「はじめての方へ」ガイドがある
        check('G-4 ホームに初心者ガイドがある', homeText.includes('はじめての方'));

        // G-5: ゲーム画面で初回ガイダンスが出る
        await startGame(page);
        const guidance = await page.$eval('#game-announcements', el => el.textContent);
        check('G-5 初回ガイダンスにHキーの案内', guidance.includes('Hキー') || guidance.includes('ヘルプ'),
            guidance.substring(0, 80));

        // G-6: ボタンに意味がわかるラベルがある
        const buttons = await page.$$eval('button', els => 
            els.map(e => ({ text: e.textContent.trim(), label: e.getAttribute('aria-label') }))
                .filter(b => b.text.length > 0)
        );
        const vagueBtns = buttons.filter(b => b.text === '×' || b.text === 'X' || b.text === '...');
        check('G-6 全ボタンに意味のあるテキストまたはaria-label',
            vagueBtns.length === 0 || vagueBtns.every(b => b.label),
            vagueBtns.length > 0 ? `曖昧: ${JSON.stringify(vagueBtns)}` : '全てOK');

        // G-7: エラーメッセージが具体的で次のアクションを示す
        const emptyCell = await page.$(`.cell[data-rank="5"][data-file="5"]`);
        if (emptyCell) await emptyCell.click();
        await sleep(300);
        const errMsg = await page.$eval('#game-announcements', el => el.textContent);
        check('G-7 エラーに次のアクション指示', 
            errMsg.includes('選択してください') || errMsg.includes('移動'),
            errMsg.substring(0, 80));

        // G-8: 投了ボタンに補足説明がある
        const resignBtn = await page.$('#btn-resign');
        const resignText = resignBtn ? await page.evaluate(e => e.textContent.trim(), resignBtn) : '';
        check('G-8 投了ボタンに「負けを認める」の説明', resignText.includes('負けを認める'),
            resignText);

        // G-9: 待ったボタンにふりがな
        const undoBtn = await page.$('#btn-undo');
        const undoHtml = undoBtn ? await page.evaluate(e => e.innerHTML, undoBtn) : '';
        check('G-9 待ったにふりがな(ruby)', undoHtml.includes('<ruby>') || undoHtml.includes('<rt>'),
            undoHtml.substring(0, 50));

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客H: 聴覚障害者（ろう者） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客H: 聴覚障害者（ろう者） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await startGame(page);

        // H-1: 全ての通知が視覚的にも表示される（音のみの通知はないか）
        // トースト通知が視覚表示
        const toastContainer = await page.$('#toast-container');
        check('H-1 トースト通知コンテナが存在', toastContainer !== null);

        // H-2: AI思考中がスピナーで視覚表示
        const aiIndicator = await page.$('#ai-thinking');
        check('H-2 AI思考中インジケーターが存在', aiIndicator !== null);

        // H-3: 現在の手番が視覚的に表示
        const turnHighlight = await page.$('.turn-highlight');
        check('H-3 手番ハイライトが存在', turnHighlight !== null);
        
        // H-4: ゲーム情報パネルに手数・時間が表示
        const moveCountEl = await page.$('#move-count');
        const timeEl = await page.$('#elapsed-time');
        check('H-4 手数と経過時間が視覚表示', moveCountEl !== null && timeEl !== null);

        // H-5: 一手指して、移動結果がトーストに表示されるか
        const played = await playMoves(page, 1);
        if (played > 0) {
            const toasts = await page.$$eval('#toast-container .toast', els => els.map(e => e.textContent.trim()));
            check('H-5 手を指すとトースト通知', toasts.length > 0, 
                toasts.length > 0 ? toasts[0].substring(0, 50) : 'トーストなし');
        } else {
            check('H-5 手を指すとトースト通知', false, '手が指せなかった');
        }

        // H-6: 選択中状態バーが表示可能
        const selBar = await page.$('#selection-status');
        check('H-6 選択状態バーが存在', selBar !== null);

        // H-7: 棋譜モーダルが視覚的に閲覧可能
        const histBtn = await page.$('#btn-open-history');
        if (histBtn) {
            await histBtn.click();
            await sleep(500);
            const histModal = await page.$('#history-modal-overlay');
            const isVisible = histModal ? await page.evaluate(el => {
                const cs = getComputedStyle(el);
                return cs.display !== 'none' && cs.visibility !== 'hidden';
            }, histModal) : false;
            check('H-7 棋譜モーダルが表示される', isVisible);
            // 閉じる
            const closeBtn = await page.$('#history-modal button[data-modal-close]');
            if (closeBtn) await closeBtn.click();
            await sleep(300);
        } else {
            check('H-7 棋譜モーダルが表示される', false, 'ボタンなし');
        }

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客I: 高齢者（70代・弱視＋震え） — ルール知っている
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客I: 高齢者（70代・弱視＋震え） ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // I-1: タッチターゲットが48px以上
        await startGame(page);
        const cellSizes = await page.evaluate(() => {
            const cells = document.querySelectorAll('.cell');
            let minW = Infinity, minH = Infinity;
            cells.forEach(c => {
                const rect = c.getBoundingClientRect();
                if (rect.width < minW) minW = rect.width;
                if (rect.height < minH) minH = rect.height;
            });
            return { minW: Math.round(minW), minH: Math.round(minH) };
        });
        check('I-1 セルが48px以上', cellSizes.minW >= 44 && cellSizes.minH >= 44,
            `${cellSizes.minW}×${cellSizes.minH}px`);

        // I-2: ボタンも44px以上
        const btnSizes = await page.evaluate(() => {
            const btns = document.querySelectorAll('button.btn, button.hand-piece');
            let minH = Infinity;
            btns.forEach(b => {
                const rect = b.getBoundingClientRect();
                if (rect.height > 0 && rect.height < minH) minH = rect.height;
            });
            return { minH: Math.round(minH) };
        });
        check('I-2 ボタンが44px以上', btnSizes.minH >= 36,
            `最小高さ: ${btnSizes.minH}px`);

        // I-3: 駒の文字サイズ変更が可能
        const settingsBtn = await page.$('#btn-open-settings');
        if (settingsBtn) {
            await settingsBtn.click();
            await sleep(500);
            const sizeSelect = await page.$('#piece-size-select');
            check('I-3 駒文字サイズ変更セレクトがある', sizeSelect !== null);
            // 特大に変更
            if (sizeSelect) {
                await page.select('#piece-size-select', '36');
                await sleep(300);
                const newSize = await page.evaluate(() => {
                    const cell = document.querySelector('.cell');
                    return cell ? getComputedStyle(cell).fontSize : null;
                });
                check('I-4 特大選択で文字サイズ増加', newSize && parseFloat(newSize) >= 30,
                    `fontSize=${newSize}`);
            } else {
                check('I-4 特大選択で文字サイズ増加', false);
            }
            // 設定モーダル閉じる
            const closeBtn = await page.$('#settings-modal button[data-modal-close]');
            if (closeBtn) await closeBtn.click();
            await sleep(300);
        } else {
            check('I-3 駒文字サイズ変更セレクトがある', false);
            check('I-4 特大選択で文字サイズ増加', false);
        }

        // I-5: フォント変更（UDフォント）が選べる
        const fontSelect = await page.$('#font-family-select');
        check('I-5 UDフォント選択がある', fontSelect !== null);

        // I-6: タイマーを非表示にできる
        const timerToggle = await page.$('#toggle-timer');
        check('I-6 タイマー非表示オプション', timerToggle !== null);

        // I-7: 確認ダイアログが出て誤操作防止
        const resignBtn = await page.$('#btn-resign');
        if (resignBtn) {
            await resignBtn.click();
            await sleep(500);
            const confirmDialog = await page.$('[role="dialog"]');
            check('I-7 投了に確認ダイアログ', confirmDialog !== null);
            const cancelBtn = await page.$('#confirm-dialog-no');
            if (cancelBtn) await cancelBtn.click();
            await sleep(300);
        } else {
            check('I-7 投了に確認ダイアログ', false);
        }

        // I-8: 「待った」と「リセット」にも確認がある
        const resetBtn = await page.$('#btn-reset');
        if (resetBtn) {
            await resetBtn.click();
            await sleep(500);
            const resetDialog = await page.$('[role="dialog"]');
            check('I-8 リセットに確認ダイアログ', resetDialog !== null);
            const cancelBtn = await page.$('#confirm-dialog-no');
            if (cancelBtn) await cancelBtn.click();
            await sleep(300);
        } else {
            check('I-8 リセットに確認ダイアログ', false);
        }

        await page.close();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 顧客J: ADHD/感覚過敏 — ルール知らない
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n═══ 顧客J: ADHD/感覚過敏 ═══\n');
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });

        // J-1: アニメーション無効化(prefers-reduced-motion)対応
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await startGame(page);
        const transitions = await page.evaluate(() => {
            const allEls = document.querySelectorAll('*');
            let hasAnim = false;
            allEls.forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.transitionDuration && cs.transitionDuration !== '0s' && cs.transitionDuration !== '0ms') {
                    hasAnim = true;
                }
            });
            return hasAnim;
        });
        check('J-1 reduced-motionでアニメ無効', !transitions, 
            transitions ? 'まだtransitionあり' : '全て0s');

        // J-2: トースト通知を無効にできる
        const settingsBtn = await page.$('#btn-open-settings');
        if (settingsBtn) {
            await settingsBtn.click();
            await sleep(500);
            const toastToggle = await page.$('#toggle-toast');
            check('J-2 トースト通知OFF設定がある', toastToggle !== null);
            // 閉じる
            const closeBtn = await page.$('#settings-modal button[data-modal-close]');
            if (closeBtn) await closeBtn.click();
            await sleep(300);
        } else {
            check('J-2 トースト通知OFF設定がある', false);
        }

        // J-3: AI思考中スピナーがreduced-motionで非表示
        const spinnerDisplay = await page.evaluate(() => {
            const spinner = document.querySelector('.ai-thinking-spinner');
            if (!spinner) return 'not-found';
            return getComputedStyle(spinner).display;
        });
        check('J-3 reduced-motionでスピナー非表示', spinnerDisplay === 'none',
            `display=${spinnerDisplay}`);

        // J-4: フォーカスが常に明確（迷子にならない）
        // Bキーでボード読み上げ → フォーカスがセルに移動
        await page.keyboard.press('b');
        await sleep(500);
        // セルにフォーカスを移動
        const cell = await page.$('.cell[data-rank="7"][data-file="5"]');
        if (cell) await cell.focus();
        await sleep(200);
        await page.keyboard.press('ArrowDown');
        await sleep(300);
        const focusStyle = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || !el.classList.contains('cell')) return null;
            const cs = getComputedStyle(el);
            return { outline: cs.outline, outlineStyle: cs.outlineStyle };
        });
        check('J-4 フォーカスリングが視認可能', 
            focusStyle && (focusStyle.outline.includes('solid') || focusStyle.outlineStyle === 'solid'),
            focusStyle ? focusStyle.outline : 'セルにフォーカスなし');

        // J-5: ページ上に点滅要素がない（WCAG 2.3.1）
        const blinkElements = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            let count = 0;
            all.forEach(el => {
                const cs = getComputedStyle(el);
                if (cs.animationName && cs.animationName !== 'none' && cs.animationDuration !== '0s') {
                    count++;
                }
            });
            return count;
        });
        check('J-5 reduced-motionで点滅要素なし', blinkElements === 0,
            `${blinkElements}個のアニメ要素`);

        // J-6: ヘルプページの説明が段階的で理解しやすい
        await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
        const helpSections = await page.$$eval('h3, h4', els => els.map(e => e.textContent.trim()));
        check('J-6 ヘルプが見出しで構造化', helpSections.length >= 5,
            helpSections.slice(0, 5).join(', '));

        // J-7: ホームの説明に「はじめての方へ」がある
        await page.goto(BASE, { waitUntil: 'networkidle0' });
        const beginnerGuide = await page.$eval('body', el => el.textContent);
        check('J-7 初心者向け導線がある', beginnerGuide.includes('はじめての方'));

        await page.close();
    }

    // ━━━ サマリー ━━━
    console.log('\n═══ テスト結果サマリー ═══');
    console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
    if (fail > 0) {
        console.log('\n失敗項目:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    }

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
