const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting DOM update test...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // コンソールログをキャプチャ
    page.on('console', msg => {
        const text = msg.text();
        console.log('BROWSER:', text);
    });
    
    // ネットワークリクエストをキャプチャ
    page.on('response', async (response) => {
        if (response.url().includes('/move')) {
            try {
                const data = await response.json();
                console.log('API RESPONSE:', JSON.stringify(data, null, 2));
            } catch (e) {
                // JSON以外のレスポンスは無視
            }
        }
    });
    
    try {
        console.log('Navigating to game...');
        await page.goto('http://localhost:8000/game/83', { waitUntil: 'networkidle0' });
        
        console.log('Waiting for board to load...');
        await page.waitForSelector('.shogi-board', { timeout: 10000 });
        
        // 初期状態のボードを確認
        console.log('\n=== Initial Board State ===');
        const initialBoard = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('.cell'));
            return cells.slice(0, 5).map(cell => ({
                position: `${cell.dataset.file}-${cell.dataset.rank}`,
                text: cell.textContent,
                classes: cell.className
            }));
        });
        console.log(initialBoard);
        
        // 駒を選択
        console.log('\n=== Selecting piece at 7-7 ===');
        await page.click('[data-file="7"][data-rank="7"]');
        await new Promise(r => setTimeout(r, 500));
        
        // 移動先を選択
        console.log('\n=== Moving to 7-6 ===');
        await page.click('[data-file="7"][data-rank="6"]');
        
        // リクエスト完了を待つ
        await new Promise(r => setTimeout(r, 2000));
        
        // 移動後のボードを確認
        console.log('\n=== Board State After Move ===');
        const afterBoard = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('.cell'));
            const cell76 = cells.find(c => c.dataset.file === '7' && c.dataset.rank === '6');
            const cell77 = cells.find(c => c.dataset.file === '7' && c.dataset.rank === '7');
            return {
                '7-6': {
                    text: cell76.textContent,
                    classes: cell76.className,
                    ariaLabel: cell76.getAttribute('aria-label')
                },
                '7-7': {
                    text: cell77.textContent,
                    classes: cell77.className,
                    ariaLabel: cell77.getAttribute('aria-label')
                }
            };
        });
        console.log(afterBoard);
        
        // window.gameData の状態を確認
        console.log('\n=== Window GameData ===');
        const gameData = await page.evaluate(() => {
            return {
                hasBoardState: !!window.gameData?.boardState,
                cell76: window.gameData?.boardState?.board[6]?.[7],
                cell77: window.gameData?.boardState?.board[7]?.[7]
            };
        });
        console.log(gameData);
        
        console.log('\n=== Reloading page to compare ===');
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1000));
        
        const afterReload = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('.cell'));
            const cell76 = cells.find(c => c.dataset.file === '7' && c.dataset.rank === '6');
            const cell77 = cells.find(c => c.dataset.file === '7' && c.dataset.rank === '7');
            return {
                '7-6': {
                    text: cell76.textContent,
                    classes: cell76.className
                },
                '7-7': {
                    text: cell77.textContent,
                    classes: cell77.className
                }
            };
        });
        console.log(afterReload);
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    await browser.close();
})();
