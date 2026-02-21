import puppeteer from 'puppeteer';

console.log('🔍 ダークモード同期確認（正しいセレクタで）\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

try {
    // === テスト1: ゲーム画面でダークモードボタンを確認 ===
    console.log('📋 テスト1: ゲーム画面のダークモードボタン確認\n');
    
    await page.goto(`${BASE_URL}/game/new`, { waitUntil: 'networkidle0' });
    await wait(500);
    
    const toggleButton = await page.$('#contrast-toggle');
    console.log(`  ボタンの存在: ${toggleButton ? '✅ あり' : '❌ なし'}`);
    
    if (!toggleButton) {
        console.log('  ⚠️  ダークモード切替ボタンが見つかりません');
        console.log('  ゲーム画面が layouts.app を継承しているか確認してください');
        throw new Error('ボタンが見つかりません');
    }
    
    const buttonText = await page.evaluate(() => {
        const btn = document.getElementById('contrast-toggle');
        return btn ? btn.textContent.trim() : null;
    });
    console.log(`  ボタンのテキスト: ${buttonText}`);
    
    // === テスト2: ダークモードをONにしてフィードバック画面に遷移 ===
    console.log('\n📋 テスト2: ダークモードON → フィードバック画面遷移\n');
    
    console.log('  2-1. ダークモードボタンをクリック');
    await toggleButton.click();
    await wait(500);
    
    const gameState = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            buttonText: document.getElementById('contrast-toggle').textContent.trim(),
            localStorage: localStorage.getItem('a11y-shogi-high-contrast'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor
        };
    });
    
    console.log(`    html.high-contrast: ${gameState.hasClass ? '✅ あり' : '❌ なし'}`);
    console.log(`    ボタン: ${gameState.buttonText}`);
    console.log(`    localStorage: ${gameState.localStorage}`);
    console.log(`    body背景色: ${gameState.bodyBg}`);
    
    console.log('\n  2-2. フィードバック画面に遷移');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const feedbackState = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor
        };
    });
    
    console.log(`    html.high-contrast: ${feedbackState.hasClass ? '✅ あり' : '❌ なし'}`);
    console.log(`    colorScheme: ${feedbackState.colorScheme}`);
    console.log(`    localStorage: ${feedbackState.localStorage}`);
    console.log(`    body背景色: ${feedbackState.bodyBg}`);
    console.log(`    判定: ${feedbackState.bodyBg === 'rgb(26, 26, 26)' ? '✅ ダークモード同期成功' : '❌ 同期失敗'}`);
    
    // === テスト3: ゲーム画面に戻ってOFF → フィードバック画面遷移 ===
    console.log('\n📋 テスト3: ダークモードOFF → フィードバック画面遷移\n');
    
    await page.goto(`${BASE_URL}/game/new`, { waitUntil: 'networkidle0' });
    await wait(500);
    
    console.log('  3-1. ダークモードボタンをクリック（OFF）');
    const toggleButton2 = await page.$('#contrast-toggle');
    await toggleButton2.click();
    await wait(500);
    
    const gameState2 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            buttonText: document.getElementById('contrast-toggle').textContent.trim(),
            localStorage: localStorage.getItem('a11y-shogi-high-contrast')
        };
    });
    
    console.log(`    html.high-contrast: ${gameState2.hasClass ? '⚠️  あり' : '✅ なし'}`);
    console.log(`    ボタン: ${gameState2.buttonText}`);
    console.log(`    localStorage: ${gameState2.localStorage}`);
    
    console.log('\n  3-2. フィードバック画面に遷移');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const feedbackState2 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor
        };
    });
    
    console.log(`    html.high-contrast: ${feedbackState2.hasClass ? '⚠️  あり' : '✅ なし'}`);
    console.log(`    colorScheme: ${feedbackState2.colorScheme}`);
    console.log(`    localStorage: ${feedbackState2.localStorage}`);
    console.log(`    body背景色: ${feedbackState2.bodyBg}`);
    console.log(`    判定: ${feedbackState2.bodyBg === 'rgba(0, 0, 0, 0)' || feedbackState2.bodyBg === 'rgb(255, 255, 255)' ? '✅ ライトモード同期成功' : '❌ 同期失敗'}`);
    
    // === テスト4: localStorageクリア（OS設定に従う） ===
    console.log('\n📋 テスト4: localStorage クリア（OS設定に従う）\n');
    
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
    ]);
    
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    
    console.log('  4-1. OS設定=dark でフィードバック画面にアクセス');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const feedbackState3 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            osPrefers: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        };
    });
    
    console.log(`    OS設定: ${feedbackState3.osPrefers}`);
    console.log(`    html.high-contrast: ${feedbackState3.hasClass ? '✅ あり' : '❌ なし'}`);
    console.log(`    colorScheme: ${feedbackState3.colorScheme}`);
    console.log(`    localStorage: ${feedbackState3.localStorage || '(未設定)'}`);
    console.log(`    body背景色: ${feedbackState3.bodyBg}`);
    console.log(`    判定: ${feedbackState3.bodyBg === 'rgb(26, 26, 26)' ? '✅ OS設定に従ってダークモード' : '❌ OS設定未反映'}`);
    
    // === 総合結果 ===
    console.log('\n📊 総合結果:\n');
    
    const tests = [
        { name: 'ゲーム画面でON → フィードバックでダーク', pass: feedbackState.bodyBg === 'rgb(26, 26, 26)' && feedbackState.localStorage === '1' },
        { name: 'ゲーム画面でOFF → フィードバックでライト', pass: (feedbackState2.bodyBg === 'rgba(0, 0, 0, 0)' || feedbackState2.bodyBg === 'rgb(255, 255, 255)') && feedbackState2.localStorage === '0' },
        { name: 'OS設定=dark（localStorage未設定）', pass: feedbackState3.bodyBg === 'rgb(26, 26, 26)' && !feedbackState3.localStorage }
    ];
    
    tests.forEach(test => {
        console.log(`${test.pass ? '✅' : '❌'} ${test.name}`);
    });
    
    const allPassed = tests.every(t => t.pass);
    console.log(`\n${allPassed ? '✅ すべてのテストが成功' : '⚠️  一部のテストが失敗'}`);
    
} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
} finally {
    await browser.close();
}
