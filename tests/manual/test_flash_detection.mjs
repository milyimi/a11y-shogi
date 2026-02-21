import puppeteer from 'puppeteer';

console.log('🔍 フラッシュ検出テスト（ページロード時の色変化確認）\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 50
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

try {
    // ダークモードをONに設定
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    
    console.log('📋 テスト: フィードバック画面読み込み時の色変化を監視\n');
    console.log('  localStorage: 1 (ダークモードON)');
    console.log('  監視中...\n');
    
    const colors = [];
    let frameCount = 0;
    
    // ページロード前にコールバックを設定
    await page.evaluateOnNewDocument(() => {
        window.colorHistory = [];
        const observer = new MutationObserver(() => {
            const bg = window.getComputedStyle(document.body).backgroundColor;
            window.colorHistory.push({
                time: performance.now(),
                color: bg,
                hasClass: document.documentElement.classList.contains('high-contrast')
            });
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // DOMContentLoaded時点の色も記録
        document.addEventListener('DOMContentLoaded', () => {
            const bg = window.getComputedStyle(document.body).backgroundColor;
            window.colorHistory.push({
                time: performance.now(),
                color: bg,
                event: 'DOMContentLoaded',
                hasClass: document.documentElement.classList.contains('high-contrast')
            });
        });
    });
    
    // ページロード
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    
    // 初期の色を記録
    await wait(10);
    for (let i = 0; i < 20; i++) {
        const color = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        colors.push({ time: i * 10, color });
        await wait(10);
    }
    
    // 履歴を取得
    const history = await page.evaluate(() => window.colorHistory);
    
    console.log('色変化の履歴:');
    if (history && history.length > 0) {
        history.forEach((entry, i) => {
            const symbol = i === 0 ? '  ├─' : i === history.length - 1 ? '  └─' : '  ├─';
            const event = entry.event ? ` [${entry.event}]` : '';
            console.log(`${symbol} ${entry.time.toFixed(2)}ms: ${entry.color} (high-contrast=${entry.hasClass})${event}`);
        });
    } else {
        console.log('  変化なし（即座に最終状態）');
    }
    
    console.log('\n最初の200msの色:');
    const uniqueColors = [...new Set(colors.map(c => c.color))];
    colors.slice(0, 10).forEach((c, i) => {
        const symbol = i === 0 ? '  ├─' : i === 9 ? '  └─' : '  ├─';
        console.log(`${symbol} ${c.time}ms: ${c.color}`);
    });
    
    console.log(`\n色の種類数: ${uniqueColors.length}`);
    uniqueColors.forEach((color, i) => {
        console.log(`  ${i + 1}. ${color}`);
    });
    
    if (uniqueColors.length ===1) {
        console.log('\n✅ フラッシュなし: 一貫して同じ色');
    } else {
        console.log('\n⚠️  フラッシュあり: ページロード時に色が変化しています');
        console.log(`   ${uniqueColors.join(' → ')}`);
    }
    
    // 最終状態確認
    await wait(500);
    const finalState = await page.evaluate(() => {
        return {
            hasClass: document.documentElement.classList.contains('high-contrast'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            colorScheme: document.documentElement.style.colorScheme
        };
    });
    
    console.log('\n最終状態:');
    console.log(`  html.high-contrast: ${finalState.hasClass ? 'あり ✅' : 'なし ❌'}`);
    console.log(`  colorScheme: ${finalState.colorScheme}`);
    console.log(`  body背景色: ${finalState.bodyBg}`);
    console.log(`  期待値: rgb(26, 26, 26)`);
    console.log(`  判定: ${finalState.bodyBg === 'rgb(26, 26, 26)' ? '✅ 正しくダークモード' : '❌ 異なる色'}`);
    
} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
} finally {
    await browser.close();
}
