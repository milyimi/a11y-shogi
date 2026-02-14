/**
 * 棋士（プロ将棋プレイヤー）AI視点のテスト
 * 
 * 将棋のルールと用語に精通しており、UI/UXの正確性・将棋用語の正しさ・
 * ゲームフローの自然さを厳しく評価する。
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

    console.log('\n═══ 棋士AI: 将棋の正確性チェック ═══\n');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // === 初期配置の正確性 ===
    await startGame(page);

    // S-1: 初期配置が正しいか（全40枚の駒チェック）
    const initBoard = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        const errors = [];
        
        // 先手（下側、rank 1-3）
        // 1段目: 香 桂 銀 金 玉 金 銀 桂 香
        const rank1 = [
            { f: 9, type: 'kyosha' }, { f: 8, type: 'keima' }, { f: 7, type: 'gin' },
            { f: 6, type: 'kin' }, { f: 5, type: 'gyoku' }, { f: 4, type: 'kin' },
            { f: 3, type: 'gin' }, { f: 2, type: 'keima' }, { f: 1, type: 'kyosha' }
        ];
        rank1.forEach(({ f, type }) => {
            const p = board[1]?.[f];
            if (!p || p.type !== type || p.color !== 'sente') {
                errors.push(`1段${f}筋: expected sente ${type}, got ${p ? p.color + ' ' + p.type : 'empty'}`);
            }
        });
        
        // 2段目: 角(8), 飛(2)
        const r2_8 = board[2]?.[8];
        if (!r2_8 || r2_8.type !== 'kaku' || r2_8.color !== 'sente') errors.push('2段8筋: 角がない');
        const r2_2 = board[2]?.[2];
        if (!r2_2 || r2_2.type !== 'hisha' || r2_2.color !== 'sente') errors.push('2段2筋: 飛がない');
        
        // 3段目: 歩×9
        for (let f = 1; f <= 9; f++) {
            const p = board[3]?.[f];
            if (!p || p.type !== 'fu' || p.color !== 'sente') errors.push(`3段${f}筋: 歩がない`);
        }
        
        // 後手（上側、rank 7-9）
        // 9段目
        const rank9 = [
            { f: 9, type: 'kyosha' }, { f: 8, type: 'keima' }, { f: 7, type: 'gin' },
            { f: 6, type: 'kin' }, { f: 5, type: 'gyoku' }, { f: 4, type: 'kin' },
            { f: 3, type: 'gin' }, { f: 2, type: 'keima' }, { f: 1, type: 'kyosha' }
        ];
        rank9.forEach(({ f, type }) => {
            const p = board[9]?.[f];
            if (!p || p.type !== type || p.color !== 'gote') {
                errors.push(`9段${f}筋: expected gote ${type}, got ${p ? p.color + ' ' + p.type : 'empty'}`);
            }
        });
        
        // 8段目: 飛(8), 角(2)
        const r8_8 = board[8]?.[8];
        if (!r8_8 || r8_8.type !== 'hisha' || r8_8.color !== 'gote') errors.push('8段8筋: 飛がない');
        const r8_2 = board[8]?.[2];
        if (!r8_2 || r8_2.type !== 'kaku' || r8_2.color !== 'gote') errors.push('8段2筋: 角がない');
        
        // 7段目: 歩×9
        for (let f = 1; f <= 9; f++) {
            const p = board[7]?.[f];
            if (!p || p.type !== 'fu' || p.color !== 'gote') errors.push(`7段${f}筋: 歩がない`);
        }
        
        // 中央(4-6段)は空
        for (let r = 4; r <= 6; r++) {
            for (let f = 1; f <= 9; f++) {
                if (board[r]?.[f]) errors.push(`${r}段${f}筋: 空であるべき`);
            }
        }
        
        return errors;
    });

    check('S-1 初期配置が正確（全40枚）', initBoard.length === 0,
        initBoard.length > 0 ? initBoard.join('; ') : '完全一致');

    // S-2: 盤面の向き — 先手が下（rank 1-3）、後手が上（rank 7-9）
    const boardOrientation = await page.evaluate(() => {
        // rank 9 が最上段（gote陣）、rank 1 が最下段（sente陣）
        const cells = document.querySelectorAll('.cell');
        const topRow = document.querySelector('[aria-label="9段目"]');
        const bottomRow = document.querySelector('[aria-label="1段目"]');
        if (!topRow || !bottomRow) return { ok: false, reason: 'row不明' };
        
        const topRect = topRow.querySelector('.cell').getBoundingClientRect();
        const botRect = bottomRow.querySelector('.cell').getBoundingClientRect();
        return { ok: topRect.top < botRect.top, reason: `top9=${Math.round(topRect.top)},top1=${Math.round(botRect.top)}` };
    });
    check('S-2 先手が下・後手が上の正しい向き', boardOrientation.ok, boardOrientation.reason);

    // S-3: 筋の番号が右から左（9→1）
    const fileOrder = await page.evaluate(() => {
        const firstRow = document.querySelector('[aria-label="9段目"]');
        const cells = firstRow.querySelectorAll('.cell');
        const files = [];
        cells.forEach(c => files.push(parseInt(c.dataset.file)));
        return files;
    });
    check('S-3 筋は右から左（9→1）', JSON.stringify(fileOrder) === '[9,8,7,6,5,4,3,2,1]',
        fileOrder.join(','));

    // S-4: 段の番号が上から下（9→1）で正しい将棋座標系
    const rankOrder = await page.evaluate(() => {
        const ranks = [];
        document.querySelectorAll('[role="row"]').forEach(row => {
            const cell = row.querySelector('.cell');
            if (cell) ranks.push(parseInt(cell.dataset.rank));
        });
        return ranks;
    });
    check('S-4 段は上から下（9→1）', JSON.stringify(rankOrder) === '[9,8,7,6,5,4,3,2,1]',
        rankOrder.join(','));

    // S-5: 王と玉の使い分け — 本将棋では先手が「玉」、後手も「玉」(または先手「王」後手「玉」 / どちらも「玉」)
    const royalCheck = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        const sente = board[1]?.[5];
        const gote = board[9]?.[5];
        return {
            senteType: sente?.type,
            goteType: gote?.type,
            ok: (sente?.type === 'gyoku' || sente?.type === 'ou') && 
                (gote?.type === 'gyoku' || gote?.type === 'ou')
        };
    });
    check('S-5 王/玉の配置が正しい', royalCheck.ok,
        `先手=${royalCheck.senteType}, 後手=${royalCheck.goteType}`);

    // S-6: 後手の飛車角が正しい位置（先手と左右対称）
    // 先手: 飛(2,2), 角(8,2)  →  後手: 飛(8,8), 角(2,8)
    const bishopRookCheck = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        return {
            senteHisha: board[2]?.[2]?.type,
            senteKaku: board[2]?.[8]?.type,
            goteHisha: board[8]?.[8]?.type,
            goteKaku: board[8]?.[2]?.type
        };
    });
    check('S-6 飛車角の左右対称配置', 
        bishopRookCheck.senteHisha === 'hisha' && bishopRookCheck.senteKaku === 'kaku' &&
        bishopRookCheck.goteHisha === 'hisha' && bishopRookCheck.goteKaku === 'kaku',
        JSON.stringify(bishopRookCheck));

    // === 将棋用語の正確性 ===

    // S-7: 駒名表記が正しい（「と金」「成香」等の将棋用語）
    const helpPage = await browser.newPage();
    await helpPage.goto(BASE + '/help', { waitUntil: 'networkidle0' });
    const helpText = await helpPage.$eval('body', el => el.textContent);

    check('S-7a 歩の説明に「前に1マス」', helpText.includes('前に1マス'));
    check('S-7b 香の説明に「前方へまっすぐ」', helpText.includes('前方へまっすぐ'));
    check('S-7c 桂の説明に「跳ぶ」', helpText.includes('跳ぶ'));
    check('S-7d 銀の説明に「前方3方向」', helpText.includes('前方3方向'));
    check('S-7e 金の説明に「前後左右」', helpText.includes('前後左右'));
    check('S-7f 角の説明に「斜め」', helpText.includes('斜め'));
    check('S-7g 飛の説明に「前後左右」', helpText.includes('前後左右'));
    check('S-7h 玉の説明に「全方向」', helpText.includes('全方向'));
    await helpPage.close();

    // S-8: 成りの説明が正確
    check('S-8a 成りが「敵陣」に関連', helpText.includes('敵陣'));
    check('S-8b 二歩禁止の説明', helpText.includes('二歩'));
    check('S-8c 王手の説明', helpText.includes('王手'));
    check('S-8d 詰みの説明', helpText.includes('詰み'));

    // === ゲームフローの正確性 ===

    // S-9: 先手番で開始（先手選択時）
    const whoFirst = await page.evaluate(() => window.gameData.currentPlayer);
    check('S-9 先手選択で先手番開始', whoFirst === 'human');

    // S-10: 歩を突く→合法手が正しい（前方1マスだけ）
    const pawnLegal = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        // 5筋の歩（5の3）を選択して合法手を確認
        const p = board[3]?.[5];
        if (!p || p.type !== 'fu' || p.color !== 'sente') return { ok: false, reason: '5の3に歩がない' };
        return { ok: true, rank: 3, file: 5 };
    });
    if (pawnLegal.ok) {
        const el = await page.$(`.cell[data-rank="3"][data-file="5"]`);
        if (el) await el.click();
        await sleep(400);
        const legalMoves = await page.$$eval('.cell[data-legal-move="true"]', els =>
            els.map(e => ({ rank: e.dataset.rank, file: e.dataset.file }))
        );
        check('S-10 歩の合法手は前方1マスのみ', 
            legalMoves.length === 1 && legalMoves[0].rank === '4' && legalMoves[0].file === '5',
            legalMoves.map(m => `${m.file}の${m.rank}`).join(', '));
        // 選択解除
        await page.keyboard.press('Escape');
        await sleep(200);
    } else {
        check('S-10 歩の合法手は前方1マスのみ', false, pawnLegal.reason);
    }

    // S-11: 飛車の合法手（縦横何マスでも）
    const rookLegal = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        const p = board[2]?.[2];
        return p && p.type === 'hisha' && p.color === 'sente';
    });
    if (rookLegal) {
        const el = await page.$(`.cell[data-rank="2"][data-file="2"]`);
        if (el) await el.click();
        await sleep(400);
        const rookMoves = await page.$$eval('.cell[data-legal-move="true"]', els => els.length);
        // 初期配置の飛車は歩の後ろなので縦に動けず、横に動ける
        check('S-11 飛車の合法手が存在', rookMoves > 0, `${rookMoves}マス`);
        await page.keyboard.press('Escape');
        await sleep(200);
    } else {
        check('S-11 飛車の合法手が存在', false, '飛車が見つからない');
    }

    // S-12: 角の合法手（初期配置では動けないはず＝前に歩がある）
    const bishopLegal = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        const p = board[2]?.[8];
        return p && p.type === 'kaku' && p.color === 'sente';
    });
    if (bishopLegal) {
        const el = await page.$(`.cell[data-rank="2"][data-file="8"]`);
        if (el) await el.click();
        await sleep(400);
        const bishopMoves = await page.$$eval('.cell[data-legal-move="true"]', els => els.length);
        check('S-12 角は初期配置で動けない（歩が邪魔）', bishopMoves === 0,
            `${bishopMoves}マス`);
        await page.keyboard.press('Escape');
        await sleep(200);
    } else {
        check('S-12 角は初期配置で動けない', false, '角が見つからない');
    }

    // S-13: 桂馬の合法手（初期配置では動けない＝前に歩がある）
    const knightCheck = await page.evaluate(() => {
        const board = window.gameData.boardState.board;
        const p = board[1]?.[2]; // 先手の桂
        return p && p.type === 'keima' && p.color === 'sente';
    });
    if (knightCheck) {
        const el = await page.$(`.cell[data-rank="1"][data-file="2"]`);
        if (el) await el.click();
        await sleep(400);
        const knightMoves = await page.$$eval('.cell[data-legal-move="true"]', els => els.length);
        // 桂馬は飛び越せるが、行き先に自駒がある場合動けない
        // (2,1)→(1,3)と(3,3) = 歩がある; ただし桂は歩を飛び越える
        // 正しくは (2,1) から (1,3) (3,3) だが 3段目に自分の歩がある
        check('S-13 桂馬の初期合法手チェック', knightMoves === 0,
            `${knightMoves}マス（3段目に自歩）`);
        await page.keyboard.press('Escape');
        await sleep(200);
    } else {
        check('S-13 桂馬の初期合法手チェック', false);
    }

    // S-14: 一手指して手数がカウントされる
    const beforeMoveCount = await page.$eval('#move-count', el => el.textContent.trim());
    // 7六歩を指す
    const pawn76 = await page.$(`.cell[data-rank="3"][data-file="7"]`);
    if (pawn76) {
        await pawn76.click();
        await sleep(300);
        const target = await page.$(`.cell[data-rank="4"][data-file="7"]`);
        if (target) {
            await target.click();
            await sleep(3000); // AIの応答待ち
        }
    }
    const afterMoveCount = await page.$eval('#move-count', el => el.textContent.trim());
    check('S-14 手数がカウントされる', beforeMoveCount !== afterMoveCount,
        `${beforeMoveCount} → ${afterMoveCount}`);

    // S-15: 棋譜にKIF形式に近い表記がある
    const histBtn = await page.$('#btn-open-history');
    if (histBtn) {
        await histBtn.click();
        await sleep(500);
        const historyContent = await page.$eval('#move-history', el => el.textContent.trim());
        check('S-15 棋譜に指し手記録がある', historyContent.length > 0 && historyContent !== 'まだ指し手がありません',
            historyContent.substring(0, 80));
        await page.keyboard.press('Escape');
        await sleep(300);
    }

    // S-16: aria-labelの将棋座標が正しい（「5の3」= 5筋3段目）
    const coordLabel = await page.$eval('.cell[data-rank="3"][data-file="5"]', el => el.getAttribute('aria-label'));
    check('S-16 aria-labelの座標が「筋の段」形式', coordLabel.startsWith('5の3'),
        coordLabel);

    // S-17: 後手の駒が180度回転（将棋盤の正しい向き）
    const goteRotation = await page.evaluate(() => {
        const gotePiece = document.querySelector('.piece-gote');
        if (!gotePiece) return null;
        const cs = getComputedStyle(gotePiece);
        return cs.transform;
    });
    check('S-17 後手駒が180度回転', goteRotation && goteRotation !== 'none',
        goteRotation);

    // S-18: 後手駒に下線（先手と視覚的に区別）
    const goteUnderline = await page.evaluate(() => {
        const gotePiece = document.querySelector('.piece-gote');
        if (!gotePiece) return null;
        const cs = getComputedStyle(gotePiece);
        return cs.textDecorationLine || cs.textDecoration;
    });
    check('S-18 後手駒に下線で区別', goteUnderline && goteUnderline.includes('underline'),
        goteUnderline);

    // S-19: 持ち駒エリアが両方存在
    const senteHand = await page.$('#sente-hand');
    const goteHand = await page.$('#gote-hand');
    check('S-19 先手・後手の駒台が両方存在', senteHand !== null && goteHand !== null);

    // S-20: 待った機能（棋譜を戻す）
    const undoBtn = await page.$('#btn-undo');
    const undoEnabled = undoBtn ? await page.evaluate(el => !el.disabled, undoBtn) : false;
    check('S-20 手を指した後に待ったが有効', undoEnabled);

    await page.close();

    // ━━━ サマリー ━━━
    console.log('\n═══ 棋士AIテスト結果サマリー ═══');
    console.log(`合計: ${pass + fail} テスト / ✅ ${pass} 成功 / ❌ ${fail} 失敗`);
    if (fail > 0) {
        console.log('\n失敗項目:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    }

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
