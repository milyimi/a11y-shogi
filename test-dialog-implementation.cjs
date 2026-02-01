const http = require('http');

function testRankingDialog() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/game/95',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let html = '';
            
            res.on('data', (chunk) => {
                html += chunk.toString();
            });
            
            res.on('end', () => {
                // HTMLから必要な要素を検査
                const checks = {
                    hasDialog: html.includes('id="ranking-registration-dialog"'),
                    hasNicknameInput: html.includes('id="ranking-nickname-input"'),
                    hasRegisterButton: html.includes('id="btn-register-ranking"'),
                    hasSkipButton: html.includes('id="btn-skip-ranking"'),
                    hasShowFunction: html.includes('function showRankingRegistrationDialog()'),
                    hasGameData: html.includes('window.gameData'),
                    dialogHasFlexStyle: html.includes("style.display = 'flex'"),
                    dialogHasNoneStyle: html.includes("style.display = 'none'")
                };
                
                // ダイアログのHTML構造を抽出
                const dialogRegex = /id="ranking-registration-dialog"[^>]*>/;
                const dialogMatch = html.match(dialogRegex);
                
                const resultText = `
=== ランキング登録ダイアログ実装確認 ===

【必須要素の確認】
✓ Dialog element: ${checks.hasDialog ? '✅ 実装済み' : '❌ 未実装'}
✓ Nickname input: ${checks.hasNicknameInput ? '✅ 実装済み' : '❌ 未実装'}
✓ Register button: ${checks.hasRegisterButton ? '✅ 実装済み' : '❌ 未実装'}
✓ Skip button: ${checks.hasSkipButton ? '✅ 実装済み' : '❌ 未実装'}

【JavaScript機能の確認】
✓ showRankingRegistrationDialog(): ${checks.hasShowFunction ? '✅ 実装済み' : '❌ 未実装'}
✓ gameData object: ${checks.hasGameData ? '✅ 実装済み' : '❌ 未実装'}

【表示制御の確認】
✓ Flex display style: ${checks.dialogHasFlexStyle ? '✅ 実装済み' : '❌ 未実装'}
✓ None display style: ${checks.dialogHasNoneStyle ? '✅ 実装済み' : '❌ 未実装'}

【実装完全性】
${Object.values(checks).every(v => v) ? '✅ ランキング登録ダイアログが完全に実装されています!' : '⚠️ 一部の要素が未実装です'}

【Dialog HTML Structure】
${dialogMatch ? dialogMatch[0] : 'Dialog not found'}
`;
                
                resolve(resultText);
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

testRankingDialog()
    .then(result => {
        console.log(result);
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
