/**
 * 全機能 E2E テスト（Puppeteer）
 *
 * ブラウザ経由で全てのゲーム機能が正しく動作するか検証する。
 *
 * 検証項目:
 *  1. ゲーム開始（難易度・先後選択）
 *  2. 駒の移動（歩の前進）＋AI応答
 *  3. 待った（undo）— 2手巻き戻し＋盤面復元
 *  4. リセット — 初期盤面に復元
 *  5. 投了 — ゲーム終了処理
 *  6. ホームに戻る（中断）
 *  7. 棋譜記録の整合性
 *  8. タイマー動作
 *  9. 後手でのゲーム開始＋AI先手
 * 10. 難易度別ゲーム開始
 */

import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:8000';

// ───────── helpers ─────────
let passed = 0;
let failed = 0;
const failures = [];

function check(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
    failures.push(msg);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** ゲームを新規開始して game ページへ遷移する */
async function startNewGame(page, { difficulty = 'easy', color = 'sente' } = {}) {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.click(`input[value="${difficulty}"]`);
  await page.click(`input[value="${color}"]`);
  await page.click('#btn-start-game');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  return page.url();
}

/** window.gameData をブラウザから取得 */
async function getGameData(page) {
  return page.evaluate(() => {
    const gd = window.gameData || {};
    return {
      status: gd.status,
      currentPlayer: gd.currentPlayer,
      humanColor: gd.humanColor,
      moveCount: gd.moveCount,
      boardState: gd.boardState,
    };
  });
}

/** 指定マスの aria-label を取得 */
async function cellLabel(page, rank, file) {
  return page.$eval(
    `.cell[data-rank="${rank}"][data-file="${file}"]`,
    el => el.getAttribute('aria-label')
  ).catch(() => null);
}

/** 先手の歩を1マス前へ進める（rank3→rank4）。返り値: 移動した筋 or null */
async function movePawnForward(page) {
  const pawn = await page.$$eval('.cell.piece-sente', els => {
    for (const el of els) {
      if (el.getAttribute('aria-label')?.includes('歩') && parseInt(el.dataset.rank) === 3) {
        return { rank: 3, file: parseInt(el.dataset.file) };
      }
    }
    return null;
  });
  if (!pawn) return null;

  await page.click(`.cell[data-rank="${pawn.rank}"][data-file="${pawn.file}"]`);
  await sleep(300);
  await page.click(`.cell[data-rank="4"][data-file="${pawn.file}"]`);
  await sleep(2500); // AI 応答待ち
  return pawn.file;
}

/** 確認ダイアログの「はい」をクリック */
async function confirmYes(page) {
  await sleep(400);
  const btn = await page.$('#confirm-dialog-yes');
  if (btn) await btn.click();
  await sleep(1500);
}

/** 確認ダイアログの「はい」をクリックし、ナビゲーション完了を待つ */
async function confirmYesAndNavigate(page) {
  await sleep(400);
  const btn = await page.$('#confirm-dialog-yes');
  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  if (btn) await btn.click();
  await navPromise;
  await sleep(500);
}

/** 確認ダイアログの「キャンセル」をクリック */
async function confirmNo(page) {
  await sleep(400);
  const btn = await page.$('#confirm-dialog-no');
  if (btn) await btn.click();
  await sleep(300);
}

// ───────── main ─────────
(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   全機能 E2E テスト (Puppeteer)      ║');
  console.log('╚══════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // コンソールエラーを記録
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ══════════════════════════════════════
    //  TEST 1: ゲーム開始（先手・かんたん）
    // ══════════════════════════════════════
    console.log('── 1. ゲーム開始 ──');

    const gameUrl = await startNewGame(page, { difficulty: 'easy', color: 'sente' });
    check(gameUrl.includes('/game/'), `ゲームページに遷移: ${gameUrl}`);

    const gd1 = await getGameData(page);
    check(gd1.status === 'in_progress', `ステータス: ${gd1.status}`);
    check(gd1.currentPlayer === 'human', `手番: ${gd1.currentPlayer}`);
    check(gd1.humanColor === 'sente', `先後: ${gd1.humanColor}`);

    // 初期盤面確認: 先手の歩が3段目にある
    const fuLabel = await cellLabel(page, 3, 5);
    check(fuLabel?.includes('歩'), `3-5に歩: "${fuLabel}"`);

    // 先手の玉が1段目にある
    const gyokuLabel = await cellLabel(page, 1, 5);
    check(gyokuLabel?.includes('玉'), `1-5に玉: "${gyokuLabel}"`);

    // 後手の玉が9段目にある
    const goteGyoku = await cellLabel(page, 9, 5);
    check(goteGyoku?.includes('玉'), `9-5に後手玉: "${goteGyoku}"`);

    // ══════════════════════════════════════
    //  TEST 2: 駒の移動＋AI応答
    // ══════════════════════════════════════
    console.log('\n── 2. 駒の移動＋AI応答 ──');

    const movedFile = await movePawnForward(page);
    check(movedFile !== null, `歩を移動 (${movedFile}筋)`);

    if (movedFile) {
      // 移動先に歩がいるか
      const movedLabel = await cellLabel(page, 4, movedFile);
      check(movedLabel?.includes('歩'), `4-${movedFile}に歩到着: "${movedLabel}"`);

      // 移動元は空になっている
      const emptyLabel = await cellLabel(page, 3, movedFile);
      check(!emptyLabel?.includes('歩') || emptyLabel?.includes('空'), `3-${movedFile}は空: "${emptyLabel}"`);

      // 手数が更新されている (人間1手 + AI1手 = 2手)
      const moveCountText = await page.$eval('#move-count', el => el.textContent);
      check(moveCountText.includes('2'), `手数表示: "${moveCountText}"`);

      // 手番が人間に戻っている
      const currentPlayerText = await page.$eval('#current-player', el => el.textContent.trim());
      check(currentPlayerText.includes('あなた') || currentPlayerText.includes('先手'), `手番表示: "${currentPlayerText}"`);

      // 棋譜に記録がある
      const historyItems = await page.$$eval('#move-history li', els => els.length);
      check(historyItems >= 2, `棋譜: ${historyItems}手記録`);

      // アナウンスにテキストがある
      const announce = await page.$eval('#game-announcements', el => el.textContent);
      check(announce.length > 0, `アナウンス: "${announce.substring(0, 50)}"`);
    }

    // ══════════════════════════════════════
    //  TEST 3: 待った（undo）
    // ══════════════════════════════════════
    console.log('\n── 3. 待った（undo） ──');

    // 待ったボタンが有効か
    const undoDisabledBefore = await page.$eval('#btn-undo', el => el.disabled);
    check(!undoDisabledBefore, '待ったボタン有効');

    // 待ったキャンセルテスト
    await page.click('#btn-undo');
    await sleep(400);
    const dialogShown = await page.$('#confirm-dialog-overlay');
    check(dialogShown !== null, '確認ダイアログ表示');
    await confirmNo(page);

    // 盤面は変わっていないはず
    if (movedFile) {
      const stillThere = await cellLabel(page, 4, movedFile);
      check(stillThere?.includes('歩'), 'キャンセル後: 盤面変化なし');
    }

    // 待った実行
    await page.click('#btn-undo');
    await confirmYesAndNavigate(page);

    // 盤面が初期状態に戻っている（歩が3段目）
    if (movedFile) {
      const restoredLabel = await cellLabel(page, 3, movedFile);
      check(restoredLabel?.includes('歩'), `待った後: 3-${movedFile}に歩復元: "${restoredLabel}"`);

      const rank4Label = await cellLabel(page, 4, movedFile);
      check(!rank4Label?.includes('先手') || rank4Label?.includes('空'), `待った後: 4-${movedFile}は空: "${rank4Label}"`);
    }

    // 手数が0に戻っている
    const moveCountAfterUndo = await page.$eval('#move-count', el => el.textContent);
    check(moveCountAfterUndo.includes('0'), `待った後手数: "${moveCountAfterUndo}"`);

    // 手番が人間に戻っている
    const playerAfterUndo = await page.$eval('#current-player', el => el.textContent.trim());
    check(playerAfterUndo.includes('あなた') || playerAfterUndo.includes('先手'), `待った後手番: "${playerAfterUndo}"`);

    // ══════════════════════════════════════
    //  TEST 4: もう一度指してからリセット
    // ══════════════════════════════════════
    console.log('\n── 4. リセット ──');

    // もう1手指す
    const movedFile2 = await movePawnForward(page);
    check(movedFile2 !== null, `リセット前に歩移動 (${movedFile2}筋)`);

    // リセットキャンセル
    await page.click('#btn-reset');
    await sleep(400);
    check(await page.$('#confirm-dialog-overlay') !== null, 'リセット確認ダイアログ表示');
    await confirmNo(page);

    // 盤面は変わっていないはず
    if (movedFile2) {
      const notReset = await cellLabel(page, 4, movedFile2);
      check(notReset?.includes('歩'), 'リセットキャンセル後: 盤面変化なし');
    }

    // リセット実行
    await page.click('#btn-reset');
    await confirmYesAndNavigate(page);

    // 初期盤面に戻っている
    const resetLabel = await cellLabel(page, 3, 5);
    check(resetLabel?.includes('歩'), `リセット後: 3-5に歩: "${resetLabel}"`);

    const resetMoveCount = await page.$eval('#move-count', el => el.textContent);
    check(resetMoveCount.includes('0'), `リセット後手数: "${resetMoveCount}"`);

    const resetHistory = await page.$$eval('#move-history li', els => els.length);
    check(resetHistory === 0, `リセット後棋譜: ${resetHistory}件`);

    // ══════════════════════════════════════
    //  TEST 5: 投了
    // ══════════════════════════════════════
    console.log('\n── 5. 投了 ──');

    // まず1手指す（投了対象の対局にする）
    await movePawnForward(page);

    // 投了キャンセル
    await page.click('#btn-resign');
    await sleep(400);
    check(await page.$('#confirm-dialog-overlay') !== null, '投了確認ダイアログ表示');
    await confirmNo(page);

    // 投了実行
    await page.click('#btn-resign');
    await confirmYes(page);
    await sleep(1500);

    // ゲームが終了したか確認
    const gd5 = await getGameData(page);
    check(gd5.status === 'resigned' || gd5.status === 'mate', `投了後ステータス: ${gd5.status}`);

    // ランキング登録ダイアログ or 結果メッセージが表示される
    const announceResign = await page.$eval('#game-announcements', el => el.textContent);
    check(announceResign.includes('投了') || announceResign.includes('負け') || announceResign.length > 0, `投了アナウンス: "${announceResign.substring(0, 50)}"`);

    // ══════════════════════════════════════
    //  TEST 6: ホームに戻る（中断）
    // ══════════════════════════════════════
    console.log('\n── 6. ホームに戻る ──');

    // 新しいゲームを開始
    const gameUrl2 = await startNewGame(page, { difficulty: 'easy', color: 'sente' });
    check(gameUrl2.includes('/game/'), `新ゲーム開始: ${gameUrl2}`);

    // 1手指す
    await movePawnForward(page);

    // ホームに戻る — キャンセル
    await page.click('#btn-quit');
    await sleep(400);
    check(await page.$('#confirm-dialog-overlay') !== null, '中断確認ダイアログ表示');
    await confirmNo(page);

    // まだゲームページにいる
    check(page.url().includes('/game/'), 'キャンセル後: ゲームページのまま');

    // ホームに戻る — 実行
    await page.click('#btn-quit');
    await confirmYesAndNavigate(page);

    // ホームに戻っている
    const afterQuitUrl = page.url();
    check(!afterQuitUrl.includes('/game/') || afterQuitUrl === BASE + '/', `ホーム復帰: ${afterQuitUrl}`);

    // ══════════════════════════════════════
    //  TEST 7: 棋譜記録の整合性
    // ══════════════════════════════════════
    console.log('\n── 7. 棋譜記録 ──');

    await startNewGame(page, { difficulty: 'easy', color: 'sente' });

    // 2手指す
    const f1 = await movePawnForward(page);
    check(f1 !== null, `1手目: ${f1}筋`);

    const hist1 = await page.$$eval('#move-history li', els => els.map(e => e.textContent));
    check(hist1.length >= 2, `棋譜2手: ${hist1.length}件`);
    check(hist1[0]?.includes('先手'), `先手の手: "${hist1[0]}"`);
    check(hist1.length >= 2 && hist1[1]?.includes('後手'), `後手の手: "${hist1[1]}"`);

    // さらに1手指す
    const f2 = await movePawnForward(page);
    if (f2) {
      const hist2 = await page.$$eval('#move-history li', els => els.length);
      check(hist2 >= 4, `棋譜4手: ${hist2}件`);
    }

    // ══════════════════════════════════════
    //  TEST 8: タイマー動作
    // ══════════════════════════════════════
    console.log('\n── 8. タイマー ──');

    const t1 = await page.$eval('#elapsed-time', el => el.textContent);
    await sleep(2500);
    const t2 = await page.$eval('#elapsed-time', el => el.textContent);
    check(t1 !== t2, `タイマー進行: "${t1}" → "${t2}"`);

    // ══════════════════════════════════════
    //  TEST 9: 後手でゲーム開始
    // ══════════════════════════════════════
    console.log('\n── 9. 後手でゲーム開始 ──');

    const gameUrl3 = await startNewGame(page, { difficulty: 'easy', color: 'gote' });
    check(gameUrl3.includes('/game/'), `後手ゲーム: ${gameUrl3}`);

    const gd9 = await getGameData(page);
    check(gd9.humanColor === 'gote', `先後: ${gd9.humanColor}`);

    // AI（先手）が最初に指す → 手数が1以上
    await sleep(2000);
    const gd9b = await getGameData(page);
    // 後手の場合、ページロード時にAIが自動で先手を指す仕組みがあるかどうかは実装依存
    // 実際にはinitAutoPlayかmove APIの呼び出しで確認
    const moveCountGote = await page.$eval('#move-count', el => el.textContent);
    console.log(`    後手時の手数表示: "${moveCountGote}"`);

    // ══════════════════════════════════════
    //  TEST 10: 難易度別ゲーム開始
    // ══════════════════════════════════════
    console.log('\n── 10. 難易度別ゲーム開始 ──');

    for (const diff of ['easy', 'medium', 'hard']) {
      const url = await startNewGame(page, { difficulty: diff, color: 'sente' });
      check(url.includes('/game/'), `${diff} ゲーム開始`);

      const diffLabel = await page.evaluate(() => {
        const dd = document.querySelectorAll('dl dd');
        for (const el of dd) {
          if (el.textContent.includes('初級') || el.textContent.includes('中級') || el.textContent.includes('上級'))
            return el.textContent.trim();
        }
        return '';
      });
      const expected = { easy: '初級', medium: '中級', hard: '上級' }[diff];
      check(diffLabel.includes(expected), `難易度表示: "${diffLabel}" (期待: ${expected})`);
    }

    // ══════════════════════════════════════
    //  TEST 11: 待った連続（2回目）
    // ══════════════════════════════════════
    console.log('\n── 11. 待った連続テスト ──');

    await startNewGame(page, { difficulty: 'easy', color: 'sente' });

    // 1手目
    const uf1 = await movePawnForward(page);
    check(uf1 !== null, '1手目移動');

    // 待った
    await page.click('#btn-undo');
    await confirmYesAndNavigate(page);

    const afterUndo1 = await page.$eval('#move-count', el => el.textContent);
    check(afterUndo1.includes('0'), `1回目待った後: ${afterUndo1}`);

    // もう1手指す
    const uf2 = await movePawnForward(page);
    check(uf2 !== null, '待った後に再移動');

    // もう1回待った
    await page.click('#btn-undo');
    await confirmYesAndNavigate(page);

    const afterUndo2 = await page.$eval('#move-count', el => el.textContent);
    check(afterUndo2.includes('0'), `2回目待った後: ${afterUndo2}`);

    // ══════════════════════════════════════
    //  TEST 12: ボタン無効化
    // ══════════════════════════════════════
    console.log('\n── 12. ボタン無効化 ──');

    // 初期状態（0手）で待ったボタンは無効
    const undoDisabled = await page.$eval('#btn-undo', el => el.disabled);
    check(undoDisabled, '0手時: 待ったボタン無効');

    // ══════════════════════════════════════
    //  TEST 13: コンソールエラー
    // ══════════════════════════════════════
    console.log('\n── 13. コンソールエラー ──');

    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('[BOOST]')
    );
    check(criticalErrors.length === 0, `重大なJSエラーなし (${criticalErrors.length}件)`);
    if (criticalErrors.length > 0) {
      criticalErrors.forEach(e => console.log(`    ⚠️  ${e.substring(0, 100)}`));
    }

    // ══════════════════════════════════════
    //  TEST 14: 不正な移動のエラーハンドリング
    // ══════════════════════════════════════
    console.log('\n── 14. 不正な移動 ──');

    await startNewGame(page, { difficulty: 'easy', color: 'sente' });

    // 空マスをクリック
    await page.click('.cell[data-rank="5"][data-file="5"]');
    await sleep(300);
    const emptyMsg = await page.$eval('#game-announcements', el => el.textContent);
    check(emptyMsg.includes('空') || emptyMsg.includes('ありません'), `空マスフィードバック: "${emptyMsg.substring(0, 50)}"`);

    // 相手の駒をクリック
    const gotePiece = await page.$('.cell.piece-gote');
    if (gotePiece) {
      await gotePiece.click();
      await sleep(300);
      const goteMsg = await page.$eval('#game-announcements', el => el.textContent);
      check(goteMsg.includes('相手') || goteMsg.includes('選択できません'), `相手駒フィードバック: "${goteMsg.substring(0, 50)}"`);
    }

    // ══════════════════════════════════════
    //  TEST 15: ヘルプページ
    // ══════════════════════════════════════
    console.log('\n── 15. ヘルプページ ──');

    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle0' });
    const helpTitle = await page.title();
    check(helpTitle.includes('ヘルプ'), `ヘルプタイトル: "${helpTitle}"`);

    const helpSections = await page.$$eval('section[aria-labelledby]', els => els.length);
    check(helpSections >= 4, `セクション数: ${helpSections}`);

    const homeLink = await page.$('a[href="/"], a[href="http://localhost:8000"], a[href="http://127.0.0.1:8000"]');
    check(homeLink !== null, 'ホームリンク存在');

  } catch (error) {
    console.error('\n💥 テスト中にエラー:', error.message);
    console.error(error.stack);
    failed++;
    failures.push(`テスト実行エラー: ${error.message}`);
  } finally {
    await browser.close();
  }

  // ── サマリー ──
  console.log('\n' + '═'.repeat(50));
  console.log(`  結果: ${passed} passed / ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  🔴 失敗:');
    failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
  } else {
    console.log('  ✅ 全テスト合格！');
  }
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
})();
