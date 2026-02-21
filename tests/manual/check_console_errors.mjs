import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
const consoleMessages = [];
const errors = [];

page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
});

page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`[PAGE ERROR] ${error.message}`);
});

page.on('response', async response => {
    if (response.status() >= 400) {
        console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
});

try {
    console.log('📄 ゲーム画面読み込み中...\n');
    await page.goto('http://127.0.0.1:8000/game/new', { waitUntil: 'networkidle0', timeout: 15000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📊 要約:\n');
    console.log(`  コンソールメッセージ: ${consoleMessages.length}件`);
    console.log(`  ページエラー: ${errors.length}件`);
    
    const html = await page.content();
    console.log(`  HTML長さ: ${html.length} 文字`);
    console.log(`  HTML先頭50文字: ${html.substring(0, 50)}`);
    
    if (errors.length > 0) {
        console.log('\n❌ エラー詳細:');
        errors.forEach((err, i) => {
            console.log(`  ${i + 1}. ${err}`);
        });
    }
    
} catch (error) {
    console.error('\n❌ ページロードエラー:', error.message);
} finally {
    await browser.close();
}
