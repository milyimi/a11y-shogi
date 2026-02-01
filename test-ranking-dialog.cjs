const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        page.on('console', (msg) => {
            if (msg.text().includes('ranking') || msg.text().includes('ランキング')) {
                console.log(`[${msg.type()}] ${msg.text()}`);
            }
        });

        console.log('Opening game page...');
        await page.goto('http://localhost:8000/game/95', { waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        
        // ゲーム終了状態に設定する（開発用）
        console.log('\n=== Testing Ranking Dialog ===');
        
        // JavaScriptで gameData を終了状態に変更してダイアログを表示
        const dialogVisible = await page.evaluate(() => {
            // gameData を終了状態に変更
            window.gameData.status = 'mate';
            window.gameData.winner = 'human';
            
            // ダイアログ表示関数を呼び出し
            if (typeof showRankingRegistrationDialog === 'function') {
                window.showRankingRegistrationDialog();
            } else {
                console.log('showRankingRegistrationDialog not available');
            }
            
            // ダイアログが表示されているか確認
            const dialog = document.getElementById('ranking-registration-dialog');
            if (dialog) {
                console.log('Dialog found');
                console.log('Dialog display:', dialog.style.display);
                console.log('Dialog computed style:', window.getComputedStyle(dialog).display);
                return {
                    exists: true,
                    display: dialog.style.display
                };
            }
            return { exists: false };
        });
        
        console.log('Dialog visibility check:', dialogVisible);
        
        // ダイアログの要素を確認
        const dialogElements = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            if (!dialog) return null;
            
            return {
                nicknameInput: !!document.getElementById('ranking-nickname-input'),
                registerBtn: !!document.getElementById('btn-register-ranking'),
                skipBtn: !!document.getElementById('btn-skip-ranking'),
                dialogText: dialog.textContent.substring(0, 100)
            };
        });
        
        console.log('\nDialog elements:', dialogElements);
        
        // ニックネームを入力してランキングに登録するシミュレーション
        if (dialogElements?.nicknameInput) {
            console.log('\n=== Simulating Ranking Registration ===');
            
            await page.type('#ranking-nickname-input', 'テストユーザー', { delay: 50 });
            console.log('Nickname entered: テストユーザー');
            
            // 登録ボタンをクリック
            await page.click('#btn-register-ranking');
            console.log('Register button clicked');
            
            // APIレスポンスを待つ
            await new Promise(r => setTimeout(r, 1000));
            
            // 登録結果を確認
            const registrationResult = await page.evaluate(() => {
                const dialog = document.getElementById('ranking-registration-dialog');
                const announcement = document.getElementById('game-announcements');
                return {
                    dialogVisible: dialog?.style.display !== 'none',
                    announcement: announcement?.textContent
                };
            });
            
            console.log('Registration result:', registrationResult);
        }
        
        console.log('\n✓ Ranking dialog test completed');

    } catch (error) {
        console.error('Error during test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
