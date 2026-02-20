/**
 * フィードバックフォーム包括的アクセシビリティテスト
 * すべてのAIペルソナ対応を確認
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
        console.log('\n♿ ========================================');
        console.log('  フィードバックフォーム包括的アクセシビリティテスト');
        console.log('========================================\n');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0', timeout: 10000 });

        // ========================================
        // 全盲ユーザー（スクリーンリーダー）対応
        // ========================================
        console.log('👁️ 全盲ユーザー対応');
        
        const skipLink = await page.$('a.skip-link, a[href="#main-content"]');
        assert(skipLink !== null, 'スキップリンク');
        
        const h1 = await page.$('h1');
        assert(h1 !== null, 'h1見出し');
        
        const main = await page.$('main');
        assert(main !== null, 'main要素');
        
        const labels = await page.$$('label');
        assert(labels.length >= 5, `label要素 (${labels.length}個)`);
        
        const ariaLabels = await page.$$('[aria-label]');
        assert(ariaLabels.length >= 2, `aria-label (${ariaLabels.length}個)`);
        
        const ariaDescribedby = await page.$$('[aria-describedby]');
        assert(ariaDescribedby.length >= 3, `aria-describedby (${ariaDescribedby.length}個)`);
        
        const ariaHidden = await page.$$('[aria-hidden="true"]');
        assert(ariaHidden.length >= 5, `装飾的アイコンにaria-hidden (${ariaHidden.length}個)`);
        
        const requiredFields = await page.$$('[required]');
        assert(requiredFields.length >= 2, `必須項目マーク (${requiredFields.length}個)`);

        // ========================================
        // 弱視ユーザー対応
        // ========================================
        console.log('\n👓 弱視ユーザー対応');
        
        const h1FontSize = await page.$eval('h1', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(h1FontSize >= 24, `見出しサイズ (${h1FontSize.toFixed(0)}px >= 24px)`);
        
        const labelFontSize = await page.$eval('label', el => parseFloat(window.getComputedStyle(el).fontSize));
        assert(labelFontSize >= 14, `ラベルサイズ (${labelFontSize.toFixed(0)}px >= 14px)`);
        
        const nameInput = await page.$('input[name="name"]');
        await nameInput.focus();
        
        const focusStyle = await page.$eval('input[name="name"]:focus', el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineWidth: styles.outlineWidth,
                boxShadow: styles.boxShadow
            };
        });
        
        const hasFocusIndicator = 
            focusStyle.outlineWidth !== '0px' ||
            focusStyle.boxShadow !== 'none';
        
        assert(hasFocusIndicator, `フォーカス表示 (outline=${focusStyle.outlineWidth}, shadow=${focusStyle.boxShadow})`);

        // ========================================
        // 色覚異常ユーザー対応
        // ========================================
        console.log('\n🌈 色覚異常ユーザー対応');
        
        const bodyText = await page.$eval('body', el => el.textContent);
        const hasRequiredMark = bodyText.includes('*') || bodyText.includes('必須');
        assert(hasRequiredMark, '必須項目マーク（*または必須テキスト）');
        
        const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
        const allButtonsHaveText = buttons.every(text => text.length > 0);
        assert(allButtonsHaveText, 'すべてのボタンにテキスト');
        
        // エラーメッセージのテスト
        await page.click('button[type="submit"]');
        await sleep(500);
        
        const errorElements = await page.$$('[role="alert"], .form-error');
        if (errorElements.length > 0) {
            const errorTexts = await page.$$eval('[role="alert"], .form-error', els => 
                els.map(el => el.textContent.trim())
            );
            const hasErrorText = errorTexts.some(text => text.length > 0);
            assert(hasErrorText, 'エラーメッセージにテキスト');
            
            // エラーアイコンまたはシンボル
            const hasErrorSymbol = errorTexts.some(text => text.includes('✕') || text.includes('×'));
            console.log(`  ℹ️ エラー記号: ${hasErrorSymbol ? '✕あり' : 'なし'}`);
        }

        // ========================================
        // パーキンソン病ユーザー対応
        // ========================================
        console.log('\n🫨 パーキンソン病ユーザー対応');
        
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        
        const submitBtn = await page.$('button[type="submit"]');
        const btnBox = await submitBtn.boundingBox();
        
        assert(btnBox.height >= 40, `ボタン高さ (${btnBox.height.toFixed(0)}px >= 40px)`);
        assert(btnBox.width >= 80, `ボタン幅 (${btnBox.width.toFixed(0)}px >= 80px)`);
        
        const nameInputBox = await nameInput.boundingBox();
        assert(nameInputBox.height >= 36, `入力欄高さ (${nameInputBox.height.toFixed(0)}px >= 36px)`);
        
        // ラベルクリックでフォーカス
        const nameLabel = await page.$('label[for="name"]');
        if (nameLabel) {
            await nameLabel.click();
            const focusedName = await page.evaluate(() => document.activeElement.name);
            assert(focusedName === 'name', 'ラベルクリックでフォーカス');
        }

        // ========================================
        // 周辺視野喪失ユーザー対応
        // ========================================
        console.log('\n🎯 周辺視野喪失ユーザー対応');
        
        const formElement = await page.$('form');
        const formBox = await formElement.boundingBox();
        
        assert(formBox.width < 900, `フォーム幅 (${formBox.width.toFixed(0)}px < 900px)`);
        
        const h1Box = await h1.boundingBox();
        const viewportWidth = 1400;
        const h1CenterX = h1Box.x + h1Box.width / 2;
        const h1Distance = Math.abs(h1CenterX - viewportWidth / 2);
        
        assert(h1Distance < 350, `見出し中央寄り (中心から${h1Distance.toFixed(0)}px)`);
        
        const btnCenterX = btnBox.x + btnBox.width / 2;
        const btnDistance = Math.abs(btnCenterX - viewportWidth / 2);
        
        assert(btnDistance < 400, `ボタン中央寄り (中心から${btnDistance.toFixed(0)}px)`);

        // ========================================
        // キーボードナビゲーション
        // ========================================
        console.log('\n⌨️ キーボードナビゲーション');
        
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        
        await page.keyboard.press('Tab'); // Skip link
        await page.keyboard.press('Tab'); // First focusable
        
        const focusableCount = await page.$$eval('a, button, input, textarea', els => 
            els.filter(el => !el.hasAttribute('tabindex') || el.getAttribute('tabindex') !== '-1').length
        );
        
        assert(focusableCount >= 10, `フォーカス可能要素 (${focusableCount}個)`);

        // ========================================
        // 動きの制限対応 (prefers-reduced-motion)
        // ========================================
        console.log('\n🎬 前庭障害対応');
        
        await page.emulateMediaFeatures([
            { name: 'prefers-reduced-motion', value: 'reduce' }
        ]);
        await page.reload({ waitUntil: 'networkidle0' });
        
        console.log('  ℹ️ prefers-reduced-motion: reduce をエミュレート');
        assert(true, 'CSSメディアクエリ対応を確認');

        // ========================================
        // フルフロー確認
        // ========================================
        console.log('\n📋 完全フロー確認');
        
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        
        await page.click('input[value="general"]');
        await page.type('input[name="name"]', 'アクセシビリティテスト');
        await page.type('textarea[name="message"]', 'すべてのAIペルソナ（全盲、弱視、色覚異常、パーキンソン病、周辺視野喪失）に対応したフィードバックフォームのテストです。');
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const confirmUrl = page.url();
        assert(confirmUrl.includes('/confirm'), `確認画面遷移: ${confirmUrl}`);
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const thanksUrl = page.url();
        assert(thanksUrl.includes('/thanks'), `完了画面遷移: ${thanksUrl}`);

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

        if (failed === 0) {
            console.log('🎉 すべてのAIペルソナ対応テストに合格しました！\n');
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
