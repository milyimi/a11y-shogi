const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            protocolTimeout: 60000
        });

        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(5000);
        await page.setDefaultTimeout(30000);
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ゲーム終了後の駒移動禁止テスト');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // ゲームページに移動
        const gameId = 95;
        console.log(`ステップ 1: ゲームページに移動 (ID: ${gameId})`);
        
        try {
            await page.goto(`http://localhost:8000/game/${gameId}`, { 
                waitUntil: 'domcontentloaded',
                timeout: 5000 
            });
        } catch (navError) {
            console.log('  (Vite接続タイムアウトを無視)');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // ダイアログ要素がDOMに追加されるまで待つ
        await page.waitForSelector('.cell', { timeout: 10000 });
        
        console.log('✓ ページ読み込み完了\n');
        
        // ゲーム状態を勝利に設定
        console.log('ステップ 2: ゲームを勝利状態に設定');
        await page.evaluate(() => {
            if (typeof window.gameData === 'undefined') {
                window.gameData = { boardState: {}, currentPlayer: 'human', moveCount: 0 };
            }
            window.gameData.status = 'mate';
            window.gameData.winner = 'human';
            window.gameData.moveCount = 30;
            
            if (typeof updateGameInfo === 'function') {
                updateGameInfo({
                    status: 'mate',
                    winner: 'human',
                    moveCount: 30
                });
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✓ ゲーム状態を「勝利」に変更\n');
        
        // テスト1: 盤面の駒をクリックしてみる
        console.log('ステップ 3: 終了後に駒移動を試みる');
        
        const moveResult = await page.evaluate(() => {
            // 盤面のセルをクリック
            const cell = document.querySelector('.cell[data-rank="7"][data-file="7"]');
            if (!cell) return { error: 'Cell not found' };
            
            // クリックイベントを発火
            cell.click();
            
            // アナウンスメッセージを取得
            const announcement = document.getElementById('game-announcements')?.textContent || '';
            
            return {
                clicked: true,
                announcement: announcement
            };
        });
        
        console.log('  盤面クリック実行:', moveResult.clicked ? '✓' : '✗');
        console.log('  アナウンスメッセージ:', moveResult.announcement);
        
        if (moveResult.announcement.includes('ゲームは終了しています')) {
            console.log('  ✅ 盤面クリックが正しくブロックされました\n');
        } else {
            console.log('  ⚠️ 期待したブロックメッセージが表示されませんでした\n');
        }
        
        // テスト2: サーバー側APIを直接呼び出してみる
        console.log('ステップ 4: APIレベルで移動を試みる');
        
        const apiResult = await page.evaluate(async () => {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            try {
                const response = await fetch('/game/95/move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({
                        from_file: 7,
                        from_rank: 7,
                        to_file: 7,
                        to_rank: 6
                    })
                });
                
                const data = await response.json();
                return {
                    success: data.success,
                    message: data.message,
                    status: response.status
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('  API呼び出し結果:', apiResult.success ? '成功' : '拒否');
        console.log('  HTTPステータス:', apiResult.status);
        console.log('  メッセージ:', apiResult.message);
        
        if (!apiResult.success && apiResult.message?.includes('終了')) {
            console.log('  ✅ サーバー側で正しくブロックされました\n');
        } else {
            console.log('  ⚠️ サーバー側のブロックが機能していない可能性があります\n');
        }
        
        // テスト3: 持ち駒を打とうとしてみる
        console.log('ステップ 5: 持ち駒の打ち込みを試みる');
        
        const dropResult = await page.evaluate(() => {
            const handPiece = document.querySelector('.hand-piece');
            if (!handPiece) return { skipped: true, reason: '持ち駒なし' };
            
            handPiece.click();
            
            const announcement = document.getElementById('game-announcements')?.textContent || '';
            
            return {
                clicked: true,
                announcement: announcement
            };
        });
        
        if (dropResult.skipped) {
            console.log('  持ち駒テストをスキップ:', dropResult.reason);
        } else {
            console.log('  持ち駒クリック実行:', dropResult.clicked ? '✓' : '✗');
            console.log('  アナウンスメッセージ:', dropResult.announcement);
            
            if (dropResult.announcement.includes('ゲームは終了しています')) {
                console.log('  ✅ 持ち駒選択が正しくブロックされました');
            } else {
                console.log('  ⚠️ 期待したブロックメッセージが表示されませんでした');
            }
        }
        
        // 結果サマリー
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  テスト結果サマリー');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const frontendBlocked = moveResult.announcement.includes('ゲームは終了しています');
        const serverBlocked = !apiResult.success && apiResult.message?.includes('終了');
        
        if (frontendBlocked && serverBlocked) {
            console.log('✅ 完全成功: フロントとサーバー両方で移動がブロックされています');
            console.log('   - フロントエンド: ユーザー操作を即座にブロック');
            console.log('   - サーバー側: APIレベルで不正なリクエストを拒否\n');
        } else {
            console.log('⚠️ 部分的成功または失敗:');
            console.log(`   - フロントエンド: ${frontendBlocked ? '✅ OK' : '❌ NG'}`);
            console.log(`   - サーバー側: ${serverBlocked ? '✅ OK' : '❌ NG'}\n`);
        }

    } catch (error) {
        console.error('\n❌ テストエラー:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
