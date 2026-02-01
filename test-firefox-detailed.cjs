const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        // Firefox で起動
        browser = await puppeteer.launch({
            headless: false,
            product: 'firefox',
            args: ['--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        // コンソールメッセージをキャッチ
        page.on('console', (msg) => {
            console.log(`[${msg.type()}] ${msg.text()}`);
        });

        // ページを開く
        console.log('Opening game page...');
        await page.goto('http://localhost:8080/game/1', { waitUntil: 'networkidle2', timeout: 10000 });
        
        // ページが読み込まれたか確認
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        console.log('Game board loaded');

        // updateBoard関数がグローバルにあるか確認
        const updateBoardExists = await page.evaluate(() => {
            console.log('Checking window.updateBoard...');
            console.log('window.updateBoard type:', typeof window.updateBoard);
            return typeof window.updateBoard === 'function';
        });

        console.log('updateBoard is accessible globally:', updateBoardExists);

        // 最初の駒の状態を確認
        const initialState = await page.evaluate(() => {
            const cell76 = document.querySelector('[data-rank="7"][data-file="6"]');
            const cell77 = document.querySelector('[data-rank="7"][data-file="7"]');
            return {
                '7-6': cell76 ? cell76.textContent : 'NOT FOUND',
                '7-7': cell77 ? cell77.textContent : 'NOT FOUND',
                '7-6_html': cell76 ? cell76.innerHTML : 'NOT FOUND',
                '7-7_html': cell77 ? cell77.innerHTML : 'NOT FOUND'
            };
        });

        console.log('Initial state of cells 7-6 and 7-7:', initialState);

        // 移動前のボード状態
        const boardStateBefore = await page.evaluate(() => {
            return typeof gameData !== 'undefined' ? gameData.boardState : 'gameData not found';
        });

        console.log('Board state before move:', JSON.stringify(boardStateBefore).substring(0, 200));

        // 74の駒を56に移動（歩の典型的な移動）
        console.log('\nMaking move: 74 -> 56');
        await page.click('[data-rank="7"][data-file="4"]');
        await page.waitForTimeout(100);
        
        const possibleMoves = await page.evaluate(() => {
            const selected = document.querySelector('.cell.selected');
            if (!selected) return 'No cell selected';
            return {
                selectedCell: `${selected.dataset.rank}-${selected.dataset.file}`,
                selectedHTML: selected.innerHTML
            };
        });
        console.log('After first click:', possibleMoves);

        // 56をクリック
        await page.click('[data-rank="5"][data-file="6"]');
        console.log('Clicked destination cell 56');

        // API呼び出しと更新を待つ
        await page.waitForTimeout(1000);

        // 移動後の状態を確認
        const afterMoveState = await page.evaluate(() => {
            const cell74 = document.querySelector('[data-rank="7"][data-file="4"]');
            const cell56 = document.querySelector('[data-rank="5"][data-file="6"]');
            const cell76 = document.querySelector('[data-rank="7"][data-file="6"]');
            const cell77 = document.querySelector('[data-rank="7"][data-file="7"]');
            return {
                '7-4': cell74 ? cell74.textContent.trim() : 'EMPTY',
                '5-6': cell56 ? cell56.textContent.trim() : 'EMPTY',
                '7-6': cell76 ? cell76.textContent.trim() : 'EMPTY',
                '7-7': cell77 ? cell77.textContent.trim() : 'EMPTY',
                '5-6_html': cell56 ? cell56.innerHTML : 'NOT FOUND'
            };
        });

        console.log('State after move:', afterMoveState);

        // ページをリロード
        console.log('\nReloading page...');
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(1000);

        const afterReloadState = await page.evaluate(() => {
            const cell56 = document.querySelector('[data-rank="5"][data-file="6"]');
            return {
                '5-6': cell56 ? cell56.textContent.trim() : 'EMPTY',
                '5-6_html': cell56 ? cell56.innerHTML : 'NOT FOUND'
            };
        });

        console.log('State after reload:', afterReloadState);

        // 複数回の操作をテスト
        console.log('\n=== Testing Multiple Operations ===');
        for (let i = 0; i < 3; i++) {
            console.log(`\n--- Test ${i + 1} ---`);
            
            // 77の駒を76に移動
            await page.click('[data-rank="7"][data-file="7"]');
            await page.waitForTimeout(100);
            await page.click('[data-rank="7"][data-file="6"]');
            console.log('Clicked move 77 -> 76');
            
            await page.waitForTimeout(500);
            
            const testState = await page.evaluate(() => {
                const cell77 = document.querySelector('[data-rank="7"][data-file="7"]');
                const cell76 = document.querySelector('[data-rank="7"][data-file="6"]');
                return {
                    '7-7': cell77 ? cell77.textContent.trim() : 'EMPTY',
                    '7-6': cell76 ? cell76.textContent.trim() : 'EMPTY'
                };
            });
            
            console.log('State after test move:', testState);
        }

        console.log('\n✓ Firefox test completed successfully');
        await page.waitForTimeout(2000);

    } catch (error) {
        console.error('Error during test:', error.message);
        console.error('Full error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
