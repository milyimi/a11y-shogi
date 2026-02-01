const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing DOM updates with Firefox...\n');
    
    // Firefoxを起動してみる
    let browser;
    try {
        console.log('Launching Firefox...');
        browser = await puppeteer.launch({
            product: 'firefox',
            headless: true,
            args: ['--no-sandbox']
        });
        console.log('Firefox launched successfully\n');
    } catch (error) {
        console.log('Firefox not available:', error.message);
        console.log('Falling back to Chrome...\n');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    const page = await browser.newPage();
    
    try {
        // ゲームを作成
        console.log('Creating game...');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('Game URL:', page.url());
        
        await page.waitForSelector('.shogi-board');
        
        // 移動テスト
        console.log('\n=== Move Test ===');
        
        // 移動前
        const before = await page.evaluate(() => {
            const cell = document.querySelector('[data-file="7"][data-rank="7"]');
            return {
                html: cell?.innerHTML || '',
                text: cell?.querySelector('.piece-text')?.textContent || '',
                className: cell?.className || '',
                textContent: cell?.textContent || ''
            };
        });
        console.log('Before move:');
        console.log('  HTML:', before.html.substring(0, 80));
        console.log('  .piece-text:', before.text);
        console.log('  textContent:', before.textContent);
        
        // 駒を移動
        console.log('\nClicking 7-7...');
        await page.click('[data-file="7"][data-rank="7"]');
        await new Promise(r => setTimeout(r, 500));
        
        console.log('Clicking 7-6...');
        await page.click('[data-file="7"][data-rank="6"]');
        
        // 様々なタイミングで確認
        for (let delay of [100, 500, 1000, 2000]) {
            await new Promise(r => setTimeout(r, delay));
            
            const after = await page.evaluate(() => {
                const cell66 = document.querySelector('[data-file="7"][data-rank="6"]');
                const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
                return {
                    cell66_text: cell66?.querySelector('.piece-text')?.textContent || '',
                    cell66_html: cell66?.innerHTML || '',
                    cell77_text: cell77?.querySelector('.piece-text')?.textContent || '',
                    cell77_className: cell77?.className || ''
                };
            });
            
            console.log(`\nAfter ${delay}ms:`);
            console.log('  7-6 .piece-text:', after.cell66_text);
            console.log('  7-6 HTML:', after.cell66_html.substring(0, 60));
            console.log('  7-7 .piece-text:', after.cell77_text);
        }
        
        // リロード後
        console.log('\n=== After Reload ===');
        await page.reload({ waitUntil: 'networkidle0' });
        
        const afterReload = await page.evaluate(() => {
            const cell66 = document.querySelector('[data-file="7"][data-rank="6"]');
            const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
            return {
                cell66_text: cell66?.querySelector('.piece-text')?.textContent || '',
                cell77_text: cell77?.querySelector('.piece-text')?.textContent || ''
            };
        });
        
        console.log('7-6 .piece-text:', afterReload.cell66_text);
        console.log('7-7 .piece-text:', afterReload.cell77_text);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    await browser.close();
})();
