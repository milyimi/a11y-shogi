import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

try {
    await page.goto('http://127.0.0.1:8000/game/new', { waitUntil: 'networkidle0' });
    await wait(1000);
    
    console.log('🔍 ゲーム画面のHTML構造確認\n');
    
    // ヘッダーの存在確認
    const hasHeader = await page.evaluate(() => {
        return !!document.querySelector('header');
    });
    console.log(`ヘッダー: ${hasHeader ? '✅ あり' : '❌ なし'}`);
    
    // id="contrast-toggle"の確認
    const hasContrastToggle = await page.evaluate(() => {
        return !!document.getElementById('contrast-toggle');
    });
    console.log(`#contrast-toggle: ${hasContrastToggle ? '✅ あり' : '❌ なし'}`);
    
    // aria-label="ダークモード切替"の確認
    const hasDarkModeButton = await page.evaluate(() => {
        return !!document.querySelector('[aria-label="ダークモード切替"]');
    });
    console.log(`aria-label="ダークモード切替": ${hasDarkModeButton ? '✅ あり' : '❌ なし'}`);
    
    // すべてのボタンを取得
    const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => ({
            id: btn.id || '(no id)',
            class: btn.className || '(no class)',
            ariaLabel: btn.getAttribute('aria-label') || '(no aria-label)',
            text: btn.textContent.trim().substring(0, 50)
        }));
    });
    
    console.log(`\nすべてのボタン (合計${allButtons.length}個):`);
    allButtons.slice(0, 10).forEach((btn, i) => {
        console.log(`  ${i + 1}. id="${btn.id}", aria-label="${btn.ariaLabel}", text="${btn.text}"`);
    });
    
    if (allButtons.length > 10) {
        console.log(`  ... (残り${allButtons.length - 10}個)`);
    }
    
    // layouts.appの継承確認
    const layoutsAppElements = await page.evaluate(() => {
        return {
            hasNavigation: !!document.getElementById('navigation'),
            hasMainLandmark: !!document.querySelector('main'),
            hasSrAnnouncements: !!document.getElementById('sr-announcements')
        };
    });
    
    console.log('\nlayouts.app の要素確認:');
    console.log(`  #navigation: ${layoutsAppElements.hasNavigation ? '✅ あり' : '❌ なし'}`);
    console.log(`  <main>: ${layoutsAppElements.hasMainLandmark ? '✅ あり' : '❌ なし'}`);
    console.log(`  #sr-announcements: ${layoutsAppElements.hasSrAnnouncements ? '✅ あり' : '❌ なし'}`);
    
    console.log('\n結論:');
    if (!hasContrastToggle) {
        console.log('  ⚠️  ゲーム画面には layouts.app のヘッダーが表示されていません');
        console.log('  game/show.blade.php が @extends(\'layouts.app\') を使っていない可能性があります');
    } else {
        console.log('  ✅ layouts.app が正しく継承されています');
    }
    
} catch (error) {
    console.error('❌ エラー:', error.message);
} finally {
    await browser.close();
}
