import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:8001';
const TEST_RESULTS_FILE = 'test-results/game-patterns.log';

if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
}

let logBuffer = [];

function log(message) {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] ${message}`;
    console.log(fullMessage);
    logBuffer.push(fullMessage);
}

async function startGame(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 15000 });

    // Select difficulty: hard
    const hardRadio = await page.$('input[name="difficulty"][value="hard"]');
    if (hardRadio) {
        await hardRadio.click();
    }

    // Ensure sente (human) is selected
    const senteRadio = await page.$('input[name="color"][value="sente"]');
    if (senteRadio) {
        await senteRadio.click();
    }

    // Submit start form
    const startButton = await page.$('#btn-start-game');
    if (!startButton) {
        throw new Error('Start button not found');
    }

    await startButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

    const gameUrl = page.url();
    const sessionMatch = gameUrl.match(/game\/([a-zA-Z0-9]+)/);
    if (!sessionMatch) {
        throw new Error(`Session ID not found in URL: ${gameUrl}`);
    }

    const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    });

    if (!csrfToken) {
        throw new Error('CSRF token not found');
    }

    return { sessionId: sessionMatch[1], csrfToken };
}

async function postMove(page, sessionId, csrfToken, payload) {
    return page.evaluate((baseUrl, sessionId, csrfToken, payload) => {
        return fetch(`${baseUrl}/game/${sessionId}/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify(payload)
        }).then(r => r.json());
    }, BASE_URL, sessionId, csrfToken, payload);
}

async function promotePiece(page, sessionId, csrfToken, rank, file, promote) {
    return page.evaluate((baseUrl, sessionId, csrfToken, payload) => {
        return fetch(`${baseUrl}/game/${sessionId}/promote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify(payload)
        }).then(r => r.json());
    }, BASE_URL, sessionId, csrfToken, { rank, file, promote });
}

async function fetchState(page, sessionId) {
    return page.evaluate((baseUrl, sessionId) => {
        return fetch(`${baseUrl}/game/${sessionId}/state`).then(r => r.json());
    }, BASE_URL, sessionId);
}

function getPiece(board, rank, file) {
    return board?.[rank]?.[file] ?? null;
}

function isEmpty(board, rank, file) {
    return !getPiece(board, rank, file);
}

function isPathClearVertical(board, fromRank, toRank, file) {
    const step = fromRank < toRank ? 1 : -1;
    for (let r = fromRank + step; r !== toRank; r += step) {
        if (!isEmpty(board, r, file)) return false;
    }
    return true;
}

function chooseHumanMove(state) {
    const board = state.boardState?.board;
    if (!board) return null;

    // 1) Advance the pawn on file 5 if possible
    for (let rank = 1; rank <= 9; rank++) {
        const piece = getPiece(board, rank, 5);
        if (piece?.type === 'fu' && piece.color === 'sente') {
            const nextRank = rank + 1;
            if (nextRank <= 9 && isEmpty(board, nextRank, 5)) {
                return { from_file: 5, from_rank: rank, to_file: 5, to_rank: nextRank };
            }
        }
    }

    // 2) If tokin exists on 5-7 and 5-8 is empty, advance it
    const tokin = getPiece(board, 7, 5);
    if (tokin?.type === 'tokin' && tokin.color === 'sente' && isEmpty(board, 8, 5)) {
        return { from_file: 5, from_rank: 7, to_file: 5, to_rank: 8 };
    }

    // 3) If bishop can capture on 5-8 from 5-2, try it
    const bishop = getPiece(board, 2, 5);
    const target = getPiece(board, 8, 5);
    if (bishop?.type === 'kaku' && bishop.color === 'sente' && target?.color === 'gote') {
        if (isPathClearVertical(board, 2, 8, 5)) {
            return { from_file: 5, from_rank: 2, to_file: 5, to_rank: 8 };
        }
    }

    return null;
}

async function runScenario() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    log('Starting fixed-sequence reproduction');

    try {
        const { sessionId, csrfToken } = await startGame(page);
        log(`Game session: ${sessionId}`);

        for (let step = 1; step <= 12; step++) {
            const stateResponse = await fetchState(page, sessionId);
            const state = stateResponse.data || stateResponse;

            const move = chooseHumanMove(state);
            if (!move) {
                log('No suitable human move found for pattern reproduction');
                break;
            }

            log(`Human move: ${move.from_file}-${move.from_rank} -> ${move.to_file}-${move.to_rank}`);
            const response = await postMove(page, sessionId, csrfToken, move);
            log(`Response: success=${response.success}, status=${response.status || 'n/a'}`);

            if (!response.success) {
                log(`Move failed: ${response.message}`);
                break;
            }

            if (response.aiMove) {
                log(`AI move: ${response.aiMove.from_file}-${response.aiMove.from_rank} -> ${response.aiMove.to_file}-${response.aiMove.to_rank}`);
            }

            if (response.canPromote && response.promotionTarget) {
                log(`Promote at ${response.promotionTarget.file}-${response.promotionTarget.rank}`);
                const promoteResponse = await promotePiece(
                    page,
                    sessionId,
                    csrfToken,
                    response.promotionTarget.rank,
                    response.promotionTarget.file,
                    true
                );
                log(`Promote response: success=${promoteResponse.success}`);
            }

            if (response.status === 'mate') {
                log(`Game ended: mate (winner=${response.winner})`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const finalState = await fetchState(page, sessionId);
        const state = finalState.data || finalState;
        log(`Final status: ${state.status}, winner=${state.winner}`);

    } catch (error) {
        log(`Scenario error: ${error.message}`);
    } finally {
        await browser.close();
        fs.writeFileSync(TEST_RESULTS_FILE, logBuffer.join('\n'), 'utf-8');
        log(`Test results saved to: ${TEST_RESULTS_FILE}`);
    }
}

runScenario().catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
});
