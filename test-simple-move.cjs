const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting simple move test...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        // まず新しいゲームを作成
        console.log('Creating new game...');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
        
        // 難易度を選択(easyはデフォルトでチェック済み)
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        const gameUrl = page.url();
        console.log('Game URL:', gameUrl);
        
        console.log('Waiting for board...');
        await page.waitForSelector('.shogi-board', { timeout: 10000 });
        
        // 初期状態を確認
        console.log('\n=== Initial State ===');
        const before = await page.evaluate(() => {
            const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
            const cell76 = document.querySelector('[data-file="7"][data-rank="6"]');
            return {
                '7-7': cell77?.querySelector('.piece-text')?.textContent || '',
                '7-6': cell76?.querySelector('.piece-text')?.textContent || ''
            };
        });
        console.log(before);
        
        // 駒を移動 (7-7 の歩を 7-6 に)
        console.log('\n=== Clicking 7-7 ===');
        await page.click('[data-file="7"][data-rank="7"]');
        await new Promise(r => setTimeout(r, 500));
        
        console.log('=== Clicking 7-6 ===');
        await page.click('[data-file="7"][data-rank="6"]');
        await new Promise(r => setTimeout(r, 2000));
        
        // 移動後の状態を確認
        console.log('\n=== After Move (without reload) ===');
        const afterNoReload = await page.evaluate(() => {
            const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
            const cell76 = document.querySelector('[data-file="7"][data-rank="6"]');
            return {
                '7-7': cell77?.querySelector('.piece-text')?.textContent || '',
                '7-6': cell76?.querySelector('.piece-text')?.textContent || '',
                '7-7-class': cell77?.className || '',
                '7-6-class': cell76?.className || ''
            };
        });
        console.log(afterNoReload);
        
        // リロードして確認
        console.log('\n=== Reloading ===');
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1000));
        
        console.log('\n=== After Reload ===');
        const afterReload = await page.evaluate(() => {
            const cell77 = document.querySelector('[data-file="7"][data-rank="7"]');
            const cell76 = document.querySelector('[data-file="7"][data-rank="6"]');
            return {
                '7-7': cell77?.querySelector('.piece-text')?.textContent || '',
                '7-6': cell76?.querySelector('.piece-text')?.textContent || ''
            };
        });
        console.log(afterReload);
        
        // 結果を比較
        console.log('\n=== RESULT ===');
        if (afterNoReload['7-6'] !== '' && afterNoReload['7-6'] === afterReload['7-6']) {
            console.log('✅ SUCCESS: DOM updates immediately!');
        } else {
            console.log('❌ FAILED: DOM not updating immediately');
            console.log(`  Expected: 7-6 should show piece, 7-7 should be empty`);
            console.log(`  Got (no reload): 7-6="${afterNoReload['7-6']}", 7-7="${afterNoReload['7-7']}"`);
            console.log(`  Got (reload): 7-6="${afterReload['7-6']}", 7-7="${afterReload['7-7']}"`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    await browser.close();
})();
