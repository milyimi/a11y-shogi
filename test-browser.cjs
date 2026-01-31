const puppeteer = require('puppeteer');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForOptionalNavigation = async (page, timeout = 5000) => {
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
    return true;
  } catch {
    return false;
  }
};

const getState = async (page) => {
  return await page.evaluate(async () => {
    const res = await fetch(`/game/${window.gameSessionId}/state`);
    const data = await res.json();
    return { ok: res.ok, data };
  });
};

(async () => {
  let browser;
  try {
    // ブラウザ起動
    console.log('ブラウザを起動しています...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // ホーム画面にアクセス
    console.log('\nホーム画面にアクセス...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });

    // ホーム画面のスクリーンショット
    const homeShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/home.png');
    await page.screenshot({ path: homeShotPath, fullPage: true });
    console.log('📸 ホーム画面スクリーンショット:', homeShotPath);
    
    // ゲーム開始ボタンを取得
    console.log('ゲーム開始フォームを検索...');
    const formExists = await page.$('form[action*="game/start"]');
    console.log('フォーム存在:', formExists ? 'はい' : 'いいえ');

    // ゲーム開始（初級、先手を選択）
    console.log('\nゲーム開始ボタンをクリック...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // ゲーム画面が読み込まれるまで待機
    await page.waitForSelector('.shogi-board', { timeout: 5000 });
    console.log('ゲーム画面が読み込まれました');

    // ゲーム画面のスクリーンショット
    const gameShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/game.png');
    await page.screenshot({ path: gameShotPath, fullPage: true });
    console.log('📸 ゲーム画面スクリーンショット:', gameShotPath);

    // 手駒を付与（デバッグ用）
    console.log('\n=== 手駒を付与（デバッグ） ===');
    const sessionId = await page.evaluate(() => {
      const parts = window.location.pathname.split('/');
      return parts[parts.length - 1];
    });

    const seedResult = await page.evaluate(async (id) => {
      const token = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch(`/debug/seed-hand/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({ color: 'sente', piece_type: 'fu', count: 1 })
      });
      const data = await res.json();
      return { ok: res.ok, data };
    }, sessionId);

    console.log('手駒付与結果:', seedResult.ok ? '成功' : '失敗');

    // 反映のため再読み込み
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.shogi-board', { timeout: 5000 });

    const gameSeedShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/game-seeded.png');
    await page.screenshot({ path: gameSeedShotPath, fullPage: true });
    console.log('📸 手駒付与後のスクリーンショット:', gameSeedShotPath);

    // コンソールログを取得
    console.log('\n=== ブラウザコンソールログ ===');
    page.on('console', msg => {
      console.log('BROWSER:', msg.text());
    });

    // confirm/alertを自動で許可
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // ページ内 JavaScript を実行して状態を確認
    const gameState = await page.evaluate(() => {
      return {
        windowGameData: window.gameData,
        currentPlayer: typeof currentPlayer !== 'undefined' ? currentPlayer : 'undefined',
        humanColor: typeof humanColor !== 'undefined' ? humanColor : 'undefined',
      };
    });

    console.log('\n=== ゲーム状態 ===');
    console.log('window.gameData.currentPlayer:', gameState.windowGameData?.currentPlayer);
    console.log('window.gameData.boardState.hand:', gameState.windowGameData?.boardState?.hand);
    console.log('currentPlayer 変数:', gameState.currentPlayer);
    console.log('humanColor 変数:', gameState.humanColor);

    // 駒台の駒をクリック
    console.log('\n=== 駒台から駒を選択 ===');
    const handPieces = await page.$$('.hand-piece');
    console.log('駒台の駒数:', handPieces.length);

    if (handPieces.length > 0) {
      console.log('最初の駒をクリック...');
      await handPieces[0].click();
      
      // クリック後の状態を確認
      await sleep(500);
      
      const stateAfterClick = await page.evaluate(() => {
        return {
          announcement: document.getElementById('game-announcements')?.textContent,
          selectedHandPieces: document.querySelectorAll('.hand-piece[data-selected="true"]').length,
        };
      });

      console.log('アナウンスメント:', stateAfterClick.announcement);
      console.log('選択された駒の数:', stateAfterClick.selectedHandPieces);
    }

    // ボード上のマスをクリック
    console.log('\n=== ボード上のマスをクリック ===');
    const cells = await page.$$('.cell');
    console.log('ボード上のマス数:', cells.length);

    if (cells.length > 0) {
      // 5〜6番目のマス（中程度）をクリック
      const cellToClick = cells[40]; // 適当なマス
      if (cellToClick) {
        console.log('ボード上のマスをクリック...');
        await cellToClick.click();
        
        await sleep(500);
        
        const finalState = await page.evaluate(() => {
          return {
            announcement: document.getElementById('game-announcements')?.textContent,
          };
        });

        console.log('最終アナウンスメント:', finalState.announcement);
      }
    }

    // 待った/リセット/投了のテスト
    console.log('\n=== ボタン動作テスト ===');

    // 1手進める（7三の歩を7四に）
    console.log('手を進めて待ったテストの準備...');
    const moveResult = await page.evaluate(async () => {
      const token = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch(`/game/${window.gameSessionId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({ from_file: 7, from_rank: 3, to_file: 7, to_rank: 4 })
      });
      const data = await res.json();
      return { ok: res.ok, data };
    });
    console.log('移動結果:', moveResult.ok ? '成功' : '失敗');

    // 待った
    console.log('待ったボタンをクリック...');
    const undoBtn = await page.$('#btn-undo');
    if (undoBtn) {
      await Promise.all([
        waitForOptionalNavigation(page),
        undoBtn.click()
      ]);
    }

    const undoState = await getState(page);
    console.log('待った後の状態:', undoState.data?.data?.moveCount, undoState.data?.data?.status);

    // リセット
    console.log('リセットボタンをクリック...');
    const resetBtn = await page.$('#btn-reset');
    if (resetBtn) {
      await Promise.all([
        waitForOptionalNavigation(page),
        resetBtn.click()
      ]);
    }

    const resetState = await getState(page);
    console.log('リセット後の状態:', resetState.data?.data?.moveCount, resetState.data?.data?.status);

    // 投了
    console.log('投了ボタンをクリック...');
    const resignBtn = await page.$('#btn-resign');
    if (resignBtn) {
      await Promise.all([
        waitForOptionalNavigation(page),
        resignBtn.click()
      ]);
    }

    const resignState = await getState(page);
    console.log('投了後の状態:', resignState.data?.data?.status);

    console.log('\n✅ テスト完了');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
