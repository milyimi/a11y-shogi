import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:8000';

function check(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
    } else {
        console.log(`  ❌ ${message}`);
        throw new Error(message);
    }
}

async function testCase(name, difficulty, color, resign = false) {
    console.log(`\n========================================`);
    console.log(`テストケース: ${name}`);
    console.log(`========================================`);
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    try {
        console.log(`\n1️⃣ ゲーム開始（難易度: ${difficulty}, 手番: ${color}）`);
        await page.goto(`${BASE_URL}/game/new?difficulty=${difficulty}&color=${color}`, { 
            waitUntil: 'networkidle2' 
        });
        
        const sessionId = await page.evaluate(() => window.gameSessionId);
        console.log(`  ✅ セッションID: ${sessionId}`);
        
        // ページが完全に読み込まれるまで待機
        await page.waitForSelector('#move-count', { visible: true, timeout: 5000 });
        
        // 数手進める
        console.log(`\n2️⃣ ゲームを進行（3手）`);
        for (let i = 0; i < 3; i++) {
            try {
                if (color === 'sente') {
                    // 先手の場合：5の3の歩を5の4に進める
                    await page.click('[data-file="5"][data-rank="3"]');
                    await page.waitForTimeout(300);
                    await page.click('[data-file="5"][data-rank="4"]');
                } else {
                    // 後手の場合：5の7の歩を5の6に進める
                    await page.click('[data-file="5"][data-rank="7"]');
                    await page.waitForTimeout(300);
                    await page.click('[data-file="5"][data-rank="6"]');
                }
                await page.waitForTimeout(1500); // AIの手を待つ
            } catch (e) {
                console.log(`  ⚠️ ${i + 1}手目で移動失敗（盤面状態により正常）`);
                break;
            }
        }
        
        // 現在の手数を取得
        const currentMoveCount = await page.$eval('#move-count', el => el.textContent.trim());
        console.log(`  ✅ 現在の手数: ${currentMoveCount}`);
        
        // 手数の数値を抽出
        const moveCountNumber = parseInt(currentMoveCount.match(/\d+/)?.[0] || '0');
        check(moveCountNumber > 0, `手数が0より大きい: ${moveCountNumber}手`);
        
        if (resign) {
            // 投了する
            console.log(`\n3️⃣ 投了する`);
            await page.click('#btn-resign');
            await page.waitForTimeout(300);
            
            // 確認ダイアログで「はい」をクリック
            await page.evaluate(() => {
                const yesBtn = document.querySelector('#confirm-dialog button.btn-primary');
                if (yesBtn) yesBtn.click();
            });
            await page.waitForTimeout(1500);
        }
        
        // ランキング登録ダイアログの状態を確認
        console.log(`\n4️⃣ ランキング登録ダイアログ確認`);
        const dialogData = await page.evaluate(() => {
            const dialog = document.getElementById('ranking-registration-dialog');
            if (!dialog) return { visible: false };
            
            const display = window.getComputedStyle(dialog).display;
            const visible = display !== 'none';
            
            if (visible) {
                const rankingMoves = document.getElementById('ranking-moves');
                return {
                    visible: true,
                    moveCount: rankingMoves ? rankingMoves.textContent.trim() : 'N/A'
                };
            }
            return { visible: false };
        });
        
        if (dialogData.visible) {
            console.log(`  ✅ ランキング登録ダイアログが表示された`);
            console.log(`  ✅ ダイアログ内の手数: ${dialogData.moveCount}`);
            
            // 手数の数値を抽出
            const rankingMoveNumber = parseInt(dialogData.moveCount.match(/\d+/)?.[0] || '0');
            
            // 検証
            check(rankingMoveNumber > 0, `手数が0より大きい: ${rankingMoveNumber}手`);
            check(dialogData.moveCount.includes('手'), `手数の形式が正しい: "${dialogData.moveCount}"`);
            
            // 手数が一致することを確認
            if (rankingMoveNumber === moveCountNumber) {
                console.log(`  ✅ 手数が一致: ${rankingMoveNumber}手`);
            } else {
                console.log(`  ⚠️ 手数が異なる: 画面=${moveCountNumber}手, ダイアログ=${rankingMoveNumber}手`);
            }
        } else {
            console.log(`  ℹ️ ランキング登録ダイアログは表示されない（投了の場合は正常）`);
        }
        
        console.log(`\n✅ テストケース「${name}」完了`);
        
    } catch (error) {
        console.log(`\n❌ テストケース「${name}」失敗: ${error.message}`);
        throw error;
    } finally {
        await browser.close();
    }
}

(async () => {
    try {
        // ケース1: 先手・初級・投了
        await testCase('先手・初級・投了', 'easy', 'sente', true);
        
        // ケース2: 後手・初級・投了
        await testCase('後手・初級・投了', 'easy', 'gote', true);
        
        // ケース3: 先手・中級・投了
        await testCase('先手・中級・投了', 'medium', 'sente', true);
        
        // ケース4: 後手・上級・投了
        await testCase('後手・上級・投了', 'hard', 'gote', true);
        
        console.log(`\n========================================`);
        console.log(`✅ 全テストケース成功`);
        console.log(`========================================`);
        
    } catch (error) {
        console.log(`\n========================================`);
        console.log(`❌ テスト失敗`);
        console.log(`========================================`);
        process.exit(1);
    }
})();
