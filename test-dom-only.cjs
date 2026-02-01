const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing DOM updates on a single game...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        // 1つのゲームを作成
        console.log('Creating game...');
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('Game created:', page.url());
        
        await page.waitForSelector('.shogi-board');
        
        let successCount = 0;
        let failCount = 0;
        
        // 複数回移動を試す
        for (let i = 0; i < 3; i++) {
            console.log(`\n--- Move ${i + 1} ---`);
            
            // 移動可能な駒を探す
            const moveInfo = await page.evaluate(() => {
                const cells = document.querySelectorAll('.cell.piece-gote');
                for (const cell of cells) {
                    const rank = parseInt(cell.dataset.rank);
                    const file = parseInt(cell.dataset.file);
                    // 後手の駒で、前に移動できそうなもの
                    if (rank < 9) {
                        return { fromFile: file, fromRank: rank, toFile: file, toRank: rank + 1 };
                    }
                }
                return null;
            });
            
            if (!moveInfo) {
                console.log('No valid move found, skipping...');
                continue;
            }
            
            console.log(`Moving from ${moveInfo.fromFile}-${moveInfo.fromRank} to ${moveInfo.toFile}-${moveInfo.toRank}`);
            
            // 移動前の状態
            const before = await page.evaluate((info) => {
                const fromCell = document.querySelector(`[data-file="${info.fromFile}"][data-rank="${info.fromRank}"]`);
                const toCell = document.querySelector(`[data-file="${info.toFile}"][data-rank="${info.toRank}"]`);
                return {
                    from: fromCell?.querySelector('.piece-text')?.textContent || '',
                    to: toCell?.querySelector('.piece-text')?.textContent || ''
                };
            }, moveInfo);
            
            console.log(`Before: from="${before.from}", to="${before.to}"`);
            
            // 駒を移動
            await page.click(`[data-file="${moveInfo.fromFile}"][data-rank="${moveInfo.fromRank}"]`);
            await new Promise(r => setTimeout(r, 300));
            await page.click(`[data-file="${moveInfo.toFile}"][data-rank="${moveInfo.toRank}"]`);
            await new Promise(r => setTimeout(r, 1500));
            
            // 移動後の状態（リロードなし）
            const afterNoReload = await page.evaluate((info) => {
                const fromCell = document.querySelector(`[data-file="${info.fromFile}"][data-rank="${info.fromRank}"]`);
                const toCell = document.querySelector(`[data-file="${info.toFile}"][data-rank="${info.toRank}"]`);
                return {
                    from: fromCell?.querySelector('.piece-text')?.textContent || '',
                    to: toCell?.querySelector('.piece-text')?.textContent || '',
                    toHTML: toCell?.innerHTML || ''
                };
            }, moveInfo);
            
            console.log(`After (no reload): from="${afterNoReload.from}", to="${afterNoReload.to}"`);
            
            // 検証
            if (afterNoReload.to !== '') {
                console.log('✅ DOM updated immediately');
                successCount++;
            } else {
                console.log('❌ DOM not updated');
                console.log('  Cell HTML:', afterNoReload.toHTML.substring(0, 100));
                failCount++;
            }
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Success: ${successCount}/3`);
        console.log(`Failed: ${failCount}/3`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    await browser.close();
})();
