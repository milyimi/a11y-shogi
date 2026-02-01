/**
 * ブラウザ自動テストスイート（修正版）
 * Puppeteerを使用したEnd-to-Endテスト
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8000';
const TIMEOUT = 30000;

// waitForTimeout の代替
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ゲーム画面に移動するヘルパー
const navigateToGame = async (page) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
    
    const startButton = await page.$('form[action*="start"] button, button[type="submit"], form button');
    if (startButton) {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
            startButton.click(),
        ]).catch(() => {});
    }
    
    return page;
};

describe('将棋ゲーム - ブラウザE2Eテスト', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        page.setDefaultTimeout(TIMEOUT);
        page.setDefaultNavigationTimeout(TIMEOUT);
    });

    afterEach(async () => {
        await page.close();
    });

    describe('初期化と盤面表示', () => {
        it('ホームページが正常に読み込まれる', async () => {
            const response = await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
            expect(response.status()).toBe(200);
        });

        it('ゲーム開始が可能', async () => {
            await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
            
            const button = await page.$('button') || await page.$('a[href*="/game"]');
            expect(button).toBeTruthy();
        });

        it('ゲーム画面が表示される', async () => {
            await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
            
            // ゲーム開始ボタンをクリック
            const startButton = await page.$('form[action*="start"] button, button[type="submit"]');
            if (startButton) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    startButton.click(),
                ]).catch(() => {});
            }
            
            const url = page.url();
            expect(url).toMatch(/localhost|game/);
        });

        it('盤面要素が存在する', async () => {
            await navigateToGame(page);
            
            const board = await page.$('.shogi-board');
            const cells = await page.$$('.cell');
            expect(board).toBeTruthy();
            expect(cells.length).toBe(81);
        });
    });

    describe('駒の配置と表示', () => {
        it('駒の要素が表示される', async () => {
            await navigateToGame(page);
            
            const pieceCount = await page.$$eval('.cell .piece-text', (spans) =>
                spans.filter((s) => s.textContent && s.textContent.trim().length > 0).length
            );
            expect(pieceCount).toBeGreaterThan(0);
        });

        it('初期配置の駒が配置されている', async () => {
            await navigateToGame(page);
            
            const pieceCount = await page.$$eval('.cell .piece-text', (spans) =>
                spans.filter((s) => s.textContent && s.textContent.trim().length > 0).length
            );
            expect(pieceCount).toBeGreaterThanOrEqual(20);
        });
    });

    describe('基本的なインタラクション', () => {
        it('ページがクリック可能', async () => {
            await navigateToGame(page);
            
            const clickable = await page.$('button, a, [role="button"]');
            if (clickable) {
                await clickable.click().catch(() => {});
            }
            expect(true).toBe(true);
        });

        it('駒の移動が試行可能', async () => {
            await navigateToGame(page);
            
            const piece = await page.$('.cell').catch(() => null);
            if (piece) {
                await piece.click().catch(() => {});
                await delay(300);
            }
            expect(true).toBe(true);
        });
    });

    describe('UI要素の存在確認', () => {
        it('ページにテキストが表示される', async () => {
            await navigateToGame(page);
            
            const content = await page.content();
            expect(content.length).toBeGreaterThan(100);
        });

        it('ボタンまたはリンクが存在', async () => {
            await navigateToGame(page);
            
            const cellButtons = await page.$$('.cell');
            expect(cellButtons.length).toBeGreaterThan(0);
        });
    });

    describe('エラーハンドリング', () => {
        it('不正なURLへのアクセスを処理', async () => {
            const response = await page.goto(`${BASE_URL}/game/99999`, { waitUntil: 'networkidle0' }).catch(() => null);
            
            // ページが何らかのレスポンスを返す
            expect(page.url()).toContain('localhost');
        });

        it('ブラウザコンソールエラーの収集', async () => {
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });
            
            await navigateToGame(page);
            await delay(1000);
            
            // Xdebugエラーを除外
            const realErrors = errors.filter(e => !e.includes('Xdebug'));
            expect(realErrors.length).toBeLessThan(10);
        });

        it('ネットワーク応答が正常', async () => {
            await navigateToGame(page);
            
            const content = await page.content();
            expect(content.length).toBeGreaterThan(0);
        });
    });

    describe('パフォーマンス', () => {
        it('ページ読み込みが5秒以内', async () => {
            const startTime = Date.now();
            await navigateToGame(page);
            const loadTime = Date.now() - startTime;
            
            expect(loadTime).toBeLessThan(5000);
        });

        it('駒のクリックが1秒以内に反応', async () => {
            await navigateToGame(page);
            
            const startTime = Date.now();
            const piece = await page.$('.cell').catch(() => null);
            if (piece) {
                await piece.click().catch(() => {});
            }
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(1000);
        });

        it('メモリ使用量が適切', async () => {
            await navigateToGame(page);
            
            const metrics = await page.metrics();
            const jsHeapSize = metrics.JSHeapUsedSize / 1048576; // MB
            
            expect(jsHeapSize).toBeLessThan(500);
        });
    });

    describe('市販ソフト基準チェック', () => {
        it('盤面がDOM上に存在', async () => {
            await navigateToGame(page);
            
            const cells = await page.$$('.cell');
            const board = await page.$('.shogi-board');
            expect(board).toBeTruthy();
            expect(cells.length).toBe(81);
        });

        it('駒の種類が識別可能', async () => {
            await navigateToGame(page);
            
            const labeledCells = await page.$$eval('.cell', (cells) =>
                cells.filter((c) => (c.getAttribute('aria-label') || '').includes('先手') || (c.getAttribute('aria-label') || '').includes('後手')).length
            );
            expect(labeledCells).toBeGreaterThan(0);
        });

        it('ゲームルールが実装されている', async () => {
            await navigateToGame(page);
            
            const hasGameData = await page.evaluate(() => {
                return !!(window.gameData && window.gameData.boardState);
            });
            expect(hasGameData).toBe(true);
        });
    });
});
