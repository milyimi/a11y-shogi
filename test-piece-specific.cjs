const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        // Chrome で起動
        browser = await puppeteer.launch({
            headless: true,
            args: ['--width=1280', '--height=800']
        });

        const page = await browser.newPage();
        
        page.on('console', (msg) => {
            console.log(`[${msg.type()}] ${msg.text()}`);
        });

        console.log('Opening game page...');
        await page.goto('http://localhost:8000/game/95', { waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });
        
        console.log('\n=== Initial Board State ===');
        
        // 初期ボード状態を取得
        const initialBoard = await page.evaluate(() => {
            const pieces = {};
            document.querySelectorAll('.cell').forEach(cell => {
                const rank = cell.dataset.rank;
                const file = cell.dataset.file;
                const text = cell.textContent.trim();
                if (text) {
                    pieces[`${rank}-${file}`] = text;
                }
            });
            return pieces;
        });
        
        console.log('Pieces on board:', initialBoard);
        
        // gameData のボード状態を取得
        const gameDataBoard = await page.evaluate(() => {
            if (typeof gameData === 'undefined') return null;
            const pieces = {};
            for (const rank in gameData.boardState.board) {
                for (const file in gameData.boardState.board[rank]) {
                    const piece = gameData.boardState.board[rank][file];
                    if (piece) {
                        pieces[`${rank}-${file}`] = piece;
                    }
                }
            }
            return pieces;
        });
        
        console.log('\nGameData board state:');
        console.log(JSON.stringify(gameDataBoard, null, 2));
        
        // 特定の駒を移動テスト: 7-8の先手駒を移動
        console.log('\n=== Testing Piece Move ===');
        
        const pieceAt78 = await page.evaluate(() => {
            const cell = document.querySelector('[data-rank="7"][data-file="8"]');
            return {
                text: cell.textContent.trim(),
                html: cell.innerHTML,
                ariaLabel: cell.getAttribute('aria-label')
            };
        });
        
        console.log('Piece at 7-8:', pieceAt78);
        
        // 7-8をクリック（先手の玉を選択）
        console.log('\nClicking cell 7-8...');
        await page.click('[data-rank="7"][data-file="8"]');
        await new Promise(r => setTimeout(r, 100));
        
        const selectedCell = await page.evaluate(() => {
            const cell = document.querySelector('.cell.selected');
            if (!cell) return 'No cell selected';
            return {
                rank: cell.dataset.rank,
                file: cell.dataset.file,
                text: cell.textContent.trim()
            };
        });
        
        console.log('Selected cell:', selectedCell);
        
        // 7-7をクリック（移動先）
        console.log('\nClicking destination 7-7...');
        await page.click('[data-rank="7"][data-file="7"]');
        console.log('Move request sent');
        
        // APIレスポンスを待つ
        await new Promise(r => setTimeout(r, 1500));
        
        // 移動後の状態を確認
        console.log('\n=== After Move ===');
        
        const afterMoveBoard = await page.evaluate(() => {
            const pieces = {};
            document.querySelectorAll('.cell').forEach(cell => {
                const rank = cell.dataset.rank;
                const file = cell.dataset.file;
                const text = cell.textContent.trim();
                if (text) {
                    pieces[`${rank}-${file}`] = text;
                }
            });
            return pieces;
        });
        
        console.log('Pieces on board:', afterMoveBoard);
        
        // 特定の駒の詳細情報を取得
        const detailedState = await page.evaluate(() => {
            const details = {};
            const positions = ['7-8', '7-7', '8-8', '8-9'];
            
            positions.forEach(pos => {
                const [rank, file] = pos.split('-');
                const cell = document.querySelector(`[data-rank="${rank}"][data-file="${file}"]`);
                if (cell) {
                    const span = cell.querySelector('.piece-text');
                    details[pos] = {
                        cellText: cell.textContent.trim(),
                        spanText: span ? span.textContent : 'NO SPAN',
                        spanHTML: span ? span.outerHTML : 'NO SPAN',
                        className: cell.className
                    };
                }
            });
            
            return details;
        });
        
        console.log('\nDetailed state:');
        console.log(JSON.stringify(detailedState, null, 2));
        
        // gameData の状態も確認
        const gameDataAfterMove = await page.evaluate(() => {
            if (typeof gameData === 'undefined') return 'gameData not found';
            const pieces = {};
            for (const rank in gameData.boardState.board) {
                for (const file in gameData.boardState.board[rank]) {
                    const piece = gameData.boardState.board[rank][file];
                    if (piece) {
                        pieces[`${rank}-${file}`] = piece;
                    }
                }
            }
            return pieces;
        });
        
        console.log('\nGameData after move:');
        console.log(JSON.stringify(gameDataAfterMove, null, 2));
        
        console.log('\n✓ Test completed');
        await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
        console.error('Error during test:', error.message);
        console.error('Full error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
