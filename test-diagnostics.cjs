const puppeteer = require('puppeteer');

(async () => {
    console.log('Checking console errors and network issues...\n');
    
    const browser = await puppeteer.launch({
        product: 'firefox',
        headless: true,
        args: ['--no-sandbox']
    }).catch(async () => {
        console.log('Firefox not available, using Chrome');
        return await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    const page = await browser.newPage();
    const logs = [];
    const errors = [];
    const networkIssues = [];
    
    // ログをキャプチャ
    page.on('console', msg => {
        logs.push(msg.text());
    });
    
    // エラーをキャプチャ
    page.on('pageerror', error => {
        errors.push(error.toString());
    });
    
    // ネットワークエラーをキャプチャ
    page.on('response', response => {
        if (!response.ok() && response.url().includes('/move')) {
            networkIssues.push(`${response.status()}: ${response.url()}`);
        }
    });
    
    try {
        // ゲーム作成
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('.shogi-board');
        
        console.log('Game created. Now testing move...\n');
        
        // 移動
        await page.click('[data-file="7"][data-rank="7"]');
        await new Promise(r => setTimeout(r, 300));
        await page.click('[data-file="7"][data-rank="6"]');
        await new Promise(r => setTimeout(r, 2000));
        
        // 結果を確認
        console.log('=== Console Logs ===');
        for (const log of logs) {
            if (log.includes('ERROR') || log.includes('error') || log.includes('updateBoard') || log.includes('move')) {
                console.log(log);
            }
        }
        
        if (logs.filter(l => l.includes('ERROR') || l.includes('error')).length === 0) {
            console.log('(No error logs)');
        }
        
        console.log('\n=== Page Errors ===');
        if (errors.length === 0) {
            console.log('(No page errors)');
        } else {
            for (const error of errors) {
                console.log(error);
            }
        }
        
        console.log('\n=== Network Issues ===');
        if (networkIssues.length === 0) {
            console.log('(No network issues)');
        } else {
            for (const issue of networkIssues) {
                console.log(issue);
            }
        }
        
        // DOM状態を確認
        console.log('\n=== DOM State ===');
        const domState = await page.evaluate(() => {
            const cell66 = document.querySelector('[data-file="7"][data-rank="6"]');
            const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
            return {
                cell66_html: cell66?.innerHTML || '',
                cell77_html: cell77?.innerHTML || '',
                hasUpdateBoardFunc: typeof updateBoard === 'function',
                gameDataExists: !!window.gameData,
                gameDataBoardState: !!window.gameData?.boardState
            };
        });
        console.log('7-6 HTML:', domState.cell66_html.substring(0, 80));
        console.log('7-7 HTML:', domState.cell77_html.substring(0, 80));
        console.log('updateBoard function exists:', domState.hasUpdateBoardFunc);
        console.log('gameData exists:', domState.gameDataExists);
        console.log('gameData.boardState exists:', domState.gameDataBoardState);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    await browser.close();
})();
