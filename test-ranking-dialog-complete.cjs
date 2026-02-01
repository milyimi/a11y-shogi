const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('=== ランキング登録ダイアログテスト ===\n');
  
  try {
    console.log('1. ゲームページにアクセス中...');
    await page.goto('http://localhost:8000/game/96', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    console.log('   ✓ ページ読み込み完了\n');
    
    // 8-5の飛車を7-5に移動して玉を取る
    console.log('2. 8-5の飛車をクリック...');
    await page.click('[data-rank="8"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('   ✓ 飛車を選択\n');
    
    console.log('3. 7-5の玉に移動...');
    await page.click('[data-rank="7"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 2000)); // AI処理を待つ
    console.log('   ✓ 移動完了\n');
    
    // ダイアログが表示されているか確認
    console.log('4. ランキング登録ダイアログの表示確認...');
    const dialogVisible = await page.evaluate(() => {
      const dialog = document.getElementById('ranking-registration-dialog');
      return dialog && dialog.style.display === 'flex';
    });
    
    if (dialogVisible) {
      console.log('   ✓ ダイアログが表示されました!\n');
      
      // ダイアログの内容を確認
      const dialogContent = await page.evaluate(() => {
        const title = document.querySelector('#ranking-registration-dialog h2');
        const nicknameInput = document.getElementById('ranking-nickname-input');
        const registerBtn = document.getElementById('btn-register-ranking');
        const skipBtn = document.getElementById('btn-skip-ranking');
        
        return {
          title: title?.textContent,
          hasNicknameInput: !!nicknameInput,
          hasRegisterBtn: !!registerBtn,
          hasSkipBtn: !!skipBtn,
          ariaModal: document.getElementById('ranking-registration-dialog')?.getAttribute('aria-modal'),
          role: document.getElementById('ranking-registration-dialog')?.getAttribute('role')
        };
      });
      
      console.log('   ダイアログの構成:');
      console.log(`   - タイトル: ${dialogContent.title}`);
      console.log(`   - ニックネーム入力欄: ${dialogContent.hasNicknameInput ? '✓' : '✗'}`);
      console.log(`   - 登録ボタン: ${dialogContent.hasRegisterBtn ? '✓' : '✗'}`);
      console.log(`   - スキップボタン: ${dialogContent.hasSkipBtn ? '✓' : '✗'}`);
      console.log(`   - role属性: ${dialogContent.role}`);
      console.log(`   - aria-modal属性: ${dialogContent.ariaModal}\n`);
      
      // Escキーで閉じるかテスト
      console.log('5. Escキーでダイアログを閉じるテスト...');
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dialogStillVisible = await page.evaluate(() => {
        const dialog = document.getElementById('ranking-registration-dialog');
        return dialog && dialog.style.display === 'flex';
      });
      
      if (!dialogStillVisible) {
        console.log('   ✓ Escキーでダイアログが閉じました\n');
        
        // アナウンスメッセージを確認
        const announcement = await page.evaluate(() => {
          return document.getElementById('game-announcements')?.textContent;
        });
        console.log(`   アナウンス: "${announcement}"\n`);
      } else {
        console.log('   ✗ Escキーでダイアログが閉じませんでした\n');
      }
      
      console.log('=== すべてのテスト完了 ===');
      
    } else {
      console.log('   ✗ ダイアログが表示されませんでした\n');
      
      // デバッグ情報
      const debugInfo = await page.evaluate(() => {
        return {
          gameDataStatus: window.gameData?.status,
          gameDataWinner: window.gameData?.winner,
          dialogElement: !!document.getElementById('ranking-registration-dialog'),
          dialogDisplay: document.getElementById('ranking-registration-dialog')?.style.display
        };
      });
      
      console.log('   デバッグ情報:', debugInfo);
    }
    
  } catch (error) {
    console.error('✗ エラーが発生しました:', error.message);
  }
  
  await browser.close();
})();
