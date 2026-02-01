const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:8000/game/1', { waitUntil: 'networkidle0' });
    console.log('✓ ゲームページ読み込み完了');
    
    // ゲーム状態を確認
    const gameInfo = await page.evaluate(() => {
      return {
        status: window.gameData?.status,
        winner: window.gameData?.winner,
        moveCount: window.gameData?.moveCount
      };
    });
    
    console.log('現在のゲーム状態:', gameInfo);
    
    // ダイアログの状態を確認
    const dialogState = await page.evaluate(() => {
      const dialog = document.getElementById('ranking-registration-dialog');
      if (!dialog) return { exists: false };
      
      const isVisible = dialog.style.display === 'flex';
      const title = document.getElementById('ranking-dialog-title')?.textContent || '';
      const message = document.getElementById('ranking-dialog-message')?.textContent || '';
      const registerBtn = document.getElementById('btn-register-ranking');
      const skipBtn = document.getElementById('btn-skip-ranking');
      
      return {
        exists: true,
        visible: isVisible,
        title: title.trim(),
        message: message.trim().replace(/\s+/g, ' '),
        registerBtnDisplay: registerBtn?.style.display || '',
        registerBtnDisabled: registerBtn?.disabled || false,
        skipBtnText: skipBtn?.textContent?.trim() || ''
      };
    });
    
    console.log('\n=== ダイアログ状態 ===');
    console.log('存在:', dialogState.exists);
    console.log('表示:', dialogState.visible);
    console.log('タイトル:', dialogState.title);
    console.log('メッセージ:', dialogState.message);
    console.log('登録ボタン表示:', dialogState.registerBtnDisplay);
    console.log('登録ボタン無効:', dialogState.registerBtnDisabled);
    console.log('スキップボタンテキスト:', dialogState.skipBtnText);
    
    // 検証
    if (gameInfo.status !== 'in_progress') {
      console.log('\n✓ ゲーム終了状態を確認');
      
      if (dialogState.visible) {
        console.log('✓ ダイアログが表示されている');
        
        if (gameInfo.winner === 'human') {
          console.log('\n--- 勝利シナリオ ---');
          if (dialogState.title.includes('ランキングに登録')) {
            console.log('✓ 勝利時のタイトルが正しい');
          }
          if (dialogState.registerBtnDisplay !== 'none') {
            console.log('✓ 登録ボタンが表示されている');
          }
          if (dialogState.skipBtnText === 'スキップ') {
            console.log('✓ スキップボタンのテキストが「スキップ」');
          }
        } else if (gameInfo.winner === 'ai') {
          console.log('\n--- 敗北シナリオ ---');
          if (dialogState.title === '対局が終了しました') {
            console.log('✓ 敗北時のタイトルが正しい');
          } else {
            console.log('✗ タイトルが間違っている:', dialogState.title);
          }
          if (dialogState.message.includes('ランキング登録の対象外')) {
            console.log('✓ 敗北時のメッセージが正しい');
          } else {
            console.log('✗ メッセージが間違っている:', dialogState.message);
          }
          if (dialogState.registerBtnDisplay === 'none') {
            console.log('✓ 登録ボタンが非表示');
          } else {
            console.log('✗ 登録ボタンが表示されている:', dialogState.registerBtnDisplay);
          }
          if (dialogState.skipBtnText === '閉じる') {
            console.log('✓ スキップボタンのテキストが「閉じる」');
          } else {
            console.log('✗ スキップボタンのテキストが間違っている:', dialogState.skipBtnText);
          }
        }
        
        console.log('\n✅ ダイアログ状態のテスト完了');
      } else {
        console.log('⚠ ダイアログが表示されていない（in_progressではないが未表示）');
      }
    } else {
      console.log('\n⚠ ゲームはまだ進行中です (status: in_progress)');
      console.log('   先にゲームを終了させてからテストしてください');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
