import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // ダークモード設定
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
    ]);

    console.log('🌙 ダークモード確認テスト\n');

    // 1️⃣ ホーム画面
    console.log('📱 1. ホーム画面をチェック...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'tests/manual/screenshots/home-dark.png', fullPage: true });
    console.log('✅ home-dark.png を保存' );

    // 背景色を確認
    const homeBody = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            html: document.documentElement.getAttribute('class'),
        };
    });
    console.log('   Body スタイル:', homeBody);

    // 2️⃣ フィードバック画面（ローカルストレージでゲーム終了状態を設定）
    console.log('\n📱 2. フィードバック画面をチェック...');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'tests/manual/screenshots/feedback-dark.png', fullPage: true });
    console.log('✅ feedback-dark.png を保存');

    const feedbackBody = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            html: document.documentElement.getAttribute('class'),
        };
    });
    console.log('   Body スタイル:', feedbackBody);

    // 3️⃣ 各要素の背景色・文字色をリストアップ
    console.log('\n🔍 各要素の詳細チェック:');
    const elements = await page.evaluate(() => {
        const items = [];
        const selectors = [
            'body',
            '.container',
            '.card',
            '.btn-dark',
            '.btn-primary',
            '.form-control',
            'textarea',
            'h1, h2',
            '.text-muted',
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach((el, idx) => {
                if (idx === 0) {  // 最初の1つだけ
                    const style = window.getComputedStyle(el);
                    items.push({
                        selector: selector,
                        text: el.textContent?.slice(0, 30),
                        bg: style.backgroundColor,
                        color: style.color,
                        borderColor: style.borderColor,
                    });
                }
            });
        });
        return items;
    });

    elements.forEach(el => {
        console.log(`  ${el.selector}:`);
        console.log(`    bg: ${el.bg}`);
        console.log(`    color: ${el.color}`);
        if (el.borderColor && el.borderColor !== 'rgb(0, 0, 0)') {
            console.log(`    border: ${el.borderColor}`);
        }
    });

    await browser.close();
    console.log('\n✅ チェック完了');
})();
