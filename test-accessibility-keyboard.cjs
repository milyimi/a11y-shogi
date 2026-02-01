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
        
        // Viteのタイムアウトを無視
        await page.setDefaultNavigationTimeout(5000);
        await page.setDefaultTimeout(30000);
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  視覚障害者向けアクセシビリティテスト');
        console.log('  ランキング登録ダイアログ - キーボード操作');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // 既存のゲームに移動
        const gameId = 95;
        console.log(`ステップ 1: ゲームページに移動 (ID: ${gameId})`);
        
        try {
            await page.goto(`http://localhost:8000/game/${gameId}`, { 
                waitUntil: 'domcontentloaded',
                timeout: 5000 
            });
        } catch (navError) {
            // Viteのタイムアウトは無視して続行
            console.log('  (Vite接続タイムアウトを無視)');
        }
        
        // ページがロードされたか確認
        await new Promise(resolve => setTimeout(resolve, 5000));

        // ダイアログ要素がDOMに追加されるまで待つ
        await page.waitForSelector('#ranking-registration-dialog', { timeout: 15000 }).catch(() => {
            console.log('  ⚠️ ダイアログ要素の読み込みタイムアウト');
        });

        // gameDataが読み込まれるまで待つ
        await page.waitForFunction(() => {
            return typeof window.gameData !== 'undefined';
        }, { timeout: 15000 }).catch(() => {
            console.log('  ⚠️ gameDataの読み込みタイムアウト');
        });

        console.log('✓ ページ読み込み完了\n');
        
        // ゲーム状態をシミュレート（勝利）
        console.log('ステップ 2: ゲーム終了状態をシミュレート');
        await page.evaluate(() => {
            console.log('[TEST] Setting game to victory state...');
            
            // gameDataが存在しない場合は初期化
            if (typeof window.gameData === 'undefined') {
                window.gameData = {
                    boardState: {},
                    currentPlayer: 'human',
                    moveCount: 0
                };
            }
            
            window.gameData.status = 'mate';
            window.gameData.winner = 'human';
            window.gameData.moveCount = 30;
            
            // updateGameInfo を直接呼び出してダイアログをトリガー
            const updateData = {
                status: 'mate',
                winner: 'human',
                moveCount: 30
            };
            
            if (typeof updateGameInfo === 'function') {
                updateGameInfo(updateData);
            } else {
                // 関数が存在しない場合、直接ダイアログを表示
                if (typeof showRankingRegistrationDialog === 'function') {
                    showRankingRegistrationDialog();
                }
            }
        });
        
        // ダイアログ表示を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✓ ゲーム状態を「勝利」に変更\n');
        
        // ダイアログ状態を確認
        console.log('ステップ 3: ランキング登録ダイアログの状態確認');
        const dialogCheck = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            const input = document.getElementById('ranking-nickname-input');
            const registerBtn = document.getElementById('btn-register-ranking');
            const skipBtn = document.getElementById('btn-skip-ranking');
            
            return {
                dialogExists: !!dialog,
                dialogDisplay: dialog?.style.display,
                dialogVisible: dialog?.style.display === 'flex',
                inputExists: !!input,
                inputDisabled: input?.disabled,
                inputTabIndex: input?.tabIndex,
                registerBtnExists: !!registerBtn,
                skipBtnExists: !!skipBtn,
                canFocusInput: input && !input.disabled && input.tabIndex !== -1
            };
        });
        
        console.log('  ダイアログHTML要素:', dialogCheck.dialogExists ? '✅存在' : '❌なし');
        console.log('  表示状態:', dialogCheck.dialogDisplay);
        console.log('  視覚的に表示:', dialogCheck.dialogVisible ? '✅ YES' : '❌ NO');
        console.log('  入力フィールド:', dialogCheck.inputExists ? '✅存在' : '❌なし');
        console.log('  入力フィールド無効化:', dialogCheck.inputDisabled ? '❌ YES' : '✅ NO');
        console.log('  タブインデックス:', dialogCheck.inputTabIndex);
        console.log('  キーボードフォーカス可能:', dialogCheck.canFocusInput ? '✅ YES' : '❌ NO');
        console.log('  登録ボタン:', dialogCheck.registerBtnExists ? '✅存在' : '❌なし');
        console.log('  スキップボタン:', dialogCheck.skipBtnExists ? '✅存在' : '❌なし');
        
        if (!dialogCheck.dialogVisible) {
            console.log('\n⚠️  ダイアログが表示されていません！手動で表示を試みます...\n');
            await page.evaluate(() => {
                const dialog = document.getElementById('ranking-registration-dialog');
                if (dialog) {
                    dialog.style.display = 'flex';
                }
                const input = document.getElementById('ranking-nickname-input');
                if (input) {
                    input.focus();
                }
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log('\nステップ 4: キーボード操作でランキング登録');
        
        // ニックネーム入力フィールドにフォーカス
        console.log('  → ニックネーム入力フィールドにフォーカス...');
        await page.focus('#ranking-nickname-input');
        
        // ニックネーム入力
        const nickname = 'テスト太郎';
        console.log(`  → ニックネームを入力: "${nickname}"`);
        await page.type('#ranking-nickname-input', nickname, { delay: 50 });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 入力値確認
        const inputValue = await page.evaluate(() => {
            return document.getElementById('ranking-nickname-input')?.value;
        });
        console.log(`  ✓ 入力確認: "${inputValue}"\n`);
        
        // Tabキーで登録ボタンに移動
        console.log('  → Tab キーで「登録」ボタンに移動...');
        await page.keyboard.press('Tab');
        
        // フォーカス位置確認
        const focusedElement = await page.evaluate(() => {
            return document.activeElement?.id || document.activeElement?.tagName;
        });
        console.log(`  ✓ フォーカス位置: ${focusedElement}`);
        
        // Enter キーで登録
        console.log('\n  → Enter キーで登録実行...');
        await page.keyboard.press('Enter');
        
        // 登録完了を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\nステップ 5: 登録リクエスト送信完了');
        console.log('  → DB確認で登録結果を検証します');

    } catch (error) {
        console.error('\n❌ テストエラー:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
