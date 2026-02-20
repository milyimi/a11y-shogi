/**
 * フィードバックフォーム基本機能テスト
 * - フォーム表示
 * - 入力→確認→送信フロー
 * - バリデーション
 * - セッションデータ保持
 * - エラー処理
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';
let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        const msg = detail ? `${testName} — ${detail}` : testName;
        console.log(`  ❌ ${msg}`);
        issues.push(msg);
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('\n📝 ========================================');
        console.log('  フィードバックフォーム基本機能テスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: フォーム表示
        // ========================================
        console.log('📝 フェーズ1: フォーム表示');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const h1 = await page.$eval('h1', el => el.textContent);
        assert(h1.includes('フィードバック'), `ページタイトル: "${h1}"`);

        const form = await page.$('form');
        assert(form !== null, 'フォームが存在');

        const typeSelect = await page.$('select[name="type"]');
        assert(typeSelect !== null, 'フィードバック種別選択');

        const nameInput = await page.$('input[name="name"]');
        assert(nameInput !== null, '名前入力欄');

        const emailInput = await page.$('input[name="email"]');
        assert(emailInput !== null, 'メールアドレス入力欄');

        const disabilityTextarea = await page.$('textarea[name="disability"]');
        assert(disabilityTextarea !== null, '障害区分入力欄');

        const messageTextarea = await page.$('textarea[name="message"]');
        assert(messageTextarea !== null, 'メッセージ入力欄');

        const submitBtn = await page.$('button[type="submit"]');
        assert(submitBtn !== null, '確認ボタン');

        // ========================================
        // フェーズ2: バリデーション（必須項目未入力）
        // ========================================
        console.log('\n📝 フェーズ2: バリデーション（必須項目未入力）');
        
        await page.click('button[type="submit"]');
        await sleep(500);

        const currentUrl = page.url();
        assert(currentUrl.includes('/feedback'), '送信失敗時は同じページに留まる');

        const errorMessage = await page.$('.text-red-600, .border-red-500, [role="alert"]');
        assert(errorMessage !== null, 'エラーメッセージが表示される');

        // ========================================
        // フェーズ3: 正常入力→確認画面
        // ========================================
        console.log('\n📝 フェーズ3: 正常入力→確認画面');

        await page.select('select[name="type"]', 'general');
        await page.type('input[name="name"]', '山田太郎');
        await page.type('input[name="email"]', 'test@example.com');
        await page.type('textarea[name="disability"]', '全盲、スクリーンリーダー使用');
        await page.type('textarea[name="message"]', 'フィードバックフォームが非常に使いやすいです。スクリーンリーダーでの読み上げが適切です。');

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const confirmUrl = page.url();
        assert(confirmUrl.includes('/feedback/confirm'), `確認画面に遷移: ${confirmUrl}`);

        const confirmH1 = await page.$eval('h1', el => el.textContent);
        assert(confirmH1.includes('確認'), `確認画面タイトル: "${confirmH1}"`);

        // ========================================
        // フェーズ4: 入力内容の表示確認
        // ========================================
        console.log('\n📝 フェーズ4: 入力内容の表示確認');

        const bodyText = await page.$eval('body', el => el.textContent);
        assert(bodyText.includes('山田太郎'), '名前が表示される');
        assert(bodyText.includes('test@example.com'), 'メールアドレスが表示される');
        assert(bodyText.includes('全盲'), '障害区分が表示される');
        assert(bodyText.includes('フィードバックフォームが非常に使いやすい'), 'メッセージが表示される');

        const sendBtn = await page.$('button[type="submit"]');
        assert(sendBtn !== null, '送信ボタンが存在');

        const editLink = await page.$('a[href*="feedback"]');
        assert(editLink !== null, '修正リンクが存在');

        // ========================================
        // フェーズ5: セッションデータ保持（修正ボタン）
        // ========================================
        console.log('\n📝 フェーズ5: セッションデータ保持');

        await page.click('a[href*="feedback"]:not([href*="confirm"])');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const backUrl = page.url();
        assert(backUrl.includes('/feedback') && !backUrl.includes('confirm'), `入力画面に戻る: ${backUrl}`);

        const nameValue = await page.$eval('input[name="name"]', el => el.value);
        assert(nameValue === '山田太郎', `名前が復元される: "${nameValue}"`);

        const emailValue = await page.$eval('input[name="email"]', el => el.value);
        assert(emailValue === 'test@example.com', `メールが復元される: "${emailValue}"`);

        const messageValue = await page.$eval('textarea[name="message"]', el => el.value);
        assert(messageValue.includes('フィードバック'), `メッセージが復元される`);

        // ========================================
        // フェーズ6: 送信完了フロー
        // ========================================
        console.log('\n📝 フェーズ6: 送信完了フロー');

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // 確認画面を経由して送信
        const finalSendBtn = await page.$('button[type="submit"]');
        if (finalSendBtn) {
            await finalSendBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
        }

        const thanksUrl = page.url();
        assert(thanksUrl.includes('/feedback/thanks'), `完了画面に遷移: ${thanksUrl}`);

        const thanksH1 = await page.$eval('h1', el => el.textContent);
        assert(thanksH1.includes('送信完了') || thanksH1.includes('ありがとう'), `完了画面タイトル: "${thanksH1}"`);

        const homeLink = await page.$('a[href="/"]');
        assert(homeLink !== null, 'ホームへ戻るリンクが存在');

        // ========================================
        // フェーズ7: ホームへのナビゲーション
        // ========================================
        console.log('\n📝 フェーズ7: ナビゲーション');

        const navFeedbackLink = await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        const feedbackNav = await page.$('nav a[href*="feedback"]');
        assert(feedbackNav !== null, 'ナビゲーションにフィードバックリンク');

        // ========================================
        // フェーズ8: 文字数カウンター
        // ========================================
        console.log('\n📝 フェーズ8: 文字数カウンター');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        
        const charCounter = await page.$('[aria-live="polite"]');
        assert(charCounter !== null, '文字数カウンターが存在（aria-live）');

        await page.type('textarea[name="message"]', 'テスト');
        await sleep(300);

        const counterText = await page.$eval('[aria-live="polite"]', el => el.textContent);
        assert(counterText.includes('4') || counterText.includes('3'), `文字数が表示される: "${counterText}"`);

        // ========================================
        // まとめ
        // ========================================
        console.log('\n========================================');
        console.log(`✅ 合格: ${passed}`);
        console.log(`❌ 失敗: ${failed}`);
        console.log('========================================\n');

        if (issues.length > 0) {
            console.log('🔴 失敗項目:\n');
            issues.forEach(i => console.log(`   - ${i}`));
            console.log('');
        }

        await browser.close();
        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ テスト実行エラー:', error.message);
        await browser.close();
        process.exit(1);
    }
})();
