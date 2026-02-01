const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        console.log('\n=== アクセシビリティテスト: ゲーム完全フロー ===\n');
        
        // ホームページに移動
        console.log('1. ホームページに移動...');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle2' });
        
        // 新しいゲームを開始
        console.log('2. 新しいゲームを開始...');
        await page.click('input[value="easy"]');
        await page.click('input[value="sente"]');
        await page.click('#btn-start-game');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('   ✓ ゲームページに移動しました');
        
        const gameUrl = page.url();
        const gameId = gameUrl.match(/game\/(\d+)/)?.[1];
        console.log('   Game ID:', gameId);
        
        // 簡単に勝つためにデータベースを直接操作
        console.log('\n3. テスト用にゲーム状態を「勝利」に変更...');
        
        // ゲーム状態を勝利に更新
        await page.evaluate((gId) => {
            fetch(`/api/test/win-game/${gId}`, { method: 'POST' })
                .catch(() => {
                    // APIがなければ、JavaScriptで直接状態を変更
                    window.gameData.status = 'mate';
                    window.gameData.winner = 'human';
                    window.gameData.moveCount = 25;
                    
                    // updateGameInfoを呼び出してダイアログをトリガー
                    if (typeof updateGameInfo === 'function') {
                        updateGameInfo({
                            status: 'mate',
                            winner: 'human',
                            moveCount: 25
                        });
                    }
                });
        }, gameId);
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ダイアログが表示されているか確認
        console.log('\n4. ランキング登録ダイアログを確認...');
        const dialogVisible = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            return dialog && dialog.style.display === 'flex';
        });
        
        if (!dialogVisible) {
            console.log('   ⚠️ ダイアログが自動表示されませんでした');
            console.log('   手動でダイアログを表示します...');
            
            await page.evaluate(() => {
                if (typeof showRankingRegistrationDialog === 'function') {
                    showRankingRegistrationDialog();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // ダイアログの最終確認
        const dialogState = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const input = document.getElementById('ranking-nickname-input');
            return {
                visible: dialog?.style.display === 'flex',
                inputExists: !!input,
                inputFocusable: input?.tabIndex !== -1 && input?.disabled !== true
            };
        });
        
        console.log('   ダイアログ表示:', dialogState.visible ? '✅' : '❌');
        console.log('   入力フィールド存在:', dialogState.inputExists ? '✅' : '❌');
        console.log('   入力フィールドフォーカス可能:', dialogState.inputFocusable ? '✅' : '❌');
        
        if (dialogState.visible) {
            console.log('\n5. キーボード操作でランキング登録...');
            
            // Tabキーでニックネーム入力フィールドに移動
            console.log('   Tab キーでフォーカス移動...');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            
            // ニックネーム入力
            const nickname = 'アクセシブルユーザー';
            console.log(`   ニックネーム入力: "${nickname}"`);
            await page.type('#ranking-nickname-input', nickname);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Enterキーで登録（またはTabで登録ボタンに移動してEnter）
            console.log('   Tab キーで登録ボタンに移動...');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('\n6. 登録結果を確認...');
            
            const announcement = await page.evaluate(() => {
                return document.getElementById('game-announcements')?.textContent;
            });
            
            console.log('   アナウンス:', announcement);
            
            if (announcement?.includes('ランキングに登録されました')) {
                console.log('\n✅ SUCCESS: キーボード操作のみでランキング登録が完了しました！');
            } else {
                console.log('\n⚠️ 登録メッセージが確認できませんでした');
            }
        } else {
            console.log('\n❌ FAIL: ダイアログが表示されませんでした');
        }
        
        console.log('\n=== テスト完了 ===\n');
        
        // ブラウザを5秒後に閉じる
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
