const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // APIリクエストを監視
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/game/') && url.includes('/move')) {
      try {
        const json = await response.json();
        console.log('\n[API Response]', url);
        console.log('Status:', json.status);
        console.log('Winner:', json.winner);
        console.log('Response:', JSON.stringify(json, null, 2));
      } catch (e) {
        // JSONでない場合は無視
      }
    }
  });
  
  console.log('=== ランキング登録ダイアログデバッグ ===\n');
  
  try {
    console.log('1. ゲームページにアクセス中...');
    await page.goto('http://localhost:8000/game/96', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    console.log('   ✓ ページ読み込み完了\n');
    
    // 初期状態を確認
    const initialState = await page.evaluate(() => {
      const board = [];
      document.querySelectorAll('.cell').forEach((cell, index) => {
        const rank = cell.getAttribute('data-rank');
        const file = cell.getAttribute('data-file');
        const text = cell.querySelector('.piece-text')?.textContent || '空';
        if (text !== '空') {
          board.push({ rank, file, piece: text });
        }
      });
      return board;
    });
    
    console.log('   初期盤面:', JSON.stringify(initialState, null, 2));
    
    // 8-5の飛車をクリック
    console.log('\n2. 8-5の飛車をクリック...');
    await page.click('[data-rank="8"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const selectedInfo = await page.evaluate(() => {
      return window.selectedCell || null;
    });
    console.log('   選択された駒:', selectedInfo);
    
    // 7-5の玉に移動
    console.log('\n3. 7-5に移動...');
    await page.click('[data-rank="7"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 3000)); // API応答を待つ
    
    // 最終状態を確認
    const finalState = await page.evaluate(() => {
      return {
        gameDataStatus: window.gameData?.status,
        gameDataWinner: window.gameData?.winner,
        dialogDisplay: document.getElementById('ranking-registration-dialog')?.style.display
      };
    });
    
    console.log('\n最終状態:', finalState);
    
  } catch (error) {
    console.error('✗ エラー:', error.message);
  }
  
  await browser.close();
})();
