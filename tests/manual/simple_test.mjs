import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    console.log('1️⃣ ゲームを開始...');
    const response = await page.goto('http://127.0.0.1:8000/game/new?difficulty=easy&color=sente', { 
        waitUntil: 'networkidle2' 
    });
    
    console.log(`  ステータス: ${response.status()}`);
    console.log(`  URL: ${page.url()}`);
    
    // ページのタイトルを取得
    const title = await page.title();
    console.log(`  タイトル: ${title}`);
    
    // セッションIDを確認
    const sessionId = await page.evaluate(() => window.gameSessionId);
    console.log(`  セッションID: ${sessionId}`);
    
    // 手数カウンターを確認
    const moveCountExists = await page.$('#move-count');
    console.log(`  手数カウンター存在: ${moveCountExists !== null}`);
    
    if (moveCountExists) {
        const moveCount = await page.$eval('#move-count', el => el.textContent);
        console.log(`  手数: ${moveCount}`);
    }
    
    await browser.close();
    console.log('\n✅ 簡易テスト完了');
})();
