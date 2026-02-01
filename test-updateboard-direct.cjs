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
            const text = msg.text();
            if (text.includes('updateBoard')) {
                console.log(`[IMPORTANT] ${msg.type()} ${text}`);
            }
        });

        console.log('Opening game page...');
        await page.goto('http://localhost:8000/game/95', { waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        
        // 駒のマッピングを確認
        const mappingTest = await page.evaluate(() => {
            return {
                hisha: typeof window.pieceNameMap !== 'undefined' ? window.pieceNameMap.hisha : 'NOT FOUND',
                kaku: typeof window.pieceNameMap !== 'undefined' ? window.pieceNameMap.kaku : 'NOT FOUND',
                kin: typeof window.pieceNameMap !== 'undefined' ? window.pieceNameMap.kin : 'NOT FOUND'
            };
        });
        
        console.log('\nPiece name mapping globally:', mappingTest);
        
        // window.updateBoard が正しくセットされているか確認
        const functionCheck = await page.evaluate(() => {
            return {
                updateBoardExists: typeof window.updateBoard === 'function',
                updateBoardDefined: window.updateBoard !== undefined,
                updateBoardType: typeof window.updateBoard
            };
        });
        
        console.log('\nwindow.updateBoard check:', functionCheck);
        
        // 実際にupdateBoardを呼び出してテスト
        console.log('\n=== Testing updateBoard() directly ===');
        
        // 実際のゲームデータから現在のボード状態を取得
        const currentGameData = await page.evaluate(() => {
            return typeof gameData !== 'undefined' ? gameData.boardState : null;
        });
        
        // 現在のボード状態から8-2の駒を別の位置に移動させたテストデータを作成
        const testBoardState = JSON.parse(JSON.stringify(currentGameData));
        
        // 8-2の飛を7-2に移動
        testBoardState.board['7']['2'] = testBoardState.board['8']['2'];
        testBoardState.board['8']['2'] = null;
        
        console.log('Test move: 8-2 (飛) -> 7-2');
        console.log('Current 8-2:', currentGameData.board['8']['2']);
        console.log('Current 7-2:', currentGameData.board['7']['2']);
        console.log('After move 7-2:', testBoardState.board['7']['2']);
        console.log('After move 8-2:', testBoardState.board['8']['2']);
        
        // updateBoard を呼び出す前と後でDOMを確認
        const beforeUpdate = await page.evaluate(() => {
            const cells = {};
            ['8-2', '7-2', '8-5', '8-6', '8-8', '8-9'].forEach(pos => {
                const [rank, file] = pos.split('-');
                const cell = document.querySelector(`[data-rank="${rank}"][data-file="${file}"]`);
                cells[pos] = {
                    text: cell ? cell.textContent.trim() : 'NOT FOUND',
                    html: cell ? cell.innerHTML : 'NOT FOUND'
                };
            });
            return cells;
        });
        
        console.log('\nBefore updateBoard:', JSON.stringify(beforeUpdate, null, 2));
        
        // updateBoard を呼び出す
        console.log('\nCalling updateBoard with test data...');
        
        const callResult = await page.evaluate((boardState) => {
            console.log('[TEST] About to call updateBoard');
            console.log('[TEST] window.updateBoard exists:', typeof window.updateBoard);
            
            try {
                window.updateBoard(boardState);
                console.log('[TEST] updateBoard called successfully');
                return { success: true, error: null };
            } catch (err) {
                console.log('[TEST] Error calling updateBoard:', err.message);
                return { success: false, error: err.message };
            }
        }, testBoardState);
        
        console.log('Call result:', callResult);
        
        // 呼び出し後のDOM状態
        await new Promise(r => setTimeout(r, 300));
        
        const afterUpdate = await page.evaluate(() => {
            const cells = {};
            ['8-2', '7-2', '8-5', '8-6', '8-8', '8-9'].forEach(pos => {
                const [rank, file] = pos.split('-');
                const cell = document.querySelector(`[data-rank="${rank}"][data-file="${file}"]`);
                cells[pos] = {
                    text: cell ? cell.textContent.trim() : 'NOT FOUND',
                    html: cell ? cell.innerHTML : 'NOT FOUND'
                };
            });
            return cells;
        });
        
        console.log('\nAfter updateBoard:', JSON.stringify(afterUpdate, null, 2));
        
        // 変更があったか確認
        console.log('\n=== DOM Change Detection ===');
        const changed = {};
        for (const pos in beforeUpdate) {
            if (JSON.stringify(beforeUpdate[pos]) !== JSON.stringify(afterUpdate[pos])) {
                changed[pos] = { before: beforeUpdate[pos], after: afterUpdate[pos] };
            }
        }
        
        if (Object.keys(changed).length === 0) {
            console.log('❌ NO DOM CHANGES DETECTED');
        } else {
            console.log('✓ DOM changes detected:');
            console.log(JSON.stringify(changed, null, 2));
        }
        
        console.log('\n✓ Test completed');

    } catch (error) {
        console.error('Error during test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
