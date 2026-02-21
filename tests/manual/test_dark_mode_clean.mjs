import puppeteer from 'puppeteer';

console.log('🔍 実際の操作フローでダークモード同期テスト\n');
console.log('（evaluateOnNewDocumentを使わず、実際のlocalStorageのみテスト）\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

// 新しいコンテキストで汚染なしのテスト
const context = await browser.createBrowserContext();
const page = await context.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

try {
    // === テスト1: ゲーム画面でダークモードON → フィードバック ===
    console.log('━━━ テスト1: ゲームでON → フィードバックでダーク ━━━\n');
    
    // ホーム画面からゲーム開始
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await wait(500);
    
    const formButton = await page.$('form button[type="submit"]');
    await formButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await wait(1000);
    
    const gameUrl = page.url();
    console.log(`ゲームURL: ${gameUrl}`);
    
    // localStorageの初期状態確認
    const initialLs = await page.evaluate(() => localStorage.getItem('a11y-shogi-high-contrast'));
    console.log(`初期 localStorage: ${initialLs || '(未設定)'}`);
    
    // ダークモードON
    const toggleBtn = await page.$('#contrast-toggle');
    await toggleBtn.click();
    await wait(300);
    
    const afterToggle = await page.evaluate(() => ({
        ls: localStorage.getItem('a11y-shogi-high-contrast'),
        hasClass: document.documentElement.classList.contains('high-contrast'),
        text: document.getElementById('contrast-toggle').textContent.trim()
    }));
    console.log(`クリック後: ls=${afterToggle.ls}, class=${afterToggle.hasClass}, text="${afterToggle.text}"`);
    
    // フィードバック画面に遷移
    console.log('\nフィードバック画面に遷移...');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const fb1 = await page.evaluate(() => {
        const cs = window.getComputedStyle(document.body);
        return {
            ls: localStorage.getItem('a11y-shogi-high-contrast'),
            hasClass: document.documentElement.classList.contains('high-contrast'),
            bodyColor: cs.color,
            bodyBgImage: cs.backgroundImage.substring(0, 60),
            cardBg: document.querySelector('.card') ? window.getComputedStyle(document.querySelector('.card')).backgroundColor : 'N/A'
        };
    });
    
    const fb1Dark = fb1.hasClass && fb1.bodyColor.includes('224');
    console.log(`結果: ${fb1Dark ? '✅ ダーク' : '❌ ライト'}`);
    console.log(`  localStorage: ${fb1.ls}`);
    console.log(`  high-contrast: ${fb1.hasClass}`);
    console.log(`  bodyColor: ${fb1.bodyColor}`);
    console.log(`  bodyBgImage: ${fb1.bodyBgImage}...`);
    console.log(`  cardBg: ${fb1.cardBg}`);
    
    // === テスト2: ゲーム画面に戻ってダークモードOFF → フィードバック ===
    console.log('\n━━━ テスト2: ゲームでOFF → フィードバックでライト ━━━\n');
    
    await page.goto(gameUrl, { waitUntil: 'networkidle0' });
    await wait(500);
    
    const toggleBtn2 = await page.$('#contrast-toggle');
    const currentState = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
    console.log(`現在: ${currentState ? 'ダーク' : 'ライト'}`);
    
    if (currentState) {
        await toggleBtn2.click();
        await wait(300);
    }
    
    const afterOff = await page.evaluate(() => ({
        ls: localStorage.getItem('a11y-shogi-high-contrast'),
        hasClass: document.documentElement.classList.contains('high-contrast'),
        text: document.getElementById('contrast-toggle').textContent.trim()
    }));
    console.log(`OFF後: ls=${afterOff.ls}, class=${afterOff.hasClass}, text="${afterOff.text}"`);
    
    // フィードバック画面に遷移
    console.log('\nフィードバック画面に遷移...');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const fb2 = await page.evaluate(() => {
        const cs = window.getComputedStyle(document.body);
        return {
            ls: localStorage.getItem('a11y-shogi-high-contrast'),
            hasClass: document.documentElement.classList.contains('high-contrast'),
            bodyColor: cs.color,
            bodyBgImage: cs.backgroundImage.substring(0, 60),
            cardBg: document.querySelector('.card') ? window.getComputedStyle(document.querySelector('.card')).backgroundColor : 'N/A'
        };
    });
    
    const fb2Light = !fb2.hasClass && fb2.bodyColor.includes('0, 0, 0');
    console.log(`結果: ${fb2Light ? '✅ ライト' : '❌ ダーク'}`);
    console.log(`  localStorage: ${fb2.ls}`);
    console.log(`  high-contrast: ${fb2.hasClass}`);
    console.log(`  bodyColor: ${fb2.bodyColor}`);
    console.log(`  bodyBgImage: ${fb2.bodyBgImage}...`);
    console.log(`  cardBg: ${fb2.cardBg}`);
    
    // === テスト3: ボタン未使用 + OS=ダーク → フィードバック ===
    console.log('\n━━━ テスト3: ボタン未使用 + OS=ダーク → ダーク ━━━\n');
    
    // localStorageクリア
    await page.evaluate(() => localStorage.removeItem('a11y-shogi-high-contrast'));
    
    // OS設定をダークに
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const fb3 = await page.evaluate(() => {
        const cs = window.getComputedStyle(document.body);
        return {
            ls: localStorage.getItem('a11y-shogi-high-contrast'),
            hasClass: document.documentElement.classList.contains('high-contrast'),
            bodyColor: cs.color,
            bodyBgImage: cs.backgroundImage.substring(0, 60)
        };
    });
    
    const fb3Dark = fb3.hasClass && fb3.bodyColor.includes('224');
    console.log(`結果: ${fb3Dark ? '✅ ダーク' : '❌ ライト'}`);
    console.log(`  localStorage: ${fb3.ls || '(未設定)'}`);
    console.log(`  high-contrast: ${fb3.hasClass}`);
    console.log(`  bodyColor: ${fb3.bodyColor}`);
    
    // === 総合結果 ===
    console.log('\n\n' + '═'.repeat(50));
    console.log('📊 総合結果');
    console.log('═'.repeat(50));
    console.log(`${fb1Dark ? '✅' : '❌'} ゲームでON → フィードバックでダーク`);
    console.log(`${fb2Light ? '✅' : '❌'} ゲームでOFF → フィードバックでライト`);
    console.log(`${fb3Dark ? '✅' : '❌'} ボタン未使用 + OS=ダーク → ダーク`);
    
    const allPassed = fb1Dark && fb2Light && fb3Dark;
    console.log(`\n${allPassed ? '✅ すべて成功！' : '⚠️  一部失敗あり'}`);

} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
} finally {
    await context.close();
    await browser.close();
}
