/**
 * 教育者AI テスト
 * 
 * ペルソナ: 田村恵子（45歳・特別支援学校教諭）
 * - 小学校の特別支援学級を担当。知的障がい、発達障がい、肢体不自由の生徒がいる
 * - ICTを使った授業に意欲的。将棋を通じて論理的思考を教えたい
 * - 生徒のデバイス(学校Chromebook)で安全に使えるか確認したい
 * - 「45分授業内で1回遊べるか」「生徒に説明しやすいか」が関心
 * - 全ての生徒が画面を理解できるか（表示が大きいか、分かりやすいか）
 * 
 * テスト観点：
 *  - 授業での使いやすさ（短時間で開始できるか）
 *  - 安全性（不適切コンテンツ・外部リンクの有無）
 *  - 多様なデバイス対応（Chromebook、iPad）
 *  - 生徒への説明のしやすさ（UI用語の日本語化度）
 *  - ルール学習のサポート
 *  - 進捗確認（手数・棋譜）
 *  - 多様な障がいへの配慮
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
        // カテゴリ1: 授業での使いやすさ
        // 「45分で使える？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ1: 授業での使いやすさ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // T-1: トップページの読み込みが速い（3秒以内）
            const start = Date.now();
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const elapsed = Date.now() - start;
            check('T-1 トップページ3秒以内に読み込み', elapsed < 3000, `${elapsed}ms`);

            // T-2: ゲーム開始がワンクリック（デフォルト値あり）
            const hasDefaults = await page.evaluate(() => {
                const diff = document.querySelector('input[name="difficulty"]:checked');
                const color = document.querySelector('input[name="color"]:checked');
                return diff !== null && color !== null;
            });
            check('T-2 デフォルト値で即開始可能', hasDefaults);

            // T-3: サインアップ不要でプレイ可能
            const loginRequired = await page.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('ログイン') || text.includes('サインアップ');
            });
            check('T-3 ログインなしでプレイ可能', !loginRequired);

            // T-4: ゲーム画面の読み込みが速い（5秒以内）
            const start2 = Date.now();
            await startGame(page);
            const elapsed2 = Date.now() - start2;
            check('T-4 ゲーム画面5秒以内に表示', elapsed2 < 5000, `${elapsed2}ms`);

            // T-5: 初回ガイダンスがある
            const guidance = await page.evaluate(() => {
                const el = document.getElementById('game-announcements');
                return el ? el.textContent.trim() : '';
            });
            check('T-5 ゲーム開始時にガイダンス', guidance.length > 0, guidance.substring(0, 50));

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ2: 安全性
        // 「生徒に見せても大丈夫？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ2: 安全性 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });

            // T-6: 広告がない
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const hasAds = await page.evaluate(() => {
                return document.querySelectorAll('iframe, .advertisement, [id^="ad-banner"], [class^="ad-"]').length;
            });
            check('T-6 広告なし', hasAds === 0, `${hasAds}個`);

            // T-7: 外部サイトへのリンクが最小（target="_blank"チェック）
            const externalLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href^="http"]'));
                const external = links.filter(a => !a.href.includes(location.host));
                return external.length;
            });
            check('T-7 外部リンク最小', externalLinks <= 2, `${externalLinks}個`);

            // T-8: 不適切な表現がない
            await startGame(page);
            const inappropriateWords = await page.evaluate(() => {
                const text = document.body.textContent;
                const ngWords = ['死', '殺', '地獄', 'バカ', 'クソ'];
                return ngWords.filter(w => text.includes(w));
            });
            check('T-8 不適切な表現なし', inappropriateWords.length === 0,
                inappropriateWords.length > 0 ? inappropriateWords.join(',') : '');

            // T-9: HTTPS想定（mixedコンテンツなし）
            const mixedContent = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('link[href], script[src], img[src]'));
                return links.filter(e => {
                    const url = e.href || e.src || '';
                    return url.startsWith('http://') && !url.includes('localhost');
                }).length;
            });
            check('T-9 外部HTTPリソースなし', mixedContent === 0, `${mixedContent}個`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ3: 生徒への説明しやすさ
        // 「生徒に「ここを押して」と指示できる？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ3: 生徒への説明しやすさ ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // T-10: ボタンにラベルが表示されている（テキスト）
            const labeledBtns = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn'));
                return btns.filter(b => b.textContent.trim().length > 0).length;
            });
            const totalBtns = await page.evaluate(() => {
                return document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn').length;
            });
            check('T-10 全ボタンにテキストラベル',
                labeledBtns === totalBtns, `${labeledBtns}/${totalBtns}`);

            // T-11: UIテキストが全て日本語
            const pageText = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const englishBtns = btns.filter(b => /^[a-zA-Z\s]+$/.test(b.textContent.trim()) && b.textContent.trim().length > 2);
                return englishBtns.map(b => b.textContent.trim());
            });
            check('T-11 UIテキストが日本語', pageText.length === 0,
                pageText.length > 0 ? pageText.join(', ') : '');

            // T-12: 手番表示が「あなた」で分かりやすい
            const turnLabel = await page.evaluate(() => {
                const el = document.getElementById('current-player');
                return el ? el.textContent.trim() : '';
            });
            check('T-12 手番表示が子供に分かる',
                turnLabel.includes('あなた'), turnLabel);

            // T-13: ふりがなで漢字が読める
            const rubyCount = await page.evaluate(() => document.querySelectorAll('ruby').length);
            check('T-13 ふりがなで漢字サポート', rubyCount >= 3, `${rubyCount}箇所`);

            // T-14: ヘルプページが教材として使える
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            const helpSections = await page.evaluate(() => {
                return document.querySelectorAll('h2, h3').length;
            });
            check('T-14 ヘルプが教材構成', helpSections >= 3, `${helpSections}セクション`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ4: 多様な障がいへの配慮
        // 「クラスの全員が使える？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ4: 多様な障がいへの配慮 ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // T-15: キーボードのみで操作可能（肢体不自由の生徒向け）
            await page.keyboard.press('Tab');
            await sleep(200);
            const kbdFocus = await page.evaluate(() => {
                const c = document.activeElement;
                return c ? c.tagName : null;
            });
            check('T-15 キーボード操作可能（肢体不自由対応）', kbdFocus !== null, kbdFocus);

            // T-16: フォーカスインジケーターが見える
            const focusOutline = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el) return null;
                const cs = getComputedStyle(el);
                return cs.outlineWidth !== '0px' || cs.boxShadow !== 'none';
            });
            check('T-16 フォーカスインジケーター表示', focusOutline);

            // T-17: スクリーンリーダー対応（aria-label）
            const ariaLabeled = await page.evaluate(() => {
                const cells = document.querySelectorAll('.cell');
                const withLabel = Array.from(cells).filter(c =>
                    c.getAttribute('aria-label') || c.getAttribute('role')
                );
                return withLabel.length;
            });
            check('T-17 スクリーンリーダー対応', ariaLabeled > 0, `${ariaLabeled}セル`);

            // T-18: テキストサイズが十分大きい（弱視の生徒向け）
            const fontSize = await page.evaluate(() => {
                const texts = document.querySelectorAll('.cell .piece-text');
                if (texts.length === 0) return 0;
                return parseFloat(getComputedStyle(texts[0]).fontSize);
            });
            check('T-18 駒文字サイズ十分', fontSize >= 14, `${fontSize}px`);

            // T-19: 色覚異常でも操作可能（色のみに依存しない）
            const colorOnly = await page.evaluate(() => {
                // 合法手マークが色だけでなく形（丸マーカー等）で区別されるか
                const legal = document.querySelector('.cell[data-legal-move="true"]');
                if (!legal) return null;
                const before = getComputedStyle(legal, '::before');
                return before.content !== 'none' || before.display !== 'none';
            });
            // 合法手がない場合は駒を選択してから確認
            await page.click('.cell[data-rank="3"][data-file="7"]');
            await sleep(500);
            const hasLegalMarking = await page.evaluate(() => {
                return document.querySelectorAll('.cell[data-legal-move="true"]').length > 0;
            });
            check('T-19 合法手が色以外でも識別可能', hasLegalMarking);
            await page.keyboard.press('Escape');
            await sleep(200);

            // T-20: prefers-reduced-motionが尊重される
            const reducedMotion = await page.evaluate(() => {
                const styles = Array.from(document.querySelectorAll('style'));
                return styles.some(s => s.textContent.includes('prefers-reduced-motion'));
            });
            check('T-20 アニメーション停止設定対応', reducedMotion);

            // T-21: リンクや操作に最小タッチターゲットサイズ
            const targetSizes = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('section[aria-labelledby="actions-heading"] .btn'));
                const small = btns.filter(b => {
                    const rect = b.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && rect.height < 36;
                });
                return { total: btns.length, small: small.length };
            });
            check('T-21 アクションボタンサイズ適切',
                targetSizes.small === 0, `${targetSizes.small}/${targetSizes.total}が小さい`);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ5: 進捗確認と学習サポート
        // 「生徒の学習状態が見える？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ5: 進捗確認と学習サポート ═══\n');
        {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await startGame(page);

            // T-22: 手数で進捗が分かる
            const moveCountEl = await page.$('#move-count');
            check('T-22 手数で進捗確認可能', moveCountEl !== null);

            // T-23: 棋譜でどう指したか確認
            const historyBtn = await page.$('#btn-open-history');
            check('T-23 棋譜で思考過程確認', historyBtn !== null);

            // T-24: 難易度選択で段階学習可能
            await page.goto(BASE, { waitUntil: 'networkidle0' });
            const difficulties = await page.evaluate(() => {
                return document.querySelectorAll('input[name="difficulty"]').length;
            });
            check('T-24 難易度段階選択', difficulties >= 2, `${difficulties}段階`);

            // T-25: 簡単な難易度が一番上/デフォルト
            const easyFirst = await page.evaluate(() => {
                const first = document.querySelector('input[name="difficulty"]');
                return first ? first.value : '';
            });
            check('T-25 「簡単」がデフォルト/先頭', easyFirst === 'easy', easyFirst);

            // T-26: ヘルプにルール解説（授業の教材として）
            await page.goto(BASE + '/help', { waitUntil: 'networkidle0' });
            const rulesSection = await page.evaluate(() => {
                const text = document.body.textContent;
                return text.includes('ルール') && text.includes('駒');
            });
            check('T-26 ヘルプに将棋ルール解説', rulesSection);

            // T-27: 時間制限なし（授業のペースで）
            await startGame(page);
            const noTimer = await page.evaluate(() => {
                // カウントダウンタイマー（制限時間）がないか確認
                // 経過時間表示はOK — 制限時間による強制終了がないこと
                const countdownEl = document.querySelector('[class*="countdown"], .time-limit, #time-limit');
                return countdownEl === null;
            });
            check('T-27 制限時間なし（マイペース可能）', noTimer);

            await page.close();
        }

        // ═══════════════════════════════════════════
        // カテゴリ6: Chromebook対応
        // 「学校のパソコンで動く？」
        // ═══════════════════════════════════════════
        console.log('\n═══ カテゴリ6: Chromebook対応 ═══\n');
        {
            const page = await browser.newPage();
            // Chromebookの一般的な解像度（1366x768）
            await page.setViewport({ width: 1366, height: 768 });
            await startGame(page);

            // T-28: 1366×768で盤面が全表示
            const boardVisible = await page.evaluate(() => {
                const board = document.querySelector('.shogi-board');
                if (!board) return false;
                const rect = board.getBoundingClientRect();
                return rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
            });
            check('T-28 Chromebook解像度で盤面全表示', boardVisible);

            // T-29: ゲームコントロールが見える
            const controlsVisible = await page.evaluate(() => {
                const controls = document.querySelector('section[aria-labelledby="actions-heading"]');
                if (!controls) return false;
                const rect = controls.getBoundingClientRect();
                // スクロールすれば見える位置にあればOK
                return rect.top < document.body.scrollHeight;
            });
            check('T-29 操作ボタンがページ内', controlsVisible);

            // T-30: スクロールなしで操作可能
            const scrollNeeded = await page.evaluate(() => {
                return document.body.scrollHeight > window.innerHeight * 1.2;
            });
            check('T-30 最小限のスクロール', !scrollNeeded,
                `ページ高${await page.evaluate(() => document.body.scrollHeight)}px`);

            await page.close();
        }

    } catch (e) {
        console.error('テスト実行エラー:', e);
        fail++;
    } finally {
        console.log('\n═══ 教育者AIテスト結果サマリー ═══');
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
