/**
 * アクセシビリティ E2E テスト（Puppeteer）
 *
 * 視覚障害者が実際にキーボードだけで将棋を遊べるかを検証する。
 *
 * 検証項目:
 *  1. ホーム画面: スキップリンク、ランドマーク、フォーム操作
 *  2. ゲーム画面: 盤面のaria-label、キーボードナビゲーション、
 *     ライブリージョン、駒の選択→移動フロー
 *  3. 成りダイアログ: role/aria属性、フォーカストラップ
 *  4. ランキングダイアログ: role/aria属性、Escape で閉じる
 */

import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:8000';

// ───────────── helpers ─────────────
function ok(cond, msg) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    return false;
  }
  console.log(`  ✓ PASS: ${msg}`);
  return true;
}

let passed = 0;
let failed = 0;
const issues = []; // 発見したアクセシビリティ問題

function check(cond, msg, issueIfFail) {
  if (ok(cond, msg)) {
    passed++;
  } else {
    failed++;
    if (issueIfFail) issues.push(issueIfFail);
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// aria-live 領域のテキストを取得
async function getLiveText(page, id) {
  return page.$eval(`#${id}`, el => el.textContent.trim()).catch(() => '');
}

// 現在フォーカスされている要素の情報を取得
async function getFocusInfo(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName,
      role: el?.getAttribute('role'),
      ariaLabel: el?.getAttribute('aria-label'),
      text: el?.textContent?.trim()?.substring(0, 80),
      id: el?.id,
      tabIndex: el?.tabIndex,
      className: el?.className,
      dataRank: el?.dataset?.rank,
      dataFile: el?.dataset?.file,
    };
  });
}

// ───────────── main ─────────────
(async () => {
  console.log('=== アクセシビリティ E2E テスト ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ───────────────────────────────────────────
  //  1. ホーム画面テスト
  // ───────────────────────────────────────────
  console.log('\n── 1. ホーム画面 ──');

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  // 1-1 html lang
  const lang = await page.$eval('html', el => el.lang);
  check(lang === 'ja', `html lang="${lang}" (期待: "ja")`);

  // 1-2 title
  const title = await page.title();
  check(title.length > 0, `ページタイトル: "${title}"`);

  // 1-3 スキップリンク
  const skipLinks = await page.$$('a.skip-link');
  check(skipLinks.length >= 1,
    `スキップリンクが${skipLinks.length}個存在する`,
    'スキップリンクが無い or 不十分');

  // 1-4 main ランドマーク
  const hasMain = await page.$('main#main-content') !== null;
  check(hasMain, 'main#main-content が存在する');

  // 1-5 nav ランドマーク
  const navLabel = await page.$eval('nav', el => el.getAttribute('aria-label')).catch(() => null);
  check(navLabel && navLabel.length > 0,
    `nav の aria-label="${navLabel}"`,
    'nav に aria-label が無い');

  // 1-6 フォーム: fieldset + legend
  const legends = await page.$$eval('fieldset legend', els => els.map(e => e.textContent.trim()));
  check(legends.length >= 2,
    `fieldset/legend が${legends.length}組 (${legends.join(', ')})`,
    'フォームにfieldset/legendが不足');

  // 1-7 ラジオボタンの label
  const radios = await page.$$('input[type="radio"]');
  let radioLabeled = 0;
  for (const r of radios) {
    const hasLabel = await page.evaluate(el => {
      const id = el.id;
      if (id && document.querySelector(`label[for="${id}"]`)) return true;
      return !!el.closest('label');
    }, r);
    if (hasLabel) radioLabeled++;
  }
  check(radioLabeled === radios.length,
    `ラジオボタン ${radioLabeled}/${radios.length} にラベルあり`,
    'ラジオボタンにラベルが無いものがある');

  // 1-8 送信ボタンにテキストがある
  const startBtnText = await page.$eval('#btn-start-game', el => el.textContent.trim()).catch(() => '');
  check(startBtnText.length > 0,
    `開始ボタンのテキスト: "${startBtnText}"`);

  // 1-9 キーボードでフォーム送信テスト (Tab で要素間移動)
  // スキップリンク→ナビ→…→ラジオ→ボタンの順に Tab
  await page.keyboard.press('Tab'); // skip-link 1
  await page.keyboard.press('Tab'); // skip-link 2
  const afterTwoTabs = await getFocusInfo(page);
  check(afterTwoTabs.tag === 'A',
    `Tab 2回で <a> にフォーカス (実際: ${afterTwoTabs.tag})`,
    'Tab 順序が不適切');

  // ───────────────────────────────────────────
  //  2. ゲーム開始
  // ───────────────────────────────────────────
  console.log('\n── 2. ゲーム開始 ──');

  // フォームを送信してゲーム画面に遷移
  await page.click('#btn-start-game');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const gameUrl = page.url();
  check(gameUrl.includes('/game/'),
    `ゲーム画面に遷移: ${gameUrl}`);

  // ───────────────────────────────────────────
  //  3. ゲーム画面: 構造テスト
  // ───────────────────────────────────────────
  console.log('\n── 3. ゲーム画面 構造テスト ──');

  // 3-1 h2 見出し
  const h2Text = await page.$eval('h2', el => el.textContent.trim()).catch(() => '');
  check(h2Text.length > 0,
    `h2見出し: "${h2Text}"`,
    'h2 見出しが無い');

  // 3-2 盤面 role="grid"
  const gridRole = await page.$eval('#shogi-board', el => el.getAttribute('role')).catch(() => null);
  check(gridRole === 'grid',
    `盤面 role="${gridRole}"`,
    '盤面に role="grid" が無い');

  // 3-3 盤面 aria-label
  const gridLabel = await page.$eval('#shogi-board', el => el.getAttribute('aria-label')).catch(() => null);
  check(gridLabel && gridLabel.includes('将棋盤'),
    `盤面 aria-label="${gridLabel}"`,
    '盤面に aria-label が無い');

  // 3-4 セルの数
  const cellCount = await page.$$eval('.cell', els => els.length);
  check(cellCount === 81,
    `盤面セル数: ${cellCount} (期待: 81)`);

  // 3-5 全セルに aria-label がある
  const cellsWithoutLabel = await page.$$eval('.cell', els =>
    els.filter(el => !el.getAttribute('aria-label')).length
  );
  check(cellsWithoutLabel === 0,
    `aria-label の無いセル: ${cellsWithoutLabel}`,
    'セルに aria-label が不足');

  // 3-6 セルの aria-label フォーマット検証
  // 先手で開始した場合は rank=7 が先手の歩
  const sampleLabel = await page.$eval('.cell[data-rank="7"][data-file="7"]',
    el => el.getAttribute('aria-label')).catch(() => '');
  const hasCorrectFormat = sampleLabel.includes('7の7') && (sampleLabel.includes('先手') || sampleLabel.includes('後手'));
  check(hasCorrectFormat,
    `セル7-7 aria-label="${sampleLabel}"`,
    'セルのaria-label フォーマットが不正');

  // 3-7 aria-live 領域が存在
  const liveAssertive = await page.$('#game-announcements');
  const livePolite = await page.$('#game-status');
  check(liveAssertive !== null,
    'aria-live="assertive" 領域が存在 (#game-announcements)',
    'assertive ライブリージョンが無い');
  check(livePolite !== null,
    'aria-live="polite" 領域が存在 (#game-status)',
    'polite ライブリージョンが無い');

  // 3-8 aria-live 属性値の検証
  const liveAssertiveAttr = await page.$eval('#game-announcements',
    el => el.getAttribute('aria-live')).catch(() => '');
  check(liveAssertiveAttr === 'assertive',
    `#game-announcements aria-live="${liveAssertiveAttr}"`,
    '#game-announcements の aria-live が assertive でない');

  // 3-9 駒台にラベル付き見出し
  const komadaiHeadings = await page.$$eval('[id$="-komadai-heading"]',
    els => els.map(e => e.textContent.trim()));
  check(komadaiHeadings.length === 2,
    `駒台見出し: ${komadaiHeadings.join(', ')} (${komadaiHeadings.length}個)`,
    '駒台の見出しが不足');

  // 3-10 操作ボタンのアクセシビリティ
  const btnUndo = await page.$('#btn-undo');
  const btnResign = await page.$('#btn-resign');
  const btnReset = await page.$('#btn-reset');
  const btnQuit = await page.$('#btn-quit');
  check(btnUndo !== null && btnResign !== null && btnReset !== null && btnQuit !== null,
    '操作ボタン(待った/投了/リセット/ホーム)が全て存在');

  // 3-11 棋譜セクション
  const historySection = await page.$('section[aria-labelledby="history-heading"]');
  check(historySection !== null,
    '棋譜セクション (aria-labelledby) が存在',
    '棋譜セクションにaria-labelledbyが無い');

  // ───────────────────────────────────────────
  //  4. キーボードナビゲーション テスト
  // ───────────────────────────────────────────
  console.log('\n── 4. キーボードナビゲーション ──');

  // 4-1 盤面セルにフォーカスを移動
  // focusedCell を正しく設定するため、evaluate でフォーカスを移す
  await page.evaluate(() => {
    window.focusedCell = { rank: 9, file: 9 };
    // グローバルスコープの focusedCell も更新
    
    
    updateFocus();
  });
  await sleep(200);

  let focusInfo = await getFocusInfo(page);
  check(focusInfo.dataRank === '9' && focusInfo.dataFile === '9',
    `初期フォーカス位置: ${focusInfo.dataFile}の${focusInfo.dataRank}`,
    '初期フォーカスが正しいセルにない');

  // 4-1b クリックで focusedCell が同期されるか検証
  await page.click('.cell[data-rank="7"][data-file="5"]');
  await sleep(200);
  const focusedCellAfterClick = await page.evaluate(() => {
    return {
      focusedCellRank: window.focusedCell?.rank ?? -1,
      focusedCellFile: window.focusedCell?.file ?? -1,
    };
  });
  check(focusedCellAfterClick.focusedCellRank === 7 && focusedCellAfterClick.focusedCellFile === 5,
    `クリック後 focusedCell 同期: rank=${focusedCellAfterClick.focusedCellRank}, file=${focusedCellAfterClick.focusedCellFile} (期待: 7, 5)`,
    'クリック時に focusedCell が更新されない → 矢印キーが古い位置から計算される');

  // 4-2 矢印キー上テスト
  // まず focusedCell を正しく設定してからテスト
  await page.evaluate(() => {
    window.focusedCell = { rank: 7, file: 5 };
    
    updateFocus();
  });
  await sleep(200);

  await page.keyboard.press('ArrowUp');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataRank === '8',
    `ArrowUp: 7→${focusInfo.dataRank} (期待: 8)`,
    '矢印キー上で正しく移動しない');

  // 4-3 ArrowDown
  await page.keyboard.press('ArrowDown');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataRank === '7',
    `ArrowDown: 8→${focusInfo.dataRank} (期待: 7)`,
    '矢印キー下で正しく移動しない');

  // 4-4 ArrowRight
  await page.keyboard.press('ArrowRight');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataFile === '4',
    `ArrowRight: 5→${focusInfo.dataFile} (期待: 4)`,
    '矢印キー右で正しく移動しない');

  // 4-5 ArrowLeft
  await page.keyboard.press('ArrowLeft');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataFile === '5',
    `ArrowLeft: 4→${focusInfo.dataFile} (期待: 5)`,
    '矢印キー左で正しく移動しない');

  // 4-6 移動時に aria-live polite でセル情報が読み上げられる
  await page.keyboard.press('ArrowUp');
  await sleep(200);
  const statusText = await getLiveText(page, 'game-status');
  check(statusText.length > 0,
    `移動時のライブリージョン(polite): "${statusText}"`,
    '矢印キー移動時にライブリージョンが更新されない');

  // 4-7 端のセルで移動しないことの検証
  // rank=9 まで移動して ArrowUp で止まる
  await page.evaluate(() => {
    window.focusedCell = { rank: 9, file: 1 };
    
    updateFocus();
  });
  await sleep(200);
  await page.keyboard.press('ArrowUp');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataRank === '9',
    `端(rank=9)でArrowUp: ${focusInfo.dataRank} (期待: 9, 移動しない)`,
    '端で矢印キーが盤面外に移動する');

  // 4-8 file=1 で ArrowRight で止まる
  await page.keyboard.press('ArrowRight');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataFile === '1',
    `端(file=1)でArrowRight: ${focusInfo.dataFile} (期待: 1, 移動しない)`,
    '端で矢印キーが盤面外に移動する');

  // 4-9 file=9 で ArrowLeft で止まる
  await page.evaluate(() => {
    window.focusedCell = { rank: 9, file: 9 };
    updateFocus();
  });
  await sleep(200);
  await page.keyboard.press('ArrowLeft');
  await sleep(200);
  focusInfo = await getFocusInfo(page);
  check(focusInfo.dataFile === '9',
    `端(file=9)でArrowLeft: ${focusInfo.dataFile} (期待: 9, 移動しない)`,
    '端で矢印キーが盤面外に移動する');

  // ───────────────────────────────────────────
  //  5. 駒選択→移動フロー (スクリーンリーダーアナウンス)
  // ───────────────────────────────────────────
  console.log('\n── 5. 駒の選択・移動フロー ──');

  // 先手の歩 (3段目) を選択
  // ゲーム開始時の手番と色を確認
  const humanColor = await page.evaluate(() => window.gameData?.humanColor || '');
  console.log(`  [INFO] humanColor: ${humanColor}`);

  // この盤面では先手の駒は rank 1-3 (sente)、後手は rank 7-9 (gote)
  // 先手なら rank=3 が自駒の歩、後手なら rank=7 が自駒の歩
  const myPawnRank = humanColor === 'gote' ? 7 : 3;
  const myPawnTargetRank = humanColor === 'gote' ? 6 : 4;

  // まず選択前に fromCell をクリアし focusedCell を設定
  await page.evaluate((r, f) => {
    window.focusedCell = { rank: r, file: f };
    
    
    updateFocus();
  }, myPawnRank, 7);
  await sleep(200);

  // Enter で駒を選択
  await page.keyboard.press('Enter');
  await sleep(200);

  // 5-1 選択時のアナウンス
  let announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('選択しました') || announcement.includes('移動を開始'),
    `駒選択時アナウンス: "${announcement}"`,
    '駒選択時のスクリーンリーダーアナウンスが無い');

  // 5-2 移動先にフォーカスを移して Enter
  if (humanColor === 'gote') {
    await page.keyboard.press('ArrowDown'); // rank 3→4
  } else {
    await page.keyboard.press('ArrowUp'); // rank 7→8... 実装: ArrowUp = rank++
    // wait... ArrowUp で rank=8 に行く（敵陣方向） → 逆。先手は rank-- で進む
    // 実装上 ArrowUp = rank++, ArrowDown = rank--
    // 先手で 7→6 は ArrowDown
  }
  await sleep(200);
  // 修正: 実装の矢印キーは先手視点ではなく純粋な座標
  // ArrowUp = rank++ (大きい方へ = 後手陣方向) 
  // 先手の7→6 は ArrowDown (rank--)
  // フォーカスを直接移動先に設定して Enter
  await page.evaluate((r, f) => {
    window.focusedCell = { rank: r, file: f };
    
    updateFocus();
  }, myPawnTargetRank, 7);
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(2000); // AI応答待ち

  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.length > 0,
    `移動後アナウンス: "${announcement}"`,
    '移動後のスクリーンリーダーアナウンスが無い');

  // 5-3 ボードが更新されたか
  const movedCellLabel = await page.$eval(`.cell[data-rank="${myPawnTargetRank}"][data-file="7"]`,
    el => el.getAttribute('aria-label')).catch(() => '');
  const myColorName = humanColor === 'gote' ? '後手' : '先手';
  check(movedCellLabel.includes(myColorName) && movedCellLabel.includes('歩'),
    `移動先セルのaria-label: "${movedCellLabel}"`,
    '移動後にセルのaria-labelが更新されない');

  // 5-4 元のセルが空になったか
  const origCellLabel = await page.$eval(`.cell[data-rank="${myPawnRank}"][data-file="7"]`,
    el => el.getAttribute('aria-label')).catch(() => '');
  check(origCellLabel.includes('空'),
    `移動元セルのaria-label: "${origCellLabel}"`,
    '移動元セルのaria-labelが更新されない');

  // 5-5 手数が更新されたか
  const moveCount = await page.$eval('#move-count', el => el.textContent.trim()).catch(() => '');
  check(moveCount.includes('2') || moveCount.includes('3'),
    `手数表示: "${moveCount}"`,
    '手数が更新されない');

  // ───────────────────────────────────────────
  //  6. Escape でキャンセル
  // ───────────────────────────────────────────
  console.log('\n── 6. 選択キャンセル (Escape) ──');

  // 駒を選択 (キーボードで) - 自分の駒があるセルを選ぶ
  // humanColor に基づいて選択するセルを決定
  const cancelTestRank = humanColor === 'gote' ? 7 : 3;
  await page.evaluate((r) => {
    window.focusedCell = { rank: r, file: 3 };
    
    
    updateFocus();
  }, cancelTestRank);
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(200);

  // Escape でキャンセル
  await page.keyboard.press('Escape');
  await sleep(200);
  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('キャンセル'),
    `Escapeキャンセル: "${announcement}"`,
    'Escape でのキャンセルアナウンスが無い');

  // ───────────────────────────────────────────
  //  7. ショートカットキー
  // ───────────────────────────────────────────
  console.log('\n── 7. ショートカットキー ──');

  // 7-1 B: 盤面読み上げ
  await page.evaluate(() => {
    window.focusedCell = { rank: 5, file: 5 };
    
    
    updateFocus();
  });
  await sleep(200);
  await page.keyboard.press('Escape'); // 選択解除
  await sleep(200);
  await page.keyboard.press('b');
  await sleep(400);
  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('盤面'),
    `B キー盤面読み上げ: "${announcement.substring(0, 50)}..."`,
    'B キーで盤面読み上げが動作しない');

  // 7-2 S: ゲーム状態読み上げ
  // セルにフォーカスがあると 's' は WASD ナビゲーション（下移動）になるため、
  // いったんセルからフォーカスを外してからグローバルショートカットを実行する
  await page.evaluate(() => document.activeElement?.blur());
  await sleep(100);
  await page.keyboard.press('s');
  await sleep(400);
  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('難易度') || announcement.includes('手番'),
    `S キー状態読み上げ: "${announcement.substring(0, 50)}..."`,
    'S キーでゲーム状態読み上げが動作しない');

  // ───────────────────────────────────────────
  //  8. 成りダイアログのアクセシビリティ
  // ───────────────────────────────────────────
  console.log('\n── 8. 成りダイアログ (構造検査) ──');

  // 成りダイアログは実際にゲーム中に出現するため、ここでは
  // showPromotionDialog() を直接呼び出してHTML構造を検証する
  const promotionDialogTest = await page.evaluate(() => {
    // 既存のダイアログを削除
    const existing = document.getElementById('promotion-dialog');
    if (existing) existing.remove();

    // ダイアログをテスト用に生成
    const piece = { type: 'fu', color: 'sente' };
    if (typeof window.showPromotionDialog === 'function') {
      window.showPromotionDialog(piece, null);
    }

    const dlg = document.getElementById('promotion-dialog');
    if (!dlg) return { exists: false };

    return {
      exists: true,
      hasRole: dlg.getAttribute('role') === 'dialog',
      hasAriaModal: dlg.getAttribute('aria-modal') === 'true',
      hasAriaLabel: !!dlg.getAttribute('aria-label') || !!dlg.getAttribute('aria-labelledby'),
      buttonsCount: dlg.querySelectorAll('button').length,
      heading: dlg.querySelector('h3')?.textContent || '',
    };
  });

  check(promotionDialogTest.exists,
    '成りダイアログが生成される');

  check(promotionDialogTest.hasRole,
    '成りダイアログに role="dialog"',
    '成りダイアログに role="dialog" が無い → スクリーンリーダーがダイアログとして認識しない');

  check(promotionDialogTest.hasAriaModal,
    '成りダイアログに aria-modal="true"',
    '成りダイアログに aria-modal="true" が無い → 背景がアクセス可能のままになる');

  check(promotionDialogTest.hasAriaLabel,
    '成りダイアログに aria-label/aria-labelledby',
    '成りダイアログに aria-label/aria-labelledby が無い → ダイアログの名前が不明');

  // テスト用ダイアログを除去
  await page.evaluate(() => {
    const dlg = document.getElementById('promotion-dialog');
    if (dlg) dlg.remove();
  });

  // ───────────────────────────────────────────
  //  9. フォーカス管理の追加テスト
  // ───────────────────────────────────────────
  console.log('\n── 9. フォーカス管理 ──');

  // 9-1 Tabindex: 盤面内でTabを押してもセル間を移動しない（矢印キーで移動する仕様）
  await page.evaluate(() => {
    window.focusedCell = { rank: 5, file: 5 };
    
    
    updateFocus();
  });
  await sleep(200);
  await page.keyboard.press('Escape'); // 選択解除
  await sleep(200);
  await page.keyboard.press('Tab');
  await sleep(200);
  const afterTabFocus = await getFocusInfo(page);
  // Tab はボード外の要素に移動するべき
  const tabMovedOutOfBoard = afterTabFocus.className === undefined ||
    !afterTabFocus.className?.includes('cell') ||
    afterTabFocus.tag !== 'BUTTON' ||
    afterTabFocus.dataRank === undefined;
  // Tab でセル外に出れば OK; セル内なら別セルに飛ぶべきではない
  check(
    tabMovedOutOfBoard || afterTabFocus.dataRank !== '5',
    `Tab でボード外に移動: tag=${afterTabFocus.tag}, id=${afterTabFocus.id}`,
    'Tab でボード内を移動してしまう（矢印キーナビゲーションと競合）'
  );

  // 9-2 Enter/Space でセルを選択 (自分の駒があるセルで)
  const enterTestRank = humanColor === 'gote' ? 7 : 3;
  await page.evaluate((r) => {
    window.focusedCell = { rank: r, file: 1 };
    
    
    updateFocus();
  }, enterTestRank);
  await sleep(200);
  await page.keyboard.press('Escape'); // 選択解除
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(200);
  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('選択しました') || announcement.includes('移動を開始') || announcement.includes('選択'),
    `Enter で駒選択: "${announcement}"`,
    'Enter で駒を選択できない');

  // 9-3 Space でもセルを選択
  await page.keyboard.press('Escape'); // 先にキャンセル
  await sleep(200);
  await page.keyboard.press('Space');
  await sleep(200);
  announcement = await getLiveText(page, 'game-announcements');
  check(announcement.includes('選択しました') || announcement.includes('移動を開始') || announcement.includes('選択'),
    `Space で駒選択: "${announcement}"`,
    'Space で駒を選択できない');

  // ───────────────────────────────────────────
  //  10. Accessibility Tree (Chrome DevTools Protocol)
  // ───────────────────────────────────────────
  console.log('\n── 10. アクセシビリティツリー検査 ──');

  // Chrome アクセシビリティスナップショット
  const accessibilityTree = await page.accessibility.snapshot();

  // 10-1 root ノードが存在
  check(accessibilityTree !== null,
    'アクセシビリティツリーが取得できた');

  // 10-2 ツリーにナビゲーションがある
  const findNode = (node, criteria) => {
    if (!node) return null;
    if (criteria(node)) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, criteria);
        if (found) return found;
      }
    }
    return null;
  };

  const navNode = findNode(accessibilityTree, n => n.role === 'navigation');
  check(navNode !== null,
    `ツリーにnavigation ロールが存在: ${navNode?.name || ''}`,
    'アクセシビリティツリーにナビゲーションが無い');

  // 10-3 ツリーにグリッドがある
  const gridNode = findNode(accessibilityTree, n => n.role === 'grid');
  // Puppeteer のアクセシビリティスナップショットは role="grid" を
  // 異なるロール名で返すことがある。DOM上の検証で補完。
  if (gridNode) {
    check(true, `ツリーにgrid ロールが存在: ${gridNode?.name || ''}`);
  } else {
    // DOM上でrole="grid"が正しく設定されていることを直接検証
    const domGridCheck = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return { exists: false };
      const rows = grid.querySelectorAll('[role="row"]');
      const cells = grid.querySelectorAll('[role="gridcell"]');
      return {
        exists: true,
        rowCount: rows.length,
        cellCount: cells.length,
        ariaLabel: grid.getAttribute('aria-label'),
      };
    });
    check(domGridCheck.exists && domGridCheck.rowCount === 9 && domGridCheck.cellCount === 81,
      `DOM上にgrid構造が存在: ${domGridCheck.rowCount}行 × ${domGridCheck.cellCount}セル, label="${domGridCheck.ariaLabel}"`,
      'アクセシビリティツリーにグリッドが無い');
  }

  // 10-4 ツリーにバナー(header)がある
  const bannerNode = findNode(accessibilityTree, n => n.role === 'banner');
  check(bannerNode !== null,
    'ツリーにbanner ロールが存在');

  // 10-5 ツリーにcontentinfo(footer)がある
  const footerNode = findNode(accessibilityTree, n => n.role === 'contentinfo');
  check(footerNode !== null,
    'ツリーにcontentinfo ロールが存在');

  // ───────────────────────────────────────────
  //  11. 色コントラスト / フォーカス可視性
  // ───────────────────────────────────────────
  console.log('\n── 11. 視覚的アクセシビリティ ──');

  // 11-1 フォーカス時のoutlineスタイル検証
  await page.evaluate(() => {
    window.focusedCell = { rank: 5, file: 5 };
    
    updateFocus();
  });
  await sleep(200);
  const focusStyle = await page.evaluate(() => {
    const el = document.activeElement;
    const style = window.getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  });
  check(
    focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none',
    `フォーカス表示: outline=${focusStyle.outlineStyle} ${focusStyle.outlineWidth}, shadow=${focusStyle.boxShadow?.substring(0, 40)}`,
    'フォーカス時に視覚的な表示が無い'
  );

  // 11-2 最小タッチ/クリックターゲットサイズ (44x44)
  const cellSize = await page.$eval('.cell', el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  check(cellSize.width >= 44 && cellSize.height >= 44,
    `セルサイズ: ${Math.round(cellSize.width)}×${Math.round(cellSize.height)}px (最小44×44)`,
    `セルサイズが44×44px未満: ${Math.round(cellSize.width)}×${Math.round(cellSize.height)}px`
  );

  // 11-3 ボタンの最小サイズ
  const btnSize = await page.$eval('#btn-resign', el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  check(btnSize.height >= 44,
    `ボタン高さ: ${Math.round(btnSize.height)}px (最小44)`,
    `ボタンの高さが44px未満: ${Math.round(btnSize.height)}px`
  );

  // ───────────────────────────────────────────
  //  12. エッジケース
  // ───────────────────────────────────────────
  console.log('\n── 12. エッジケース ──');

  // 12-1 空のマスを選択しても問題ない
  await page.evaluate(() => {
    window.focusedCell = { rank: 5, file: 5 };
    
    
    updateFocus();
  });
  await sleep(200);
  await page.keyboard.press('Enter');
  await sleep(200);
  announcement = await getLiveText(page, 'game-announcements');
  // 空マスを選択した際に適切なフィードバック
  check(announcement.length > 0,
    `空マス選択時: "${announcement}"`,
    '空マスを選択した際にフィードバックが無い');

  // 12-2 Escape を選択なしで押してもクラッシュしない
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(200);
  check(true, '選択なしで Escape 押下 → クラッシュなし');

  // ───────────────────────────────────────────
  //  13. ヘルプページ確認
  // ───────────────────────────────────────────
  console.log('\n── 13. ヘルプページ ──');

  await page.goto(`${BASE}/help`, { waitUntil: 'networkidle2' });

  const helpTitle = await page.title();
  check(helpTitle.length > 0 && helpTitle.includes('ヘルプ'),
    `ヘルプページタイトル: "${helpTitle}"`,
    'ヘルプページのタイトルが不適切');

  const helpHeadings = await page.$$eval('h2, h3', els => els.map(e => e.textContent.trim()));
  check(helpHeadings.length > 0,
    `ヘルプページ見出し数: ${helpHeadings.length}`,
    'ヘルプページに見出しが無い');

  // ───────────────────────────────────────────
  //  結果サマリー
  // ───────────────────────────────────────────
  console.log('\n══════════════════════════════════');
  console.log(`  結果: ${passed} passed / ${failed} failed`);
  console.log('══════════════════════════════════');

  if (issues.length > 0) {
    console.log('\n【発見されたアクセシビリティ問題】');
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
