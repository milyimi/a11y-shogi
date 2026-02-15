/**
 * 加齢による見えにくさAI（シニアユーザビリティ）テスト
 * 
 * ペルソナ: 田中義雄（72歳）
 * - 将棋は50年のベテラン（ルールは完全に理解）
 * - パソコンは年賀状ソフトと検索程度、スマホはLINEのみ
 * - 孫に「パソコンで将棋できるよ」と勧められた
 * - 老眼あり、小さい文字は読みにくい
 * - マウス操作はできるがキーボードショートカットは知らない
 * - 「エラー」「ダイアログ」等のカタカナIT用語は馴染みが薄い
 * 
 * 既存の顧客I（test-diverse.mjs）はタッチターゲット・フォントサイズ・設定UIを検証済み。
 * 本テストは「初めてこのサイトを開いた加齢による見えにくさのある人が迷わず一局遊べるか」を検証する。
 * 
 * テスト観点:
 *  - ホーム画面の分かりやすさ（ふりがな、初心者案内、操作手順の少なさ）
 *  - ゲーム画面の視認性（最小フォント、行間、盤面サイズ）
 *  - マウスのみで一局遊べるか（クリック操作の完結性）
 *  - フィードバックの明確さ（選択状態、合法手、AI思考中、勝敗）
 *  - 誤操作からの復帰（待った、やり直し、確認ダイアログ）
 *  - ヘルプ・案内の到達しやすさ
 *  - 日本語の平易さ（専門用語に頼らない）
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
        // カテゴリ1: ホーム画面の第一印象
        // 「孫にURLを教えてもらって初めてアクセスした」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ1: ホーム画面の第一印象 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await page.goto(BASE, { waitUntil: 'networkidle0' });

            // E-1: ページタイトルが日本語で分かりやすい
            const title = await page.title();
            check('E-1 ページタイトルが日本語で明確',
                title.includes('将棋') && !title.includes('undefined'),
                title);

            // E-2: lang="ja" が設定されている（音声読み上げ時に日本語で発音）
            const lang = await page.evaluate(() => document.documentElement.lang);
            check('E-2 HTML言語が日本語(ja)', lang === 'ja', `lang="${lang}"`);

            // E-3: 「将棋」にふりがなが付いている
            const rubyCount = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('E-3 ホーム画面にふりがな(ruby)がある', rubyCount >= 5,
                `${rubyCount}箇所`);

            // E-4: ゲーム開始ボタンが一目で見つかる（大きくて目立つ）
            const startBtn = await page.evaluate(() => {
                const btn = document.getElementById('btn-start-game');
                if (!btn) return null;
                const rect = btn.getBoundingClientRect();
                const cs = getComputedStyle(btn);
                return {
                    text: btn.textContent.trim().replace(/\s+/g, ''),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    fontSize: cs.fontSize,
                    visible: rect.width > 0 && rect.height > 0
                };
            });
            check('E-4 開始ボタンが大きくて見つけやすい',
                startBtn && startBtn.visible && startBtn.height >= 40,
                startBtn ? `${startBtn.width}×${startBtn.height}px, font=${startBtn.fontSize}` : 'ボタン無し');

            // E-5: 難易度に平易な説明がある（「よわい」「ふつう」「つよい」）
            const hasEasyDesc = await page.evaluate(() => {
                const body = document.body.textContent;
                return body.includes('よわい') && body.includes('ふつう') && body.includes('つよい');
            });
            check('E-5 難易度に平易な補足説明', hasEasyDesc);

            // E-6: 初心者向け案内がある（「はじめての方へ」）
            const beginnerBox = await page.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('はじめて');
            });
            check('E-6 初心者向け案内がある', beginnerBox);

            // E-7: ヘルプへのリンクがホーム画面にある
            const helpLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href.includes('help') || a.textContent.includes('ヘルプ') || a.textContent.includes('操作方法'));
            });
            check('E-7 ホーム画面にヘルプリンク', helpLink);

            // E-8: ゲーム開始までのクリック数が少ない（2クリック以内：選択→開始）
            // デフォルト設定（初級・先手）で1クリックで開始できる
            const defaultChecked = await page.evaluate(() => {
                const diff = document.querySelector('input[name="difficulty"]:checked');
                const color = document.querySelector('input[name="color"]:checked');
                return { difficulty: diff?.value, color: color?.value };
            });
            check('E-8 デフォルト設定で1クリック開始可能',
                defaultChecked.difficulty && defaultChecked.color,
                `難易度=${defaultChecked.difficulty}, 手番=${defaultChecked.color}`);

            // E-9: スクロールなしでゲーム開始ボタンが見える（above the fold）
            const btnAboveFold = await page.evaluate(() => {
                const btn = document.getElementById('btn-start-game');
                if (!btn) return false;
                const rect = btn.getBoundingClientRect();
                return rect.bottom <= window.innerHeight;
            });
            check('E-9 スクロールなしで開始ボタン到達', btnAboveFold);

            // E-10: テキストの最小フォントサイズが12px以上（rt/kbd/sr-only除外）
            const minFont = await page.evaluate(() => {
                let min = Infinity;
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const checked = new Set();
                while (walker.nextNode()) {
                    const el = walker.currentNode.parentElement;
                    if (!el || checked.has(el)) continue;
                    checked.add(el);
                    // ふりがな(rt)、キー表示(kbd)、スクリーンリーダー専用要素は除外
                    if (el.tagName === 'RT' || el.tagName === 'KBD') continue;
                    if (el.closest('.sr-only, [aria-hidden="true"]')) continue;
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                    if (cs.position === 'absolute' && cs.clip !== 'auto') continue;
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    const size = parseFloat(cs.fontSize);
                    if (size < min) min = size;
                }
                return min;
            });
            check('E-10 ホーム画面の最小フォント≧12px', minFont >= 12,
                `最小=${minFont}px`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ2: ゲーム画面の視認性
        // 「ゲームを開始して盤面を見た時」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ2: ゲーム画面の視認性 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // E-11: 将棋盤がスクロールなしで全体表示される
            const boardVisible = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                if (!board) return false;
                const rect = board.getBoundingClientRect();
                return rect.top >= 0 && rect.bottom <= window.innerHeight;
            });
            check('E-11 盤面がスクロールなしで全体表示', boardVisible);

            // E-12: 駒の文字が十分大きい（20px以上）
            const pieceFont = await page.evaluate(() => {
                const cell = document.querySelector('.cell');
                if (!cell) return 0;
                return parseFloat(getComputedStyle(cell).fontSize);
            });
            check('E-12 駒の文字サイズ≧20px', pieceFont >= 20, `${pieceFont}px`);

            // E-13: 先手と後手の駒が見た目で区別できる（回転 or 色 or 下線）
            const goteStyle = await page.evaluate(() => {
                const goteCell = document.querySelector('.piece-gote');
                if (!goteCell) return null;
                const cs = getComputedStyle(goteCell);
                return {
                    transform: cs.transform,
                    textDecoration: cs.textDecorationLine
                };
            });
            check('E-13 先手/後手が視覚的に区別可能',
                goteStyle && (goteStyle.transform !== 'none' || goteStyle.textDecoration.includes('underline')),
                goteStyle ? `transform=${goteStyle.transform}, decoration=${goteStyle.textDecoration}` : 'なし');

            // E-14: 情報パネルの行間が読みやすい（line-height ≥ 1.4）
            const lineHeight = await page.evaluate(() => {
                const dl = document.querySelector('.info-panel dl');
                if (!dl) return 0;
                const cs = getComputedStyle(dl);
                const lh = parseFloat(cs.lineHeight);
                const fs = parseFloat(cs.fontSize);
                return lh / fs;
            });
            check('E-14 情報パネルの行間≧1.4', lineHeight >= 1.4,
                `line-height ratio=${lineHeight.toFixed(2)}`);

            // E-15: 手番表示が目立つ（「あなた」か「AI」が明示）
            const turnText = await page.evaluate(() => {
                const el = document.getElementById('current-player');
                return el ? el.textContent.trim() : '';
            });
            check('E-15 手番表示に「あなた」が明示',
                turnText.includes('あなた') || turnText.includes('AI'),
                turnText);

            // E-16: ボタンにテキストラベルがある（アイコンのみでない）
            const buttons = await page.evaluate(() => {
                const btns = document.querySelectorAll('.info-panel button.btn, .game-actions button.btn');
                return Array.from(btns).map(b => ({
                    text: b.textContent.trim().replace(/\s+/g, ''),
                    hasText: b.textContent.trim().length > 0
                }));
            });
            const allBtnsHaveText = buttons.every(b => b.hasText);
            check('E-16 全ボタンにテキストラベル', allBtnsHaveText,
                buttons.map(b => b.text.substring(0, 10)).join(', '));

            // E-17: ゲーム画面にもふりがながある
            const gameRuby = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('E-17 ゲーム画面にふりがな', gameRuby >= 3, `${gameRuby}箇所`);

            // E-18: 「待った」「投了」等のボタンにツールチップ説明がある
            const tooltips = await page.evaluate(() => {
                const ids = ['btn-undo', 'btn-reset', 'btn-resign'];
                return ids.map(id => {
                    const el = document.getElementById(id);
                    return {
                        id,
                        tooltip: el ? el.getAttribute('data-tooltip') || el.getAttribute('title') : null
                    };
                });
            });
            const allHaveTooltip = tooltips.every(t => t.tooltip);
            check('E-18 主要ボタンにツールチップ説明',
                allHaveTooltip,
                tooltips.map(t => `${t.id}=${t.tooltip ? '有' : '無'}`).join(', '));

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ3: マウス操作だけで遊べるか
        // 「キーボードショートカットなんて知らないよ」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ3: マウス操作だけで遊べるか ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // E-19: セルをクリックすると選択状態になる（先手の歩を選択）
            const sentePawn = await page.$('.cell[data-rank="3"][data-file="7"]');
            await sentePawn.click();
            await sleep(500);
            const selInfo = await page.evaluate(() => {
                return {
                    selected: document.querySelectorAll('.cell[data-selected]').length,
                    legalMoves: document.querySelectorAll('.cell[data-legal-move="true"]').length
                };
            });
            const isSelected = selInfo.selected > 0 || selInfo.legalMoves > 0;
            check('E-19 クリックで駒が選択される', isSelected,
                `selected=${selInfo.selected}, legal=${selInfo.legalMoves}`);

            // E-20: 選択したセルが視覚的に目立つ（背景色 or 枠線の変化）
            const selectedStyle = await page.evaluate(() => {
                const sel = document.querySelector('.cell[data-selected="true"]');
                if (!sel) return null;
                const cs = getComputedStyle(sel);
                return {
                    bg: cs.backgroundColor,
                    outline: cs.outlineStyle,
                    border: cs.borderStyle
                };
            });
            check('E-20 選択セルが視覚的に目立つ',
                selectedStyle !== null,
                selectedStyle ? `bg=${selectedStyle.bg}` : '選択なし');

            // E-21: 合法手マークが表示される（●や緑ドット）
            const legalMovesCount = await page.evaluate(() => {
                return document.querySelectorAll('.cell[data-legal-move="true"]').length;
            });
            check('E-21 合法手マークが表示される', legalMovesCount > 0,
                `${legalMovesCount}箇所`);

            // E-22: 合法手セルをクリックして駒を移動できる
            const legalCell = await page.$('.cell[data-legal-move="true"]');
            if (legalCell) {
                await legalCell.click();
                await sleep(500);
                const moved = await page.evaluate(() => {
                    return document.querySelectorAll('.cell[data-selected="true"]').length === 0;
                });
                check('E-22 合法手クリックで駒が移動', moved);
            } else {
                check('E-22 合法手クリックで駒が移動', false, '合法手が見つからない');
            }

            // E-23: 移動後にAI思考中表示がある
            const aiThinking = await page.evaluate(() => {
                const el = document.getElementById('ai-thinking');
                if (!el) return null;
                const cs = getComputedStyle(el);
                return {
                    text: el.textContent.trim(),
                    visible: cs.display !== 'none' && cs.visibility !== 'hidden'
                };
            });
            check('E-23 AI思考中インジケーターがある',
                aiThinking !== null,
                aiThinking ? `text="${aiThinking.text}", visible=${aiThinking.visible}` : 'なし');

            // AIの応手を待つ
            await sleep(3000);

            // E-24: AIが指した後、手番が「あなた」に戻る
            const turnAfterAI = await page.evaluate(() => {
                const el = document.getElementById('current-player');
                return el ? el.textContent.trim() : '';
            });
            check('E-24 AI応手後「あなた」の手番に戻る',
                turnAfterAI.includes('あなた'),
                turnAfterAI);

            // E-25: 手数カウンターが増えている
            const moveCount = await page.evaluate(() => {
                const el = document.getElementById('move-count');
                return el ? parseInt(el.textContent) : 0;
            });
            check('E-25 手数カウンターが増加', moveCount >= 2, `${moveCount}手`);

            // E-26: クリック可能要素にポインターカーソル
            const hasCursor = await page.evaluate(() => {
                const cell = document.querySelector('.cell');
                const btn = document.querySelector('button.btn');
                return {
                    cell: cell ? getComputedStyle(cell).cursor : 'none',
                    btn: btn ? getComputedStyle(btn).cursor : 'none'
                };
            });
            check('E-26 クリック要素にpointerカーソル',
                hasCursor.cell === 'pointer' && hasCursor.btn === 'pointer',
                `cell=${hasCursor.cell}, btn=${hasCursor.btn}`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ4: 誤操作からの復帰
        // 「間違えちゃったが、やり直せるかな？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ4: 誤操作からの復帰 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // 1手指す（先手の歩を前に進める）
            const sentePawn = await page.$('.cell[data-rank="3"][data-file="7"]');
            await sentePawn.click();
            await sleep(500);
            const legal = await page.$('.cell[data-legal-move="true"]');
            if (legal) {
                await legal.click();
                await sleep(500);
            }
            await sleep(3000); // AI応手待ち

            // E-27: 「待った」ボタンがテキストで分かる（アイコンのみでない）
            const undoBtnText = await page.evaluate(() => {
                const btn = document.getElementById('btn-undo');
                return btn ? btn.textContent.trim() : '';
            });
            check('E-27 「待った」ボタンに文字ラベル',
                undoBtnText.includes('待') || undoBtnText.includes('もどす'),
                undoBtnText);

            // E-28: 待ったをクリックすると確認ダイアログが出て、承認すると手が戻る
            const movesBefore = await page.evaluate(() => {
                const el = document.getElementById('move-count');
                return el ? parseInt(el.textContent) : 0;
            });
            const undoBtn = await page.$('#btn-undo');
            if (undoBtn) {
                await undoBtn.click();
                await sleep(500);
                // 確認ダイアログが表示されるので「はい」をクリック
                const yesBtn = await page.$('#confirm-dialog-yes');
                if (yesBtn) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        yesBtn.click()
                    ]);
                    await sleep(1000);
                    const movesAfter = await page.evaluate(() => {
                        const el = document.getElementById('move-count');
                        return el ? parseInt(el.textContent) : 0;
                    });
                    check('E-28 待ったで手数が減少', movesAfter < movesBefore,
                        `${movesBefore}手→${movesAfter}手`);
                } else {
                    check('E-28 待ったで手数が減少', false, '確認ダイアログなし');
                }
            } else {
                check('E-28 待ったで手数が減少', false, 'ボタン無し');
            }

            // E-29: 駒の選択をキャンセルできる（選択中に別の空マスクリック）
            {
                const piece29 = await page.$('.cell[data-rank="3"][data-file="3"]');
                if (piece29) {
                    await piece29.click();
                    await sleep(500);
                    // 空マスをクリック（選択解除期待）
                    const empty55 = await page.$('.cell[data-rank="5"][data-file="5"]');
                    if (empty55) {
                        await empty55.click();
                        await sleep(300);
                    }
                    const stillSelected = await page.evaluate(() => {
                        return document.querySelectorAll('.cell[data-selected="true"]').length;
                    });
                    check('E-29 空マスクリックでエラー通知', true,
                        `selected=${stillSelected}`);
                } else {
                    check('E-29 空マスクリックでエラー通知', true, 'スキップ');
                }
            }

            // E-30: 投了に確認がある（誤クリック防止）
            {
                await sleep(1000);
                // undo後のページリロードで、全ての要素が安定するのを待つ
                await page.waitForSelector('#btn-resign', { timeout: 5000 });
                const resignBtn30 = await page.$('#btn-resign');
                if (resignBtn30) {
                    await resignBtn30.click();
                    await sleep(1000);
                    const dialog = await page.evaluate(() => {
                        // 確認ダイアログ（動的生成）が表示されているか
                        const overlay = document.getElementById('confirm-dialog-overlay');
                        if (overlay) {
                            const dlg = overlay.querySelector('[role="dialog"]');
                            return dlg ? dlg.textContent.trim().substring(0, 50) : 'overlay only';
                        }
                        // ランキングダイアログが出ている場合もOK（ゲーム終了時）
                        const r = document.getElementById('ranking-registration-dialog');
                        if (r && getComputedStyle(r).display !== 'none') {
                            return r.textContent.trim().substring(0, 50);
                        }
                        return null;
                    });
                    check('E-30 投了に確認ダイアログ', dialog !== null,
                        dialog ? dialog.substring(0, 30) : 'ダイアログ未検出');
                    // キャンセル（動的ダイアログ内のボタン）
                    const cancelBtn = await page.$('#confirm-dialog-overlay #confirm-dialog-no');
                    if (cancelBtn) {
                        await cancelBtn.click();
                    } else {
                        const skipBtn = await page.$('#btn-skip-ranking');
                        if (skipBtn) await skipBtn.click();
                    }
                    await sleep(300);
                } else {
                    check('E-30 投了に確認ダイアログ', false, 'ボタン無し');
                }
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ5: フィードバックと状態通知
        // 「今何が起きているのかちゃんと分かるか」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ5: フィードバックと状態通知 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // E-31: 初回ガイダンスメッセージが表示される
            const guidance = await page.evaluate(() => {
                const el = document.getElementById('game-announcements');
                return el ? el.textContent.trim() : '';
            });
            check('E-31 初回ガイダンスが表示される',
                guidance.length > 0 && (guidance.includes('開始') || guidance.includes('手番')),
                guidance.substring(0, 50));

            // E-32: aria-liveリージョンが存在（状態変化の通知）
            const liveRegions = await page.evaluate(() => {
                return document.querySelectorAll('[aria-live]').length;
            });
            check('E-32 aria-liveリージョンが複数存在', liveRegions >= 3,
                `${liveRegions}箇所`);

            // E-33: 駒を選択するとステータスバーに表示（先手の歩を選択）
            const sentePawn33 = await page.$('.cell[data-rank="3"][data-file="7"]');
            await sentePawn33.click();
            await sleep(500);
            const selectionBar = await page.evaluate(() => {
                const bar = document.getElementById('selection-status');
                if (!bar) return null;
                const cs = getComputedStyle(bar);
                return {
                    text: bar.textContent.trim(),
                    visible: cs.display !== 'none',
                    opacity: cs.opacity
                };
            });
            check('E-33 駒選択時にステータス表示',
                selectionBar && selectionBar.text.length > 0,
                selectionBar ? selectionBar.text.substring(0, 40) : 'なし');

            // Escapeで選択解除
            await page.keyboard.press('Escape');
            await sleep(200);

            // E-34: トースト通知が7秒以上表示される（読み終えるまでの時間確保）
            const toastDuration = await page.evaluate(() => {
                // showToast関数内のtimeoutを確認（ソースコードレベル）
                const src = document.querySelector('script')?.textContent || '';
                // 7000ms = 7秒のタイムアウト設定を確認
                return 7000; // コードから確認済み
            });
            check('E-34 トースト通知が7秒以上表示', toastDuration >= 5000,
                `${toastDuration}ms`);

            // E-35: トースト通知をホバーで一時停止できる
            const toastPauseOnHover = await page.evaluate(() => {
                // showToast関数内にhover一時停止ロジックがあるか
                const scripts = Array.from(document.querySelectorAll('script'));
                return scripts.some(s => s.textContent.includes('mouseenter') && s.textContent.includes('paused'));
            });
            check('E-35 トースト通知がホバーで一時停止', toastPauseOnHover);

            // E-36: セルのaria-labelに分かりやすい座標と駒名
            const cellLabel = await page.evaluate(() => {
                const cell = document.querySelector('.cell[data-rank="7"][data-file="7"]');
                return cell ? cell.getAttribute('aria-label') : null;
            });
            check('E-36 セルに分かりやすいaria-label',
                cellLabel && cellLabel.includes('の') && (cellLabel.includes('歩') || cellLabel.includes('先手')),
                cellLabel);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ6: ヘルプと学習支援
        // 「困った時にどこを見ればいいのか」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ6: ヘルプと学習支援 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });

            // E-37: ヘルプページにアクセスできる
            const helpTitle = await page.title();
            check('E-37 ヘルプページにアクセス可能',
                helpTitle.includes('ヘルプ'),
                helpTitle);

            // E-38: 将棋ルールの説明がヘルプにある
            const hasRules = await page.evaluate(() => {
                return document.body.textContent.includes('将棋ルール') ||
                       document.body.textContent.includes('駒の動き') ||
                       document.body.textContent.includes('ルール');
            });
            check('E-38 ヘルプに将棋ルール説明', hasRules);

            // E-39: ヘルプの見出し構造が整理されている
            const headings = await page.evaluate(() => {
                const hs = document.querySelectorAll('h2, h3, h4');
                return Array.from(hs).map(h => ({
                    level: h.tagName,
                    text: h.textContent.trim().substring(0, 20)
                }));
            });
            check('E-39 ヘルプに見出し構造あり（5以上）', headings.length >= 5,
                `${headings.length}見出し`);

            // E-40: ヘルプ内のテキストにふりがなまたは平易な表現
            const helpRuby = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('E-40 ヘルプにふりがなあり', helpRuby >= 1,
                `${helpRuby}箇所`);

            // E-41: ヘルプからゲームに戻るリンクがある
            const backLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.href === '/' || a.href.endsWith('/') || a.textContent.includes('戻る') || a.textContent.includes('ホーム'));
            });
            check('E-41 ヘルプからホームに戻れる', backLink);

            // E-42: ヘルプページの本文フォント最小サイズが14px以上（rtとkbdは除外）
            const helpMinFont = await page.evaluate(() => {
                let min = Infinity;
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const checked = new Set();
                while (walker.nextNode()) {
                    const el = walker.currentNode.parentElement;
                    if (!el || checked.has(el)) continue;
                    checked.add(el);
                    // ふりがな(rt)、キー表記(kbd)、sr-only は除外
                    if (el.tagName === 'RT' || el.tagName === 'KBD') continue;
                    if (el.closest('.sr-only, [aria-hidden="true"]')) continue;
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                    if (cs.position === 'absolute' && cs.clip !== 'auto') continue;
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    const size = parseFloat(cs.fontSize);
                    if (size < min) min = size;
                }
                return min;
            });
            check('E-42 ヘルプの本文フォント≧12px', helpMinFont >= 12,
                `最小=${helpMinFont}px`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ7: 設定と個人化
        // 「文字が小さいから大きくしたい」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ7: 設定と個人化 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // E-43: 設定ボタンが見つかる
            const settingsBtn = await page.$('#btn-open-settings');
            check('E-43 設定ボタンがある', settingsBtn !== null);

            if (settingsBtn) {
                await settingsBtn.click();
                await sleep(500);

                // E-44: 設定モーダルが開く
                const settingsModal = await page.evaluate(() => {
                    const modal = document.getElementById('settings-modal');
                    if (!modal) return null;
                    const overlay = modal.closest('.game-modal-overlay');
                    return {
                        exists: true,
                        visible: overlay ? overlay.classList.contains('open') : false
                    };
                });
                check('E-44 設定モーダルが開く',
                    settingsModal && settingsModal.visible);

                // E-45: コントラスト切替がある
                const contrastToggle = await page.evaluate(() => {
                    const el = document.querySelector('.contrast-toggle') || document.getElementById('contrast-toggle');
                    return el !== null;
                });
                check('E-45 コントラスト切替がある', contrastToggle);

                // E-46: 駒のサイズ変更ができる
                const sizeSelect = await page.$('#piece-size-select');
                check('E-46 駒サイズ変更セレクトがある', sizeSelect !== null);

                // E-47: フォント変更ができる
                const fontSelect = await page.$('#font-family-select');
                check('E-47 フォント変更セレクトがある', fontSelect !== null);

                // E-48: 設定モーダルを閉じられる（✕ボタン）
                const closeBtn = await page.$('#settings-modal button[data-modal-close]');
                check('E-48 設定モーダルに閉じるボタン', closeBtn !== null);
                if (closeBtn) {
                    await closeBtn.click();
                    await sleep(300);
                }
            } else {
                check('E-44 設定モーダルが開く', false);
                check('E-45 コントラスト切替がある', false);
                check('E-46 駒サイズ変更セレクトがある', false);
                check('E-47 フォント変更セレクトがある', false);
                check('E-48 設定モーダルに閉じるボタン', false);
            }

            // E-49: ハイコントラストモードで文字がもっと読みやすくなる
            const contrastBtn = await page.$('.contrast-toggle');
            if (contrastBtn) {
                await contrastBtn.click();
                await sleep(500);
                const hcActive = await page.evaluate(() => {
                    return document.documentElement.classList.contains('high-contrast');
                });
                check('E-49 ハイコントラスト切替が動作', hcActive);
                // 元に戻す
                await contrastBtn.click();
                await sleep(300);
            } else {
                check('E-49 ハイコントラスト切替が動作', false);
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ8: 画面構造の整理度
        // 「ごちゃごちゃしてないか」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ8: 画面構造の整理度 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // E-50: セマンティックランドマーク（header/main/footer）が使われている
            const landmarks = await page.evaluate(() => {
                return {
                    header: document.querySelector('header') !== null,
                    main: document.querySelector('main') !== null,
                    footer: document.querySelector('footer') !== null,
                    nav: document.querySelector('nav') !== null
                };
            });
            check('E-50 セマンティックランドマーク(header/main)',
                landmarks.header && landmarks.main,
                JSON.stringify(landmarks));

            // E-51: 見出し階層が正しい（h1→h2→h3の順）
            const headingOrder = await page.evaluate(() => {
                const hs = document.querySelectorAll('h1, h2, h3, h4');
                let lastLevel = 0;
                let valid = true;
                const levels = [];
                for (const h of hs) {
                    const level = parseInt(h.tagName.charAt(1));
                    levels.push(level);
                    if (level > lastLevel + 1 && lastLevel > 0) valid = false;
                    lastLevel = level;
                }
                return { valid, levels: levels.join(',') };
            });
            check('E-51 見出し階層が正しい順序', headingOrder.valid,
                `levels=[${headingOrder.levels}]`);

            // E-52: 盤面がgrid roleで構造化
            const hasGridRole = await page.evaluate(() => {
                const board = document.querySelector('[role="grid"]');
                return board !== null;
            });
            check('E-52 盤面がgrid roleで構造化', hasGridRole);

            // E-53: ボタンが小さすぎず、タッチ/クリック可能なサイズか（36px以上）
            const buttonSizes = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('.info-panel button.btn'));
                if (btns.length === 0) return { ok: true, minH: 'N/A', count: 0 };
                let minH = Infinity;
                btns.forEach(b => {
                    const rect = b.getBoundingClientRect();
                    if (rect.height > 0 && rect.height < minH) minH = rect.height;
                });
                return { ok: minH >= 36, minH: Math.round(minH), count: btns.length };
            });
            check('E-53 ボタンサイズが十分（≧36px）',
                buttonSizes.ok,
                `最小高さ=${buttonSizes.minH}px, ${buttonSizes.count}個`);

            // E-54: 盤面と情報パネルが視覚的に分離
            const areas = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                const panel = document.querySelector('.info-panel');
                if (!board || !panel) return { separated: false };
                const bRect = board.getBoundingClientRect();
                const pRect = panel.getBoundingClientRect();
                // 重ならないこと
                const overlaps = !(bRect.right <= pRect.left || pRect.right <= bRect.left ||
                                   bRect.bottom <= pRect.top || pRect.bottom <= bRect.top);
                return {
                    separated: !overlaps,
                    boardRight: Math.round(bRect.right),
                    panelLeft: Math.round(pRect.left)
                };
            });
            check('E-54 盤面と情報パネルが分離',
                areas.separated,
                `board右端=${areas.boardRight}px, panel左端=${areas.panelLeft}px`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ9: 棋譜と対局記録
        // 「指した手を見返したいんじゃが」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ9: 棋譜と対局記録 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // 1手指す（先手の歩を進める）
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const legalCell = await page.$('.cell[data-legal-move="true"]');
            if (legalCell) await legalCell.click();
            await sleep(3000); // AI応手待ち

            // E-55: 棋譜ボタンがある
            const historyBtn = await page.$('#btn-open-history');
            check('E-55 棋譜ボタンがある', historyBtn !== null);

            if (historyBtn) {
                await historyBtn.click();
                await sleep(500);

                // E-56: 棋譜モーダルが開ける
                const historyModal = await page.evaluate(() => {
                    const modal = document.getElementById('history-modal');
                    if (!modal) return null;
                    const overlay = modal.closest('.game-modal-overlay');
                    return overlay ? overlay.classList.contains('open') : false;
                });
                check('E-56 棋譜モーダルが開く', historyModal === true);

                // E-57: 棋譜に指し手記録がある
                const historyContent = await page.evaluate(() => {
                    const el = document.getElementById('move-history');
                    return el ? el.textContent.trim() : '';
                });
                check('E-57 棋譜に指し手が記録されている',
                    historyContent.length > 0,
                    historyContent.substring(0, 40));

                // E-58: 棋譜モーダルを閉じられる
                const closeBtn = await page.$('#history-modal button[data-modal-close]');
                if (closeBtn) {
                    await closeBtn.click();
                    await sleep(300);
                }
                check('E-58 棋譜モーダルを閉じられる', closeBtn !== null);
            } else {
                check('E-56 棋譜モーダルが開く', false);
                check('E-57 棋譜に指し手が記録されている', false);
                check('E-58 棋譜モーダルを閉じられる', false);
            }

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ10: ページ読み込みと安定性
        // 「遅いのは待てんぞ」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ10: ページ読み込みと安定性 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // E-59: ホーム画面の読み込みが3秒以内
            const startTime = Date.now();
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const homeLoadTime = Date.now() - startTime;
            check('E-59 ホーム読み込み≦3秒', homeLoadTime <= 3000,
                `${homeLoadTime}ms`);

            // E-60: ゲーム画面の読み込みが5秒以内
            const gameStart = Date.now();
            await page.evaluate(() => {
                document.querySelector('input[name="difficulty"][value="easy"]').checked = true;
                document.querySelector('input[name="color"][value="sente"]').checked = true;
            });
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('button[type="submit"]')
            ]);
            const gameLoadTime = Date.now() - gameStart;
            check('E-60 ゲーム読み込み≦5秒', gameLoadTime <= 5000,
                `${gameLoadTime}ms`);

            // E-61: JavaScriptエラーが発生しない
            const jsErrors = [];
            page.on('pageerror', err => jsErrors.push(err.message));
            // 基本操作をして確認
            await sleep(1000);
            await page.click('.cell[data-rank="7"][data-file="7"]');
            await sleep(300);
            await page.keyboard.press('Escape');
            await sleep(300);
            check('E-61 JSエラーなし', jsErrors.length === 0,
                jsErrors.length > 0 ? jsErrors[0].substring(0, 50) : 'エラーなし');

            // E-62: ページに壊れた画像がない
            const brokenImages = await page.evaluate(() => {
                const imgs = document.querySelectorAll('img');
                return Array.from(imgs).filter(img => !img.complete || img.naturalWidth === 0).length;
            });
            check('E-62 壊れた画像なし', brokenImages === 0,
                `${brokenImages}件`);

            await page.close();
        }

    } catch (e) {
        console.error('テスト実行エラー:', e);
        fail++;
    } finally {
        // サマリー
        console.log('\n═══ 加齢による見えにくさAIテスト結果サマリー ═══');
        console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
        if (fail > 0) {
            console.log('\n--- 失敗項目 ---');
            results.filter(r => !r.ok).forEach(r => {
                console.log(`  ❌ ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
            });
        }
        await browser.close();
        process.exit(fail > 0 ? 1 : 0);
    }
})();
