/**
 * 全盲ユーザー（スクリーンリーダー利用者）視点での対局テスト
 * 
 * 内部座標系:
 *   rank 9-7 = 後手の駒（画面上部）
 *   rank 3-1 = 先手の駒（画面下部）
 *   描画順: rank 9→1（上→下）
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';
let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        const msg = detail ? `${testName} — ${detail}` : testName;
        console.log(`  ❌ ${msg}`);
        issues.push(msg);
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        // ========================================
        // フェーズ1: ホーム画面
        // ========================================
        console.log('\n🏠 フェーズ1: ホーム画面');
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

        const h2Text = await page.$eval('h2', el => el.textContent);
        assert(h2Text.includes('アクセシブル将棋'), 'ホーム見出し');

        const diffLegend = await page.$('fieldset legend');
        assert(diffLegend !== null, 'fieldset/legend');

        const radioLabels = await page.$$eval('label', els => els.filter(l => l.querySelector('input[type="radio"]')).length);
        assert(radioLabels >= 3, `ラジオボタンlabel (${radioLabels}個)`);

        const startBtnText = await page.$eval('#btn-start-game', el => el.textContent.trim());
        assert(startBtnText === 'ゲームを開始する', `開始ボタン: "${startBtnText}"`);

        const helpLinkInNav = await page.$('nav a[href*="help"]');
        assert(helpLinkInNav !== null, 'ナビにヘルプリンク');

        const helpBtn = await page.$('a.btn[href*="help"]');
        assert(helpBtn !== null, '操作方法リンク');

        // ========================================
        // フェーズ2: ゲーム開始
        // ========================================
        console.log('\n🎮 フェーズ2: ゲーム開始');
        
        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await page.click('#btn-start-game');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const gameUrl = page.url();
        assert(gameUrl.includes('/game/'), `遷移: ${gameUrl}`);

        // ========================================
        // フェーズ3: 構造
        // ========================================
        console.log('\n📋 フェーズ3: 構造');

        assert(await page.$eval('h2.sr-only', el => el.textContent) === '将棋ゲーム', 'sr-only見出し');
        assert(await page.$eval('#game-announcements', el => el.getAttribute('aria-live')) === 'assertive', 'announcements assertive');
        assert(await page.$eval('#game-status', el => el.getAttribute('aria-live')) === 'polite', 'status polite');

        const layoutSkip = await page.$('a.skip-link[href="#main-content"]');
        assert(layoutSkip !== null, 'メインスキップリンク');

        const boardSkip = await page.$('a.skip-link[href="#shogi-board"]');
        assert(boardSkip !== null, '盤面スキップリンク');

        assert(await page.$eval('#shogi-board', el => el.getAttribute('aria-label')) === '将棋盤 9×9マス', '盤面aria-label');
        assert(await page.$eval('#shogi-board', el => el.getAttribute('role')) === 'grid', '盤面role');
        assert((await page.$$('#shogi-board > [role="row"]')).length === 9, '行9つ');
        assert((await page.$$('.cell')).length === 81, 'セル81個');

        // ========================================
        // フェーズ4: aria-label
        // ========================================
        console.log('\n🔍 フェーズ4: aria-label');

        const cell33 = await page.$eval('.cell[data-rank="3"][data-file="3"]', el => el.getAttribute('aria-label'));
        assert(cell33.includes('先手') && cell33.includes('歩'), `先手の歩(3の3): "${cell33}"`);

        const cell11 = await page.$eval('.cell[data-rank="1"][data-file="1"]', el => el.getAttribute('aria-label'));
        assert(cell11.includes('先手') && cell11.includes('香'), `先手の香(1の1): "${cell11}"`);

        const cell77 = await page.$eval('.cell[data-rank="7"][data-file="7"]', el => el.getAttribute('aria-label'));
        assert(cell77.includes('後手') && cell77.includes('歩'), `後手の歩(7の7): "${cell77}"`);

        const cell99 = await page.$eval('.cell[data-rank="9"][data-file="9"]', el => el.getAttribute('aria-label'));
        assert(cell99.includes('後手') && cell99.includes('香'), `後手の香(9の9): "${cell99}"`);

        const cell55 = await page.$eval('.cell[data-rank="5"][data-file="5"]', el => el.getAttribute('aria-label'));
        assert(cell55.includes('空'), `5の5空: "${cell55}"`);

        const unhidden = await page.$$eval('.piece-text', els => els.filter(e => e.getAttribute('aria-hidden') !== 'true').length);
        assert(unhidden === 0, `piece-text aria-hidden (未: ${unhidden})`);

        // ========================================
        // フェーズ5: キーボードナビ
        // ========================================
        console.log('\n⌨️  フェーズ5: キーボードナビ');

        const initFocus = await page.$eval('.cell[tabindex="0"]', el => `${el.dataset.file}の${el.dataset.rank}`);
        assert(initFocus === '9の9', `初期フォーカス: ${initFocus}`);

        await page.focus('.cell[data-rank="9"][data-file="9"]');
        await page.keyboard.press('ArrowRight');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.file) === '8', 'ArrowRight→8列目');

        await page.keyboard.press('ArrowDown');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.rank) === '8', 'ArrowDown→8段目');

        await page.keyboard.press('ArrowUp');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.rank) === '9', 'ArrowUp→9段目');

        const navSt = await page.$eval('#game-status', el => el.textContent);
        assert(navSt.length > 0, `ナビステータス: "${navSt}"`);

        // ========================================
        // フェーズ6: 指し手
        // ========================================
        console.log('\n♟️  フェーズ6: 指し手');

        await page.click('.cell[data-rank="3"][data-file="7"]');
        await sleep(300);
        
        const selAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(selAnn.includes('選択しました'), `選択アナウンス: "${selAnn}"`);
        assert(selAnn.includes('移動先'), '移動先案内');

        assert(await page.$eval('.cell[data-rank="3"][data-file="7"]', el => el.dataset.selected) === 'true', 'data-selected');

        await page.click('.cell[data-rank="4"][data-file="7"]');
        await sleep(2000);

        const moveAnn = await page.$eval('#game-announcements', el => el.textContent);
        assert(moveAnn.length > 0, `指し手アナウンス: "${moveAnn}"`);

        const cell47 = await page.$eval('.cell[data-rank="4"][data-file="7"]', el => el.getAttribute('aria-label'));
        assert(cell47.includes('先手') && cell47.includes('歩'), `4の7に歩: "${cell47}"`);

        assert(await page.$eval('.cell[data-rank="3"][data-file="7"]', el => el.getAttribute('aria-label')).then(l => l.includes('空')), '3の7空');

        assert(moveAnn.includes('AI') || moveAnn.includes('移動'), `AIアナウンス含む`);

        const mc = await page.$eval('#move-count', el => el.textContent);
        assert(mc.includes('手'), `手数: "${mc}"`);

        // ========================================
        // フェーズ7: 持ち駒
        // ========================================
        console.log('\n🎯 フェーズ7: 持ち駒');

        assert(await page.$eval('#sente-hand', el => el.getAttribute('aria-label')) === '先手の持ち駒', '先手駒台label');
        assert(await page.$eval('#gote-hand', el => el.getAttribute('aria-label')) === '後手の持ち駒', '後手駒台label');
        assert(await page.$eval('#sente-hand', el => el.getAttribute('aria-live')) === 'polite', '先手駒台 live');
        assert(await page.$eval('#gote-hand', el => el.getAttribute('aria-live')) === 'polite', '後手駒台 live');

        // ========================================
        // フェーズ8: ショートカット
        // ========================================
        console.log('\n🔑 フェーズ8: ショートカット');

        await page.focus('.cell[data-rank="5"][data-file="5"]');
        await page.keyboard.press('b');
        await sleep(300);
        assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.includes('盤面')), 'Bキー盤面');

        await page.keyboard.press('s');
        await sleep(300);
        assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.length > 10), 'Sキー状態');

        // ========================================
        // フェーズ9: 待った
        // ========================================
        console.log('\n↩️  フェーズ9: 待った');

        const undoDis = await page.$eval('#btn-undo', el => el.disabled);
        if (!undoDis) {
            await page.click('#btn-undo');
            await sleep(300);
            const ud = await page.$('#confirm-dialog-overlay');
            assert(ud !== null, '待ったダイアログ');
            if (ud) {
                assert(await page.$eval('#confirm-dialog-overlay', el => el.getAttribute('role')) === 'dialog', 'role="dialog"');
                assert(await page.$eval('#confirm-dialog-overlay', el => el.getAttribute('aria-modal')) === 'true', 'aria-modal');
                await page.click('#confirm-dialog-no');
                await sleep(200);
            }
        } else {
            console.log('  ⏭️  待ったボタン無効');
        }

        // ========================================
        // フェーズ10: Escape
        // ========================================
        console.log('\n🚫 フェーズ10: Escape');

        const sp = await page.$$eval('.cell.piece-sente', els => {
            const el = els[0];
            return el ? { rank: el.dataset.rank, file: el.dataset.file } : null;
        });
        
        if (sp) {
            await page.click(`.cell[data-rank="${sp.rank}"][data-file="${sp.file}"]`);
            await sleep(200);
            const sa = await page.$eval('#game-announcements', el => el.textContent);
            if (sa.includes('選択しました')) {
                await page.keyboard.press('Escape');
                await sleep(200);
                assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.includes('キャンセル')), 'Escapeキャンセル');
            } else {
                console.log(`  ⏭️  選択不可: "${sa}"`);
            }
        }

        // ========================================
        // フェーズ11: 投了
        // ========================================
        console.log('\n🏳️  フェーズ11: 投了');

        await page.click('#btn-resign');
        await sleep(300);
        const rd = await page.$('#confirm-dialog-overlay');
        assert(rd !== null, '投了ダイアログ');
        if (rd) {
            assert(await page.$eval('#confirm-dialog-title', el => el.textContent).then(t => t.includes('投了')), 'タイトル');
            await page.keyboard.press('Escape');
            await sleep(200);
        }

        // ========================================
        // フェーズ12: タイマー
        // ========================================
        console.log('\n⏱️  フェーズ12: タイマー');

        const t1 = await page.$eval('#elapsed-time', el => el.textContent);
        await sleep(2000);
        const t2 = await page.$eval('#elapsed-time', el => el.textContent);
        assert(t1 !== t2, `タイマー: "${t1}" → "${t2}"`);

        // ========================================
        // フェーズ13: 棋譜
        // ========================================
        console.log('\n📝 フェーズ13: 棋譜');

        assert(await page.$eval('#move-history', el => el.getAttribute('aria-live')) === 'polite', '棋譜 live');
        const hi = await page.$$eval('#move-history li', els => els.length);
        assert(hi >= 1, `棋譜記録: ${hi}手`);

        // ========================================
        // フェーズ14: パネル
        // ========================================
        console.log('\n📊 フェーズ14: パネル');

        assert(await page.$eval('#game-info-heading', el => el.textContent) === 'ゲーム情報', '情報見出し');
        assert(await page.$eval('#actions-heading', el => el.textContent) === '操作', '操作見出し');
        assert(await page.$eval('#history-heading', el => el.textContent) === '棋譜', '棋譜見出し');
        assert(await page.$eval('.info-panel dl', el => el.getAttribute('role')) === null, 'dl role');

        // ========================================
        // フェーズ15: 連続プレイ
        // ========================================
        console.log('\n🔄 フェーズ15: 連続プレイ');

        const pawns = await page.$$eval('.cell.piece-sente', els => els
            .filter(e => e.getAttribute('aria-label').includes('歩') && parseInt(e.dataset.rank) === 3)
            .map(e => ({ rank: parseInt(e.dataset.rank), file: parseInt(e.dataset.file) }))
        );
        
        if (pawns.length > 0) {
            const p = pawns[0];
            await page.click(`.cell[data-rank="${p.rank}"][data-file="${p.file}"]`);
            await sleep(200);
            await page.click(`.cell[data-rank="${p.rank + 1}"][data-file="${p.file}"]`);
            await sleep(2000);
            assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.length > 0), '2手目アナウンス');
        } else {
            console.log('  ⏭️  3段目の歩なし');
        }

        // ========================================
        // フェーズ16: フォーカス
        // ========================================
        console.log('\n🎯 フェーズ16: フォーカス');

        const tz = await page.$$eval('.cell[tabindex="0"]', els => els.length);
        assert(tz === 1, `tabindex=0 x1: ${tz}`);

        // ========================================
        // フェーズ17: エラーフィードバック
        // ========================================
        console.log('\n⚠️  フェーズ17: エラーフィードバック');

        await page.click('.cell[data-rank="5"][data-file="5"]');
        await sleep(200);
        assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.includes('空')), '空マスFB');

        const gp = await page.$('.cell.piece-gote');
        if (gp) {
            await gp.click();
            await sleep(200);
            assert(await page.$eval('#game-announcements', el => el.textContent).then(t => t.includes('相手')), '相手駒FB');
        }

        // ========================================
        // フェーズ18: ホームに戻る
        // ========================================
        console.log('\n🏠 フェーズ18: ホームに戻る');

        await page.click('#btn-quit');
        await sleep(300);
        assert(await page.$('#confirm-dialog-overlay') !== null, 'ホームダイアログ');
        await page.click('#confirm-dialog-no');
        await sleep(200);

        // ========================================
        // フェーズ19: リセット
        // ========================================
        console.log('\n🔄 フェーズ19: リセット');

        await page.click('#btn-reset');
        await sleep(300);
        assert(await page.$('#confirm-dialog-overlay') !== null, 'リセットダイアログ');
        await page.click('#confirm-dialog-no');
        await sleep(200);

        // ========================================
        // フェーズ20: ヘルプ
        // ========================================
        console.log('\n❓ フェーズ20: ヘルプ');

        await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle0' });
        assert(await page.$eval('h2', el => el.textContent).then(t => t.includes('ヘルプ')), 'ヘルプ見出し');

        const hs = await page.$$eval('section[aria-labelledby]', els => els.map(e => e.getAttribute('aria-labelledby')));
        assert(hs.length >= 4, `セクション数: ${hs.length}`);
        assert(hs.some(s => s.includes('keyboard')), 'キーボードセクション');
        assert(hs.some(s => s.includes('screen-reader')), 'SRセクション');

        // ========================================
        // フェーズ21: 境界チェック
        // ========================================
        console.log('\n🔲 フェーズ21: 境界チェック');

        await page.goto(gameUrl, { waitUntil: 'networkidle0' });

        await page.focus('.cell[data-rank="1"][data-file="1"]');
        await sleep(50);
        // click to set focusedCell
        await page.click('.cell[data-rank="1"][data-file="1"]');
        await sleep(100);
        await page.keyboard.press('ArrowDown');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.rank) === '1', '1段目ArrowDown不動');

        await page.click('.cell[data-rank="9"][data-file="9"]');
        await sleep(100);
        await page.keyboard.press('ArrowUp');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.rank) === '9', '9段目ArrowUp不動');

        await page.keyboard.press('ArrowLeft');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.file) === '9', '9列目ArrowLeft不動');

        await page.click('.cell[data-rank="9"][data-file="1"]');
        await sleep(100);
        await page.keyboard.press('ArrowRight');
        await sleep(100);
        assert(await page.$eval('.cell[tabindex="0"]', el => el.dataset.file) === '1', '1列目ArrowRight不動');

        // ========================================
        // フェーズ22: CSRFトークン期限切れ
        // ========================================
        console.log('\n🔒 フェーズ22: CSRFトークン期限切れ');

        // CSRFトークンを無効化して駒を動かす
        await page.evaluate(() => {
            document.querySelector('meta[name="csrf-token"]').setAttribute('content', 'expired_token');
        });
        // 先手の歩を選択して移動を試みる
        await page.click('.cell[data-rank="3"][data-file="1"]');
        await sleep(300);
        await page.click('.cell[data-rank="4"][data-file="1"]');
        await sleep(1500);

        // セッション期限切れダイアログが表示される
        const expiredDialog = await page.$('#session-expired-overlay');
        assert(expiredDialog !== null, 'CSRFエラーでセッション期限切れダイアログ表示');

        if (expiredDialog) {
            const dialogRole = await page.$eval('#session-expired-overlay', el => el.getAttribute('role'));
            assert(dialogRole === 'alertdialog', 'ダイアログ role=alertdialog');

            const dialogTitle = await page.$eval('#session-expired-title', el => el.textContent);
            assert(dialogTitle.includes('有効期限'), 'ダイアログタイトルに有効期限');

            const reloadBtn = await page.$('#session-expired-reload');
            assert(reloadBtn !== null, '再読み込みボタン存在');

            const focusedId = await page.evaluate(() => document.activeElement?.id);
            assert(focusedId === 'session-expired-reload', 'フォーカスが再読み込みボタンに移動');

            // aria-modal
            const ariaModal = await page.$eval('#session-expired-overlay', el => el.getAttribute('aria-modal'));
            assert(ariaModal === 'true', 'ダイアログ aria-modal="true"');

            // クリーンアップ: ダイアログを閉じてトークンを復元
            await page.evaluate(() => {
                document.getElementById('session-expired-overlay')?.remove();
            });
        }

        // CSRFトークンを復元
        await page.evaluate(() => {
            // ページのCSRFクッキーを使って復元（テスト継続のため）
            // 実際にはリロードが必要だが、テスト続行のためにダミー処理
        });

        // アナウンスが日本語であることを確認
        const announceText = await page.$eval('#game-announcements', el => el.textContent);
        assert(announceText.includes('セッション') || announceText.includes('有効期限'), 'アナウンスが日本語');

        // ========================================
        // サマリー
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log(`🎯 全盲ユーザー対局テスト: ${passed} passed / ${failed} failed`);
        
        if (issues.length > 0) {
            console.log('\n🔴 問題:');
            issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
        } else {
            console.log('\n✅ 全テスト合格！');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\nエラー:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }

    process.exit(failed > 0 ? 1 : 0);
})();
