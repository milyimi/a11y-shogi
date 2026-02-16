import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle2' });
    
    await page.click('input[value="easy"]');
    await page.click('input[value="sente"]');
    await page.click('#btn-start-game');
    await new Promise(r => setTimeout(r, 2000));
    
    const info = await page.evaluate(() => {
        const cells = document.querySelectorAll('.cell');
        let totalCells = cells.length;
        let cellsWithPieceSenteClass = 0;
        let cellsWithPieceChild = 0;
        let examplePieces = [];
        
        cells.forEach((cell, idx) => {
            if (cell.classList.contains('piece-sente')) {
                cellsWithPieceSenteClass++;
                if (examplePieces.length < 3) {
                    examplePieces.push({
                        index: idx,
                        classes: cell.className,
                        html: cell.outerHTML.slice(0, 300)
                    });
                }
            }
            const pieceChild = cell.querySelector('.piece-sente');
            if (pieceChild) {
                cellsWithPieceChild++;
            }
        });
        
        return {
            totalCells,
            cellsWithPieceSenteClass,
            cellsWithPieceChild,
            examplePieces
        };
    });
    
    console.log(JSON.stringify(info, null, 2));
    
    await browser.close();
})();
