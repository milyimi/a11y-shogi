const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        const logs = [];
        page.on('console', (msg) => {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        });

        console.log('Opening game page...');
        await page.goto('http://localhost:8000/game/95', { waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        
        console.log('\n=== Initial Ranking Dialog Check ===');
        
        // ページ初期読み込み時のダイアログ状態
        const initialState = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const gameData = window.gameData || {};
            return {
                gameStatus: gameData.status,
                gameWinner: gameData.winner,
                dialogExists: !!dialog,
                dialogDisplay: dialog?.style.display,
                currentPlayer: gameData.currentPlayer
            };
        });
        
        console.log('Initial game state:', initialState);
        
        if (initialState.gameStatus === 'mate' && initialState.gameWinner === 'human') {
            console.log('✓ ゲーム終了（詰み、人間勝利）- ダイアログが表示されるべき');
        } else {
            console.log('ℹ ゲーム進行中 - ダイアログは表示されない');
        }
        
        console.log('\n=== Simulating Game End ===');
        
        // ゲーム終了状態をシミュレート
        const simulatedEnd = await page.evaluate(() => {
            console.log('[TEST] Simulating game end...');
            
            // gameData を終了状態に変更
            window.gameData.status = 'mate';
            window.gameData.winner = 'human';
            
            console.log('[TEST] gameData.status set to:', window.gameData.status);
            console.log('[TEST] gameData.winner set to:', window.gameData.winner);
            
            // ダイアログ表示関数を呼び出し
            if (typeof showRankingRegistrationDialog === 'function') {
                console.log('[TEST] Calling showRankingRegistrationDialog()');
                window.showRankingRegistrationDialog();
                return { functionCalled: true };
            } else {
                console.log('[TEST] showRankingRegistrationDialog not found');
                return { functionCalled: false };
            }
        });
        
        console.log('\nSimulation result:', simulatedEnd);
        
        // ダイアログの最終状態
        const finalState = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const nicknameInput = document.getElementById('ranking-nickname-input');
            const registerBtn = document.getElementById('btn-register-ranking');
            const skipBtn = document.getElementById('btn-skip-ranking');
            
            return {
                dialogVisible: dialog?.style.display === 'flex',
                nicknameInputReady: nicknameInput !== null,
                buttonsReady: registerBtn !== null && skipBtn !== null,
                dialogCanBeFocused: nicknameInput?.focus !== undefined
            };
        });
        
        console.log('\nFinal dialog state:', finalState);
        
        if (finalState.dialogVisible && finalState.nicknameInputReady) {
            console.log('\n✅ ランキング登録ダイアログが正しく機能しています');
        } else {
            console.log('\n⚠️ ダイアログの表示状態に問題があります');
        }
        
        console.log('\nConsole logs:');
        logs.filter(l => l.includes('[TEST]')).forEach(l => console.log('  ' + l));

    } catch (error) {
        console.error('Error during test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
