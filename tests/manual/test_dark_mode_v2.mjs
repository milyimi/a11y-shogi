import puppeteer from 'puppeteer';

console.log('🔍 ダークモード全パターン検証（修正版）\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const results = [];

async function checkPage(url, description, expectedDark) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await wait(800);

    const state = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const cs = window.getComputedStyle(body);
        
        return {
            hasClass: html.classList.contains('high-contrast'),
            bodyBg: cs.backgroundColor,
            bodyBgImage: cs.backgroundImage,
            bodyColor: cs.color,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast')
        };
    });

    // ダーク判定: high-contrast クラスがある AND テキスト色が明るい
    const textRGB = state.bodyColor.match(/\d+/g).map(Number);
    const textBright = (textRGB[0] + textRGB[1] + textRGB[2]) / 3;
    const actualDark = state.hasClass && textBright > 150;
    const pass = expectedDark === actualDark;
    
    console.log(`${pass ? '✅' : '❌'} ${description}`);
    console.log(`   期待: ${expectedDark ? 'ダーク' : 'ライト'} | 実際: ${actualDark ? 'ダーク' : 'ライト'}`);
    console.log(`   high-contrast: ${state.hasClass}, bodyColor: ${state.bodyColor}`);
    console.log(`   bodyBg: ${state.bodyBg}`);
    console.log(`   bodyBgImage: ${state.bodyBgImage.substring(0, 80)}`);
    console.log(`   localStorage: ${state.localStorage || '(未設定)'}`);
    
    results.push({ description, pass });
    return state;
}

try {
    const pages = ['/feedback'];
    
    for (const pagePath of pages) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📄 テストページ: ${pagePath}`);
        console.log(`${'='.repeat(50)}`);
        
        // パターン1: OS=ライト + ボタン未使用 → ライト
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
        await page.evaluateOnNewDocument(() => { localStorage.removeItem('a11y-shogi-high-contrast'); });
        await checkPage(`${BASE_URL}${pagePath}`, 'P1: OS=ライト + ボタン未使用 → ライト', false);

        // パターン2: OS=ダーク + ボタン未使用 → ダーク
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
        await page.evaluateOnNewDocument(() => { localStorage.removeItem('a11y-shogi-high-contrast'); });
        await checkPage(`${BASE_URL}${pagePath}`, 'P2: OS=ダーク + ボタン未使用 → ダーク', true);

        // パターン3: OS=ライト + ボタンON → ダーク
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
        await page.evaluateOnNewDocument(() => { localStorage.setItem('a11y-shogi-high-contrast', '1'); });
        await checkPage(`${BASE_URL}${pagePath}`, 'P3: OS=ライト + ボタンON → ダーク', true);

        // パターン4: OS=ダーク + ボタンOFF → ライト
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
        await page.evaluateOnNewDocument(() => { localStorage.setItem('a11y-shogi-high-contrast', '0'); });
        await checkPage(`${BASE_URL}${pagePath}`, 'P4: OS=ダーク + ボタンOFF → ライト', false);
    }

    // パターン5: ゲーム画面で実際にボタンクリック → フィードバック
    console.log(`\n${'='.repeat(50)}`);
    console.log('📄 ゲーム画面からの遷移テスト');
    console.log(`${'='.repeat(50)}`);
    
    // まずlocalStorageをクリア
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(() => { localStorage.removeItem('a11y-shogi-high-contrast'); });
    
    // ホームからゲーム開始
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await wait(500);
    const formButton = await page.$('form button[type="submit"]');
    if (formButton) {
        await formButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    await wait(1000);
    
    const gameUrl = page.url();
    console.log(`ゲームURL: ${gameUrl}`);
    
    // ダークモードON
    const toggleBtn = await page.$('#contrast-toggle');
    if (toggleBtn) {
        const beforeState = await page.evaluate(() => ({
            hasClass: document.documentElement.classList.contains('high-contrast'),
            text: document.getElementById('contrast-toggle').textContent.trim(),
            ls: localStorage.getItem('a11y-shogi-high-contrast')
        }));
        console.log(`\nクリック前: high-contrast=${beforeState.hasClass}, text="${beforeState.text}", ls=${beforeState.ls}`);
        
        await toggleBtn.click();
        await wait(500);
        
        const afterState = await page.evaluate(() => ({
            hasClass: document.documentElement.classList.contains('high-contrast'),
            text: document.getElementById('contrast-toggle').textContent.trim(),
            ls: localStorage.getItem('a11y-shogi-high-contrast')
        }));
        console.log(`クリック後: high-contrast=${afterState.hasClass}, text="${afterState.text}", ls=${afterState.ls}`);
        
        if (afterState.ls !== '1') {
            console.log('⚠️  もう一度クリック（OFFだったのでONに変更）');
            await toggleBtn.click();
            await wait(500);
            
            const afterState2 = await page.evaluate(() => ({
                hasClass: document.documentElement.classList.contains('high-contrast'),
                text: document.getElementById('contrast-toggle').textContent.trim(),
                ls: localStorage.getItem('a11y-shogi-high-contrast')
            }));
            console.log(`再クリック後: high-contrast=${afterState2.hasClass}, text="${afterState2.text}", ls=${afterState2.ls}`);
        }
    }
    
    // フィードバック画面に遷移（evaluateOnNewDocumentは使わない - 実際のlocalStorageを使う）
    await checkPage(`${BASE_URL}/feedback`, 'P5: ゲーム画面でON → フィードバックでダーク', true);

    // 総合結果
    console.log(`\n\n${'═'.repeat(50)}`);
    console.log('📊 総合結果');
    console.log(`${'═'.repeat(50)}`);
    
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    
    results.forEach(r => {
        console.log(`${r.pass ? '✅' : '❌'} ${r.description}`);
    });
    
    console.log(`\n${passed}/${total} テスト合格`);
    console.log(passed === total ? '\n✅ すべて成功！' : '\n⚠️  一部失敗あり');

} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
} finally {
    await browser.close();
}
