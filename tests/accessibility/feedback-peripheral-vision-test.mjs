/**
 * フィードバックフォーム周辺視野喪失ユーザーテスト
 * - 重要な情報が中央に配置
 * - フォーカス位置が明確
 * - スクロール不要で主要要素が見える
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
        console.log('\n🎯 ========================================');
        console.log('  フィードバックフォーム周辺視野喪失テスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: ページタイトルの中央配置
        // ========================================
        console.log('🎯 フェーズ1: タイトル配置');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const h1 = await page.$('h1');
        const h1Box = await h1.boundingBox();
        const viewportWidth = 1400;
        const h1CenterX = h1Box.x + h1Box.width / 2;
        const distanceFromCenter = Math.abs(h1CenterX - viewportWidth / 2);

        // タイトルが画面中央付近にあるか（±300pxの範囲）
        assert(distanceFromCenter < 300, `h1が中央付近 (中心から${distanceFromCenter.toFixed(0)}px)`);

        // タイトルが上部1/3以内にあるか
        assert(h1Box.y < 300, `h1が上部に配置 (y=${h1Box.y.toFixed(0)}px)`);

        // ========================================
        // フェーズ2: フォームの中央配置
        // ========================================
        console.log('\n🎯 フェーズ2: フォーム配置');

        const form = await page.$('form');
        const formBox = await form.boundingBox();
        const formCenterX = formBox.x + formBox.width / 2;
        const formDistanceFromCenter = Math.abs(formCenterX - viewportWidth / 2);

        assert(formDistanceFromCenter < 350, `フォームが中央付近 (中心から${formDistanceFromCenter.toFixed(0)}px)`);
        
        // フォーム幅が広すぎないか（周辺視野喪失では狭い方が良い）
        assert(formBox.width < 800, `フォーム幅が適切 (${formBox.width.toFixed(0)}px < 800px)`);

        // ========================================
        // フェーズ3: フィールド間の視覚的間隔
        // ========================================
        console.log('\n🎯 フェーズ3: フィールド間隔');

        const typeSelect = await page.$('select[name="type"]');
        const nameInput = await page.$('input[name="name"]');

        const typeBox = await typeSelect.boundingBox();
        const nameBox = await nameInput.boundingBox();

        const fieldSpacing = nameBox.y - (typeBox.y + typeBox.height);
        assert(fieldSpacing >= 16, `フィールド間隔が十分 (${fieldSpacing.toFixed(0)}px)`);

        // ========================================
        // フェーズ4: ボタンの配置
        // ========================================
        console.log('\n🎯 フェーズ4: ボタン配置');

        const submitBtn = await page.$('button[type="submit"]');
        const btnBox = await submitBtn.boundingBox();
        const btnCenterX = btnBox.x + btnBox.width / 2;
        const btnDistanceFromCenter = Math.abs(btnCenterX - viewportWidth / 2);

        assert(btnDistanceFromCenter < 350, `ボタンが中央付近 (中心から${btnDistanceFromCenter.toFixed(0)}px)`);

        // ========================================
        // フェーズ5: フォーカス時の視認性
        // ========================================
        console.log('\n🎯 フェーズ5: フォーカス表示');

        await nameInput.focus();
        await sleep(300);

        const focusedBox = await nameInput.boundingBox();
        const focusStyle = await page.$eval('input[name="name"]:focus', el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineWidth: styles.outlineWidth,
                boxShadow: styles.boxShadow
            };
        });

        const hasClearFocus = 
            focusStyle.outlineWidth !== '0px' ||
            focusStyle.boxShadow !== 'none';

        assert(hasClearFocus, `フォーカスが明確: outline=${focusStyle.outlineWidth}, shadow=${focusStyle.boxShadow}`);

        // ========================================
        // フェーズ6: エラーメッセージの位置
        // ========================================
        console.log('\n🎯 フェーズ6: エラーメッセージ位置');

        await page.click('button[type="submit"]');
        await sleep(500);

        const errorElement = await page.$('[role="alert"], .text-red-600, .text-red-500');
        if (errorElement) {
            const errorBox = await errorElement.boundingBox();
            
            // エラーメッセージが画面上部～中央にあるか
            assert(errorBox.y < 600, `エラーが視認範囲 (y=${errorBox.y.toFixed(0)}px)`);

            // エラーメッセージが中央寄りか
            const errorCenterX = errorBox.x + errorBox.width / 2;
            const errorDistanceFromCenter = Math.abs(errorCenterX - viewportWidth / 2);
            assert(errorDistanceFromCenter < 400, `エラーが中央寄り (中心から${errorDistanceFromCenter.toFixed(0)}px)`);
        }

        // ========================================
        // フェーズ7: 確認画面のレイアウト
        // ========================================
        console.log('\n🎯 フェーズ7: 確認画面レイアウト');

        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });
        await page.select('select[name="type"]', 'general');
        await page.type('textarea[name="message"]', '周辺視野喪失ユーザー向けテスト');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const confirmH1 = await page.$('h1');
        const confirmH1Box = await confirmH1.boundingBox();
        const confirmH1CenterX = confirmH1Box.x + confirmH1Box.width / 2;
        const confirmH1Distance = Math.abs(confirmH1CenterX - viewportWidth / 2);

        assert(confirmH1Distance < 300, `確認画面タイトルが中央 (中心から${confirmH1Distance.toFixed(0)}px)`);

        // ========================================
        // フェーズ8: データ表示の視認性
        // ========================================
        console.log('\n🎯 フェーズ8: データ表示');

        const dataContainer = await page.$('.data-display, .confirmation, main');
        if (dataContainer) {
            const dataBox = await dataContainer.boundingBox();
            assert(dataBox.width < 900, `データ表示幅が適切 (${dataBox.width.toFixed(0)}px < 900px)`);
        }

        // ========================================
        // フェーズ9: 複数ボタンの配置（確認画面）
        // ========================================
        console.log('\n🎯 フェーズ9: 複数ボタン配置');

        const buttons = await page.$$('button, a[class*="btn"]');
        if (buttons.length >= 2) {
            const btn1Box = await buttons[0].boundingBox();
            const btn2Box = await buttons[1].boundingBox();

            // ボタンが縦並びか横並びか判定
            const isVertical = Math.abs(btn1Box.y - btn2Box.y) > Math.abs(btn1Box.x - btn2Box.x);

            if (isVertical) {
                // 縦並びの場合、両方が中央付近にあるか
                const btn1CenterX = btn1Box.x + btn1Box.width / 2;
                const btn2CenterX = btn2Box.x + btn2Box.width / 2;
                const avgCenterX = (btn1CenterX + btn2CenterX) / 2;
                const avgDistance = Math.abs(avgCenterX - viewportWidth / 2);

                assert(avgDistance < 350, `縦並びボタンが中央 (中心から${avgDistance.toFixed(0)}px)`);
            } else {
                // 横並びの場合、両方のボタンが画面中央付近にあるか
                const btn1CenterX = btn1Box.x + btn1Box.width / 2;
                const btn2CenterX = btn2Box.x + btn2Box.width / 2;
                const leftmost = Math.min(btn1Box.x, btn2Box.x);
                const rightmost = Math.max(btn1Box.x + btn1Box.width, btn2Box.x + btn2Box.width);
                const totalWidth = rightmost - leftmost;

                assert(totalWidth < 600, `横並びボタン幅が適切 (${totalWidth.toFixed(0)}px)`);
            }
        }

        // ========================================
        // フェーズ10: 送信・修正ボタンの視認性
        // ========================================
        console.log('\n🎯 フェーズ10: ボタン視認性');

        const sendBtn = await page.$('button[type="submit"]');
        const sendBox = await sendBtn.boundingBox();

        // ボタンが画面の下部1/3程度にあるか（スクロール不要）
        assert(sendBox.y < 700, `送信ボタンが視認範囲 (y=${sendBox.y.toFixed(0)}px)`);

        // ========================================
        // フェーズ11: 完了画面のレイアウト
        // ========================================
        console.log('\n🎯 フェーズ11: 完了画面');

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const thanksH1 = await page.$('h1');
        const thanksH1Box = await thanksH1.boundingBox();
        const thanksH1CenterX = thanksH1Box.x + thanksH1Box.width / 2;
        const thanksH1Distance = Math.abs(thanksH1CenterX - viewportWidth / 2);

        assert(thanksH1Distance < 300, `完了画面タイトルが中央 (中心から${thanksH1Distance.toFixed(0)}px)`);

        // 成功アイコンが中央にあるか
        const successIcon = await page.$('svg, .success-icon');
        if (successIcon) {
            const iconBox = await successIcon.boundingBox();
            const iconCenterX = iconBox.x + iconBox.width / 2;
            const iconDistance = Math.abs(iconCenterX - viewportWidth / 2);

            assert(iconDistance < 250, `成功アイコンが中央 (中心から${iconDistance.toFixed(0)}px)`);
        }

        // ========================================
        // フェーズ12: ナビゲーションリンク
        // ========================================
        console.log('\n🎯 フェーズ12: ナビゲーション');

        const homeLink = await page.$('a[href="/"]');
        if (homeLink) {
            const homeLinkBox = await homeLink.boundingBox();
            const homeLinkCenterX = homeLinkBox.x + homeLinkBox.width / 2;
            const homeLinkDistance = Math.abs(homeLinkCenterX - viewportWidth / 2);

            assert(homeLinkDistance < 350, `ホームリンクが中央寄り (中心から${homeLinkDistance.toFixed(0)}px)`);
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
