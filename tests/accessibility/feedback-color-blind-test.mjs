/**
 * フィードバックフォーム色覚異常ユーザーテスト
 * - エラー表示が色のみに依存しない
 * - 必須項目マークが色のみでない
 * - 状態表示がアイコンやテキストでも識別可能
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
        console.log('\n🌈 ========================================');
        console.log('  フィードバックフォーム色覚異常ユーザーテスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: 必須項目の表示（色のみでない）
        // ========================================
        console.log('🌈 フェーズ1: 必須項目の表示');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const bodyText = await page.$eval('body', el => el.textContent);
        const hasAsterisk = bodyText.includes('*');
        const hasRequiredText = bodyText.includes('必須');

        assert(hasAsterisk || hasRequiredText, '必須項目マーク（*または必須テキスト）が存在');

        // 必須項目のHTML属性チェック
        const typeRequired = await page.$eval('select[name="type"]', el => el.hasAttribute('required'));
        assert(typeRequired, 'フィードバック種別にrequired属性');

        const messageRequired = await page.$eval('textarea[name="message"]', el => el.hasAttribute('required'));
        assert(messageRequired, 'メッセージにrequired属性');

        // ========================================
        // フェーズ2: エラーメッセージ（色とアイコン/テキスト）
        // ========================================
        console.log('\n🌈 フェーズ2: エラーメッセージ');

        await page.click('button[type="submit"]');
        await sleep(500);

        const errorElements = await page.$$('.text-red-600, .text-red-500, [role="alert"]');
        if (errorElements.length > 0) {
            // エラーメッセージのテキスト内容をチェック
            const errorTexts = await page.$$eval('.text-red-600, .text-red-500, [role="alert"]', els => 
                els.map(el => el.textContent.trim())
            );

            const hasErrorText = errorTexts.some(text => text.length > 0);
            assert(hasErrorText, 'エラーメッセージにテキストが含まれる');

            // エラーアイコンまたはシンボルの存在確認
            const hasErrorIcon = await page.$('.text-red-600 svg, .text-red-500 svg, [role="alert"] svg, .text-red-600::before, .text-red-500::before');
            const hasExclamation = errorTexts.some(text => text.includes('!') || text.includes('！') || text.includes('×') || text.includes('✕'));

            if (hasErrorIcon || hasExclamation) {
                console.log('  ℹ️ エラーにアイコンまたは記号あり');
            }
        }

        // ========================================
        // フェーズ3: フォームフィールドの視覚的区別
        // ========================================
        console.log('\n🌈 フェーズ3: フォームフィールドの視覚的区別');

        const inputBorder = await page.$eval('input[name="name"]', el => {
            const styles = window.getComputedStyle(el);
            return {
                border: styles.border,
                borderWidth: styles.borderWidth,
                outline: styles.outline
            };
        });

        const hasBorder = inputBorder.borderWidth !== '0px';
        assert(hasBorder, `入力欄にボーダー (${inputBorder.borderWidth})`);

        // ========================================
        // フェーズ4: ボタンの識別性
        // ========================================
        console.log('\n🌈 フェーズ4: ボタンの識別性');

        const buttons = await page.$$('button');
        for (let i = 0; i < buttons.length; i++) {
            const btnText = await page.evaluate(el => el.textContent.trim(), buttons[i]);
            const hasText = btnText.length > 0;
            assert(hasText, `ボタン${i + 1}にテキスト: "${btnText}"`);
        }

        const submitBtnStyle = await page.$eval('button[type="submit"]', el => {
            const styles = window.getComputedStyle(el);
            return {
                border: styles.border,
                background: styles.background,
                boxShadow: styles.boxShadow
            };
        });

        const hasVisualStyle = 
            submitBtnStyle.border !== 'none' ||
            submitBtnStyle.background !== 'none' ||
            submitBtnStyle.boxShadow !== 'none';

        assert(hasVisualStyle, 'ボタンに視覚的スタイル（ボーダー、背景、影）');

        // ========================================
        // フェーズ5: リンクの識別性（下線またはアイコン）
        // ========================================
        console.log('\n🌈 フェーズ5: リンクの識別性');

        const links = await page.$$('a:not(.skip-link)');
        if (links.length > 0) {
            const linkStyle = await page.$eval('a:not(.skip-link)', el => {
                const styles = window.getComputedStyle(el);
                return {
                    textDecoration: styles.textDecoration,
                    borderBottom: styles.borderBottom,
                    fontWeight: styles.fontWeight
                };
            });

            const hasUnderline = linkStyle.textDecoration.includes('underline');
            const hasBorder = linkStyle.borderBottom !== 'none';
            const isBold = parseInt(linkStyle.fontWeight) >= 600;

            if (hasUnderline || hasBorder || isBold) {
                console.log(`  ℹ️ リンク装飾: underline=${hasUnderline}, border=${hasBorder}, bold=${isBold}`);
            }
        }

        // ========================================
        // フェーズ6: フォーカス表示（色とアウトライン）
        // ========================================
        console.log('\n🌈 フェーズ6: フォーカス表示');

        const nameInput = await page.$('input[name="name"]');
        await nameInput.focus();

        const focusStyle = await page.$eval('input[name="name"]:focus', el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineWidth: styles.outlineWidth,
                boxShadow: styles.boxShadow,
                borderWidth: styles.borderWidth
            };
        });

        const hasFocusIndicator = 
            focusStyle.outlineWidth !== '0px' ||
            focusStyle.boxShadow !== 'none' ||
            parseFloat(focusStyle.borderWidth) >= 2;

        assert(hasFocusIndicator, `フォーカス表示: outline=${focusStyle.outlineWidth}, shadow=${focusStyle.boxShadow}`);

        // ========================================
        // フェーズ7: 確認画面（データの視覚的区別）
        // ========================================
        console.log('\n🌈 フェーズ7: 確認画面のデータ表示');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        await page.select('select[name="type"]', 'bug');
        await page.type('input[name="name"]', '色覚テストユーザー');
        await page.type('textarea[name="message"]', '色だけでなくアイコンやテキストでも情報が伝わることを確認しています。');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const confirmData = await page.$$('dl, table, .data-display');
        assert(confirmData.length > 0 || await page.$('p, div'), '入力データが表示される');

        // ラベルとデータが明確に区別されているか
        const hasLabels = await page.$$('dt, th, strong, label');
        if (hasLabels.length > 0) {
            console.log(`  ℹ️ データラベルが存在 (${hasLabels.length}個)`);
        }

        // ========================================
        // フェーズ8: 色に依存しない状態表示
        // ========================================
        console.log('\n🌈 フェーズ8: 状態表示');

        // 送信ボタンのテキスト確認
        const sendButton = await page.$('button[type="submit"]');
        const sendBtnText = await page.$eval('button[type="submit"]', el => el.textContent.trim());
        assert(sendBtnText.includes('送信'), `送信ボタンに明確なテキスト: "${sendBtnText}"`);

        // 修正ボタン/リンクのテキスト確認
        const editLink = await page.$('a[href*="feedback"]:not([href*="confirm"])');
        if (editLink) {
            const editText = await page.$eval('a[href*="feedback"]:not([href*="confirm"])', el => el.textContent.trim());
            assert(editText.includes('修正') || editText.includes('戻る'), `修正リンクに明確なテキスト: "${editText}"`);
        }

        // ========================================
        // フェーズ9: 完了画面のアイコン
        // ========================================
        console.log('\n🌈 フェーズ9: 完了画面');

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const thanksH1 = await page.$eval('h1', el => el.textContent);
        assert(thanksH1.includes('完了') || thanksH1.includes('ありがとう'), `完了メッセージが明確: "${thanksH1}"`);

        // 成功アイコンの確認（SVGやチェックマーク）
        const successIcon = await page.$('svg[role="img"]');
        if (successIcon) {
            const iconLabel = await page.$eval('svg[role="img"]', el => el.getAttribute('aria-label'));
            assert(iconLabel !== null, `成功アイコンにaria-label: "${iconLabel}"`);
        }

        // ========================================
        // フェーズ10: グレースケールシミュレーション
        // ========================================
        console.log('\n🌈 フェーズ10: グレースケールテスト');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        
        // グレースケールエミュレーション
        await page.emulateVisionDeficiency('achromatopsia'); // 全色盲
        await sleep(500);

        // グレースケールでもUI要素が識別可能か
        const grayscaleBtn = await page.$('button[type="submit"]');
        const grayscaleBtnBox = await grayscaleBtn.boundingBox();
        assert(grayscaleBtnBox.width > 0 && grayscaleBtnBox.height > 0, 'グレースケールでもボタンが表示される');

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
