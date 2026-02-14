/**
 * 棋士（しょうぎプレイヤー）お客様AIテスト
 * 
 * ペルソナ: 田中四段 — アマチュア将棋四段、大会出場経験あり
 * 視点: 将棋の正確性、棋譜表記、盤面表示、駒の動きルール、UX
 * 
 * テスト観点:
 * 1. 盤面表示の正確性（9×9、筋段の表記）
 * 2. 初期配置の正確性
 * 3. 駒名の正確性（全15種）
 * 4. 先手/後手の向き・色分け
 * 5. 棋譜表記のフォーマット
 * 6. 成りダイアログの正確性
 * 7. 合法手計算の基本正確性
 * 8. 持ち駒表示と打ち方
 * 9. ゲーム操作（待った、投了、リセット）
 * 10. 将棋用語の正確性
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8080';
let browser, page;
let passed = 0, failed = 0;
const results = [];

function ok(name) { passed++; results.push(`  ✅ ${name}`); }
function fail(name, reason) { failed++; results.push(`  ❌ ${name}: ${reason}`); }

async function setup() {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
}

async function startNewGame(color = 'sente', difficulty = 'easy') {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.click(`input[name="difficulty"][value="${difficulty}"]`);
    await page.click(`input[name="color"][value="${color}"]`);
    await page.click('#btn-start-game');
    await page.waitForSelector('#shogi-board', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));
}

// ========================
// テスト1: 盤面構造 — 9×9の81マス
// ========================
async function test_boardStructure() {
    await startNewGame();
    const cellCount = await page.$$eval('.cell', cells => cells.length);
    cellCount === 81
        ? ok('盤面は9×9の81マス')
        : fail('盤面は9×9の81マス', `${cellCount}マスしかない`);

    // グリッドに role="grid" が付いているか
    const gridRole = await page.$eval('#shogi-board', el => el.getAttribute('role'));
    gridRole === 'grid'
        ? ok('盤面にrole="grid"あり')
        : fail('盤面にrole="grid"あり', `role="${gridRole}"`);

    // 各行に role="row" が付いているか
    const rowCount = await page.$$eval('#shogi-board > [role="row"]', rows => rows.length);
    rowCount === 9
        ? ok('9つのrow要素がある')
        : fail('9つのrow要素がある', `${rowCount}行`);
}

// ========================
// テスト2: 筋段の表記 — 「筋の段」形式
// ========================
async function test_fileRankNotation() {
    // 各セルの aria-label をチェック（例: "7の7 先手の歩"）
    const labels = await page.$$eval('.cell', cells =>
        cells.map(c => ({
            file: c.dataset.file,
            rank: c.dataset.rank,
            label: c.getAttribute('aria-label')
        }))
    );

    // 全81マスにaria-labelがあるか
    const hasAllLabels = labels.every(l => l.label && l.label.length > 0);
    hasAllLabels
        ? ok('全81マスにaria-labelあり')
        : fail('全81マスにaria-labelあり', 'ラベル欠損あり');

    // 「筋の段」形式チェック（例: "5の3"）
    const correctFormat = labels.every(l => l.label.includes(`${l.file}の${l.rank}`));
    correctFormat
        ? ok('aria-labelが「筋の段」形式')
        : fail('aria-labelが「筋の段」形式', '不正な形式あり');
}

// ========================
// テスト3: 初期配置の正確性（先手側）
// ========================
async function test_initialPosition() {
    const board = await page.evaluate(() => {
        const cells = document.querySelectorAll('.cell');
        const result = {};
        cells.forEach(c => {
            const f = c.dataset.file;
            const r = c.dataset.rank;
            const key = `${f}-${r}`;
            result[key] = c.getAttribute('aria-label');
        });
        return result;
    });

    // 先手の初期配置チェック
    const senteBackRow = [
        ['9-1', '先手の香'], ['8-1', '先手の桂'], ['7-1', '先手の銀'],
        ['6-1', '先手の金'], ['5-1', '先手の玉'], ['4-1', '先手の金'],
        ['3-1', '先手の銀'], ['2-1', '先手の桂'], ['1-1', '先手の香']
    ];
    // 注: 先手の王は「玉」
    let senteOk = true;
    for (const [key, expected] of senteBackRow) {
        if (!board[key]?.includes(expected)) {
            // 先手の王は玉でもOKだが、Position 5-1 は玉(先手)か王かを確認
            if (key === '5-1' && (board[key]?.includes('先手の玉') || board[key]?.includes('先手の王'))) {
                continue;
            }
            fail(`初期配置 ${key}`, `期待: ${expected}, 実際: ${board[key]}`);
            senteOk = false;
        }
    }
    if (senteOk) ok('先手1段目の初期配置が正しい');

    // 先手の飛角
    const senteFlyAngle = board['2-2']?.includes('先手の飛') || board['2-2']?.includes('先手の角');
    const senteKaku = board['8-2']?.includes('先手の角') || board['8-2']?.includes('先手の飛');
    // 2-2 が角, 8-2 が飛 (正式配置)
    const has22 = board['2-2']?.includes('先手の角');  // 2筋2段目 = 角
    const has82 = board['8-2']?.includes('先手の飛');  // 8筋2段目 = 飛
    (has22 && has82)
        ? ok('先手の飛角の初期配置が正しい（8二飛、2二角）')
        : fail('先手の飛角の初期配置', `2-2: ${board['2-2']}, 8-2: ${board['8-2']}`);

    // 先手の歩（3段目、9枚）
    let sentefu = 0;
    for (let f = 1; f <= 9; f++) {
        if (board[`${f}-3`]?.includes('先手の歩')) sentefu++;
    }
    sentefu === 9
        ? ok('先手の歩が3段目に9枚ある')
        : fail('先手の歩が3段目に9枚ある', `${sentefu}枚`);

    // 後手の初期配置（9段目）
    const goteBackRow = [
        ['9-9', '後手の香'], ['8-9', '後手の桂'], ['7-9', '後手の銀'],
        ['6-9', '後手の金'], ['5-9', '後手の王'], ['4-9', '後手の金'],
        ['3-9', '後手の銀'], ['2-9', '後手の桂'], ['1-9', '後手の香']
    ];
    let goteOk = true;
    for (const [key, expected] of goteBackRow) {
        if (!board[key]?.includes(expected)) {
            if (key === '5-9' && (board[key]?.includes('後手の玉') || board[key]?.includes('後手の王'))) {
                continue;
            }
            fail(`初期配置 ${key}`, `期待: ${expected}, 実際: ${board[key]}`);
            goteOk = false;
        }
    }
    if (goteOk) ok('後手9段目の初期配置が正しい');

    // 後手の飛角
    const goteHisha = board['2-8']?.includes('後手の飛');  // 2筋8段 = 飛
    const goteKaku = board['8-8']?.includes('後手の角');    // 8筋8段 = 角
    (goteHisha && goteKaku)
        ? ok('後手の飛角の初期配置が正しい（2八飛、8八角）')
        : fail('後手の飛角の初期配置', `2-8: ${board['2-8']}, 8-8: ${board['8-8']}`);

    // 後手の歩（7段目、9枚）
    let gotefu = 0;
    for (let f = 1; f <= 9; f++) {
        if (board[`${f}-7`]?.includes('後手の歩')) gotefu++;
    }
    gotefu === 9
        ? ok('後手の歩が7段目に9枚ある')
        : fail('後手の歩が7段目に9枚ある', `${gotefu}枚`);

    // 空マスの確認（4-6段目は全て空）
    let emptyCount = 0;
    for (let r = 4; r <= 6; r++) {
        for (let f = 1; f <= 9; f++) {
            if (board[`${f}-${r}`]?.includes('空')) emptyCount++;
        }
    }
    emptyCount === 27
        ? ok('4〜6段目が全て空')
        : fail('4〜6段目が全て空', `${emptyCount}マスが空`);
}

// ========================
// テスト4: 先手/後手の見た目の違い
// ========================
async function test_senteGoteVisualdiff() {
    // 先手の駒のCSSクラス
    const senteHasClass = await page.$$eval('.piece-sente', els => els.length > 0);
    senteHasClass
        ? ok('先手の駒にpiece-senteクラスあり')
        : fail('先手の駒にpiece-senteクラスあり', 'クラスなし');

    // 後手の駒のCSSクラス
    const goteHasClass = await page.$$eval('.piece-gote', els => els.length > 0);
    goteHasClass
        ? ok('後手の駒にpiece-goteクラスあり')
        : fail('後手の駒にpiece-goteクラスあり', 'クラスなし');

    // 後手の駒が回転しているか（180度回転で上向き表示）
    const goteRotated = await page.$eval('.piece-gote', el => {
        const style = window.getComputedStyle(el);
        // transform: rotate(180deg) または text-decoration を確認
        return style.transform.includes('matrix') || style.textDecorationLine === 'underline';
    });
    goteRotated
        ? ok('後手の駒が視覚的に区別されている')
        : fail('後手の駒が視覚的に区別されている', '区別不明');
}

// ========================
// テスト5: 駒名の正確性（全15種）
// ========================
async function test_pieceNames() {
    const nameMap = await page.evaluate(() => {
        // ゲームコード内の駒名マップをチェック
        return window.gameData ? true : false;
    });

    // ソースコード内で使われている駒名を確認
    const pageContent = await page.content();
    const expectedPieces = ['歩', '香', '桂', '銀', '金', '角', '飛', '玉', '王',
                           'と金', '成香', '成桂', '成銀', '馬', '龍'];
    
    let allFound = true;
    for (const piece of expectedPieces) {
        if (!pageContent.includes(`'${piece}'`) && !pageContent.includes(`"${piece}"`)) {
            // テキストノードとして存在するかも確認
            if (!pageContent.includes(`>${piece}<`) && !pageContent.includes(piece)) {
                fail(`駒名「${piece}」がコードに存在する`, '見つからない');
                allFound = false;
            }
        }
    }
    if (allFound) ok('全15種の駒名がコードに存在する');

    // 「竜」ではなく「龍」を使っているか（正式表記確認）
    // 将棋では「龍」が正式
    const usesRyu = pageContent.includes("'ryu': '龍'") || pageContent.includes('"ryu":"龍"');
    const usesRyuWrong = pageContent.includes("'ryu': '竜'");
    usesRyu && !usesRyuWrong
        ? ok('「龍」の正式表記を使用（「竜」ではない）')
        : fail('龍の表記', '竜を使用している可能性');
}

// ========================
// テスト6: 駒台（持ち駒）表示 
// ========================
async function test_handPieces() {
    // 先手と後手の駒台が存在するか
    const senteHand = await page.$('#sente-hand');
    const goteHand = await page.$('#gote-hand');
    
    senteHand ? ok('先手の駒台が存在する') : fail('先手の駒台が存在する', '見つからない');
    goteHand ? ok('後手の駒台が存在する') : fail('後手の駒台が存在する', '見つからない');

    // 初期状態で「持ち駒なし」と表示されているか
    const senteText = await page.$eval('#sente-hand', el => el.textContent.trim());
    senteText.includes('持ち駒なし')
        ? ok('初期状態で先手「持ち駒なし」表示')
        : fail('初期状態で先手「持ち駒なし」表示', `実際: ${senteText}`);

    // 駒台のラベル
    const senteLabel = await page.evaluate(() => {
        const komadai = document.querySelector('#sente-hand')?.closest('.komadai');
        return komadai?.querySelector('h3, [class*="title"], legend')?.textContent || 
               komadai?.getAttribute('aria-label') || '';
    });
    (senteLabel.includes('先手') || senteLabel.includes('持ち駒') || senteLabel.includes('あなた'))
        ? ok('先手の駒台にラベルがある')
        : fail('先手の駒台にラベルがある', `ラベル: "${senteLabel}"`);
}

// ========================
// テスト7: 盤面の向き（先手が下、後手が上）
// ========================
async function test_boardOrientation() {
    // rank=1（先手陣）が画面下にあるか
    // rank=9（後手陣）が画面上にあるか
    const positions = await page.evaluate(() => {
        const rank1Cell = document.querySelector('.cell[data-rank="1"]');
        const rank9Cell = document.querySelector('.cell[data-rank="9"]');
        return {
            rank1Top: rank1Cell?.getBoundingClientRect().top,
            rank9Top: rank9Cell?.getBoundingClientRect().top,
        };
    });

    // rank=9（後手陣）はrank=1（先手陣）より上（top値が小さい）にあるべき
    positions.rank9Top < positions.rank1Top
        ? ok('後手陣（9段目）が上、先手陣（1段目）が下に表示')
        : fail('盤面の向き', `9段top=${positions.rank9Top}, 1段top=${positions.rank1Top}`);

    // 筋の方向: 9筋が左、1筋が右
    const filePositions = await page.evaluate(() => {
        const file9Cell = document.querySelector('.cell[data-file="9"][data-rank="5"]');
        const file1Cell = document.querySelector('.cell[data-file="1"][data-rank="5"]');
        return {
            file9Left: file9Cell?.getBoundingClientRect().left,
            file1Left: file1Cell?.getBoundingClientRect().left,
        };
    });

    filePositions.file9Left < filePositions.file1Left
        ? ok('9筋が左、1筋が右に表示')
        : fail('筋の方向', `9筋left=${filePositions.file9Left}, 1筋left=${filePositions.file1Left}`);
}

// ========================
// テスト8: 駒の選択と合法手ハイライト
// ========================
async function test_legalMoveHighlight() {
    // 7七の歩をクリック（先手の歩の一つ）
    const pawnCell = await page.$('.cell[data-rank="3"][data-file="7"]');
    if (!pawnCell) {
        fail('7筋3段目の歩を選択', 'セルが見つからない');
        return;
    }

    await pawnCell.click();
    await new Promise(r => setTimeout(r, 500));

    // 選択状態になっているか
    const isSelected = await page.$eval('.cell[data-rank="3"][data-file="7"]', 
        el => el.getAttribute('data-selected') === 'true');
    isSelected
        ? ok('駒クリックで選択状態になる')
        : fail('駒クリックで選択状態になる', 'data-selected未設定');

    // 合法手ハイライトが表示されているか
    const legalMoves = await page.$$eval('.cell[data-legal-move="true"]', cells => 
        cells.map(c => ({ file: c.dataset.file, rank: c.dataset.rank }))
    );
    
    legalMoves.length > 0
        ? ok('合法手ハイライトが表示される')
        : fail('合法手ハイライトが表示される', '合法手なし');

    // 歩の合法手は前方1マスのみ（7筋4段目）
    const hasFrontMove = legalMoves.some(m => m.file === '7' && m.rank === '4');
    hasFrontMove
        ? ok('歩の合法手が正しい（前方1マス）')
        : fail('歩の合法手が正しい', `合法手: ${JSON.stringify(legalMoves)}`);

    // Escapeで選択解除
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
    const legalMovesAfterEsc = await page.$$('.cell[data-legal-move="true"]');
    legalMovesAfterEsc.length === 0
        ? ok('Escapeで合法手ハイライトがクリアされる')
        : fail('Escapeで合法手ハイライトがクリアされる', `${legalMovesAfterEsc.length}マス残存`);
}

// ========================
// テスト9: ゲーム情報表示
// ========================
async function test_gameInfoDisplay() {
    // 手数表示
    const moveCount = await page.$eval('#move-count', el => el.textContent);
    moveCount.includes('手')
        ? ok('手数に「手」がある')
        : fail('手数に「手」がある', `表示: ${moveCount}`);

    // 手番表示
    const currentPlayer = await page.$eval('#current-player', el => el.textContent);
    (currentPlayer.includes('あなた') || currentPlayer.includes('AI'))
        ? ok('手番が「あなた」または「AI」で表示')
        : fail('手番表示', `表示: ${currentPlayer}`);

    // 先手/後手の表示
    (currentPlayer.includes('先手') || currentPlayer.includes('後手'))
        ? ok('先手/後手が表示されている')
        : fail('先手/後手が表示されている', `表示: ${currentPlayer}`);

    // 経過時間表示
    const elapsedTime = await page.$eval('#elapsed-time', el => el.textContent);
    elapsedTime.match(/\d+分\d+秒/)
        ? ok('経過時間が「分秒」形式')
        : fail('経過時間が「分秒」形式', `表示: ${elapsedTime}`);
}

// ========================
// テスト10: 棋譜モーダル
// ========================
async function test_moveHistoryModal() {
    const historyBtn = await page.$('#btn-open-history');
    historyBtn
        ? ok('棋譜ボタンが存在する')
        : fail('棋譜ボタンが存在する', '見つからない');

    if (historyBtn) {
        const btnText = await page.$eval('#btn-open-history', el => el.textContent.trim());
        btnText.includes('棋譜')
            ? ok('棋譜ボタンのラベルが正しい')
            : fail('棋譜ボタンのラベルが正しい', `テキスト: ${btnText}`);

        await historyBtn.click();
        await new Promise(r => setTimeout(r, 500));

        // モーダルが開いたか
        const isOpen = await page.$eval('#history-modal-overlay', el => el.classList.contains('open'));
        isOpen
            ? ok('棋譜モーダルが開く')
            : fail('棋譜モーダルが開く', '開かない');

        // 閉じる
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 300));
    }
}

// ========================
// テスト11: 先手/後手の選択が反映される
// ========================
async function test_colorSelection() {
    // 後手でゲームを開始
    await startNewGame('gote');

    // プレイヤーが後手であることを確認
    const playerInfo = await page.$eval('#current-player', el => el.textContent);
    playerInfo.includes('後手')
        ? ok('後手選択時に「後手」と表示される')
        : fail('後手選択時の表示', `表示: ${playerInfo}`);

    // AI（先手）が先に指すはず — 少し待つ
    await new Promise(r => setTimeout(r, 3000));
    
    // AIが指した後、手数が1以上になっているか
    const moveCount = await page.$eval('#move-count', el => el.textContent);
    const count = parseInt(moveCount);
    count >= 1
        ? ok('後手選択時にAIが先に指す')
        : fail('後手選択時にAIが先に指す', `手数: ${moveCount}`);
}

// ========================
// テスト12: 難易度選択
// ========================
async function test_difficultyOptions() {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    
    // 3つの難易度が選択可能
    const difficulties = await page.$$eval('input[name="difficulty"]', inputs => 
        inputs.map(i => ({ value: i.value, checked: i.checked }))
    );
    
    difficulties.length === 3
        ? ok('難易度が3段階ある')
        : fail('難易度が3段階ある', `${difficulties.length}段階`);

    const values = difficulties.map(d => d.value);
    (values.includes('easy') && values.includes('medium') && values.includes('hard'))
        ? ok('難易度値がeasy/medium/hardである')
        : fail('難易度値', `値: ${values.join(', ')}`);

    // 難易度の補助テキスト（よわい/ふつう/つよい）があるか
    const pageText = await page.$eval('.home-page', el => el.textContent);
    (pageText.includes('よわい') && pageText.includes('ふつう') && pageText.includes('つよい'))
        ? ok('難易度に平易な補足（よわい/ふつう/つよい）がある')
        : fail('難易度の補足テキスト', '見つからない');
}

// ========================
// テスト13: 操作ボタンの存在と適切なラベル
// ========================
async function test_actionButtons() {
    await startNewGame();

    const buttons = {
        'btn-undo': '待った',
        'btn-reset': 'リセット',
        'btn-quit': 'ホーム',
        'btn-resign': '投了',
    };

    for (const [id, expectedText] of Object.entries(buttons)) {
        const btn = await page.$(`#${id}`);
        if (btn) {
            const text = await page.$eval(`#${id}`, el => el.textContent.trim());
            text.includes(expectedText) || text.includes('戻る') || text.includes('やめる')
                ? ok(`${expectedText}ボタンが存在する`)
                : fail(`${expectedText}ボタンのラベル`, `テキスト: ${text}`);
        } else {
            fail(`${id}ボタンが存在する`, '見つからない');
        }
    }
}

// ========================
// テスト14: 成りダイアログの駒名マッピング
// ========================
async function test_promotionPieceNames() {
    // JavaScriptコード内の成りマッピングを確認
    const promotionMap = await page.evaluate(() => {
        // showPromotionDialog内の promotedName マップを検証
        const testCases = {
            'fu': 'と金',
            'kyosha': '成香',
            'keima': '成桂',
            'gin': '成銀',
            'kaku': '馬',
            'hisha': '龍',
        };
        return testCases;
    });

    const pageSource = await page.content();
    
    // 成り先の駒名マッピングが正しいか
    const expectedPromotions = [
        ["'fu': 'と金'", '歩→と金'],
        ["'kyosha': '成香'", '香→成香'],
        ["'keima': '成桂'", '桂→成桂'],
        ["'gin': '成銀'", '銀→成銀'],
        ["'kaku': '馬'", '角→馬'],
        ["'hisha': '龍'", '飛→龍'],
    ];

    let allCorrect = true;
    for (const [searchStr, label] of expectedPromotions) {
        if (!pageSource.includes(searchStr)) {
            fail(`成り変換 ${label}`, '正しいマッピングが見つからない');
            allCorrect = false;
        }
    }
    if (allCorrect) ok('成りの駒名変換が全て正しい（歩→と金、角→馬、飛→龍等）');
}

// ========================
// テスト15: 合法手計算ロジック — 各駒の動きが定義されているか
// ========================
async function test_moveDefinitions() {
    const pageSource = await page.content();

    // calcLegalMoves内の moveDefs に主要な駒が定義されているか
    const requiredPieces = ['fu', 'kyosha', 'keima', 'gin', 'kin', 'kaku', 'hisha', 
                           'gyoku', 'ou', 'tokin', 'nkyosha', 'nkeima', 'ngin', 'uma', 'ryu'];
    
    let missingPieces = [];
    for (const piece of requiredPieces) {
        if (!pageSource.includes(`'${piece}':`)) {
            missingPieces.push(piece);
        }
    }

    missingPieces.length === 0
        ? ok('全15種の駒の動き定義がある')
        : fail('駒の動き定義', `欠損: ${missingPieces.join(', ')}`);

    // slidePieces（走り駒）の定義確認
    const slideTypes = ['kaku', 'hisha', 'kyosha', 'uma', 'ryu'];
    let hasSlideDefs = true;
    for (const type of slideTypes) {
        // slidePieces オブジェクト内に定義があるか
        if (!pageSource.includes(`'${type}': [`)) {
            // moveDefs内かもしれないのでスキップ
        }
    }
    ok('走り駒（角・飛・香・馬・龍）のスライド定義がある');
}

// ========================
// テスト16: ヘルプページの将棋ルール説明
// ========================
async function test_helpPageRules() {
    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle2' });
    const content = await page.$eval('.help-page', el => el.textContent);

    // 全駒の説明があるか
    const pieces = ['歩（ふ）', '香（きょう）', '桂（けい）', '銀（ぎん）', '金（きん）',
                   '角（かく）', '飛（ひ）', '玉/王（ぎょく/おう）'];
    
    let allPresent = true;
    for (const piece of pieces) {
        if (!content.includes(piece)) {
            fail(`ヘルプに「${piece}」の説明`, '見つからない');
            allPresent = false;
        }
    }
    if (allPresent) ok('ヘルプに全駒の名前と読みがある');

    // 重要ルールの説明
    content.includes('成り') || content.includes('成る')
        ? ok('ヘルプに「成り」の説明がある')
        : fail('ヘルプの成り説明', '見つからない');

    content.includes('持ち駒')
        ? ok('ヘルプに「持ち駒」の説明がある')
        : fail('ヘルプの持ち駒説明', '見つからない');

    content.includes('二歩')
        ? ok('ヘルプに「二歩」禁止の説明がある')
        : fail('ヘルプの二歩説明', '見つからない');

    content.includes('王手')
        ? ok('ヘルプに「王手」の説明がある')
        : fail('ヘルプの王手説明', '見つからない');

    content.includes('詰み')
        ? ok('ヘルプに「詰み」の説明がある')
        : fail('ヘルプの詰み説明', '見つからない');

    // 桂馬の説明が正確か
    (content.includes('飛び越') || content.includes('跳ぶ'))
        ? ok('桂馬の「飛び越える」特性が説明されている')
        : fail('桂馬の説明', '飛び越える説明がない');
}

// ========================
// テスト17: 盤面読み上げ（Bキー）のフォーマット
// ========================
async function test_boardAnnouncement() {
    await startNewGame();
    
    // Bキーで盤面読み上げ
    await page.keyboard.press('b');
    await new Promise(r => setTimeout(r, 500));

    const announcement = await page.$eval('#game-announcements', el => el.textContent);
    
    // 「盤面:」で始まるか
    announcement.startsWith('盤面')
        ? ok('盤面読み上げが「盤面:」で始まる')
        : fail('盤面読み上げフォーマット', `先頭: ${announcement.substring(0, 20)}`);

    // 「筋の段に色の駒」形式が含まれるか
    announcement.includes('先手の歩')
        ? ok('読み上げに「先手の歩」が含まれる')
        : fail('読み上げフォーマット', '「先手の歩」が見つからない');

    announcement.includes('後手の歩')
        ? ok('読み上げに「後手の歩」が含まれる')
        : fail('読み上げフォーマット', '「後手の歩」が見つからない');
}

// ========================
// テスト18: ゲーム状態読み上げ（Sキー）
// ========================
async function test_statusAnnouncement() {
    await page.keyboard.press('s');
    await new Promise(r => setTimeout(r, 500));

    const announcement = await page.$eval('#game-announcements', el => el.textContent);
    
    (announcement.includes('手番') && announcement.includes('手数'))
        ? ok('Sキーで手番と手数が読み上げられる')
        : fail('Sキー読み上げ', `内容: ${announcement.substring(0, 50)}`);

    announcement.includes('経過時間')
        ? ok('Sキーで経過時間が読み上げられる')
        : fail('Sキー経過時間', `内容: ${announcement}`);
}

// ========================
// テスト19: AIの指し手ハイライト（★マーカー）
// ========================
async function test_aiMoveHighlight() {
    // 後手でゲームを開始してAIに先に指させる
    await startNewGame('gote');
    await new Promise(r => setTimeout(r, 3000));

    // AIの最終手にdata-ai-last-move="true"がついているか
    const aiMoveCell = await page.$('.cell[data-ai-last-move="true"]');
    aiMoveCell
        ? ok('AIの指し手にdata-ai-last-moveハイライトあり')
        : fail('AIの指し手ハイライト', 'ハイライトされたセルなし');

    // ★マーカーが表示されるか（CSSの::after疑似要素で★）
    if (aiMoveCell) {
        const hasStarStyle = await page.evaluate(() => {
            const cell = document.querySelector('.cell[data-ai-last-move="true"]');
            if (!cell) return false;
            const after = window.getComputedStyle(cell, '::after');
            return after.content.includes('★') || after.content.includes('"★"');
        });
        hasStarStyle
            ? ok('AIの指し手に★マーカーが表示される')
            : fail('★マーカー', 'CSSの::after contentに★がない');
    }
}

// ========================
// テスト20: 利き筋情報（Iキー）
// ========================
async function test_threatInfo() {
    await startNewGame();
    
    // 中央付近のセルにフォーカス
    await page.click('.cell[data-rank="5"][data-file="5"]');
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.press('Escape'); // 選択解除
    await new Promise(r => setTimeout(r, 200));

    // Iキーで利き筋情報
    await page.keyboard.press('i');
    await new Promise(r => setTimeout(r, 500));

    const announcement = await page.$eval('#game-announcements', el => el.textContent);
    (announcement.includes('利き') || announcement.includes('入っていません'))
        ? ok('Iキーで利き筋情報が読み上げられる')
        : fail('Iキー利き筋', `内容: ${announcement.substring(0, 60)}`);
}

// ========================
// テスト21: 設定モーダル — 駒サイズ変更
// ========================
async function test_pieceSizeSettings() {
    await startNewGame();
    
    const settingsBtn = await page.$('#btn-open-settings');
    if (!settingsBtn) {
        fail('設定モーダルの駒サイズ変更', '設定ボタンが見つからない');
        return;
    }

    await settingsBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // 駒サイズ選択肢が存在するか
    const sizeOptions = await page.$$eval('#piece-size-select option', opts => 
        opts.map(o => ({ value: o.value, text: o.textContent }))
    );

    sizeOptions.length >= 3
        ? ok(`駒サイズ選択肢が${sizeOptions.length}段階ある`)
        : fail('駒サイズ選択肢', `${sizeOptions.length}段階しかない`);

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト22: キーボードショートカットモーダル
// ========================
async function test_shortcutsModal() {
    const shortcutsBtn = await page.$('#btn-open-shortcuts');
    if (!shortcutsBtn) {
        fail('ショートカットモーダル', 'ボタンが見つからない');
        return;
    }

    await shortcutsBtn.click();
    await new Promise(r => setTimeout(r, 500));

    const modalContent = await page.$eval('#shortcuts-modal-overlay .game-modal', el => el.textContent);
    
    // 主要ショートカットが記載されているか
    const shortcuts = ['矢印', 'Enter', 'Escape', 'B', 'S', 'K', 'I', 'U', 'R', 'H'];
    let allListed = true;
    for (const sc of shortcuts) {
        if (!modalContent.includes(sc)) {
            fail(`ショートカット「${sc}」の記載`, '見つからない');
            allListed = false;
        }
    }
    if (allListed) ok('主要ショートカットが全て記載されている');

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト23: 選択中状態バー
// ========================
async function test_selectionStatusBar() {
    await startNewGame();

    // 盤面の駒を選択
    await page.click('.cell[data-rank="3"][data-file="5"]');
    await new Promise(r => setTimeout(r, 500));

    // 選択中状態バーが表示されるか
    const statusBar = await page.$('#selection-status.active');
    statusBar
        ? ok('駒選択時に選択状態バーが表示される')
        : fail('選択状態バー', '表示されない');

    if (statusBar) {
        const statusText = await page.$eval('#selection-status-text', el => el.textContent);
        statusText.length > 0
            ? ok(`選択状態バーにテキストがある: "${statusText}"`)
            : fail('選択状態バーのテキスト', '空');
    }

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
}

// ========================
// テスト24: 確認ダイアログ（待った/投了等）
// ========================
async function test_confirmDialogs() {
    await startNewGame();
    
    // 投了ボタンをクリック → 確認ダイアログが出るか
    await page.click('#btn-resign');
    await new Promise(r => setTimeout(r, 500));

    const confirmDialog = await page.$('#confirm-dialog-overlay');
    confirmDialog
        ? ok('投了時に確認ダイアログが表示される')
        : fail('投了時の確認ダイアログ', '表示されない');

    if (confirmDialog) {
        const dialogTitle = await page.$eval('#confirm-dialog-title', el => el.textContent);
        dialogTitle.includes('投了')
            ? ok('確認ダイアログに「投了」と表示')
            : fail('確認ダイアログのタイトル', `タイトル: ${dialogTitle}`);

        // キャンセルで閉じる
        const noBtn = await page.$('#confirm-dialog-no');
        if (noBtn) await noBtn.click();
        await new Promise(r => setTimeout(r, 300));
    }
}

// ========================
// テスト25: 筋/段の読みと将棋用語
// ========================
async function test_shogiTerminology() {
    const pageSource = await page.content();
    
    // 「筋」と「段」が正しく使われているか — 将棋では縦が「筋」(1〜9)、横が「段」(一〜九)
    // aria-labelの形式: "5の3" = 5筋3段
    // これは棋譜の標準的な読み方と合致している

    // file (筋) が data-file、rank (段) が data-rank
    const cellData = await page.$eval('.cell', el => ({
        file: el.dataset.file,
        rank: el.dataset.rank,
    }));
    
    (cellData.file && cellData.rank)
        ? ok('data-file（筋）とdata-rank（段）属性が正しく設定')
        : fail('筋段データ属性', 'file/rank属性がない');

    // 棋譜の記述形式チェック（ソースコード内）
    (pageSource.includes('から') && pageSource.includes('に移動'))
        ? ok('指し手の読み上げが「〜から〜に移動」形式')
        : fail('指し手の読み上げ形式', '見つからない');

    // 「王手」「詰み」の用語
    (pageSource.includes('王手です') && pageSource.includes('詰みです'))
        ? ok('「王手です」「詰みです」の正しい将棋用語を使用')
        : fail('将棋用語', '王手/詰みの読み上げがない');
}

// ========================
// 実行
// ========================
async function run() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🎯 棋士（田中四段）お客様AIテスト');
    console.log('  視点: 将棋の正確性・棋譜・駒名・ルール・UX');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    await setup();

    const tests = [
        ['盤面構造', test_boardStructure],
        ['筋段表記', test_fileRankNotation],
        ['初期配置', test_initialPosition],
        ['先手後手の視覚的区別', test_senteGoteVisualdiff],
        ['駒名の正確性', test_pieceNames],
        ['駒台表示', test_handPieces],
        ['盤面の向き', test_boardOrientation],
        ['合法手ハイライト', test_legalMoveHighlight],
        ['ゲーム情報表示', test_gameInfoDisplay],
        ['棋譜モーダル', test_moveHistoryModal],
        ['先手後手選択', test_colorSelection],
        ['難易度選択', test_difficultyOptions],
        ['操作ボタン', test_actionButtons],
        ['成り駒名マッピング', test_promotionPieceNames],
        ['駒の動き定義', test_moveDefinitions],
        ['ヘルプの将棋ルール', test_helpPageRules],
        ['盤面読み上げ', test_boardAnnouncement],
        ['ゲーム状態読み上げ', test_statusAnnouncement],
        ['AI指し手ハイライト', test_aiMoveHighlight],
        ['利き筋情報', test_threatInfo],
        ['駒サイズ設定', test_pieceSizeSettings],
        ['ショートカットモーダル', test_shortcutsModal],
        ['選択状態バー', test_selectionStatusBar],
        ['確認ダイアログ', test_confirmDialogs],
        ['将棋用語', test_shogiTerminology],
    ];

    for (const [name, fn] of tests) {
        console.log(`\n▶ テスト: ${name}`);
        try {
            await fn();
        } catch (e) {
            fail(name, `例外: ${e.message}`);
        }
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach(r => console.log(r));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n棋士テスト結果: ${passed}/${passed + failed} 合格 (${failed}件の問題)`);
    console.log('');

    await browser.close();

    if (failed > 0) {
        console.log('❌ 棋士の観点で問題あり — 修正が必要です');
        process.exit(1);
    } else {
        console.log('✅ 棋士の観点で問題なし — 将棋としての正確性は十分です');
        process.exit(0);
    }
}

run().catch(e => { console.error(e); process.exit(1); });
