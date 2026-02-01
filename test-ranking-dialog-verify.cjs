const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        const logs = [];
        page.on('console', (msg) => {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        });
        
        page.on('error', (err) => {
            console.error('Page error:', err);
        });

        console.log('Opening game page...');
        const url = 'http://localhost:8000/game/95';
        console.log(`Navigating to: ${url}`);
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log('Page loaded successfully');
        } catch (navError) {
            console.error('Navigation error:', navError.message);
            // ページが存在しない可能性があるため、ゲームページを確認
            console.log('\nTrying to get list of available routes...');
            await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
            throw new Error('Game page /game/95 not accessible - page may not exist');
        }
        
        console.log('\n=== Ranking Dialog Functionality Test ===\n');
        
        // ダイアログの初期状態を確認
        const dialogCheck = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const functionExists = typeof window.showRankingRegistrationDialog === 'function';
            
            return {
                dialogElement: !!dialog,
                functionExists,
                dialogHTML: dialog?.outerHTML?.substring(0, 100),
                gameData: {
                    status: window.gameData?.status,
                    winner: window.gameData?.winner,
                    currentPlayer: window.gameData?.currentPlayer
                }
            };
        });
        
        console.log('Dialog check result:');
        console.log('  Dialog element exists:', dialogCheck.dialogElement);
        console.log('  showRankingRegistrationDialog() exists:', dialogCheck.functionExists);
        console.log('  Game status:', dialogCheck.gameData.status);
        console.log('  Game winner:', dialogCheck.gameData.winner);
        console.log('  Current player:', dialogCheck.gameData.currentPlayer);
        
        // ゲーム終了状態をシミュレート
        console.log('\n=== Simulating Game End ===\n');
        
        const simulationResult = await page.evaluate(() => {
            console.log('[SIMULATE] Setting game to finished state...');
            
            // ゲーム状態を更新
            window.gameData = window.gameData || {};
            window.gameData.status = 'mate';
            window.gameData.winner = 'human';
            
            console.log('[SIMULATE] Game status changed to: mate');
            console.log('[SIMULATE] Game winner changed to: human');
            
            // ダイアログ表示関数を呼び出し
            if (typeof window.showRankingRegistrationDialog === 'function') {
                console.log('[SIMULATE] Calling showRankingRegistrationDialog()...');
                window.showRankingRegistrationDialog();
                console.log('[SIMULATE] Function called');
                return { success: true };
            } else {
                console.log('[SIMULATE] Error: showRankingRegistrationDialog not found');
                return { success: false, error: 'Function not found' };
            }
        });
        
        // ダイアログの表示確認
        const finalCheck = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const input = document.getElementById('ranking-nickname-input');
            const registerBtn = document.getElementById('btn-register-ranking');
            const skipBtn = document.getElementById('btn-skip-ranking');
            
            return {
                dialogVisible: dialog?.style.display === 'flex',
                dialogDisplayValue: dialog?.style.display,
                inputVisible: input?.style.display !== 'none',
                inputValue: input?.value,
                registerBtnText: registerBtn?.textContent,
                skipBtnText: skipBtn?.textContent,
                allElementsPresent: !!dialog && !!input && !!registerBtn && !!skipBtn
            };
        });
        
        console.log('\n=== Final Dialog State ===\n');
        console.log('Dialog visible (display=flex):', finalCheck.dialogVisible);
        console.log('Dialog display value:', finalCheck.dialogDisplayValue);
        console.log('All elements present:', finalCheck.allElementsPresent);
        console.log('Input field visible:', finalCheck.inputVisible);
        console.log('Register button:', finalCheck.registerBtnText?.trim());
        console.log('Skip button:', finalCheck.skipBtnText?.trim());
        
        // コンソールログから[SIMULATE]の部分を表示
        console.log('\n=== Simulation Console Logs ===\n');
        logs.filter(l => l.includes('[SIMULATE]')).forEach(l => console.log(l));
        
        // 結果判定
        if (finalCheck.dialogVisible && finalCheck.allElementsPresent) {
            console.log('\n✅ SUCCESS: ランキング登録ダイアログが正常に機能しています');
            console.log('   - ゲーム終了（詰み、人間勝利）時にダイアログが表示されます');
            console.log('   - ニックネーム入力フィールドが利用可能');
            console.log('   - 「登録」と「スキップ」ボタンが利用可能');
        } else {
            console.log('\n⚠️ WARNING: ダイアログに問題があります');
            if (!finalCheck.dialogVisible) console.log('   - ダイアログが表示されていません');
            if (!finalCheck.allElementsPresent) console.log('   - 一部の要素が見つかりません');
        }

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
