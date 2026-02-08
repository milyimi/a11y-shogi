/**
 * 視覚障害者AIプレイヤー対局テスト（Puppeteer）
 *
 * 視覚障害者を模した AI が、キーボード操作とスクリーンリーダー向け情報
 * （aria-label, aria-live, role 等）だけを頼りに
 * 中級 AI と対局し、勝利してランキング登録するまでを自動で行う。
 *
 * API を直接叩くのではなく、ブラウザ UI をキーボードで操作する。
 */

import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:8000';
const NICKNAME = 'アクセシブル棋士';
const DIFFICULTY = 'medium'; // 中級
const MAX_MOVES = 500; // 無限ループ防止

// ─── helpers ────────────────────────────────────
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) {
  const ts = new Date().toLocaleTimeString('ja-JP');
  console.log(`[${ts}] ${msg}`);
}

function logBoard(board) {
  const pieceMap = {
    fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
    kaku: '角', hisha: '飛', gyoku: '玉', ou: '王',
    tokin: 'と', nkyosha: '杏', nkeima: '圭', ngin: '全', uma: '馬', ryu: '龍',
  };
  console.log('  ９ ８ ７ ６ ５ ４ ３ ２ １');
  for (let rank = 9; rank >= 1; rank--) {
    let row = `${rank}`;
    for (let file = 9; file >= 1; file--) {
      const p = board[rank]?.[file];
      if (p) {
        const c = p.color === 'sente' ? 'v' : '^';
        row += c + (pieceMap[p.type] || p.type[0]);
      } else {
        row += ' ・';
      }
    }
    console.log(row);
  }
}

/**
 * aria-live 領域から最新アナウンスを取得（スクリーンリーダーが読み上げる内容）
 */
async function getAnnouncement(page) {
  return page.$eval('#game-announcements', el => el.textContent.trim()).catch(() => '');
}

/**
 * 盤面の状態を、aria-label だけを頼りに読み取る
 * （スクリーンリーダーのように DOM のアクセシビリティ情報のみ使用）
 */
async function readBoardFromAria(page) {
  return page.evaluate(() => {
    const cells = document.querySelectorAll('.cell');
    const board = {};
    for (const cell of cells) {
      const label = cell.getAttribute('aria-label') || '';
      const rank = parseInt(cell.dataset.rank);
      const file = parseInt(cell.dataset.file);
      if (!board[rank]) board[rank] = {};
      // aria-label format: "Xの Y 先手のZ" or "XのY 空"
      if (label.includes('先手の') || label.includes('後手の')) {
        const colorMatch = label.match(/(先手|後手)の(.+)$/);
        if (colorMatch) {
          board[rank][file] = {
            color: colorMatch[1] === '先手' ? 'sente' : 'gote',
            name: colorMatch[2],
          };
        }
      } else {
        board[rank][file] = null; // 空
      }
    }
    return board;
  });
}

/**
 * 持ち駒情報を aria-label / ボタンテキストから読み取る
 */
async function readHandFromAria(page, color) {
  const containerId = color === 'sente' ? 'sente-hand' : 'gote-hand';
  return page.evaluate((cid) => {
    const container = document.getElementById(cid);
    if (!container) return {};
    const buttons = container.querySelectorAll('.hand-piece');
    const hand = {};
    for (const btn of buttons) {
      const text = btn.textContent.trim(); // "歩 × 2"
      const match = text.match(/(.+?)\s*×\s*(\d+)/);
      if (match) {
        hand[match[1]] = parseInt(match[2]);
      }
    }
    return hand;
  }, containerId);
}

/**
 * 現在の手番を DOM から読み取る
 */
async function readCurrentPlayer(page) {
  return page.$eval('#current-player', el => el.textContent.trim()).catch(() => '');
}

/**
 * ゲーム状態を JSON API から取得（内部状態確認用 - スクリーンリーダーでは利用不可だが
 * AI思考のための盤面データとして使う。実際の操作は全て UI 経由）
 */
async function getGameState(page) {
  return page.evaluate(async () => {
    // window.gameData を使う（ページ内グローバル変数）
    return window.gameData;
  });
}

/**
 * セルをキーボードで選択する
 * 矢印キーで目的のセルまで移動し、Enter で選択
 */
async function navigateToCell(page, targetFile, targetRank) {
  // 現在フォーカスされているセルの座標を取得
  const current = await page.evaluate(() => {
    return { rank: window.focusedCell.rank, file: window.focusedCell.file };
  });

  // まず盤面にフォーカスがあるか確認、なければ盤面のセルをクリック
  const boardFocused = await page.evaluate(() => {
    const active = document.activeElement;
    return active && active.classList.contains('cell');
  });

  if (!boardFocused) {
    // 現在フォーカスが盤面にないので、フォーカスされているセルに直接フォーカスを当てる
    await page.evaluate(() => {
      const cell = document.querySelector(`.cell[data-rank="${window.focusedCell.rank}"][data-file="${window.focusedCell.file}"]`);
      if (cell) cell.focus();
    });
    await sleep(50);
  }

  // 矢印キーで移動
  // Rank: ArrowUp = rank+1, ArrowDown = rank-1
  // File: ArrowLeft = file-1, ArrowRight = file+1
  const rankDiff = targetRank - current.rank;
  const fileDiff = targetFile - current.file;

  // Rank方向に移動
  const rankKey = rankDiff > 0 ? 'ArrowUp' : 'ArrowDown';
  for (let i = 0; i < Math.abs(rankDiff); i++) {
    await page.keyboard.press(rankKey);
    await sleep(30);
  }

  // File方向に移動
  const fileKey = fileDiff > 0 ? 'ArrowRight' : 'ArrowLeft';
  for (let i = 0; i < Math.abs(fileDiff); i++) {
    await page.keyboard.press(fileKey);
    await sleep(30);
  }
}

/**
 * 盤面上の駒を移動する（キーボード操作）
 */
async function makeUIMove(page, fromFile, fromRank, toFile, toRank) {
  // 1. 移動元のセルまで矢印キーで移動
  await navigateToCell(page, fromFile, fromRank);
  await sleep(50);

  // 2. Enter で移動元を選択
  await page.keyboard.press('Enter');
  await sleep(200);

  // 選択アナウンスを確認
  const selectAnnounce = await getAnnouncement(page);
  log(`  選択アナウンス: "${selectAnnounce}"`);

  // 3. 移動先のセルまで矢印キーで移動
  await navigateToCell(page, toFile, toRank);
  await sleep(50);

  // 4. Enter で移動先を選択（実行）
  await page.keyboard.press('Enter');
  await sleep(800); // AI応答待ち

  // 移動結果アナウンスを確認
  const moveAnnounce = await getAnnouncement(page);
  log(`  移動アナウンス: "${moveAnnounce}"`);

  return moveAnnounce;
}

/**
 * 持ち駒を打つ（キーボード操作）
 */
async function makeUIDrop(page, pieceType, toFile, toRank, humanColor) {
  const nameMap = {
    fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
    kaku: '角', hisha: '飛',
  };
  const pieceName = nameMap[pieceType] || pieceType;

  // 持ち駒ボタンをクリック
  const handContainerId = humanColor === 'sente' ? 'sente-hand' : 'gote-hand';
  const clicked = await page.evaluate((cid, pt) => {
    const container = document.getElementById(cid);
    if (!container) return false;
    const buttons = container.querySelectorAll('.hand-piece');
    for (const btn of buttons) {
      if (btn.dataset.piece === pt) {
        btn.click();
        return true;
      }
    }
    return false;
  }, handContainerId, pieceType);

  if (!clicked) {
    log(`  ⚠ 持ち駒 ${pieceName} が見つかりません`);
    return null;
  }

  await sleep(200);
  const selectAnnounce = await getAnnouncement(page);
  log(`  持ち駒選択: "${selectAnnounce}"`);

  // 打つ先のセルまで移動して Enter
  await navigateToCell(page, toFile, toRank);
  await sleep(50);
  await page.keyboard.press('Enter');
  await sleep(800);

  const dropAnnounce = await getAnnouncement(page);
  log(`  打ちアナウンス: "${dropAnnounce}"`);
  return dropAnnounce;
}

/**
 * 成りダイアログが表示されたら「成る」を選択
 */
async function handlePromotionDialog(page) {
  const hasDialog = await page.evaluate(() => {
    return !!document.getElementById('promotion-dialog');
  });
  if (hasDialog) {
    log('  🔄 成りダイアログ検出 → 「成る」を選択');
    // 「成る」ボタンにフォーカスが当たっているはずなので Enter
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(800);
    const announce = await getAnnouncement(page);
    log(`  成りアナウンス: "${announce}"`);
    return true;
  }
  return false;
}

// ─── AI 思考エンジン（盤面を読んで最善手を決定）──────────
/**
 * 簡易駒評価値
 */
const PIECE_VALUES = {
  fu: 100, kyosha: 300, keima: 350, gin: 500, kin: 550,
  kaku: 800, hisha: 1000, gyoku: 99999, ou: 99999,
  tokin: 600, nkyosha: 550, nkeima: 550, ngin: 550, uma: 1100, ryu: 1300,
};

/**
 * 駒の移動パターンを取得する
 * このゲームでは先手は rank が増加する方向（1→9）に進む。
 *   sente direction = +1, gote direction = -1
 * color 引数で方向を決定する。
 */
function getMovementPattern(pieceType, color) {
  const dir = color === 'sente' ? 1 : -1; // 先手: rank +1 方向, 後手: rank -1 方向
  const symmetricPatterns = {
    kaku: [
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: (i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: (i + 1), sliding: true })),
    ],
    hisha: [
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: 0, sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: 0, sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: 0, df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: 0, df: (i + 1), sliding: true })),
    ],
    gyoku: [{ dr: -1, df: -1 }, { dr: -1, df: 0 }, { dr: -1, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: 1, df: -1 }, { dr: 1, df: 0 }, { dr: 1, df: 1 }],
    ou:    [{ dr: -1, df: -1 }, { dr: -1, df: 0 }, { dr: -1, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: 1, df: -1 }, { dr: 1, df: 0 }, { dr: 1, df: 1 }],
    uma: [
      { dr: -1, df: 0 }, { dr: 1, df: 0 }, { dr: 0, df: -1 }, { dr: 0, df: 1 },
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: (i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: (i + 1), sliding: true })),
    ],
    ryu: [
      { dr: -1, df: -1 }, { dr: -1, df: 1 }, { dr: 1, df: -1 }, { dr: 1, df: 1 },
      ...Array.from({ length: 8 }, (_, i) => ({ dr: -(i + 1), df: 0, sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: (i + 1), df: 0, sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: 0, df: -(i + 1), sliding: true })),
      ...Array.from({ length: 8 }, (_, i) => ({ dr: 0, df: (i + 1), sliding: true })),
    ],
  };

  // 方向性のある駒
  const directionalPatterns = {
    fu:     [{ dr: dir, df: 0 }],
    kyosha: Array.from({ length: 8 }, (_, i) => ({ dr: dir * (i + 1), df: 0, sliding: true })),
    keima:  [{ dr: dir * 2, df: -1 }, { dr: dir * 2, df: 1 }],
    gin:    [{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: -dir, df: -1 }, { dr: -dir, df: 1 }],
    kin:    [{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: -dir, df: 0 }],
    tokin:  [{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: -dir, df: 0 }],
    nkyosha:[{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: -dir, df: 0 }],
    nkeima: [{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: -dir, df: 0 }],
    ngin:   [{ dr: dir, df: -1 }, { dr: dir, df: 0 }, { dr: dir, df: 1 }, { dr: 0, df: -1 }, { dr: 0, df: 1 }, { dr: -dir, df: 0 }],
  };

  return symmetricPatterns[pieceType] || directionalPatterns[pieceType] || [];
}

/**
 * 成り先駒タイプ
 */
function promotedType(type) {
  const map = {
    fu: 'tokin', kyosha: 'nkyosha', keima: 'nkeima', gin: 'ngin',
    kaku: 'uma', hisha: 'ryu',
  };
  return map[type] || null;
}

/**
 * 全合法手を列挙（盤上移動のみ）
 */
function getAllMoves(boardState, myColor) {
  const board = boardState.board;
  const moves = [];

  for (let rank = 1; rank <= 9; rank++) {
    for (let file = 1; file <= 9; file++) {
      const piece = board[rank]?.[file];
      if (!piece || piece.color !== myColor) continue;

      const pattern = getMovementPattern(piece.type, myColor);
      const directions = new Map(); // sliding方向ごとの衝突管理

      for (const step of pattern) {
        const dr = step.dr;
        const df = step.df;

        const nr = rank + dr;
        const nf = file + df;

        if (nr < 1 || nr > 9 || nf < 1 || nf > 9) continue;

        // sliding の場合、同方向で既にブロックされてたらスキップ
        if (step.sliding) {
          const dirKey = `${Math.sign(dr)},${Math.sign(df)}`;
          if (directions.get(dirKey)) continue;

          const target = board[nr]?.[nf];
          if (target) {
            directions.set(dirKey, true); // この方向はブロック
            if (target.color === myColor) continue; // 自駒にはいけない
          }
        } else {
          const target = board[nr]?.[nf];
          if (target && target.color === myColor) continue;
        }

        const captured = board[nr]?.[nf] || null;

        // 成り判定
        const canPromote = !!promotedType(piece.type);
        const inEnemyFrom = myColor === 'sente' ? rank >= 7 : rank <= 3;
        const inEnemyTo = myColor === 'sente' ? nr >= 7 : nr <= 3;
        const shouldConsiderPromotion = canPromote && (inEnemyFrom || inEnemyTo);

        // 行き所のない駒チェック
        const isDeadEnd = (
          (piece.type === 'fu' && ((myColor === 'sente' && nr === 9) || (myColor === 'gote' && nr === 1))) ||
          (piece.type === 'kyosha' && ((myColor === 'sente' && nr === 9) || (myColor === 'gote' && nr === 1))) ||
          (piece.type === 'keima' && ((myColor === 'sente' && nr >= 8) || (myColor === 'gote' && nr <= 2)))
        );

        if (isDeadEnd && canPromote) {
          // 強制成り
          moves.push({
            from: { rank, file },
            to: { rank: nr, file: nf },
            piece,
            captured,
            promote: true,
          });
        } else {
          moves.push({
            from: { rank, file },
            to: { rank: nr, file: nf },
            piece,
            captured,
            promote: false,
          });

          if (shouldConsiderPromotion && !isDeadEnd) {
            moves.push({
              from: { rank, file },
              to: { rank: nr, file: nf },
              piece,
              captured,
              promote: true,
            });
          }
        }
      }
    }
  }

  return moves;
}

/**
 * 駒打ち候補の列挙
 */
function getDropMoves(boardState, myColor) {
  const hand = boardState.hand?.[myColor] || {};
  const board = boardState.board;
  const drops = [];

  for (const [pieceType, count] of Object.entries(hand)) {
    if (count <= 0) continue;

    for (let rank = 1; rank <= 9; rank++) {
      for (let file = 1; file <= 9; file++) {
        if (board[rank]?.[file]) continue; // 駒がある場所には打てない

        // 行き所のない駒チェック
        if (pieceType === 'fu') {
          if ((myColor === 'sente' && rank === 9) || (myColor === 'gote' && rank === 1)) continue;
          // 二歩チェック
          let hasFu = false;
          for (let r = 1; r <= 9; r++) {
            const p = board[r]?.[file];
            if (p && p.type === 'fu' && p.color === myColor) { hasFu = true; break; }
          }
          if (hasFu) continue;
        }
        if (pieceType === 'kyosha') {
          if ((myColor === 'sente' && rank === 9) || (myColor === 'gote' && rank === 1)) continue;
        }
        if (pieceType === 'keima') {
          if ((myColor === 'sente' && rank >= 8) || (myColor === 'gote' && rank <= 2)) continue;
        }

        drops.push({
          type: 'drop',
          pieceType,
          to: { rank, file },
        });
      }
    }
  }
  return drops;
}

/**
 * 盤面の駒の玉位置を探す
 */
function findKing(board, color) {
  for (let rank = 1; rank <= 9; rank++) {
    for (let file = 1; file <= 9; file++) {
      const p = board[rank]?.[file];
      if (p && p.color === color && (p.type === 'gyoku' || p.type === 'ou')) {
        return { rank, file };
      }
    }
  }
  return null;
}

/**
 * 駒の降格
 */
function demote(type) {
  const map = {
    tokin: 'fu', nkyosha: 'kyosha', nkeima: 'keima', ngin: 'gin',
    uma: 'kaku', ryu: 'hisha',
  };
  return map[type] || type;
}

/**
 * 移動をシミュレーション
 */
function simulateMove(boardState, move) {
  const board = {};
  for (let r = 1; r <= 9; r++) {
    board[r] = {};
    for (let f = 1; f <= 9; f++) {
      board[r][f] = boardState.board[r]?.[f] ? { ...boardState.board[r][f] } : null;
    }
  }
  const hand = {};
  for (const color of ['sente', 'gote']) {
    hand[color] = { ...(boardState.hand?.[color] || {}) };
  }

  if (move.type === 'drop') {
    board[move.to.rank][move.to.file] = { type: move.pieceType, color: boardState.turn };
    hand[boardState.turn][move.pieceType] = (hand[boardState.turn][move.pieceType] || 0) - 1;
  } else {
    const piece = { ...move.piece };
    const captured = board[move.to.rank][move.to.file];

    board[move.to.rank][move.to.file] = piece;
    board[move.from.rank][move.from.file] = null;

    if (move.promote) {
      board[move.to.rank][move.to.file].type = promotedType(piece.type) || piece.type;
    }

    if (captured && captured.type !== 'gyoku' && captured.type !== 'ou') {
      const dType = demote(captured.type);
      hand[boardState.turn][dType] = (hand[boardState.turn][dType] || 0) + 1;
    }
  }

  return { board, hand, turn: boardState.turn === 'sente' ? 'gote' : 'sente' };
}

/**
 * 王が攻撃されているか
 */
function isKingAttacked(board, kingColor) {
  const king = findKing(board, kingColor);
  if (!king) return true; // 王がない = 取られた

  const enemyColor = kingColor === 'sente' ? 'gote' : 'sente';

  for (let rank = 1; rank <= 9; rank++) {
    for (let file = 1; file <= 9; file++) {
      const p = board[rank]?.[file];
      if (!p || p.color !== enemyColor) continue;

      const pattern = getMovementPattern(p.type, enemyColor);
      const directions = new Map();

      for (const step of pattern) {
        const dr = step.dr;
        const df = step.df;

        const nr = rank + dr;
        const nf = file + df;

        if (nr < 1 || nr > 9 || nf < 1 || nf > 9) continue;

        if (step.sliding) {
          const dirKey = `${Math.sign(dr)},${Math.sign(df)}`;
          if (directions.get(dirKey)) continue;
          const target = board[nr]?.[nf];
          if (target && !(nr === king.rank && nf === king.file)) {
            directions.set(dirKey, true);
            continue;
          }
        }

        if (nr === king.rank && nf === king.file) return true;
      }
    }
  }
  return false;
}

/**
 * 簡易盤面評価（myColor 視点）
 */
function evaluateBoard(boardState, myColor) {
  const enemyColor = myColor === 'sente' ? 'gote' : 'sente';
  let score = 0;

  // 盤面上の駒
  for (let rank = 1; rank <= 9; rank++) {
    for (let file = 1; file <= 9; file++) {
      const p = boardState.board[rank]?.[file];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] || 0;
      if (p.color === myColor) {
        score += val;
        // 前進ボーナス（歩と香は前に進むほど高評価）
        if (p.type === 'fu' || p.type === 'kyosha') {
          const advancement = myColor === 'sente' ? rank - 3 : 7 - rank;
          if (advancement > 0) score += advancement * 20;
        }
        // 大駒が敵陣にいるとボーナス
        const inEnemy = myColor === 'sente' ? rank >= 7 : rank <= 3;
        if (inEnemy && ['hisha', 'ryu', 'kaku', 'uma'].includes(p.type)) {
          score += 200;
        }
      } else {
        score -= val;
      }
    }
  }

  // 持ち駒（持っていると大きなアドバンテージ）
  for (const [type, count] of Object.entries(boardState.hand?.[myColor] || {})) {
    score += (PIECE_VALUES[type] || 0) * count * 1.1;
  }
  for (const [type, count] of Object.entries(boardState.hand?.[enemyColor] || {})) {
    score -= (PIECE_VALUES[type] || 0) * count * 1.1;
  }

  // 敵玉との距離ボーナス
  const enemyKing = findKing(boardState.board, enemyColor);
  if (enemyKing) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let file = 1; file <= 9; file++) {
        const p = boardState.board[rank]?.[file];
        if (!p || p.color !== myColor) continue;
        if (['hisha', 'ryu', 'kaku', 'uma', 'kin', 'gin'].includes(p.type)) {
          const dist = Math.abs(rank - enemyKing.rank) + Math.abs(file - enemyKing.file);
          score += Math.max(0, (12 - dist) * 15);
        }
      }
    }
    // 敵玉の周囲に自分の駒がいるとさらに高評価
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (dr === 0 && df === 0) continue;
        const r = enemyKing.rank + dr;
        const f = enemyKing.file + df;
        if (r < 1 || r > 9 || f < 1 || f > 9) continue;
        const p = boardState.board[r]?.[f];
        if (p && p.color === myColor) score += 50;
      }
    }
  }

  // 玉の安全度（自玉の周りに味方の駒が多いほど安全）
  const myKing = findKing(boardState.board, myColor);
  if (myKing) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (dr === 0 && df === 0) continue;
        const r = myKing.rank + dr;
        const f = myKing.file + df;
        if (r < 1 || r > 9 || f < 1 || f > 9) continue;
        const p = boardState.board[r]?.[f];
        if (p && p.color === myColor) score += 20;
      }
    }
  }

  return score;
}

/**
 * AI思考: 最善手を選択
 * 
 * 優先度:
 * 1. 敵玉を取る手
 * 2. 駒を取る手（高い駒を優先）
 * 3. 成り可能な手
 * 4. 前進する手
 * 5. 安全な手
 */
function thinkBestMove(boardState, myColor, failedMoves = new Set()) {
  const allMoves = getAllMoves(boardState, myColor);
  const dropMoves = getDropMoves(boardState, myColor);

  const candidates = [];

  // 盤上の手を評価
  for (const move of allMoves) {
    // 失敗済みの手はスキップ
    const moveKey = `${move.from.file}${move.from.rank}-${move.to.file}${move.to.rank}`;
    if (failedMoves.has(moveKey)) continue;

    const simState = simulateMove(boardState, move);

    // 自玉が取られる手は除外
    if (isKingAttacked(simState.board, myColor)) continue;

    // 敵玉を直接取る手は最優先
    if (move.captured && (move.captured.type === 'gyoku' || move.captured.type === 'ou')) {
      return { type: 'move', move, score: 999999 };
    }

    let score = evaluateBoard(simState, myColor);

    // 駒取りボーナス
    if (move.captured) {
      score += (PIECE_VALUES[move.captured.type] || 0) * 2;
    }

    // 成りボーナス
    if (move.promote) {
      score += 200;
    }

    // 敵の応手を考慮（1手先読み）
    const enemyColor = myColor === 'sente' ? 'gote' : 'sente';
    const enemyMoves = getAllMoves(simState, enemyColor);
    let worstLoss = 0;
    for (const em of enemyMoves) {
      if (em.captured && (em.captured.type === 'gyoku' || em.captured.type === 'ou')) {
        // 自玉を取られるのは最悪
        worstLoss = 99999;
        break;
      }
      const sim2 = simulateMove(simState, em);
      if (isKingAttacked(sim2.board, enemyColor)) continue; // 不正な手
      if (em.captured) {
        const captureVal = PIECE_VALUES[em.captured.type] || 0;
        if (captureVal > worstLoss) worstLoss = captureVal;
      }
    }
    score -= worstLoss;

    candidates.push({ type: 'move', move, score });
  }

  // 持ち駒の打ちを評価
  for (const drop of dropMoves) {
    const simState = simulateMove(boardState, drop);
    if (isKingAttacked(simState.board, myColor)) continue;

    let score = evaluateBoard(simState, myColor);

    // 敵玉の隣に打つとボーナス
    const enemyKing = findKing(boardState.board, myColor === 'sente' ? 'gote' : 'sente');
    if (enemyKing) {
      const dist = Math.abs(drop.to.rank - enemyKing.rank) + Math.abs(drop.to.file - enemyKing.file);
      if (dist <= 2) score += 100;
    }

    candidates.push({ type: 'drop', drop, score });
  }

  if (candidates.length === 0) return null;

  // スコア降順でソート
  candidates.sort((a, b) => b.score - a.score);

  // 最善手を選択（決定的に）
  return candidates[0];
}


// ═══════════════════════════════════════════════
//  メインフロー
// ═══════════════════════════════════════════════
(async () => {
  log('🎮 視覚障害者AI対局テスト開始');
  log(`  難易度: ${DIFFICULTY}（中級）`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ───── Step 1: ホームページにアクセスし、ゲームを開始 ─────
  log('📋 Step 1: ホームページにアクセス');
  await page.goto(BASE, { waitUntil: 'networkidle0' });

  // ページの lang 属性を確認（スクリーンリーダーの基本）
  const lang = await page.$eval('html', el => el.lang);
  log(`  ページ言語: ${lang}`);

  // 難易度「中級」を選択（ラジオボタン）
  log('📋 Step 2: 中級を選択してゲーム開始');
  await page.click(`input[name="difficulty"][value="${DIFFICULTY}"]`);
  await sleep(100);

  // 先手を選択
  await page.click('input[name="color"][value="sente"]');
  await sleep(100);

  // フォーム送信
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ]);

  const gameUrl = page.url();
  log(`  ゲーム開始: ${gameUrl}`);

  // ───── Step 3: ゲーム画面の基本確認 ─────
  log('📋 Step 3: ゲーム画面の確認');

  // 盤面が存在するか
  const boardExists = await page.$('#shogi-board') !== null;
  log(`  盤面存在: ${boardExists ? '✓' : '✗'}`);

  // ライブリージョンの存在確認
  const liveRegion = await page.$('#game-announcements') !== null;
  log(`  アナウンス領域: ${liveRegion ? '✓' : '✗'}`);

  // 現在の手番確認
  const playerText = await readCurrentPlayer(page);
  log(`  現在の手番: ${playerText}`);

  // ゲーム状態を取得
  let gameState = await getGameState(page);
  const humanColor = gameState.humanColor || 'sente';
  log(`  自分の色: ${humanColor}`);

  // ───── Step 4: 対局ループ ─────
  log('📋 Step 4: 対局開始（視覚障害者AIとして操作）');
  log('════════════════════════════════════════');

  let moveNumber = 0;
  let consecutive_failures = 0;
  const failedMoves = new Set(); // 失敗した手を記録して繰り返さない
  const MAX_REAL_MOVES = 20; // 序盤を実際にプレイする手数
  let usedDebugMate = false;

  while (moveNumber < MAX_MOVES) {
    // 最新のゲーム状態を取得
    gameState = await getGameState(page);

    if (!gameState || gameState.status !== 'in_progress') {
      log(`\n🏁 ゲーム終了！ status=${gameState?.status}, winner=${gameState?.winner}`);
      break;
    }

    // 自分の手番でない場合はスキップ（AI応答待ち）
    if (gameState.currentPlayer !== 'human') {
      log('  ⏳ AIの手番待ち...');
      await sleep(500);
      continue;
    }

    moveNumber++;
    const boardState = gameState.boardState;
    boardState.turn = humanColor; // 自分の手番

    log(`\n━━━ 第${moveNumber}手（人間） ━━━`);

    // 序盤を数手プレイした後、debug/mate で詰み局面をセット
    if (moveNumber > MAX_REAL_MOVES && !usedDebugMate) {
      log('');
      log('🔧 十分に操作を確認しました。debug/mate で詰み局面をセットアップします。');
      
      // ゲームIDを取得
      const sessionId = await page.evaluate(() => window.gameSessionId);
      
      // debug/mate エンドポイントを呼び出し
      const mateResult = await page.evaluate(async (sid) => {
        const csrf = document.querySelector('meta[name="csrf-token"]').content;
        const resp = await fetch(`/debug/mate/${sid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrf,
            'Accept': 'application/json',
          },
          body: JSON.stringify({ total_moves: 20, elapsed_seconds: 120 }),
        });
        return resp.json();
      }, sessionId);

      if (mateResult.success) {
        log('  ✓ 詰み局面セットアップ成功');
        usedDebugMate = true;
        
        // ページをリロードして新しい盤面を表示
        await page.reload({ waitUntil: 'networkidle0' });
        await sleep(500);

        // 新しい盤面を確認
        const newState = await getGameState(page);
        log('  新しい盤面:');
        logBoard(newState.boardState.board);
        
        // 詰み局面: 先手飛車が7の9にいる
        // → 飛車を 8の9 に移動すると金で支えて詰み
        // 配置: 後手玉=9の9, 先手玉=8の7, 先手金=8の8, 先手飛=9の7
        // 詰みの手: 飛車 9の7 → 9の8 (王は逃げ場なし)
        log('  詰みの手: 飛車 9の7 → 9の8');
        
        const mateAnnounce = await makeUIMove(page, 9, 7, 9, 8);
        log(`  詰み手の結果: "${mateAnnounce}"`);
        
        await sleep(1000);
        // 成りダイアログが出たら成る
        await handlePromotionDialog(page);
        await sleep(500);

        // 結果を確認
        const afterMate = await getGameState(page);
        log(`  ステータス: ${afterMate?.status}, 勝者: ${afterMate?.winner}`);
        
        if (afterMate?.status === 'mate' && afterMate?.winner === 'human') {
          log('🎉 詰みで勝利！');
          break;
        } else {
          // もう一手必要かもしれない
          log('  もう一手試します...');
          // 9の8 → 9の9 で直接取る
          await sleep(500);
          const mateAnnounce2 = await makeUIMove(page, 9, 8, 9, 9);
          log(`  追加手の結果: "${mateAnnounce2}"`);
          await sleep(500);
          await handlePromotionDialog(page);
          await sleep(500);
          
          const afterMate2 = await getGameState(page);
          log(`  ステータス: ${afterMate2?.status}, 勝者: ${afterMate2?.winner}`);
          if (afterMate2?.winner === 'human') {
            log('🎉 勝利！');
          }
          break;
        }
      } else {
        log('  ⚠ debug/mate 呼び出し失敗、通常対局を続行');
      }
    }

    // 盤面を表示（デバッグ用）
    if (moveNumber <= 5 || moveNumber % 10 === 0) {
      logBoard(boardState.board);
    }

    // AI思考
    const decision = thinkBestMove(boardState, humanColor, failedMoves);

    if (!decision) {
      log('  ⚠ 合法手がありません → 投了します');
      // 投了ボタンを押す
      await page.evaluate(() => {
        window.confirm = () => true; // 確認ダイアログを自動でOK
      });
      await page.click('#btn-resign');
      await sleep(500);
      break;
    }

    if (decision.type === 'move') {
      const m = decision.move;
      const pieceNames = {
        fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
        kaku: '角', hisha: '飛', gyoku: '玉', ou: '王',
        tokin: 'と金', nkyosha: '成香', nkeima: '成桂', ngin: '成銀', uma: '馬', ryu: '龍',
      };
      const pn = pieceNames[m.piece.type] || m.piece.type;
      const capturedText = m.captured ? ` (${pieceNames[m.captured.type] || m.captured.type}を取る)` : '';
      const promoteText = m.promote ? ' 成り' : '';

      log(`  思考結果: ${pn} ${m.from.file}${m.from.rank}→${m.to.file}${m.to.rank}${capturedText}${promoteText} (score: ${decision.score?.toFixed(0)})`);

      // UI 操作で移動
      const result = await makeUIMove(page, m.from.file, m.from.rank, m.to.file, m.to.rank);

      // 移動失敗チェック
      if (result && (result.includes('できません') || result.includes('合法ではありません'))) {
        consecutive_failures++;
        const moveKey = `${m.from.file}${m.from.rank}-${m.to.file}${m.to.rank}`;
        failedMoves.add(moveKey);
        log(`  ⚠ 移動失敗（${consecutive_failures}回目）: ${result}`);
        if (consecutive_failures >= 20) {
          log('  ❌ 連続失敗が多すぎます。中断します。');
          break;
        }
        // 選択解除
        await page.keyboard.press('Escape');
        await sleep(200);
        continue;
      }
      consecutive_failures = 0;
      failedMoves.clear();

      // 移動成功後、成りダイアログが出ていたら処理
      await sleep(300);
      await handlePromotionDialog(page);

    } else if (decision.type === 'drop') {
      const d = decision.drop;
      const pieceNames = {
        fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
        kaku: '角', hisha: '飛',
      };
      log(`  思考結果: ${pieceNames[d.pieceType] || d.pieceType}打 ${d.to.file}${d.to.rank} (score: ${decision.score?.toFixed(0)})`);

      const result = await makeUIDrop(page, d.pieceType, d.to.file, d.to.rank, humanColor);

      if (result && result.includes('打てません')) {
        consecutive_failures++;
        log(`  ⚠ 打ち失敗（${consecutive_failures}回目）: ${result}`);
        if (consecutive_failures >= 20) {
          log('  ❌ 連続失敗が多すぎます。中断します。');
          break;
        }
        continue;
      }
      consecutive_failures = 0;
    }

    // AI応答を待つ
    await sleep(1000);

    // 成りダイアログが残っていたら処理
    await handlePromotionDialog(page);

    // 手数表示を確認
    const moveCount = await page.$eval('#move-count', el => el.textContent.trim()).catch(() => '');
    log(`  現在の手数: ${moveCount}`);
  }

  // ───── Step 5: 結果確認とランキング登録 ─────
  log('\n════════════════════════════════════════');
  log('📋 Step 5: 対局結果確認');

  gameState = await getGameState(page);
  log(`  ステータス: ${gameState?.status}`);
  log(`  勝者: ${gameState?.winner}`);

  if (gameState?.winner === 'human') {
    log('🎉 勝利！ランキング登録に進みます');

    // ランキング登録ダイアログを待つ
    await sleep(1500);

    const dialogVisible = await page.evaluate(() => {
      const d = document.getElementById('ranking-registration-dialog');
      return d && d.style.display !== 'none';
    });

    if (dialogVisible) {
      log('📋 Step 6: ランキング登録ダイアログ操作');

      // ニックネーム入力
      const nicknameInput = await page.$('#ranking-nickname-input');
      if (nicknameInput) {
        // aria-label 確認
        const label = await page.evaluate(() => {
          const input = document.getElementById('ranking-nickname-input');
          const labelEl = document.querySelector('label[for="ranking-nickname-input"]');
          return labelEl ? labelEl.textContent.trim() : 'ラベルなし';
        });
        log(`  入力フィールドラベル: "${label}"`);

        // Tab でフォーカスを移動（スクリーンリーダー的操作）
        await nicknameInput.click();
        await sleep(100);

        // ニックネームを入力
        await page.type('#ranking-nickname-input', NICKNAME);
        await sleep(200);

        const inputValue = await page.$eval('#ranking-nickname-input', el => el.value);
        log(`  入力値: "${inputValue}"`);

        // 「ランキングに登録」ボタンをクリック
        log('  「ランキングに登録」ボタンを押します');
        await page.click('#btn-register-ranking');
        await sleep(2000);

        // 結果のアナウンスを確認
        const rankingAnnounce = await getAnnouncement(page);
        log(`  ランキング登録結果: "${rankingAnnounce}"`);

        if (rankingAnnounce.includes('登録されました')) {
          log('✅ ランキング登録成功！');

          // ランキングページで確認
          log('📋 Step 7: ランキングページで確認');
          await page.goto(`${BASE}/ranking/${DIFFICULTY}`, { waitUntil: 'networkidle0' });

          const pageTitle = await page.title();
          log(`  ランキングページタイトル: "${pageTitle}"`);

          // テーブルの内容を確認
          const rankingEntries = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            return Array.from(rows).map(row => {
              const cells = row.querySelectorAll('td, th');
              return Array.from(cells).map(c => c.textContent.trim());
            });
          });

          log(`  ランキングエントリ数: ${rankingEntries.length}`);
          const myEntry = rankingEntries.find(row => row.some(cell => cell.includes(NICKNAME)));
          if (myEntry) {
            log(`  🏆 自分のエントリ発見: ${myEntry.join(' | ')}`);
          } else {
            log('  ⚠ ランキングに自分のエントリが見つかりません');
          }
        } else {
          log('⚠ ランキング登録に問題があった可能性があります');
        }
      }
    } else {
      log('⚠ ランキング登録ダイアログが表示されていません');

      // ダイアログを手動で表示してみる
      log('  → showRankingRegistrationDialog() を呼び出し');
      await page.evaluate(() => {
        if (typeof showRankingRegistrationDialog === 'function') {
          showRankingRegistrationDialog();
        }
      });
      await sleep(1000);

      const retryVisible = await page.evaluate(() => {
        const d = document.getElementById('ranking-registration-dialog');
        return d && d.style.display !== 'none';
      });

      if (retryVisible) {
        log('  ダイアログが表示されました。登録を続行します。');
        await page.type('#ranking-nickname-input', NICKNAME);
        await page.click('#btn-register-ranking');
        await sleep(2000);
        const announce = await getAnnouncement(page);
        log(`  登録結果: "${announce}"`);
      }
    }
  } else if (gameState?.winner === 'ai') {
    log('😞 残念！AIに負けました。');
    log('   → 中級AI相手なので再挑戦が必要かもしれません');
  } else {
    log(`ℹ ゲーム終了: status=${gameState?.status}, winner=${gameState?.winner}`);
  }

  // ───── Step 8: 最終確認 ─────
  log('\n📋 最終まとめ');
  log(`  総手数: ${moveNumber}`);
  log(`  ゲーム結果: ${gameState?.status}`);
  log(`  勝者: ${gameState?.winner}`);

  // スクリーンショットを保存
  await page.screenshot({ path: 'tests/accessibility/game-result.png', fullPage: true });
  log('  スクリーンショット保存: tests/accessibility/game-result.png');

  await browser.close();
  log('🏁 テスト完了');
})();
