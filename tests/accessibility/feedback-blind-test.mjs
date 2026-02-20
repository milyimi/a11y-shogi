/**
 * フィードバックフォーム全盲ユーザーテスト
 * スクリーンリーダー利用者視点でのテスト
 * - ARIA属性の適切性
 * - フォーカス順序
 * - セマンティックHTML
 * - キーボードナビゲーション
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
        console.log('\n👁️ ========================================');
        console.log('  フィードバックフォーム全盲ユーザーテスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: スキップリンク
        // ========================================
        console.log('👁️ フェーズ1: スキップリンク');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const skipLink = await page.$('a.skip-link, a[href="#main-content"]');
        assert(skipLink !== null, 'スキップリンクが存在');

        if (skipLink) {
            const skipText = await page.$eval('a.skip-link, a[href="#main-content"]', el => el.textContent);
            assert(skipText.includes('メイン') || skipText.includes('コンテンツ'), `スキップリンク文言: "${skipText}"`);
        }

        // ========================================
        // フェーズ2: セマンティックHTML
        // ========================================
        console.log('\n👁️ フェーズ2: セマンティックHTML');

        const h1 = await page.$('h1');
        assert(h1 !== null, 'h1見出しが存在');

        const main = await page.$('main');
        assert(main !== null, 'main要素が存在');

        const form = await page.$('form');
        assert(form !== null, 'form要素が存在');

        const labels = await page.$$('label');
        assert(labels.length >= 5, `labelが十分に存在 (${labels.length}個)`);

        // ========================================
        // フェーズ3: フォームフィールドのARIA属性
        // ========================================
        console.log('\n👁️ フェーズ3: フォームフィールドのARIA属性');

        const typeSelect = await page.$('select[name="type"]');
        const typeLabel = await page.$('label[for="type"]');
        assert(typeLabel !== null, 'フィードバック種別にlabel');

        const typeAriaLabel = await page.$eval('select[name="type"]', el => el.getAttribute('aria-label') || el.id);
        assert(typeAriaLabel, 'フィードバック種別にaria-labelまたはid');

        const nameLabel = await page.$('label[for="name"]');
        assert(nameLabel !== null, '名前にlabel');

        const emailLabel = await page.$('label[for="email"]');
        assert(emailLabel !== null, 'メールアドレスにlabel');

        const disabilityLabel = await page.$('label[for="disability"]');
        assert(disabilityLabel !== null, '障害区分にlabel');

        const messageLabel = await page.$('label[for="message"]');
        assert(messageLabel !== null, 'メッセージにlabel');

        // ========================================
        // フェーズ4: 必須項目のマーク
        // ========================================
        console.log('\n👁️ フェーズ4: 必須項目のマーク');

        const typeRequired = await page.$eval('select[name="type"]', el => el.hasAttribute('required'));
        assert(typeRequired, 'フィードバック種別がrequired');

        const messageRequired = await page.$eval('textarea[name="message"]', el => el.hasAttribute('required'));
        assert(messageRequired, 'メッセージがrequired');

        const bodyText = await page.$eval('body', el => el.textContent);
        const hasRequiredMark = bodyText.includes('*') || bodyText.includes('必須');
        assert(hasRequiredMark, '必須項目の表示（*または必須）');

        // ========================================
        // フェーズ5: aria-describedby（補足説明）
        // ========================================
        console.log('\n👁️ フェーズ5: aria-describedby');

        const messageDescribedby = await page.$eval('textarea[name="message"]', el => el.getAttribute('aria-describedby'));
        if (messageDescribedby) {
            const descElement = await page.$(`#${messageDescribedby}`);
            assert(descElement !== null, `aria-describedby参照先が存在: #${messageDescribedby}`);
        }

        // ========================================
        // フェーズ6: キーボードナビゲーション（Tab順序）
        // ========================================
        console.log('\n👁️ フェーズ6: キーボードナビゲーション');

        await page.keyboard.press('Tab'); // Skip link
        await page.keyboard.press('Tab'); // First nav link or type select
        const focusedElement1 = await page.evaluate(() => document.activeElement.tagName);
        assert(focusedElement1, 'Tab移動可能');

        // フォーカス可能な要素をカウント
        const focusableCount = await page.$$eval('a, button, input, select, textarea', els => 
            els.filter(el => !el.hasAttribute('tabindex') || el.getAttribute('tabindex') !== '-1').length
        );
        assert(focusableCount >= 8, `フォーカス可能要素が十分 (${focusableCount}個)`);

        // ========================================
        // フェーズ7: エラーメッセージのaria-live
        // ========================================
        console.log('\n👁️ フェーズ7: エラーメッセージ');

        await page.click('button[type="submit"]');
        await sleep(500);

        const errorAlert = await page.$('[role="alert"]');
        const ariaLive = await page.$('[aria-live]');
        assert(errorAlert !== null || ariaLive !== null, 'エラーにrole="alert"またはaria-live');

        // ========================================
        // フェーズ8: 文字数カウンターのaria-live
        // ========================================
        console.log('\n👁️ フェーズ8: 文字数カウンター');

        const charCounter = await page.$('[aria-live="polite"]');
        assert(charCounter !== null, '文字数カウンターにaria-live="polite"');

        // ========================================
        // フェーズ9: 確認画面のアクセシビリティ
        // ========================================
        console.log('\n👁️ フェーズ9: 確認画面');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        await page.select('select[name="type"]', 'general');
        await page.type('textarea[name="message"]', 'スクリーンリーダーでのテストメッセージです。');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const confirmH1 = await page.$('h1');
        assert(confirmH1 !== null, '確認画面にh1見出し');

        const confirmMain = await page.$('main');
        assert(confirmMain !== null, '確認画面にmain要素');

        const sendButton = await page.$('button[type="submit"]');
        assert(sendButton !== null, '送信ボタンが存在');

        const sendButtonText = await page.$eval('button[type="submit"]', el => el.textContent);
        assert(sendButtonText.includes('送信'), `送信ボタン文言: "${sendButtonText}"`);

        const editLink = await page.$('a[href*="feedback"]');
        assert(editLink !== null, '修正リンクが存在');

        const editLinkText = await page.$eval('a[href*="feedback"]:not([href*="confirm"])', el => el.textContent);
        assert(editLinkText.includes('修正') || editLinkText.includes('戻る'), `修正リンク文言: "${editLinkText}"`);

        // ========================================
        // フェーズ10: 完了画面
        // ========================================
        console.log('\n👁️ フェーズ10: 完了画面');

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const thanksH1 = await page.$('h1');
        assert(thanksH1 !== null, '完了画面にh1見出し');

        const homeLink = await page.$('a[href="/"]');
        assert(homeLink !== null, 'ホームリンクが存在');

        const homeLinkText = await page.$eval('a[href="/"]', el => el.textContent);
        assert(homeLinkText.includes('ホーム'), `ホームリンク文言: "${homeLinkText}"`);

        // ========================================
        // フェーズ11: 装飾的アイコンのaria-hidden
        // ========================================
        console.log('\n👁️ フェーズ11: 装飾的アイコン');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const decorativeSvgs = await page.$$('svg[aria-hidden="true"]');
        const totalSvgs = await page.$$('svg');
        
        if (totalSvgs.length > 0) {
            assert(decorativeSvgs.length > 0, `装飾的SVGにaria-hidden (${decorativeSvgs.length}/${totalSvgs.length}個)`);
        }

        // ========================================
        // フェーズ12: ボタンの明確な文言
        // ========================================
        console.log('\n👁️ フェーズ12: ボタン文言');

        const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
        
        for (const btnText of buttons) {
            const hasText = btnText.length > 0 && !btnText.match(/^[\s\n]*$/);
            assert(hasText, `ボタンに文言: "${btnText}"`);
        }

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
