import puppeteer from 'puppeteer';

console.log('🔍 ダークモード反映テスト（localStorage直接設定）\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

try {
    // === テスト1: localStorageでダークモードON ===
    console.log('📋 テスト1: localStorage で明示的にダークモードON\n');
    
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const result1 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast')
        };
    });
    
    console.log('結果:');
    console.log(`  html.high-contrast: ${result1.hasClass ? '✅ あり' : '❌ なし'}`);
    console.log(`  colorScheme: ${result1.colorScheme || '(未設定)'}`);
    console.log(`  body背景色: ${result1.bodyBg}`);
    console.log(`  localStorage: ${result1.localStorage}`);
    console.log(`  判定: ${result1.bodyBg === 'rgb(26, 26, 26)' ? '✅ ダークモード正常' : '❌ ダークモード未反映'}`);
    
    // === テスト2: localStorageでライトモードOFF ===
    console.log('\n📋 テスト2: localStorage で明示的にライトモードOFF\n');
    
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '0');
    });
    
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const result2 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast')
        };
    });
    
    console.log('結果:');
    console.log(`  html.high-contrast: ${result2.hasClass ? '⚠️  あり' : '✅ なし'}`);
    console.log(`  colorScheme: ${result2.colorScheme || '(未設定)'}`);
    console.log(`  body背景色: ${result2.bodyBg}`);
    console.log(`  localStorage: ${result2.localStorage}`);
    console.log(`  判定: ${result2.bodyBg === 'rgba(0, 0, 0, 0)' || result2.bodyBg === 'rgb(255, 255, 255)' ? '✅ ライトモード正常' : '❌ ライトモード未反映'}`);
    
    // === テスト3: localStorage未設定（OS設定に従う） ===
    console.log('\n📋 テスト3: localStorage 未設定（OS設定=darkに従う）\n');
    
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
    ]);
    
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    
    const result3 = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            colorScheme: document.documentElement.style.colorScheme,
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast'),
            osPrefers: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        };
    });
    
    console.log('結果:');
    console.log(`  OS設定: ${result3.osPrefers}`);
    console.log(`  html.high-contrast: ${result3.hasClass ? '✅ あり' : '❌ なし'}`);
    console.log(`  colorScheme: ${result3.colorScheme || '(未設定)'}`);
    console.log(`  body背景色: ${result3.bodyBg}`);
    console.log(`  localStorage: ${result3.localStorage || '(未設定)'}`);
    console.log(`  判定: ${result3.bodyBg === 'rgb(26, 26, 26)' ? '✅ OS設定に従ってダークモード' : '❌ OS設定未反映'}`);
    
    // === テスト4: 確認画面・完了画面 ===
    console.log('\n📋 テスト4: 確認画面・完了画面の反映確認\n');
    
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    
    // 確認画面（直接アクセスは不可なので、ダミーデータで確認）
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(300);
    
    console.log('  フォーム画面の背景色チェック...');
    const formBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`    背景色: ${formBg} ${formBg === 'rgb(26, 26, 26)' ? '✅' : '❌'}`);
    
    // === 総合結果 ===
    console.log('\n📊 総合結果:\n');
    
    const tests = [
        { name: 'localStorage=1 (ON)', pass: result1.bodyBg === 'rgb(26, 26, 26)' && result1.hasClass },
        { name: 'localStorage=0 (OFF)', pass: (result2.bodyBg === 'rgba(0, 0, 0, 0)' || result2.bodyBg === 'rgb(255, 255, 255)') && !result2.hasClass },
        { name: 'OS設定=dark (未設定)', pass: result3.bodyBg === 'rgb(26, 26, 26)' && result3.hasClass }
    ];
    
    tests.forEach(test => {
        console.log(`${test.pass ? '✅' : '❌'} ${test.name}`);
    });
    
    const allPassed = tests.every(t => t.pass);
    
    if (!allPassed) {
        console.log('\n⚠️  問題検出:');
        tests.filter(t => !t.pass).forEach(test => {
            console.log(`   - ${test.name} が失敗`);
        });
        
        console.log('\n🔍 デバッグ情報:');
        console.log('   即時実行スクリプトが正しく動作していない可能性があります。');
        console.log('   以下を確認してください:');
        console.log('   1. <head>内のスクリプトが正しく実行されているか');
        console.log('   2. document.documentElement.classList に high-contrast が追加されているか');
        console.log('   3. CSS の html.high-contrast セレクタが正しく定義されているか');
    } else {
        console.log('\n✅ すべてのテストが正常');
    }
    
} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
} finally {
    await browser.close();
}
