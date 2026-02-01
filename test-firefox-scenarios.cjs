const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing various scenarios with Firefox...\n');
    
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

    const testScenarios = [
        { name: '通常の移動', moves: [[7, 7, 7, 6]] },
        { name: '持ち駒を打つ', moves: 'drop' },
        { name: '連続移動', moves: [[7, 7, 7, 6], [7, 6, 7, 5]] },
        { name: '高速連続移動', moves: 'fast_sequence' }
    ];
    
    for (const scenario of testScenarios) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Test: ${scenario.name}`);
        console.log('='.repeat(50));
        
        const page = await browser.newPage();
        
        try {
            // ゲーム作成
            await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            await page.waitForSelector('.shogi-board');
            
            if (scenario.moves === 'drop') {
                // 持ち駒テスト - まず駒を取られるまで複数手進める
                await page.click('[data-file="7"][data-rank="7"]');
                await new Promise(r => setTimeout(r, 300));
                await page.click('[data-file="7"][data-rank="6"]');
                await new Promise(r => setTimeout(r, 2000));
                
                // 手駒があるか確認
                const hasHand = await page.evaluate(() => {
                    const handPieces = document.querySelectorAll('.hand-piece');
                    return handPieces.length > 0;
                });
                
                if (hasHand) {
                    console.log('✓ Hand pieces available');
                    // 手駒をクリック
                    await page.click('.hand-piece');
                    await new Promise(r => setTimeout(r, 300));
                    
                    // 空いているマスをクリック
                    const emptyCell = await page.evaluate(() => {
                        const cells = document.querySelectorAll('.cell');
                        for (const cell of cells) {
                            const text = cell.querySelector('.piece-text')?.textContent || '';
                            if (text === '') {
                                return [cell.dataset.file, cell.dataset.rank];
                            }
                        }
                        return null;
                    });
                    
                    if (emptyCell) {
                        await page.click(`[data-file="${emptyCell[0]}"][data-rank="${emptyCell[1]}"]`);
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }
            } else if (scenario.moves === 'fast_sequence') {
                // 高速で連続クリック
                const moves = [[7, 7, 7, 6], [2, 2, 2, 3], [8, 8, 8, 7]];
                for (const [f1, r1, f2, r2] of moves) {
                    await page.click(`[data-file="${f1}"][data-rank="${r1}"]`);
                    await new Promise(r => setTimeout(r, 100)); // 短めの待機
                    await page.click(`[data-file="${f2}"][data-rank="${r2}"]`);
                    await new Promise(r => setTimeout(r, 500)); // 応答待機
                }
            } else {
                // 通常の移動
                for (const [f1, r1, f2, r2] of scenario.moves) {
                    console.log(`\nMoving ${f1}-${r1} to ${f2}-${r2}`);
                    
                    const before = await page.evaluate((info) => {
                        const cell = document.querySelector(`[data-file="${info.f1}"][data-rank="${info.r1}"]`);
                        return cell?.querySelector('.piece-text')?.textContent || '';
                    }, {f1, r1});
                    
                    await page.click(`[data-file="${f1}"][data-rank="${r1}"]`);
                    await new Promise(r => setTimeout(r, 300));
                    await page.click(`[data-file="${f2}"][data-rank="${r2}"]`);
                    await new Promise(r => setTimeout(r, 1500));
                    
                    const after = await page.evaluate((info) => {
                        const cell = document.querySelector(`[data-file="${info.f2}"][data-rank="${info.r2}"]`);
                        return cell?.querySelector('.piece-text')?.textContent || '';
                    }, {f2, r2});
                    
                    if (after !== '') {
                        console.log(`✓ DOM updated: ${before} moved`);
                    } else {
                        console.log(`✗ DOM NOT updated: expected ${before}, got empty`);
                    }
                }
            }
            
            console.log('\n✓ Scenario completed');
            
        } catch (error) {
            console.error('✗ Error:', error.message);
        }
        
        await page.close();
    }
    
    await browser.close();
})();
