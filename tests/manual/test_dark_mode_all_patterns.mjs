import puppeteer from 'puppeteer';

console.log('🔍 ダークモード全パターン検証\n');
console.log('フィードバック画面がゲーム画面のダークモード設定と完全同期することを確認');
console.log('テストパターン: localStorage・OS設定・実際のボタン操作・確認/完了画面\n');

const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const BASE_URL = 'http://127.0.0.1:8000';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const results = [];

function isDark(bg) {
    return bg === 'rgb(26, 26, 26)' || bg.includes('26, 26, 46') || bg.includes('22, 33, 62') || bg.includes('15, 52, 96');
}
function isLight(bg) {
    return bg === 'rgba(0, 0, 0, 0)' || bg === 'rgb(255, 255, 255)' || bg.includes('238') || bg.includes('245');
}

async function checkFeedbackPage(description, expectedDark) {
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'domcontentloaded' });
    await wait(500);

    const state = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const bodyBg = window.getComputedStyle(body).backgroundColor;
        const bodyColor = window.getComputedStyle(body).color;
        
        // カードの色をチェック
        const card = document.querySelector('.card');
        const cardBg = card ? window.getComputedStyle(card).backgroundColor : 'N/A';
        
        // テキスト色チェック
        const title = document.querySelector('.text-gray-900');
        const titleColor = title ? window.getComputedStyle(title).color : 'N/A';
        
        return {
            hasClass: html.classList.contains('high-contrast'),
            bodyBg,
            bodyColor,
            cardBg,
            titleColor,
            localStorage: localStorage.getItem('a11y-shogi-high-contrast')
        };
    });

    const actualDark = isDark(state.bodyBg);
    const pass = expectedDark === actualDark;
    
    console.log(`\n${pass ? '✅' : '❌'} ${description}`);
    console.log(`   期待: ${expectedDark ? 'ダーク' : 'ライト'} | 実際: ${actualDark ? 'ダーク' : 'ライト'}`);
    console.log(`   html.high-contrast: ${state.hasClass}`);
    console.log(`   body背景: ${state.bodyBg}`);
    console.log(`   カード背景: ${state.cardBg}`);
    console.log(`   タイトル色: ${state.titleColor}`);
    console.log(`   localStorage: ${state.localStorage || '(未設定)'}`);
    
    results.push({ description, pass, expectedDark, actualDark, state });
    return state;
}

try {
    // ==========================================
    // パターン1: OS=ライト + ボタン未使用
    // ==========================================
    console.log('━━━ パターン1: OS=ライト + ボタン未使用 ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    await checkFeedbackPage('OS=ライト + ボタン未使用 → ライト', false);

    // ==========================================
    // パターン2: OS=ダーク + ボタン未使用
    // ==========================================
    console.log('\n━━━ パターン2: OS=ダーク + ボタン未使用 ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });
    await checkFeedbackPage('OS=ダーク + ボタン未使用 → ダーク', true);

    // ==========================================
    // パターン3: OS=ライト + ボタンON
    // ==========================================
    console.log('\n━━━ パターン3: OS=ライト + ボタンON ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    await checkFeedbackPage('OS=ライト + ボタンON → ダーク', true);

    // ==========================================
    // パターン4: OS=ダーク + ボタンOFF
    // ==========================================
    console.log('\n━━━ パターン4: OS=ダーク + ボタンOFF ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '0');
    });
    await checkFeedbackPage('OS=ダーク + ボタンOFF → ライト', false);

    // ==========================================
    // パターン5: OS=ダーク + ボタンON
    // ==========================================
    console.log('\n━━━ パターン5: OS=ダーク + ボタンON ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    await checkFeedbackPage('OS=ダーク + ボタンON → ダーク', true);

    // ==========================================
    // パターン6: OS=ライト + ボタンOFF
    // ==========================================
    console.log('\n━━━ パターン6: OS=ライト + ボタンOFF ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '0');
    });
    await checkFeedbackPage('OS=ライト + ボタンOFF → ライト', false);

    // ==========================================
    // パターン7: ゲーム画面で実際にボタンクリック → フィードバック
    // ==========================================
    console.log('\n━━━ パターン7: ゲーム画面で実際にダークモードON → フィードバック ━━━');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    
    // ホームからゲーム開始
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await wait(500);
    const formButton = await page.$('form button[type="submit"]');
    if (formButton) {
        await formButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    await wait(1000);
    
    // ダークモードON
    const toggleBtn = await page.$('#contrast-toggle');
    if (toggleBtn) {
        await toggleBtn.click();
        await wait(500);
        console.log('   ゲーム画面でダークモードONクリック');
    }
    
    await checkFeedbackPage('ゲーム画面でON → フィードバックでダーク', true);

    // ==========================================
    // パターン8: 確認画面・完了画面
    // ==========================================
    console.log('\n━━━ パターン8: 確認画面（ダークモード） ━━━');
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('a11y-shogi-high-contrast', '1');
    });
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
    await wait(300);
    
    // フォーム入力
    const textarea = await page.$('textarea[name="content"]');
    if (textarea) {
        await textarea.type('テスト用フィードバック');
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
            await submitBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            await wait(300);
            
            const confirmState = await page.evaluate(() => ({
                bodyBg: window.getComputedStyle(document.body).backgroundColor,
                hasClass: document.documentElement.classList.contains('high-contrast')
            }));
            
            const confirmDark = isDark(confirmState.bodyBg);
            console.log(`\n${confirmDark ? '✅' : '❌'} 確認画面: ${confirmDark ? 'ダーク' : 'ライト'}`);
            console.log(`   body背景: ${confirmState.bodyBg}`);
            results.push({ description: '確認画面ダーク', pass: confirmDark, expectedDark: true, actualDark: confirmDark });
            
            // 完了画面へ
            const confirmSubmit = await page.$('button[type="submit"]');
            if (confirmSubmit) {
                await confirmSubmit.click();
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await wait(300);
                
                const thanksState = await page.evaluate(() => ({
                    bodyBg: window.getComputedStyle(document.body).backgroundColor,
                    hasClass: document.documentElement.classList.contains('high-contrast')
                }));
                
                const thanksDark = isDark(thanksState.bodyBg);
                console.log(`${thanksDark ? '✅' : '❌'} 完了画面: ${thanksDark ? 'ダーク' : 'ライト'}`);
                console.log(`   body背景: ${thanksState.bodyBg}`);
                results.push({ description: '完了画面ダーク', pass: thanksDark, expectedDark: true, actualDark: thanksDark });
            }
        }
    }

    // ==========================================
    // 総合結果
    // ==========================================
    console.log('\n\n' + '═'.repeat(50));
    console.log('📊 総合結果');
    console.log('═'.repeat(50));
    
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
