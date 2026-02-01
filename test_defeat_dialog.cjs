const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // ゲームページにアクセス
    await page.goto('http://localhost:8000/game/1', { waitUntil: 'networkidle0' });
    
    console.log('✓ ゲームページ読み込み完了');
    
    // リセット実行
    await page.evaluate(() => {
      return fetch('/game/1/reset', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          'Content-Type': 'application/json'
        }
      }).then(r => r.json());
    });
    
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'networkidle0' });
    
    console.log('✓ ゲームをリセット完了');
    
    // AIに負けるシナリオ：AIが勝つまで適当な手を指す
    for (let i = 0; i < 30; i++) {
      // ゲーム状態を確認
      const gameStatus = await page.evaluate(() => {
        return window.gameData?.status;
      });
      
      if (gameStatus !== 'in_progress') {
        console.log(`ゲーム終了（${i}手目）: ${gameStatus}`);
        break;
      }
      
      // 人間の手番か確認
      const currentPlayer = await page.evaluate(() => window.gameData?.currentPlayer);
      
      if (currentPlayer === 'human') {
        // 適当な合法手を探して指す（7七歩を7六歩に動かすなど）
        const moveResult = await page.evaluate(() => {
          // 盤面から人間の駒を探す
          const board = window.gameData.boardState.board;
          const humanColor = window.gameData.boardState.turn;
          
          for (let rank = 1; rank <= 9; rank++) {
            for (let file = 1; file <= 9; file++) {
              const piece = board[rank]?.[file];
              if (piece && piece.color === humanColor) {
                // 上下左右に移動を試みる
                const moves = [
                  { toRank: rank - 1, toFile: file },
                  { toRank: rank + 1, toFile: file },
                  { toRank: rank, toFile: file - 1 },
                  { toRank: rank, toFile: file + 1 }
                ];
                
                for (const move of moves) {
                  if (move.toRank >= 1 && move.toRank <= 9 && 
                      move.toFile >= 1 && move.toFile <= 9) {
                    const target = board[move.toRank]?.[move.toFile];
                    // 移動先が空か相手の駒なら移動可能
                    if (!target || target.color !== humanColor) {
                      return fetch('/game/1/move', {
                        method: 'POST',
                        headers: {
                          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          from_rank: rank,
                          from_file: file,
                          to_rank: move.toRank,
                          to_file: move.toFile
                        })
                      }).then(r => r.json());
                    }
                  }
                }
              }
            }
          }
          return { success: false, message: '合法手が見つかりません' };
        });
        
        if (moveResult.success) {
          console.log(`手番 ${i + 1}: 人間が指し手を実行`);
        } else {
          console.log(`手番 ${i + 1}: ${moveResult.message}`);
          break;
        }
        
        await page.waitForTimeout(300);
      }
      
      await page.waitForTimeout(200);
    }
    
    // ゲーム終了を待つ
    await page.waitForTimeout(1000);
    
    // 最終的なゲーム状態を確認
    const finalStatus = await page.evaluate(() => {
      return {
        status: window.gameData?.status,
        winner: window.gameData?.winner
      };
    });
    
    console.log(`最終ゲーム状態: status=${finalStatus.status}, winner=${finalStatus.winner}`);
    
    // ダイアログが表示されているか確認
    const dialogInfo = await page.evaluate(() => {
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
        message: message.trim(),
        registerBtnVisible: registerBtn ? registerBtn.style.display !== 'none' : false,
        registerBtnDisabled: registerBtn?.disabled || false,
        skipBtnText: skipBtn?.textContent?.trim() || ''
      };
    });
    
    console.log('\n=== ダイアログ状態（敗北時）===');
    console.log(`存在: ${dialogInfo.exists}`);
    console.log(`表示: ${dialogInfo.visible}`);
    console.log(`タイトル: ${dialogInfo.title}`);
    console.log(`メッセージ: ${dialogInfo.message}`);
    console.log(`登録ボタン表示: ${dialogInfo.registerBtnVisible}`);
    console.log(`登録ボタン無効: ${dialogInfo.registerBtnDisabled}`);
    console.log(`スキップボタンテキスト: ${dialogInfo.skipBtnText}`);
    
    // 検証
    if (finalStatus.winner === 'ai') {
      console.log('\n✓ AIの勝利を確認');
      
      if (dialogInfo.visible) {
        console.log('✓ ダイアログが表示されている');
        
        if (dialogInfo.title === '対局が終了しました') {
          console.log('✓ 敗北時のタイトルが正しい');
        } else {
          console.log('✗ タイトルが間違っている:', dialogInfo.title);
        }
        
        if (dialogInfo.message.includes('ランキング登録の対象外')) {
          console.log('✓ 敗北時のメッセージが正しい');
        } else {
          console.log('✗ メッセージが間違っている:', dialogInfo.message);
        }
        
        if (!dialogInfo.registerBtnVisible) {
          console.log('✓ 登録ボタンが非表示');
        } else {
          console.log('✗ 登録ボタンが表示されている（非表示であるべき）');
        }
        
        if (dialogInfo.skipBtnText === '閉じる') {
          console.log('✓ スキップボタンのテキストが「閉じる」');
        } else {
          console.log('✗ スキップボタンのテキストが間違っている:', dialogInfo.skipBtnText);
        }
        
        console.log('\n✅ 敗北時ダイアログのテスト完了');
      } else {
        console.log('✗ ダイアログが表示されていない');
      }
    } else {
      console.log(`\n⚠ 想定外の結果: winner=${finalStatus.winner} (AIの勝利を期待)`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await browser.close();
  }
})();
