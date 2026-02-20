/**
 * フィードバックフォーム迅速テスト
 * - 各画面の基本的な表示とナビゲーション
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
        console.log('\n⚡ フィードバックフォーム迅速テスト\n');

        // フォーム表示
        console.log('📝 フォーム表示');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0', timeout: 10000 });
        
        const h1 = await page.$eval('h1', el => el.textContent);
        assert(h1.includes('意見') || h1.includes('感想'), `ページタイトル表示: "${h1}"`);
        
        const form = await page.$('form');
        assert(form !== null, 'フォームが存在');
        
        const radioButtons = await page.$$('input[type="radio"][name="type"]');
        assert(radioButtons.length >= 3, `フィードバック種別選択 (${radioButtons.length}個)`);
        
        const nameInput = await page.$('input[name="name"]');
        assert(nameInput !== null, '名前入力欄');
        
        const emailInput = await page.$('input[name="email"]');
        assert(emailInput !== null, 'メールアドレス入力欄');
        
        const messageTextarea = await page.$('textarea[name="message"]');
        assert(messageTextarea !== null, 'メッセージ入力欄');
        
        const submitBtn = await page.$('button[type="submit"]');
        assert(submitBtn !== null, '送信ボタン');

        // アクセシビリティ基礎
        console.log('\n♿ アクセシビリティ基礎');
        
        const skipLink = await page.$('a.skip-link, a[href="#main-content"]');
        assert(skipLink !== null, 'スキップリンク');
        
        const labels = await page.$$('label');
        assert(labels.length >= 3, `ラベル (${labels.length}個)`);
        
        const ariaDescribedBy = await page.$$('[aria-describedby]');
        assert(ariaDescribedBy.length >= 1, `aria-describedby (${ariaDescribedBy.length}個)`);

        // 入力→確認フロー
        console.log('\n📤 入力→確認フロー');
        
        await page.click('input[value="general"]');
        await page.type('input[name="name"]', 'テストユーザー');
        await page.type('input[name="email"]', 'test@example.com');
        await page.type('textarea[name="message"]', 'これはPuppeteer自動テストです。フィードバックフォームが正常に動作しています。');
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const confirmUrl = page.url();
        assert(confirmUrl.includes('/confirm'), `確認画面に遷移: ${confirmUrl}`);
        
        const confirmH1 = await page.$eval('h1', el => el.textContent);
        assert(confirmH1.includes('確認'), `確認画面タイトル: "${confirmH1}"`);
        
        const bodyText = await page.$eval('body', el => el.textContent);
        assert(bodyText.includes('テストユーザー'), '入力データ表示（名前）');
        assert(bodyText.includes('test@example.com'), '入力データ表示（メール）');
        
        const confirmSendBtn = await page.$('button[type="submit"]');
        assert(confirmSendBtn !== null, '送信ボタン（確認画面）');
        
        const editLink = await page.$('a[href*="feedback"]');
        assert(editLink !== null, '修正リンク');

        // 送信完了
        console.log('\n✅ 送信完了');
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const thanksUrl = page.url();
        assert(thanksUrl.includes('/thanks'), `完了画面に遷移: ${thanksUrl}`);
        
        const thanksH1 = await page.$eval('h1', el => el.textContent);
        assert(thanksH1.includes('完了') || thanksH1.includes('ありがとう'), `完了画面タイトル: "${thanksH1}"`);
        
        const homeLink = await page.$('a[href*="127.0.0.1"], a[href="/"]');
        assert(homeLink !== null, 'ホームリンク');

        // まとめ
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
        console.error(error.stack);
        await browser.close();
        process.exit(1);
    }
})();
