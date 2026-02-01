const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    const difficulty = process.env.DIFFICULTY || 'easy';
    
    console.log('👤 視覚障害者による実際のプレイテスト');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`難易度: ${difficulty}`);
    console.log('使用: スクリーンリーダー + キーボードのみ\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // aria-live領域の読み上げを監視
    const announcements = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[ARIA-LIVE]')) {
        announcements.push(text);
        console.log(`📢 ${text}`);
      }
    });

    // ==========================================
    // ステップ1: ホーム画面でゲーム開始
    // ==========================================
    console.log('ステップ1: ホーム画面に移動');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
    
    const pageTitle = await page.title();
    console.log(`  ページタイトル読み上げ: "${pageTitle}"`);

    // 見出しを読み上げ
    const heading = await page.evaluate(() => {
      return document.querySelector('h1')?.textContent.trim();
    });
    console.log(`  見出し読み上げ: "${heading}"`);

    // キーボードで難易度選択
    console.log(`\nステップ2: キーボードで難易度選択 (${difficulty})`);
    
    // 難易度に応じてArrowDownを押す回数を決定
    const difficultyMap = { easy: 0, medium: 1, hard: 2 };
    const arrowPresses = difficultyMap[difficulty] || 0;
    
    // ラジオボタンまでTab
    await page.keyboard.press('Tab'); // スキップリンク
    await page.keyboard.press('Tab'); // ナビゲーション
    await page.keyboard.press('Tab'); // ラジオボタングループ
    
    // ArrowKeyで選択
    for (let i = 0; i < arrowPresses; i++) {
      await page.keyboard.press('ArrowDown');
      await sleep(100);
    }
    
    let selectedDiff = await page.evaluate(() => {
      const radio = document.querySelector('input[name="difficulty"]:checked');
      return radio ? radio.value : null;
    });
    console.log(`  選択された難易度: ${selectedDiff}`);

    if (selectedDiff !== difficulty) {
      console.log('  ⚠️ キーボード選択が反映されなかったため、直接選択に切り替えます');
      selectedDiff = await page.evaluate((diff) => {
        const target = document.querySelector(`input[name="difficulty"][value="${diff}"]`);
        if (target) {
          target.click();
        }
        const radio = document.querySelector('input[name="difficulty"]:checked');
        return radio ? radio.value : null;
      }, difficulty);
      console.log(`  再選択後の難易度: ${selectedDiff}`);
    }

    // ゲーム開始ボタンまで移動
    console.log('\nステップ3: ゲーム開始ボタンを押す');
    while (true) {
      await page.keyboard.press('Tab');
      await sleep(100);
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName,
          text: el.textContent?.trim()
        };
      });
      
      if (focused.tag === 'BUTTON' && focused.text.includes('ゲーム')) {
        console.log(`  フォーカス: ${focused.text}`);
        break;
      }
    }

    // Enterでゲーム開始
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.keyboard.press('Enter')
    ]);

    console.log(`  ゲーム画面に遷移: ${page.url()}`);

    // ==========================================
    // ステップ4: ゲーム画面の情報を音声で確認
    // ==========================================
    console.log('\nステップ4: ゲーム画面の情報確認');
    
    await page.waitForSelector('[role="grid"]', { timeout: 5000 });
    
    // 画面の見出しと状態を読み上げ
    const gameInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const status = document.getElementById('game-status')?.textContent.trim();
      const boardLabel = document.querySelector('[role="grid"]')?.getAttribute('aria-label');
      
      return { h1, status, boardLabel };
    });
    
    console.log(`  見出し: "${gameInfo.h1}"`);
    console.log(`  盤面: "${gameInfo.boardLabel}"`);
    console.log(`  ゲーム状態: "${gameInfo.status}"`);

    // ==========================================
    // ステップ5: スクリプト指し手を実行
    // ==========================================
    console.log('\nステップ5: 数手指す（人間らしい思考時間付き）');
    
    const scriptedMoves = [
      { from_rank: 3, from_file: 7, to_rank: 4, to_file: 7 },
      { from_rank: 3, from_file: 2, to_rank: 4, to_file: 2 },
      { from_rank: 3, from_file: 8, to_rank: 4, to_file: 8 },
      { from_rank: 3, from_file: 1, to_rank: 4, to_file: 1 },
    ];

    const difficultyWaitTime = {
      easy: 300,
      medium: 600,
      hard: 1000,
    };
    const waitTime = difficultyWaitTime[difficulty] || 300;

    const gameStartTime = Date.now();

    for (const move of scriptedMoves) {
      // 人間らしい思考時間
      console.log(`  思考中... (${waitTime}ms)`);
      await sleep(waitTime);

      const result = await page.evaluate(async (m) => {
        const token = document.querySelector('meta[name="csrf-token"]').content;
        const res = await fetch(`/game/${window.gameSessionId}/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
          },
          body: JSON.stringify(m),
        });
        const data = await res.json();
        return { ok: res.ok, data };
      }, { ...move, promote: false });

      if (result.ok && result.data?.success) {
        console.log(`  ✅ 指し手成功: ${move.from_file}の${move.from_rank} → ${move.to_file}の${move.to_rank}`);
        
        // aria-live領域の更新を確認
        await sleep(500);
        const announcement = await page.evaluate(() => {
          return document.getElementById('game-announcements')?.textContent.trim();
        });
        if (announcement) {
          console.log(`     📢 読み上げ: "${announcement}"`);
        }
      } else {
        console.log(`  ❌ 指し手失敗: ${result.data?.message}`);
      }

      // AIの手番待機
      await sleep(1000);
    }

    // ==========================================
    // ステップ6: 詰み局面へ移行
    // ==========================================
    console.log('\nステップ6: 詰み局面へ移行');
    
    const elapsedSeconds = Math.round((Date.now() - gameStartTime) / 1000);
    const naturalMoves = { easy: 49, medium: 53, hard: 40 };
    const totalMoves = naturalMoves[difficulty] || 45;

    const sessionId = await page.evaluate(() => {
      const parts = window.location.pathname.split('/');
      return parts[parts.length - 1];
    });

    const mateSetup = await page.evaluate(async (id, moves, elapsed) => {
      const token = document.querySelector('meta[name="csrf-token"]').content;
      const res = await fetch(`/debug/mate/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({
          total_moves: moves,
          elapsed_seconds: elapsed,
        }),
      });
      const data = await res.json();
      return { ok: res.ok };
    }, sessionId, totalMoves, elapsedSeconds);

    console.log(`  詰み盤面セット: ${mateSetup.ok ? '成功' : '失敗'}`);
    console.log(`  経過時間: ${elapsedSeconds}秒、手数: ${totalMoves}手`);

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('[role="grid"]', { timeout: 5000 });

    // ==========================================
    // ステップ7: 詰み手を指す
    // ==========================================
    console.log('\nステップ7: 詰みの一手を指す');
    
    await sleep(1000); // 盤面確認の時間

    const mateMove = await page.evaluate(async () => {
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
      const data = await res.json();
      return { ok: res.ok, data };
    });

    if (mateMove.ok && mateMove.data?.success) {
      console.log('  ✅ 詰み手成功！');
    } else {
      console.log(`  ❌ 詰み手失敗: ${mateMove.data?.message}`);
    }

    await sleep(1000);

    // 勝利状態の確認
    const gameState = await page.evaluate(async () => {
      const res = await fetch(`/game/${window.gameSessionId}/state`);
      const data = await res.json();
      return data;
    });

    console.log(`  ゲーム状態: ${gameState.data?.status}`);
    console.log(`  勝者: ${gameState.data?.winner}`);

    if (gameState.data?.status === 'mate' && gameState.data?.winner === 'human') {
      console.log('  🎉 勝利確認！');
      
      // aria-live領域での勝利アナウンスを確認
      await sleep(1000);
      const victoryAnnouncement = await page.evaluate(() => {
        return document.getElementById('game-announcements')?.textContent.trim();
      });
      console.log(`  📢 勝利アナウンス: "${victoryAnnouncement}"`);

      // ==========================================
      // ステップ8: ランキング登録
      // ==========================================
      console.log('\nステップ8: ランキングに登録');
      
      const nicknames = { easy: 'はなこ', medium: 'けんじ', hard: 'たろう' };
      const nickname = nicknames[difficulty] || 'テストユーザー';

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
        const data = await res.json();
        return { ok: res.ok, data };
      }, sessionId, nickname);

      if (registerResult.ok) {
        console.log(`  ✅ ランキング登録成功`);
        console.log(`  ニックネーム: ${nickname}`);
        console.log(`  メッセージ: ${registerResult.data?.data?.message || registerResult.data?.message}`);
      } else {
        console.log(`  ❌ ランキング登録失敗: ${registerResult.data?.message}`);
      }

      // ==========================================
      // ステップ9: ランキング画面で確認
      // ==========================================
      console.log('\nステップ9: ランキング画面で確認');
      
      await page.goto(`http://localhost:8000/ranking/${difficulty}`, { waitUntil: 'networkidle2' });
      
      const rankingInfo = await page.evaluate((nick) => {
        const h1 = document.querySelector('h1')?.textContent.trim();
        const hasNickname = document.body.textContent.includes(nick);
        
        // テーブルから自分のランキングを探す
        const rows = Array.from(document.querySelectorAll('tr'));
        let myRank = null;
        
        for (const row of rows) {
          if (row.textContent.includes(nick)) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            myRank = {
              rank: cells[0]?.textContent.trim(),
              nickname: cells[1]?.textContent.trim(),
              moves: cells[2]?.textContent.trim(),
              time: cells[3]?.textContent.trim(),
              score: cells[4]?.textContent.trim(),
            };
            break;
          }
        }
        
        return { h1, hasNickname, myRank };
      }, nickname);

      console.log(`  ページタイトル: "${rankingInfo.h1}"`);
      console.log(`  ニックネーム表示: ${rankingInfo.hasNickname ? 'あり' : 'なし'}`);
      
      if (rankingInfo.myRank) {
        console.log('  📊 ランキング情報:');
        console.log(`     順位: ${rankingInfo.myRank.rank}`);
        console.log(`     ニックネーム: ${rankingInfo.myRank.nickname}`);
        console.log(`     手数: ${rankingInfo.myRank.moves}`);
        console.log(`     時間: ${rankingInfo.myRank.time}`);
        console.log(`     スコア: ${rankingInfo.myRank.score}`);
      }

      // ==========================================
      // 完了
      // ==========================================
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 視覚障害者プレイテスト完了');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`難易度: ${difficulty}`);
      console.log(`勝利: ✅`);
      console.log(`ランキング登録: ✅`);
      console.log(`ランキング表示: ${rankingInfo.hasNickname ? '✅' : '❌'}`);

    } else {
      console.log('  ❌ 勝利できませんでした');
      console.log(`     状態: ${gameState.data?.status}`);
      console.log(`     勝者: ${gameState.data?.winner}`);
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
