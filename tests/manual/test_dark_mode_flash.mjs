import puppeteer from 'puppeteer';

console.log('🔍 ダークモードフラッシュ検出テスト\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // 動作を見やすくする
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const BASE_URL = 'http://127.0.0.1:8000';

// wait関数
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ページロード時の背景色変化を監視する関数
async function detectFlash(page, url, description) {
    const colors = [];
    
    // ページロード前にCDP（Chrome DevTools Protocol）で色変化を監視
    const client = await page.target().createCDPSession();
    await client.send('Animation.enable');
    
    page.on('framenavigated', async () => {
        // DOM構築直後の色をキャプチャ
        try {
            const bgColor = await page.evaluate(() => {
                return window.getComputedStyle(document.body).backgroundColor;
            });
            colors.push({ time: Date.now(), color: bgColor, stage: 'immediate' });
        } catch (e) {
            // DOMが未構築の場合は無視
        }
    });
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // DOMContentLoaded直後
    const colorAfterDOM = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    colors.push({ time: Date.now(), color: colorAfterDOM, stage: 'domcontentloaded' });
    
    await wait(50);
    
    // 50ms後
    const colorAfter50ms = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    colors.push({ time: Date.now(), color: colorAfter50ms, stage: '50ms' });
    
    await wait(100);
    
    // 150ms後
    const colorAfter150ms = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    colors.push({ time: Date.now(), color: colorAfter150ms, stage: '150ms' });
    
    await wait(200);
    
    // 350ms後（最終）
    const colorFinal = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    colors.push({ time: Date.now(), color: colorFinal, stage: 'final' });
    
    console.log(`\n${description}:`);
    console.log('背景色の変化:');
    const uniqueColors = [...new Set(colors.map(c => c.color))];
    colors.forEach((c, i) => {
        const symbol = i === 0 ? '  ├─' : i === colors.length - 1 ? '  └─' : '  ├─';
        console.log(`${symbol} ${c.stage}: ${c.color}`);
    });
    
    // フラッシュ判定
    const hasFlash = uniqueColors.length > 1;
    if (hasFlash) {
        console.log(`  ⚠️  フラッシュ検出: ${uniqueColors.length}種類の色変化`);
        uniqueColors.forEach((color, i) => {
            console.log(`     ${i + 1}. ${color}`);
        });
    } else {
        console.log(`  ✅ フラッシュなし: 一貫して ${uniqueColors[0]}`);
    }
    
    return { colors, hasFlash, uniqueColors };
}

try {
    // === テスト1: ダークモードボタンを押していない状態（OS設定に従う） ===
    console.log('\n📋 テスト1: ダークモードボタン未使用（OS設定に従う）\n');
    
    // localStorageをクリア
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    
    // OS設定をダークモードに
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
    ]);
    
    console.log('1-1. OS設定=dark でフィードバック画面にアクセス');
    const test1_1 = await detectFlash(page, `${BASE_URL}/feedback`, '  結果');
    
    await wait(500);
    
    // OS設定をライトモードに変更
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'light' }
    ]);
    
    console.log('\n1-2. OS設定=light に変更してフィードバック画面を再読み込み');
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    const test1_2 = await detectFlash(page, `${BASE_URL}/feedback`, '  結果');
    
    // === テスト2: ダークモードボタンを押した状態（明示的にON） ===
    console.log('\n\n📋 テスト2: ダークモードボタンでON（明示的）\n');
    
    // ゲーム画面でダークモードをONに
    await page.goto(`${BASE_URL}/game/new`, { waitUntil: 'networkidle0' });
    await wait(500);
    
    console.log('2-1. ゲーム画面でダークモードボタンをクリック');
    const toggleButton = await page.$('button[aria-label*="コントラスト"]');
    if (toggleButton) {
        await toggleButton.click();
        await wait(300);
        
        const isHighContrast = await page.evaluate(() => {
            return document.documentElement.classList.contains('high-contrast');
        });
        const stored = await page.evaluate(() => localStorage.getItem('a11y-shogi-high-contrast'));
        console.log(`  ゲーム画面: ${isHighContrast ? 'ダーク' : 'ライト'}`);
        console.log(`  localStorage: ${stored}`);
    }
    
    console.log('\n2-2. フィードバック画面に遷移（ダークモード維持確認）');
    const test2_1 = await detectFlash(page, `${BASE_URL}/feedback`, '  結果');
    
    // === テスト3: ダークモードボタンでOFF（明示的） ===
    console.log('\n\n📋 テスト3: ダークモードボタンでOFF（明示的）\n');
    
    await page.goto(`${BASE_URL}/game/new`, { waitUntil: 'networkidle0' });
    await wait(500);
    
    console.log('3-1. ゲーム画面でダークモードボタンをクリック（OFF）');
    const toggleButton2 = await page.$('button[aria-label*="コントラスト"]');
    if (toggleButton2) {
        const currentState = await page.evaluate(() => {
            return document.documentElement.classList.contains('high-contrast');
        });
        
        if (currentState) {
            await toggleButton2.click();
            await wait(300);
        }
        
        const stored = await page.evaluate(() => localStorage.getItem('a11y-shogi-high-contrast'));
        console.log(`  localStorage: ${stored}`);
    }
    
    console.log('\n3-2. フィードバック画面に遷移（ライトモード維持確認）');
    const test3_1 = await detectFlash(page, `${BASE_URL}/feedback`, '  結果');
    
    // === テスト4: 確認画面・完了画面でもチェック ===
    console.log('\n\n📋 テスト4: 確認画面・完了画面のフラッシュ検出\n');
    
    // ダークモードON
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    
    console.log('4-1. 確認画面（ダークモード）');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
    await wait(300);
    
    // フォーム入力
    await page.type('textarea[name="content"]', 'テスト用フィードバック');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const confirmColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`  確認画面の背景色: ${confirmColor}`);
    console.log(`  ${confirmColor === 'rgb(26, 26, 26)' ? '✅ ダークモード' : '⚠️  ライトモード'}`);
    
    // 完了画面へ
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const thanksColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`\n4-2. 完了画面の背景色: ${thanksColor}`);
    console.log(`  ${thanksColor === 'rgb(26, 26, 26)' ? '✅ ダークモード' : '⚠️  ライトモード'}`);
    
    // === 最終結果 ===
    console.log('\n\n📊 総合結果:\n');
    
    const allTests = [
        { name: 'OS設定=dark', result: test1_1 },
        { name: 'OS設定=light', result: test1_2 },
        { name: 'ボタンでON', result: test2_1 },
        { name: 'ボタンでOFF', result: test3_1 }
    ];
    
    allTests.forEach(test => {
        const status = test.result.hasFlash ? '❌' : '✅';
        console.log(`${status} ${test.name}: ${test.result.hasFlash ? 'フラッシュあり' : 'フラッシュなし'}`);
    });
    
    const allPassed = allTests.every(t => !t.result.hasFlash);
    console.log(`\n${allPassed ? '✅ すべてのテストでフラッシュなし' : '⚠️  一部のテストでフラッシュを検出'}`);
    
} catch (error) {
    console.error('❌ エラー:', error.message);
} finally {
    await browser.close();
}
