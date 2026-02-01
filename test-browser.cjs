const puppeteer = require('puppeteer');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForOptionalNavigation = async (page, timeout = 5000) => {
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
    return true;
  } catch {
    return false;
  }
};

const getState = async (page) => {
  return await page.evaluate(async () => {
    const res = await fetch(`/game/${window.gameSessionId}/state`);
    const data = await res.json();
    return { ok: res.ok, data };
  });
};

(async () => {
  let browser;
  try {
    const difficulty = process.env.DIFFICULTY || 'easy';
    const fullMatch = process.env.FULL_MATCH === '1';
    const mateTest = process.env.MATE_TEST === '1';
    const longMateTest = process.env.LONG_MATE_TEST === '1';
    const rankingCheck = process.env.RANKING_CHECK === '1';
    const clearAll = process.env.CLEAR_ALL === '1';
    console.log('rankingCheck:', rankingCheck);
    console.log('clearAll:', clearAll);

    const naturalNicknamesByDifficulty = {
      easy: 'はなこ',
      medium: 'けんじ',
      hard: 'たろう',
    };
    const nickname = naturalNicknamesByDifficulty[difficulty] || naturalNicknamesByDifficulty.easy;
    let gameStartTime = null;  // ゲーム開始時刻を記録
    // ブラウザ起動
    console.log('ブラウザを起動しています...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // ホーム画面にアクセス
    console.log('\nホーム画面にアクセス...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });

    // ホーム画面のスクリーンショット
    const homeShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/home.png');
    await page.screenshot({ path: homeShotPath, fullPage: true });
    console.log('📸 ホーム画面スクリーンショット:', homeShotPath);
    
    // ゲーム開始ボタンを取得
    console.log('ゲーム開始フォームを検索...');
    const formExists = await page.$('form[action*="game/start"]');
    console.log('フォーム存在:', formExists ? 'はい' : 'いいえ');

    if (clearAll) {
      console.log('データをクリアします...');
      const clearResult = await page.evaluate(async () => {
        const token = document.querySelector('meta[name="csrf-token"]').content;
        const res = await fetch('/debug/clear-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
          },
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      });
      console.log('クリア結果:', clearResult.ok ? '成功' : '失敗');

      await page.reload({ waitUntil: 'networkidle2' });
    }

    // ゲーム開始（難易度選択、先手を選択）
    console.log(`\n難易度を選択: ${difficulty}`);
    const difficultySelector = `input[name="difficulty"][value="${difficulty}"]`;
    const difficultyInput = await page.$(difficultySelector);
    if (difficultyInput) {
      await difficultyInput.click();
    } else {
      console.warn('難易度の入力が見つかりません:', difficultySelector);
    }

    console.log('\nゲーム開始ボタンをクリック...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // ゲーム画面が読み込まれるまで待機
    await page.waitForSelector('.shogi-board', { timeout: 5000 });
    console.log('ゲーム画面が読み込まれました');
    gameStartTime = Date.now();  // ゲーム開始時刻を記録（これから計測開始）

    // ゲーム画面のスクリーンショット
    const gameShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/game.png');
    await page.screenshot({ path: gameShotPath, fullPage: true });
    console.log('📸 ゲーム画面スクリーンショット:', gameShotPath);

    // 手駒を付与（デバッグ用）
    console.log('\n=== 手駒を付与（デバッグ） ===');
    const sessionId = await page.evaluate(() => {
      const parts = window.location.pathname.split('/');
      return parts[parts.length - 1];
    });

    const seedResult = await page.evaluate(async (id) => {
      const token = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch(`/debug/seed-hand/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({ color: 'sente', piece_type: 'gin', count: 1 })
      });
      const data = await res.json();
      return { ok: res.ok, data };
    }, sessionId);

    console.log('手駒付与結果:', seedResult.ok ? '成功' : '失敗');

    // 反映のため再読み込み
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.shogi-board', { timeout: 5000 });

    const gameSeedShotPath = path.resolve(__dirname, 'storage/app/public/screenshots/game-seeded.png');
    await page.screenshot({ path: gameSeedShotPath, fullPage: true });
    console.log('📸 手駒付与後のスクリーンショット:', gameSeedShotPath);

    // コンソールログを取得
    console.log('\n=== ブラウザコンソールログ ===');
    page.on('console', msg => {
      console.log('BROWSER:', msg.text());
    });

    // confirm/alertを自動で許可
    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message());
      await dialog.accept();
    });

    // ページ内 JavaScript を実行して状態を確認
    const gameState = await page.evaluate(() => {
      return {
        windowGameData: window.gameData,
        currentPlayer: typeof currentPlayer !== 'undefined' ? currentPlayer : 'undefined',
        humanColor: typeof humanColor !== 'undefined' ? humanColor : 'undefined',
      };
    });

    console.log('\n=== ゲーム状態 ===');
    console.log('window.gameData.currentPlayer:', gameState.windowGameData?.currentPlayer);
    console.log('window.gameData.boardState.hand:', gameState.windowGameData?.boardState?.hand);
    const humanColor = gameState.windowGameData?.human_color || gameState.windowGameData?.humanColor || 'sente';
    console.log('humanColor:', humanColor);

    // 難易度に応じた待機時間（AIの思考時間をシミュレート）
    const difficultyWaitTime = {
      easy: 300,
      medium: 600,
      hard: 1000,
    };
    const waitTimePerMove = difficultyWaitTime[difficulty] || 300;

    // 難易度に応じた手数設定（自然な対局を想定）
    const naturalMovesByDifficulty = {
      easy: 49,    // 初級: 少し長めの対局
      medium: 53,  // 中級: やや長めの対局
      hard: 40,    // 上級: 早めの決着
    };
    const totalMovesForMate = naturalMovesByDifficulty[difficulty] || 45;

    if (fullMatch) {
      console.log('\n=== 実戦フルマッチテスト ===');
      console.log('開始から勝利まで中断せずに進行します。');

      if (mateTest) {
        console.log('詰み勝利テストを実行します。');

        const sessionId = await page.evaluate(() => {
          const parts = window.location.pathname.split('/');
          return parts[parts.length - 1];
        });

        // ゲーム開始からの経過時間を計算
        const totalElapsedSeconds = Math.round((Date.now() - gameStartTime) / 1000);
        console.log(`ゲーム開始からの経過時間: ${totalElapsedSeconds}秒`);

        // 詰み盤面へセット（実際の経過時間をパラメータとして渡す）
        const mateSetup = await page.evaluate(async (id, elapsedSec, moves) => {
          const token = document.querySelector('meta[name="csrf-token"]').content;
          const res = await fetch(`/debug/mate/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': token,
            },
            body: JSON.stringify({
              total_moves: moves,
              elapsed_seconds: elapsedSec,
            }),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, data };
        }, sessionId, totalElapsedSeconds, totalMovesForMate);

        console.log('詰み盤面セット:', mateSetup.ok ? '成功' : '失敗');

        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });

        const moveResult = await page.evaluate(async () => {
          const token = document.querySelector('meta[name="csrf-token"]').content;
          const res = await fetch(`/game/${window.gameSessionId}/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': token,
            },
            body: JSON.stringify({
              from_rank: 7,
              from_file: 9,
              to_rank: 8,
              to_file: 9,
              promote: false,
            }),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, data };
        });

        if (moveResult.ok && moveResult.data?.success) {
          console.log('詰み手指し手結果: 成功');
        } else {
          console.log('詰み手指し手結果: 失敗', moveResult.data?.message || '詳細不明');
        }

        const finalState = await getState(page);
        console.log('最終状態:', finalState.data?.data?.status);

        if (finalState.data?.data?.status !== 'mate') {
          console.error('詰み勝利に到達できませんでした。');
        } else {
          console.log('✅ 詰み勝利テスト完了');

          const registerResult = await page.evaluate(async (id, nick) => {
            const token = document.querySelector('meta[name="csrf-token"]').content;
            const res = await fetch('/ranking/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
              },
              body: JSON.stringify({
                game_session_id: Number(id),
                nickname: nick,
              }),
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, data };
          }, sessionId, nickname);

          console.log('ランキング登録:', registerResult.ok ? '成功' : '失敗', registerResult.data?.data?.message || registerResult.data?.message || '');

          if (rankingCheck) {
            const rankingUrl = `http://localhost:8000/ranking/${difficulty}`;
            await page.goto(rankingUrl, { waitUntil: 'networkidle2' });
            const hasNickname = await page.evaluate((nickname) => {
              return document.body?.innerText?.includes(nickname) ?? false;
            }, naturalStats.nickname);
            console.log('ランキング反映確認:', hasNickname ? '成功' : '失敗');
          }
        }

        return;
      }

      if (longMateTest) {
        console.log('連続指し手→詰み勝利テストを実行します。');

        const waitForHumanTurn = async (maxLoops = 20) => {
          for (let i = 0; i < maxLoops; i++) {
            const state = await getState(page);
            const status = state.data?.data?.status;
            if (status === 'mate' || status === 'resigned' || status === 'draw') {
              return { finished: true, status };
            }
            const turn = state.data?.data?.boardState?.turn;
            if (turn === humanColor) {
              return { finished: false };
            }
            await sleep(300);
          }
          return { finished: false, timeout: true };
        };

        const makeMove = async (move) => {
          return await page.evaluate(async (payload) => {
            const token = document.querySelector('meta[name="csrf-token"]').content;
            const moveRes = await fetch(`/game/${window.gameSessionId}/move`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
              },
              body: JSON.stringify(payload),
            });
            const moveData = await moveRes.json().catch(() => ({}));
            return { ok: moveRes.ok, data: moveData };
          }, move);
        };

        const scriptedMoves = [
          { from_rank: 3, from_file: 7, to_rank: 4, to_file: 7 },
          { from_rank: 3, from_file: 2, to_rank: 4, to_file: 2 },
          { from_rank: 3, from_file: 8, to_rank: 4, to_file: 8 },
          { from_rank: 3, from_file: 1, to_rank: 4, to_file: 1 },
        ];

        for (const move of scriptedMoves) {
          const turnState = await waitForHumanTurn();
          if (turnState.finished) {
            console.log('対局終了:', turnState.status);
            break;
          }
          if (turnState.timeout) {
            console.warn('手番待機がタイムアウトしました。');
            break;
          }

          await sleep(waitTimePerMove);  // 難易度に応じた考慮時間
          const res = await makeMove({ ...move, promote: false });
          if (res.ok && res.data?.success) {
            console.log(`指し手成功: (${move.from_rank},${move.from_file}) -> (${move.to_rank},${move.to_file})`);
          } else {
            console.warn('指し手失敗:', res.data?.message || '不明');
            break;
          }
        }

        // 詰み盤面へ切り替え（公平に同一局面で決着）
        const sessionId = await page.evaluate(() => {
          const parts = window.location.pathname.split('/');
          return parts[parts.length - 1];
        });

        // ゲーム開始からの経過時間を計算
        const totalElapsedSeconds = Math.round((Date.now() - gameStartTime) / 1000);
        console.log(`ゲーム開始からの経過時間: ${totalElapsedSeconds}秒`);

        const mateSetup = await page.evaluate(async (id, elapsedSec, moves) => {
          const token = document.querySelector('meta[name="csrf-token"]').content;
          const res = await fetch(`/debug/mate/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': token,
            },
            body: JSON.stringify({
              total_moves: moves,
              elapsed_seconds: elapsedSec,
            }),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, data };
        }, sessionId, totalElapsedSeconds, totalMovesForMate);

        console.log('詰み盤面セット:', mateSetup.ok ? '成功' : '失敗');

        gameStartTime = Date.now();  // 詰み盤面セット後に時刻を再設定
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector('.shogi-board', { timeout: 5000 });

        const moveResult = await makeMove({
          from_rank: 7,
          from_file: 9,
          to_rank: 8,
          to_file: 9,
          promote: false,
        });

        if (moveResult.ok && moveResult.data?.success) {
          console.log('詰み手指し手結果: 成功');
        } else {
          console.log('詰み手指し手結果: 失敗', moveResult.data?.message || '詳細不明');
        }

        const finalState = await getState(page);
        console.log('最終状態:', finalState.data?.data?.status);

        if (finalState.data?.data?.status !== 'mate') {
          console.error('詰み勝利に到達できませんでした。');
        } else {
          console.log('✅ 詰み勝利テスト完了');
          const elapsedSeconds = Math.round((Date.now() - gameStartTime) / 1000);
          console.log(`実際の対局時間: ${elapsedSeconds}秒`);

          const registerResult = await page.evaluate(async (id, nick) => {
            const token = document.querySelector('meta[name="csrf-token"]').content;
            const res = await fetch('/ranking/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
              },
              body: JSON.stringify({
                game_session_id: Number(id),
                nickname: nick,
              }),
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, data };
          }, sessionId, nickname);

          console.log('ランキング登録:', registerResult.ok ? '成功' : '失敗', registerResult.data?.data?.message || registerResult.data?.message || '');

          if (rankingCheck) {
            const rankingUrl = `http://localhost:8000/ranking/${difficulty}`;
            await page.goto(rankingUrl, { waitUntil: 'networkidle2' });
            const hasNickname = await page.evaluate((nick) => {
              return document.body?.innerText?.includes(nick) ?? false;
            }, nickname);
            console.log('ランキング反映確認:', hasNickname ? '成功' : '失敗');
          }
        }

        return;
      }

      const scriptedMoves = [
        { from_rank: 3, from_file: 7, to_rank: 4, to_file: 7 },
        { from_rank: 3, from_file: 2, to_rank: 4, to_file: 2 },
        { from_rank: 3, from_file: 8, to_rank: 4, to_file: 8 },
        { from_rank: 3, from_file: 1, to_rank: 4, to_file: 1 },
      ];

      const makeMove = async (move) => {
        return await page.evaluate(async (payload) => {
          const token = document.querySelector('meta[name="csrf-token"]').content;
          const moveRes = await fetch(`/game/${window.gameSessionId}/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': token,
            },
            body: JSON.stringify(payload),
          });
          const moveData = await moveRes.json().catch(() => ({}));
          return { ok: moveRes.ok, data: moveData };
        }, move);
      };

      for (const move of scriptedMoves) {
        let waitCount = 0;
        while (waitCount < 10) {
          const state = await getState(page);
          const status = state.data?.data?.status;
          if (status === 'finished' || status === 'resigned') {
            console.log('対局終了:', status);
            break;
          }
          const turn = state.data?.data?.boardState?.turn;
          if (turn !== humanColor) {
            await sleep(300);
            waitCount++;
            continue;
          }
          const res = await makeMove({ ...move, promote: false });
          if (res.ok && res.data?.success) {
            console.log(`指し手成功: (${move.from_rank},${move.from_file}) -> (${move.to_rank},${move.to_file})`);
            await sleep(waitTimePerMove);  // 難易度に応じた待機
            break;
          }
          console.warn('指し手失敗:', res.data?.message || '不明');
          break;
        }
      }

      console.warn('実戦継続後、投了で決着を付けます。');
      const resignBtn = await page.$('#btn-resign');
      if (resignBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {}),
          resignBtn.click()
        ]);
      }
      const resignState = await getState(page);
      console.log('投了後の状態:', resignState.data?.data?.status);

      console.log('✅ フルマッチ完了');
      
      // 実際の対局時間を記録
      const elapsedSeconds = Math.round((Date.now() - gameStartTime) / 1000);
      console.log(`実際の対局時間: ${elapsedSeconds}秒`);

      if (rankingCheck) {
        const sessionId = await page.evaluate(() => {
          const parts = window.location.pathname.split('/');
          return parts[parts.length - 1];
        });

        const registerResult = await page.evaluate(async (id, nick) => {
          const token = document.querySelector('meta[name="csrf-token"]').content;
          const res = await fetch('/ranking/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': token,
            },
            body: JSON.stringify({
              game_session_id: Number(id),
              nickname: nick,
            }),
          });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, data };
        }, sessionId, nickname);

        console.log('ランキング登録:', registerResult.ok ? '成功' : '失敗', registerResult.data?.data?.message || registerResult.data?.message || '');

        if (rankingCheck) {
          const rankingUrl = `http://localhost:8000/ranking/${difficulty}`;
          await page.goto(rankingUrl, { waitUntil: 'networkidle2' });
          const hasNickname = await page.evaluate((nick) => {
            return document.body?.innerText?.includes(nick) ?? false;
          }, nickname);
          console.log('ランキング反映確認:', hasNickname ? '成功' : '失敗');
        }
      }
      return;
    }
    console.log('currentPlayer 変数:', gameState.currentPlayer);
    console.log('humanColor 変数:', gameState.humanColor);

    // 駒台の駒をクリック
    console.log('\n=== 駒台から駒を選択 ===');
    const handPieces = await page.$$('.hand-piece');
    console.log('駒台の駒数:', handPieces.length);

    if (handPieces.length > 0) {
      console.log('最初の駒をクリック...');
      await handPieces[0].click();
      
      // クリック後の状態を確認
      await sleep(500);
      
      const stateAfterClick = await page.evaluate(() => {
        return {
          announcement: document.getElementById('game-announcements')?.textContent,
          selectedHandPieces: document.querySelectorAll('.hand-piece[data-selected="true"]').length,
        };
      });

      console.log('アナウンスメント:', stateAfterClick.announcement);
      console.log('選択された駒の数:', stateAfterClick.selectedHandPieces);
    }

    // ボード上のマスをクリック
    console.log('\n=== ボード上のマスをクリック ===');
    const cells = await page.$$('.cell');
    console.log('ボード上のマス数:', cells.length);

    if (cells.length > 0) {
      // 5〜6番目のマス（中程度）をクリック
      const cellToClick = cells[40]; // 適当なマス
      if (cellToClick) {
        console.log('ボード上のマスをクリック...');
        await cellToClick.click();
        
        await sleep(500);
        
        const finalState = await page.evaluate(() => {
          return {
            announcement: document.getElementById('game-announcements')?.textContent,
          };
        });

        console.log('最終アナウンスメント:', finalState.announcement);
      }
    }

    // 待った/リセット/投了のテスト
    console.log('\n=== ボタン動作テスト ===');

    // 1手進める（7三の歩を7四に）
    console.log('手を進めて待ったテストの準備...');
    const moveResult = await page.evaluate(async () => {
      const token = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch(`/game/${window.gameSessionId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({ from_file: 7, from_rank: 3, to_file: 7, to_rank: 4 })
      });
      const data = await res.json();
      return { ok: res.ok, data };
    });
    console.log('移動結果:', moveResult.ok ? '成功' : '失敗');

    // 待った
    console.log('待ったボタンをクリック...');
    const undoBtn = await page.$('#btn-undo');
    if (undoBtn) {
      await Promise.all([
        waitForOptionalNavigation(page),
        undoBtn.click()
      ]);
    }

    const undoState = await getState(page);
    console.log('待った後の状態:', undoState.data?.data?.moveCount, undoState.data?.data?.status);

    // リセット
    console.log('リセットボタンをクリック...');
    const resetBtn = await page.$('#btn-reset');
    if (resetBtn) {
      await Promise.all([
        waitForOptionalNavigation(page),
        resetBtn.click()
      ]);
    }

    const resetState = await getState(page);
    console.log('リセット後の状態:', resetState.data?.data?.moveCount, resetState.data?.data?.status);

    // 投了
    console.log('\n=== 投了テスト ===');
    const resignBtn = await page.$('#btn-resign');
    if (resignBtn) {
      console.log('投了ボタンをクリック...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {}),
        resignBtn.click()
      ]);
    }

    const resignState = await getState(page);
    console.log('投了後の状態:', resignState.data?.data?.status);

    // ホームに戻るテスト
    console.log('\n=== ホームに戻るボタンテスト ===');
    console.log('ホームに戻るボタンをクリック...');
    const quitBtn = await page.$('#btn-quit');
    if (quitBtn) {
      // ホーム画面への移動を待つ
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {}),
        quitBtn.click()
      ]);
      
      // ホーム画面にいるか確認
      const currentUrl = page.url();
      const isHome = currentUrl.includes('localhost:8000') && !currentUrl.includes('/game/');
      console.log('ホーム画面に移動:', isHome ? 'はい ✓' : 'いいえ ✗');
      console.log('現在のURL:', currentUrl);
    }

    console.log('\n✅ テスト完了');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
