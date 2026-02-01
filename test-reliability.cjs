const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing DOM update reliability...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < 10; i++) {
        console.log(`\n=== Test ${i + 1} ===`);
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.text().includes('ERROR') || msg.text().includes('error')) {
                console.log('  Console:', msg.text());
            }
        });
        
        try {
            await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0', timeout: 10000 });
            await new Promise(r => setTimeout(r, 500));
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
            await new Promise(r => setTimeout(r, 500));
            await page.waitForSelector('.shogi-board', { timeout: 10000 });
            
            // 移動前の状態
            const before = await page.evaluate(() => {
                const cell = document.querySelector('[data-file="7"][data-rank="7"]');
                return cell?.querySelector('.piece-text')?.textContent || '';
            });
            
            // 駒を移動
            await page.click('[data-file="7"][data-rank="7"]');
            await new Promise(r => setTimeout(r, 300));
            await page.click('[data-file="7"][data-rank="6"]');
            await new Promise(r => setTimeout(r, 2000));
            
            // 移動後の状態（リロードなし）
            const afterNoReload = await page.evaluate(() => {
                const cell76 = document.querySelector('[data-file="7"][data-rank="6"]');
                const text = cell76?.querySelector('.piece-text')?.textContent || '';
                return {
                    text,
                    hasSpan: !!cell76?.querySelector('.piece-text'),
                    cellHTML: cell76?.innerHTML || ''
                };
            });
            
            // リロードして確認
            await page.reload({ waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 500));
            
            const afterReload = await page.evaluate(() => {
                const cell = document.querySelector('[data-file="7"][data-rank="6"]');
                return cell?.querySelector('.piece-text')?.textContent || '';
            });
            
            if (afterNoReload.text !== '' && afterNoReload.text === afterReload) {
                console.log(`✅ SUCCESS: 7-6="${afterNoReload.text}"`);
                successCount++;
            } else {
                console.log(`❌ FAILED`);
                console.log(`  Before: 7-7="${before}"`);
                console.log(`  After (no reload): 7-6="${afterNoReload.text}", has span: ${afterNoReload.hasSpan}`);
                console.log(`  After (reload): 7-6="${afterReload}"`);
                console.log(`  Cell HTML: ${afterNoReload.cellHTML.substring(0, 100)}`);
                failCount++;
            }
            
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            failCount++;
        }
        
        await page.close();
    }
    
    console.log(`\n\n=== SUMMARY ===`);
    console.log(`Success: ${successCount}/10`);
    console.log(`Failed: ${failCount}/10`);
    console.log(`Reliability: ${(successCount / 10 * 100).toFixed(0)}%`);
    
    await browser.close();
})();
