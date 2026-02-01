const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        const consoleLogs = [];
        page.on('console', (msg) => {
            consoleLogs.push({ type: msg.type(), text: msg.text() });
            if (msg.text().includes('makeMove') || msg.text().includes('updateBoard')) {
                console.log(`[${msg.type()}] ${msg.text()}`);
            }
        });

        console.log('Opening game page...');
        await page.goto('http://localhost:8000/game/95', { waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        
        console.log('\n=== Game State ===');
        
        // 先手の駒の状態を確認
        const senteBoard = await page.evaluate(() => {
            const pieces = {};
            document.querySelectorAll('.cell.piece-sente').forEach(cell => {
                const rank = cell.dataset.rank;
                const file = cell.dataset.file;
                pieces[`${rank}-${file}`] = cell.textContent.trim();
            });
            return pieces;
        });
        
        console.log('Sente pieces (blue):', senteBoard);
        
        const goteBoard = await page.evaluate(() => {
            const pieces = {};
            document.querySelectorAll('.cell.piece-gote').forEach(cell => {
                const rank = cell.dataset.rank;
                const file = cell.dataset.file;
                pieces[`${rank}-${file}`] = cell.textContent.trim();
            });
            return pieces;
        });
        
        console.log('Gote pieces (red):', goteBoard);
        
        // 飛（hisha）の位置を確認
        const hishaPositions = await page.evaluate(() => {
            const positions = [];
            document.querySelectorAll('.cell').forEach(cell => {
                if (cell.textContent.includes('飛')) {
                    positions.push({
                        rank: cell.dataset.rank,
                        file: cell.dataset.file,
                        color: cell.classList.contains('piece-sente') ? 'sente' : 'gote',
                        text: cell.textContent.trim()
                    });
                }
            });
            return positions;
        });
        
        console.log('\nHisha (飛) positions:', hishaPositions);
        
        // 角（kaku）の位置を確認
        const kakuPositions = await page.evaluate(() => {
            const positions = [];
            document.querySelectorAll('.cell').forEach(cell => {
                if (cell.textContent.includes('角')) {
                    positions.push({
                        rank: cell.dataset.rank,
                        file: cell.dataset.file,
                        color: cell.classList.contains('piece-sente') ? 'sente' : 'gote',
                        text: cell.textContent.trim()
                    });
                }
            });
            return positions;
        });
        
        console.log('Kaku (角) positions:', kakuPositions);
        
        // 金（kin）の位置を確認
        const kinPositions = await page.evaluate(() => {
            const positions = [];
            document.querySelectorAll('.cell').forEach(cell => {
                if (cell.textContent.includes('金')) {
                    positions.push({
                        rank: cell.dataset.rank,
                        file: cell.dataset.file,
                        color: cell.classList.contains('piece-sente') ? 'sente' : 'gote',
                        text: cell.textContent.trim()
                    });
                }
            });
            return positions;
        });
        
        console.log('Kin (金) positions:', kinPositions);
        
        // gameData のボード状態
        const gameDataBoard = await page.evaluate(() => {
            if (!window.gameData) return null;
            const pieces = {};
            for (const rank in window.gameData.boardState.board) {
                for (const file in window.gameData.boardState.board[rank]) {
                    const piece = window.gameData.boardState.board[rank][file];
                    if (piece && (piece.type === 'hisha' || piece.type === 'kaku' || piece.type === 'kin')) {
                        pieces[`${rank}-${file}`] = `${piece.type}/${piece.color}`;
                    }
                }
            }
            return pieces;
        });
        
        console.log('\ngameData board state (hisha/kaku/kin only):', gameDataBoard);
        
        // 移動テスト: 2-5の飛を3-5に移動
        console.log('\n=== Testing Move: 2-5 -> 3-5 ===');
        
        await page.click('[data-rank="2"][data-file="5"]');
        console.log('Clicked 2-5');
        await new Promise(r => setTimeout(r, 150));
        
        const selectedCell = await page.evaluate(() => {
            const cell = document.querySelector('[data-rank="2"][data-file="5"]');
            return cell.classList.contains('selected') || cell.hasAttribute('data-selected');
        });
        
        console.log('Cell 2-5 selected:', selectedCell);
        
        // 移動先をクリック
        await page.click('[data-rank="3"][data-file="5"]');
        console.log('Clicked 3-5 (destination)');
        
        await new Promise(r => setTimeout(r, 2000));
        
        // 移動後の状態を確認
        console.log('\n=== After Move ===');
        
        const afterMove = await page.evaluate(() => {
            const hisha25 = document.querySelector('[data-rank="2"][data-file="5"]');
            const hisha35 = document.querySelector('[data-rank="3"][data-file="5"]');
            return {
                '2-5': {
                    text: hisha25 ? hisha25.textContent.trim() : 'NONE',
                    html: hisha25 ? hisha25.innerHTML : 'NONE'
                },
                '3-5': {
                    text: hisha35 ? hisha35.textContent.trim() : 'NONE',
                    html: hisha35 ? hisha35.innerHTML : 'NONE'
                }
            };
        });
        
        console.log('Cell contents after move:', afterMove);
        
        // gameData の状態確認
        const gameDataAfterMove = await page.evaluate(() => {
            if (!window.gameData) return null;
            return {
                '2-5': window.gameData.boardState.board['2']['5'],
                '3-5': window.gameData.boardState.board['3']['5']
            };
        });
        
        console.log('gameData after move:', gameDataAfterMove);
        
        // コンソールログから重要なメッセージを抽出
        console.log('\n=== Important Console Logs ===');
        const importantLogs = consoleLogs.filter(log => 
            log.text.includes('makeMove') || 
            log.text.includes('updateBoard') ||
            log.text.includes('API response') ||
            log.type === 'error'
        );
        
        importantLogs.forEach(log => {
            console.log(`[${log.type}] ${log.text}`);
        });

    } catch (error) {
        console.error('Error during test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
