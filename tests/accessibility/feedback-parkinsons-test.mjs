/**
 * フィードバックフォームパーキンソン病ユーザーテスト
 * - ボタン・入力欄のサイズが十分
 * - クリック領域が広い
 * - 誤操作防止（確認画面）
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
        console.log('\n🫨 ========================================');
        console.log('  フィードバックフォームパーキンソン病テスト');
        console.log('========================================\n');

        // ========================================
        // フェーズ1: ボタンサイズ
        // ========================================
        console.log('🫨 フェーズ1: ボタンサイズ');
        await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle0' });

        const submitBtn = await page.$('button[type="submit"]');
        const btnBox = await submitBtn.boundingBox();
        
        assert(btnBox.height >= 44, `ボタン高さが44px以上 (${btnBox.height.toFixed(1)}px) - WCAG推奨`);
        assert(btnBox.width >= 80, `ボタン幅が十分 (${btnBox.width.toFixed(1)}px)`);

        const btnArea = btnBox.width * btnBox.height;
        assert(btnArea >= 3000, `ボタン面積が十分 (${btnArea.toFixed(0)}px²)`);

        // ========================================
        // フェーズ2: 入力欄の高さ
        // ========================================
        console.log('\n🫨 フェーズ2: 入力欄サイズ');

        const nameInput = await page.$('input[name="name"]');
        const nameBox = await nameInput.boundingBox();
        assert(nameBox.height >= 40, `入力欄高さが40px以上 (${nameBox.height.toFixed(1)}px)`);

        const emailInput = await page.$('input[name="email"]');
        const emailBox = await emailInput.boundingBox();
        assert(emailBox.height >= 40, `メール入力欄が40px以上 (${emailBox.height.toFixed(1)}px)`);

        // ========================================
        // フェーズ3: テキストエリアのサイズ
        // ========================================
        console.log('\n🫨 フェーズ3: テキストエリア');

        const messageTextarea = await page.$('textarea[name="message"]');
        const textareaBox = await messageTextarea.boundingBox();
        assert(textareaBox.height >= 100, `テキストエリア高さが十分 (${textareaBox.height.toFixed(1)}px)`);
        assert(textareaBox.width >= 200, `テキストエリア幅が十分 (${textareaBox.width.toFixed(1)}px)`);

        // ========================================
        // フェーズ4: ラベルのクリック領域
        // ========================================
        console.log('\n🫨 フェーズ4: ラベルのクリック領域');

        // ラベルをクリックして入力欄にフォーカスできるか
        const nameLabel = await page.$('label[for="name"]');
        if (nameLabel) {
            await nameLabel.click();
            const focusedElement = await page.evaluate(() => document.activeElement.name);
            assert(focusedElement === 'name', 'ラベルクリックで入力欄にフォーカス');
        }

        // ========================================
        // フェーズ5: 選択肢のクリック領域
        // ========================================
        console.log('\n🫨 フェーズ5: 選択肢');

        const typeSelect = await page.$('select[name="type"]');
        const typeBox = await typeSelect.boundingBox();
        assert(typeBox.height >= 40, `選択肢の高さが40px以上 (${typeBox.height.toFixed(1)}px)`);

        // ========================================
        // フェーズ6: ボタン間の間隔
        // ========================================
        console.log('\n🫨 フェーズ6: ボタン間隔');

        await page.select('select[name="type"]', 'general');
        await page.type('textarea[name="message"]', 'パーキンソン病ユーザー向けテスト');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const buttons = await page.$$('button, a.btn, a[class*="btn"]');
        if (buttons.length >= 2) {
            const btn1Box = await buttons[0].boundingBox();
            const btn2Box = await buttons[1].boundingBox();

            let spacing;
            if (btn1Box && btn2Box) {
                // 水平方向または垂直方向の間隔を計算
                if (Math.abs(btn1Box.y - btn2Box.y) < 10) {
                    // 水平並び
                    spacing = Math.abs(btn2Box.x - (btn1Box.x + btn1Box.width));
                } else {
                    // 垂直並び
                    spacing = Math.abs(btn2Box.y - (btn1Box.y + btn1Box.height));
                }

                assert(spacing >= 8, `ボタン間隔が十分 (${spacing.toFixed(1)}px)`);
            }
        }

        // ========================================
        // フェーズ7: 確認画面の存在（誤操作防止）
        // ========================================
        console.log('\n🫨 フェーズ7: 確認画面（誤操作防止）');

        const currentUrl = page.url();
        assert(currentUrl.includes('/confirm'), '確認画面が存在（誤送信防止）');

        const confirmH1 = await page.$eval('h1', el => el.textContent);
        assert(confirmH1.includes('確認'), '確認画面であることが明示される');

        // ========================================
        // フェーズ8: 修正ボタンのサイズ
        // ========================================
        console.log('\n🫨 フェーズ8: 修正ボタン');

        const editLink = await page.$('a[href*="feedback"]:not([href*="confirm"])');
        if (editLink) {
            const editBox = await editLink.boundingBox();
            assert(editBox.height >= 40, `修正ボタン高さが40px以上 (${editBox.height.toFixed(1)}px)`);
        }

        // ========================================
        // フェーズ9: 送信ボタンのサイズ（確認画面）
        // ========================================
        console.log('\n🫨 フェーズ9: 送信ボタン（確認画面）');

        const confirmSendBtn = await page.$('button[type="submit"]');
        const confirmBtnBox = await confirmSendBtn.boundingBox();
        assert(confirmBtnBox.height >= 44, `送信ボタン高さが44px以上 (${confirmBtnBox.height.toFixed(1)}px)`);

        // ========================================
        // フェーズ10: ホバー領域の余裕
        // ========================================
        console.log('\n🫨 フェーズ10: パディング・余白');

        const btnPadding = await page.$eval('button[type="submit"]', el => {
            const styles = window.getComputedStyle(el);
            return {
                top: parseFloat(styles.paddingTop),
                bottom: parseFloat(styles.paddingBottom),
                left: parseFloat(styles.paddingLeft),
                right: parseFloat(styles.paddingRight)
            };
        });

        const verticalPadding = btnPadding.top + btnPadding.bottom;
        const horizontalPadding = btnPadding.left + btnPadding.right;

        assert(verticalPadding >= 16, `ボタン縦パディングが十分 (${verticalPadding}px)`);
        assert(horizontalPadding >= 24, `ボタン横パディングが十分 (${horizontalPadding}px)`);

        // ========================================
        // フェーズ11: 振戦シミュレーション（マウス移動）
        // ========================================
        console.log('\n🫨 フェーズ11: 振戦シミュレーション');

        // ボタンの近くにマウスを移動してクリック（少しずれても動作するか）
        await page.mouse.move(
            confirmBtnBox.x + confirmBtnBox.width / 2 + 3,
            confirmBtnBox.y + confirmBtnBox.height / 2 + 3
        );
        await sleep(200);
        await page.mouse.click(
            confirmBtnBox.x + confirmBtnBox.width / 2 + 3,
            confirmBtnBox.y + confirmBtnBox.height / 2 + 3
        );
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});

        const thanksUrl = page.url();
        assert(thanksUrl.includes('/thanks'), `クリック成功: ${thanksUrl}`);

        // ========================================
        // フェーズ12: 完了画面のボタンサイズ
        // ========================================
        console.log('\n🫨 フェーズ12: 完了画面のボタン');

        const homeLink = await page.$('a[href="/"]');
        if (homeLink) {
            const homeLinkBox = await homeLink.boundingBox();
            assert(homeLinkBox.height >= 40, `ホームリンク高さが40px以上 (${homeLinkBox.height.toFixed(1)}px)`);
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
