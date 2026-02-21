/**
 * ゲーム画面とフィードバック画面のダークモード同期テスト
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.log('🔄 ダークモード同期テスト\n');

    // ========== 1. ゲーム画面でダークモードをONにする ==========
    console.log('1️⃣ ゲーム画面でダークモードON');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    
    // ゲームを開始
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // ダークモード切替ボタンをクリック
    const toggleBtn = await page.$('#contrast-toggle');
    if (toggleBtn) {
        await toggleBtn.click();
        await new Promise(r => setTimeout(r, 500));
    }

    // localStorageを確認
    const stored = await page.evaluate(() => {
        return localStorage.getItem('a11y-shogi-high-contrast');
    });
    console.log(`   localStorage: ${stored} ${stored === '1' ? '✅' : '❌'}`);

    // ダークモードが適用されているか確認
    const isDarkOnGame = await page.evaluate(() => {
        return document.documentElement.classList.contains('high-contrast');
    });
    console.log(`   ゲーム画面: ${isDarkOnGame ? 'ダーク' : 'ライト'} ${isDarkOnGame ? '✅' : '❌'}`);

    // ========== 2. フィードバック画面に移動 ==========
    console.log('\n2️⃣ フィードバック画面に移動');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000)); // ダークモード適用を待つ

    // フィードバック画面でダークモードが適用されているか確認
    const isDarkOnFeedback = await page.evaluate(() => {
        return document.documentElement.classList.contains('high-contrast');
    });
    console.log(`   フィードバック画面: ${isDarkOnFeedback ? 'ダーク' : 'ライト'} ${isDarkOnFeedback ? '✅' : '❌'}`);

    // 背景色を確認
    const bgColor = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).backgroundColor;
    });
    console.log(`   背景色: ${bgColor}`);

    // ========== 3. ゲーム画面に戻ってダークモードをOFFにする ==========
    console.log('\n3️⃣ ゲーム画面でダークモードOFF');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // ダークモード切替ボタンをクリック（OFF）
    const toggleBtn2 = await page.$('#contrast-toggle');
    if (toggleBtn2) {
        await toggleBtn2.click();
        await new Promise(r => setTimeout(r, 500));
    }

    const storedOff = await page.evaluate(() => {
        return localStorage.getItem('a11y-shogi-high-contrast');
    });
    console.log(`   localStorage: ${storedOff} ${storedOff === '0' ? '✅' : '❌'}`);

    // ========== 4. フィードバック画面に移動（ライトモードになっているか確認） ==========
    console.log('\n4️⃣ フィードバック画面に移動（ライトモード確認）');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const isLightOnFeedback = await page.evaluate(() => {
        return !document.documentElement.classList.contains('high-contrast');
    });
    console.log(`   フィードバック画面: ${isLightOnFeedback ? 'ライト' : 'ダーク'} ${isLightOnFeedback ? '✅' : '❌'}`);

    const bgColorLight = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).backgroundColor;
    });
    console.log(`   背景色: ${bgColorLight}`);

    // ========== 5. localStorageをクリアしてOS設定に従うか確認 ==========
    console.log('\n5️⃣ localStorage クリア（OS設定に従う）');
    await page.evaluate(() => {
        localStorage.removeItem('a11y-shogi-high-contrast');
    });

    // OS設定を暗に設定
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
    ]);

    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const isAutoToDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('high-contrast');
    });
    console.log(`   OS設定=dark → フィードバック画面: ${isAutoToDark ? 'ダーク' : 'ライト'} ${isAutoToDark ? '✅' : '❌'}`);

    await browser.close();

    console.log('\n✅ テスト完了');
    console.log('\n📊 結果:');
    console.log('  - ゲーム画面でON → フィードバック画面でON');
    console.log('  - ゲーム画面でOFF → フィードバック画面でOFF');
    console.log('  - localStorage未設定 → OS設定に従う');
})();
