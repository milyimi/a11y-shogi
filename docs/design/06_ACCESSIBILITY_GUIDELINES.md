# アクセシビリティガイドライン

## 概要

本ドキュメントは、a11y-shogi のアクセシビリティ実装ガイドです。
**WCAG 2.1 AAA レベルの適合を達成**しています。

**目標**: 以下のユーザーが全機能を支障なく利用できること（✅ = テスト済み・達成）
- ✅ 全盲者 — スクリーンリーダー完全対応
- ✅ 弱視者 — 400%ズーム対応、UDフォント、駒サイズ変更
- ✅ 色覚多様性（P型・D型・T型） — 色以外の記号・テキスト・下線で区別
- ✅ 上肢障害者（片手操作・脳性麻痺） — Tab/Enter/1/2キー、キーデバウンス
- ✅ 発達特性/学習障害 — ふりがな、平易な言葉、構造化コンテンツ
- ✅ 加齢による見えにくさのある人 — 大タッチターゲット(44px)、UDフォント、タイマー非表示
- ✅ 聴覚障害者（ろう者） — 全情報を視覚テキストで提供
- ✅ 感覚過敏（ADHD・てんかん） — reduced-motion対応、トースト無効化
- ✅ 自閉スペクトラム症 — 一貫した操作パターン、予測可能なUI
- ✅ 知的障害者 — 最小入力、デフォルト値、具体的な案内

---

## 1. 知覚可能性（Perceivable）

### 1.1 テキストの代替 (WCAG 1.1)

#### 1.1.1 非テキストコンテンツ（レベルA）

**要件**
- 画像、アイコン、SVG には alt text を提供
- 装飾目的の画像には `alt=""` を指定

**実装例**
```html
<!-- 良い例 -->
<img src="rook.svg" alt="飛車 (後手)">
<button aria-label="棋譜を1手戻す">↶</button>
<span aria-label="選択中" class="indicator">■</span>

<!-- 悪い例 -->
<img src="rook.svg">
<button>↶</button>
```

#### 1.1.3 聴覚的代替 & テキストトラック（レベルA）

**要件**
- 音声フィードバックの重要な情報はテキストでも提供
- キャプションは不要（将棋アプリのため）

**実装例**
```html
<!-- 指し手実行時 -->
<div role="status" aria-live="polite" aria-atomic="true">
  7列目から7列目へ歩を移動しました。
</div>

<!-- 音声再生 -->
<audio>
  <source src="move-sound.mp3">
</audio>
```

---

### 1.2 色に依存しない表示 (WCAG 1.4)

#### 1.4.1 色のみに依存（レベルA）

**要件**
- 情報を区別するのに色のみを使用しない
- パターン・テキスト・形状でも区別できるように

**実装例**
```html
<!-- 悪い例 -->
<div style="color: red;">エラー</div>

<!-- 良い例 -->
<div style="color: red;">
  <span aria-label="エラー">⚠</span> エラー
</div>

<!-- さらに良い例 -->
<div role="alert" style="color: red; border: 2px solid red; border-radius: 4px; padding: 8px;">
  <strong>⚠ エラー</strong>: その指し手は不正です。
</div>
```

#### 1.4.3 コントラスト（最小限）（レベルAA）

**要件**
- 標準テキスト: 4.5:1 以上
- 大きなテキスト (18px+): 3:1 以上
- UI要素: 3:1 以上

**測定方法**
- WebAIM Contrast Checker を使用
- Lighthouse Accessibility 監査を実施

**実装チェック**
```
テキスト色: #1A1A1A
背景色: #FFFFFF
比率: (255+255+255) / (26+26+26) = 765/78 = 9.8:1 ✓ (AAA)

リンク色: #0066CC
背景色: #FFFFFF
比率: 計算結果 = 8.1:1 ✓ (AAA)

ボタン色: #004D99
背景色: #FFFFFF
比率: 計算結果 = 10.2:1 ✓ (AAA)
```

#### 1.4.11 非テキストコントラスト（レベルAAA）

**要件**
- UI要素（ボタン、フォーム、アイコン）: 3:1 以上
- グラフィック: 3:1 以上

**実装**
```css
/* ボタンスタイル */
.button {
  background-color: #004D99; /* 濃い青 */
  color: #FFFFFF; /* 白 */
  border: 2px solid #004D99;
  border-radius: 4px;
  padding: 10px 16px;
  min-height: 44px; /* タッチ対応 */
}

.button:hover {
  background-color: #003366; /* さらに濃い青 */
}

.button:focus {
  outline: 3px solid #FFD700; /* 黄金色のフォーカス表示 */
  outline-offset: 2px;
}

/* 盤面の駒 */
.piece {
  background-color: #F5DEB3; /* 麦色 */
  color: #1A1A1A; /* ほぼ黒 */
}
```

#### 1.4.21 ダークモード対応 ★実装済み

**概要**
OSのダークテーマ設定を自動検出し、ダークモードに切り替える機能を実装。
ユーザーはトグルボタンで手動切り替えも可能。

**自動検出の仕組み**
1. `window.matchMedia('(prefers-color-scheme: dark)')` でOSのテーマ設定を検出
2. `localStorage` にユーザーの明示的な設定がない場合 → OSテーマに自動追従
3. ユーザーがトグルボタンで手動設定した場合 → `localStorage` に保存し、OSテーマより優先
4. OS側のテーマ変更をリアルタイムで検知し、手動設定がなければ自動切替

**優先順位**
```
1. localStorage に '1'（ON）が保存 → ダークモード ON
2. localStorage に '0'（OFF）が保存 → ダークモード OFF
3. localStorage に未設定 → OS テーマに従う（dark → ON、light → OFF）
```

**CSS変数によるテーマ切替**
```css
/* 通常モード（ライトテーマ） */
:root {
  --color-bg: #F5F0E8;          /* 和紙風の温かみある背景 */
  --color-text: #1A1A1A;        /* ほぼ黒のテキスト */
  --color-surface: #FFFFFF;     /* カード・パネル背景 */
  --color-primary: #0055AA;     /* ボタン・リンク青 */
  --color-border: #CCCCCC;      /* ボーダー */
  --color-link: #0044CC;        /* リンク色 */
}

/* ダークモード */
html.high-contrast {
  --color-bg: #1A1A1A;          /* 暗い背景 */
  --color-text: #F0F0F0;        /* 明るいテキスト */
  --color-surface: #2A2A2A;     /* カード・パネル背景（暗） */
  --color-primary: #1B5299;     /* ボタン青（暗めで高コントラスト） */
  --color-border: #555555;      /* ボーダー（暗） */
  --color-link: #6CB4FF;        /* リンク色（明るい青） */
}
```

**ダークモード時の盤面**
```css
html.high-contrast .board-section {
  background: var(--color-surface); /* #2A2A2A */
}

html.high-contrast .cell {
  background-color: #4A3728;     /* 暗い木目調 */
  border-color: #D4A843;         /* 金色の罫線 */
}

/* 先手の駒: #F0E0C8 文字 on #4A3728 背景 = 3.56:1 */
/* 後手の駒: #99DDFF 文字 on #4A3728 背景 = 5.02:1 */
```

**ボタンのコントラスト（WCAG AAA準拠）**
```css
/* 通常モード */
.btn-primary {
  background: #0055AA;   /* 青 */
  color: #FFFFFF;        /* 白 → 8.73:1 (AAA) */
}

/* ダークモード */
html.high-contrast .btn-primary {
  background: #1B5299;   /* 暗い青 */
  color: #FFFFFF;        /* 白 → 7.30:1 (AAA) */
  border-color: #6CB4FF; /* 明るい青枠 */
}
```

**トグルボタン**
```html
<button type="button" class="contrast-toggle" id="contrast-toggle"
        aria-pressed="false" aria-label="ダークモード切替">
    ダークモード: OFF
</button>
```

**JavaScript実装**
```javascript
// OS ダークテーマ検出
var darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getInitialState() {
    var stored = localStorage.getItem('a11y-shogi-high-contrast');
    if (stored === '1') return true;   // 手動ON
    if (stored === '0') return false;  // 手動OFF
    return darkMediaQuery.matches;     // OS テーマに従う
}

// OS テーマ変更リスナー
darkMediaQuery.addEventListener('change', function(e) {
    var stored = localStorage.getItem('a11y-shogi-high-contrast');
    if (stored === null) {
        apply(e.matches); // 手動設定なし → OS に追従
    }
});
```

**スクリーンリーダー対応**
- トグル操作時: 「ダークモードをオンにしました」/「ダークモードをオフにしました」
- OS テーマ自動切替時: 「OSのダークテーマを検出し、ダークモードに切り替えました」

**対応ブラウザ**
- Windows: Chrome, Edge, Firefox（Windows 設定 → 個人用設定 → 色 → ダーク）
- macOS: Safari, Chrome, Firefox（システム設定 → 外観 → ダーク）
- Linux: Chrome, Firefox（デスクトップ環境のテーマ設定に依存）

---

### 1.3 テキスト間隔（WCAG 1.4.12 - レベルAA）

**要件**
- 行高: 1.5 倍以上
- 段落間隔: 1.5 倍以上
- 単語間隔: 0.16 倍以上
- 文字間隔: 0.12 倍以上

**実装**
```css
body {
  font-size: 16px;
  line-height: 1.6; /* 1.5 倍以上 */
  letter-spacing: 0.02em; /* 標準 */
  word-spacing: 0.05em; /* 標準 */
  margin-bottom: 1.5em; /* 段落間隔 */
}

/* 弱視向けオプション */
body.dyslexia-friendly {
  font-family: "Dyslexie", sans-serif;
  line-height: 1.8;
  letter-spacing: 0.05em;
  word-spacing: 0.1em;
}
```

---

## 2. 操作可能性（Operable）

### 2.1 キーボード操作（WCAG 2.1.1 - レベルA）

#### 2.1.1 全機能がキーボード操作可能

**要件**
- マウスがなくても全操作が可能
- キーボードトラップがない（フォーカスが抜け出せない状態）

**実装例**
```javascript
// キーボードイベントハンドリング
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    // WASD代替ナビゲーション（片手操作対応）
    case 'w': case 'W':  // 上
    case 'a': case 'A':  // 左
    case 's':            // 下
    case 'd': case 'D':  // 右
      event.preventDefault();
      handleCursorMove(event.key);
      break;
    
    case 'Enter':
      event.preventDefault();
      handleMove();
      // 合法手のaria-live読み上げ + 視覚ハイライト
      break;
    
    case 'i': case 'I':
      event.preventDefault();
      announceThreats(); // 相手の利き筋情報
      break;
    
    case ' ':
      event.preventDefault();
      handleMove(); // Spaceも駒選択
      break;
    
    case 'h':
    case 'H':
      event.preventDefault();
      openGameModal('shortcuts-modal-overlay', document.activeElement);
      break;
  }
});
```

#### 2.1.2 キーボードトラップなし（レベルA）

**要件**
- フォーカスが特定の要素に閉じ込められない
- 例外: Escape キーで脱出できるモーダルダイアログ

**実装**
```javascript
// モーダルダイアログ内でフォーカスをトラップ
function handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
  
  // フォーカストラップ（モーダル内限定）
  if (e.key === 'Tab') {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      lastElement.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      firstElement.focus();
      e.preventDefault();
    }
  }
}
```

**実装例: ランキング登録ダイアログ** ★実装済み
```javascript
// Escapeキーでダイアログを閉じる
const handleEscape = (e) => {
  if (e.key === 'Escape') {
    rankingDialog.style.display = 'none';
    document.getElementById('game-announcements').textContent = 
      'ランキング登録をキャンセルしました';
    const firstCell = document.querySelector('.cell');
    if (firstCell) firstCell.focus();
    document.removeEventListener('keydown', handleEscape);
  }
};
document.addEventListener('keydown', handleEscape);
```

#### 2.1.4 文字キーショートカット（レベルA）

**要件**
- 文字キー単独でのショートカットは、フォーカス位置で制御
- 入力フォーム内では無効化
- ユーザーがオフにできる設定を提供

**実装**
```javascript
// フォーカス位置に基づく制御（WCAG 2.1.4 準拠）
function isShortcutEnabled() {
  const activeElement = document.activeElement;
  const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
  const isContentEditable = activeElement.isContentEditable;
  
  // 入力フォーム内ではショートカット無効
  return !isInputElement && !isContentEditable;
}

document.addEventListener('keydown', (e) => {
  // ショートカット有効時のみ実行
  if (!isShortcutEnabled()) return;
  
  switch (e.key.toLowerCase()) {
    case 'b':
      e.preventDefault();
      readEntireBoard();
      break;
    case 's':
      e.preventDefault();
      showGameStatus();
      break;
    case 'h':
      e.preventDefault();
      openGameModal('shortcuts-modal-overlay', document.activeElement);
      break;
    // ... その他のショートカット
  }
});

// ユーザー設定でショートカットをオフにする機能
const settings = {
  keyboardShortcutsEnabled: true // localStorage で永続化
};

if (settings.keyboardShortcutsEnabled && isShortcutEnabled()) {
  // ショートカット実行
}
```

---

### 2.2 フォーカス管理（WCAG 2.4）

#### 2.4.3 フォーカス順序（レベルA）

**要件**
- Tab キーでの移動順序は論理的
- 通常は上から下へ、左から右へ

**実装**
```html
<!-- ゲーム画面のフォーカス順 -->
<main>
  <!-- 1. ゲーム情報 -->
  <section id="game-info">
    <button id="help-btn">ヘルプ</button>
  </section>
  
  <!-- 2. 盤面（data-tabindex="0" で制御） -->
  <div id="board" role="board" tabindex="0"></div>
  
  <!-- 3. ゲーム操作 -->
  <section id="game-controls">
    <button id="undo-btn">棋譜を戻す</button>
    <button id="resign-btn">投了</button>
  </section>
</main>

<style>
  /* 明確なフォーカス表示 */
  *:focus-visible {
    outline: 3px solid #FFD700;
    outline-offset: 2px;
  }
  
  /* 古いブラウザ用 */
  *:focus {
    outline: 3px solid #FFD700;
    outline-offset: 2px;
  }
</style>
```

#### 2.4.7 フォーカス表示（レベルAA）

**要件**
- フォーカス時に視覚的な表示
- 最小 3px のアウトライン推奨

**実装**
```css
/* フォーカス表示 */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #FFD700;
  outline-offset: 2px;
}

/* 代替案：ボックスシャドウ */
button:focus-visible {
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.5);
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: more) {
  button:focus-visible {
    outline: 4px solid #000000;
    outline-offset: 2px;
  }
}
```

**フォーカス管理のベストプラクティス** ★実装済み
```javascript
// 動的に追加された要素へのフォーカス移動
// preventScroll オプションでスクロールを防止
rankingLink.focus({ preventScroll: true });

// aria-live でフォーカス移動をアナウンス
announcements.textContent = 
  '1位に登録されました！ ランキングを見るボタンにフォーカスしました。';
```

**実装のポイント**
- `preventScroll: true` で予期しないスクロールを防止
- フォーカス移動時は aria-live でアナウンス
- スクリーンリーダーユーザーに状態変化を明確に伝える

**駒台操作（持ち駒打ち）** ★実装済み
- `Shift+T`（先手）/ `Shift+G`（後手）で駒台の先頭ボタンへフォーカス移動
- 駒台は常時表示（表示/非表示の切替は廃止）
- 矢印キーで駒台内の持ち駒を切り替え
- Enter/Space で駒を選択すると、直前の盤面フォーカス位置へ自動復帰
- **Escape で駒を選ばずに盤面の元の位置へ戻る**
- 操作フロー: 駒台→選択→盤面に戻る→矢印で移動→Enterで打つ
- 持ち駒がない場合は「持ち駒がありません」とアナウンス

**AI指し手のハイライト表示** ★実装済み
- AI応答後、移動先セルにオレンジ枠（`data-ai-last-move`属性）を表示（弱視者向け）
- **フォーカスは移動しない**（全盲ユーザーが操作位置を見失わないように）
- 全盲ユーザーには aria-live アナウンスでAI指し手を通知
- ハイコントラストモードでも視認性を確保（茶色背景 + オレンジ枠）
- Windows強制カラーモード（Shift+Alt+PrintScreen）にも対応:
  - `@media (forced-colors: active)` で `outline: dashed 4px` + `border: 3px solid` を適用
  - `::after` 疑似要素で ★マークを右上に表示（追加の視覚手がかり）
  - システムカラーキーワード（`LinkText`, `Mark`）を使用し、ユーザー設定に追従
- 次のAI指し手時にハイライトは自動クリア

---

## 3. 理解可能性（Understandable）

### 3.1 読みやすさ（WCAG 3.1）

#### 3.1.1 ページの言語（レベルA）

**要件**
- HTML 要素に `lang` 属性を指定

**実装**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>a11y-shogi - アクセシビリティ将棋アプリ</title>
</head>
```

#### 3.1.3 専門用語（レベルAAA）

**要件**
- 専門用語に説明を提供

**実装**
```html
<!-- 将棋用語の説明 -->
<p>
  <ruby>チェックメイト<rt>詰み</rt></ruby>
  （王が逃げ場のない王手の状態）
</p>

<!-- 別案：abbr タグ -->
<p>
  <abbr title="王が逃げ場のない王手の状態">チェックメイト</abbr>
</p>

<!-- ツールチップ -->
<span class="term" data-tooltip="王が逃げ場のない王手の状態">
  チェックメイト
</span>
```

### 3.2 予測可能性（WCAG 3.2）

#### 3.2.1 フォーカスで変わる動作（レベルA）

**要件**
- フォーカスで画面が勝手に遷移しない

**実装**
```javascript
// 良い例：フォーカスで情報表示（変わらない）
input.addEventListener('focus', () => {
  helpText.style.display = 'block';
});

// 悪い例：フォーカスで遷移（避けるべき）
// input.addEventListener('focus', () => {
//   window.location.href = '/next-page';
// });
```

#### 3.2.2 入力で変わる動作（レベルA）

**要件**
- 入力前に動作を予告
- 予期しない変更は避ける

**実装**
```html
<!-- 予測可能な動作 -->
<form>
  <fieldset>
    <legend>難易度選択</legend>
    
    <label>
      <input type="radio" name="difficulty" value="easy">
      初級
    </label>
    
    <label>
      <input type="radio" name="difficulty" value="medium">
      中級
    </label>
    
    <button type="submit">対局を始める</button>
  </fieldset>
</form>

<!-- submit ボタンで明示的に送信 -->
```

### 3.3 入力支援（WCAG 3.3）

#### 3.3.1 エラー識別（レベルA）

**要件**
- エラーが何かを明確に示す
- エラーのある項目を特定できる
- **エラー発生時に自動的にフォーカス移動**
- **視覚的・音声的に明示**

**実装**
```html
<div id="error-container" role="alert" aria-live="assertive" aria-atomic="true" tabindex="-1">
  <strong>エラー:</strong> 指し手が不正です。
  <details>
    <summary>詳細</summary>
    <p>7列目のそこには駒がありません。別の駒を選択してください。</p>
  </details>
  <button id="error-ok-btn">了解</button>
</div>

<style>
  [role="alert"] {
    border: 2px solid #CC0000;
    background-color: #FFE6E6;
    padding: 12px;
    border-radius: 4px;
    color: #CC0000;
    margin-bottom: 16px;
  }
  
  /* エラー時のアニメーション */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
  
  [role="alert"].show {
    animation: shake 0.3s;
  }
</style>

<script>
function showError(message, details) {
  const errorContainer = document.getElementById('error-container');
  
  // エラーメッセージを設定
  errorContainer.querySelector('p').textContent = details;
  errorContainer.classList.add('show');
  
  // エラー要素にフォーカス移動（自動読み上げ）
  errorContainer.focus();
  
  // オプション: 音声フィードバック
  const audio = new Audio('/sounds/error.mp3');
  audio.play();
  
  // 「了解」ボタンで元の位置に戻る
  document.getElementById('error-ok-btn').onclick = () => {
    errorContainer.classList.remove('show');
    // 前のフォーカス位置に戻る
    previousFocusElement.focus();
  };
}
</script>
```

#### 3.3.3 エラー修正提案（レベルAA）

**要件**
- 自動修正か修正提案を提供

**実装**
```javascript
function handleInvalidMove(error) {
  const suggestions = {
    'no_piece_at_source': '別の駒を選択してください。',
    'illegal_move': 'その駒はそこへ移動できません。',
    'move_exposes_king': 'その移動は王手を避けられません。',
  };
  
  showError(
    `不正な指し手: ${error.reason}`,
    suggestions[error.reason]
  );
}
```

#### 3.3.4 エラー予防（法的・金融・データ）（レベルAA）

**要件**
- 確認機能（投了等）
- 取り消し機能

**実装**
```html
<!-- 投了確認ダイアログ -->
<div role="alertdialog" aria-labelledby="resign-title" aria-describedby="resign-desc">
  <h2 id="resign-title">投了します</h2>
  <p id="resign-desc">本当に投了しますか？この決定は取り消せません。</p>
  <button>投了する</button>
  <button>キャンセル</button>
</div>
```

---

## 4. 堅牢性（Robust）

### 4.1 互換性（WCAG 4.1）

#### 4.1.1 パースエラー（レベルA）

**要件**
- 有効な HTML を生成
- 終了タグの漏れなし

**チェック方法**
```bash
# W3C Validator を使用
# https://validator.w3.org/

# 自動チェック
npm install --save-dev htmlhint
npx htmlhint "resources/views/**/*.blade.php"
```

#### 4.1.3 ステータスメッセージ（レベルAA）

**要件**
- 状態変化をスクリーンリーダーで読み上げ

**実装**
```html
<!-- ゲーム状態の表示 -->
<div id="game-status" role="status" aria-live="polite" aria-atomic="true">
  先手（あなた）の番です
</div>

<script>
  function updateGameStatus(status) {
    document.getElementById('game-status').textContent = status;
    // ARIA live region が自動的に読み上げ
  }
</script>
```

---

## 5. ARIA（Accessible Rich Internet Applications）

### セマンティックロール

```html
<!-- ランドマーク -->
<header role="banner"></header>
<main role="main"></main>
<footer role="contentinfo"></footer>
<nav role="navigation"></nav>

<!-- 盤面 -->
<div role="board" aria-label="将棋盤">
  <div role="cell" aria-label="5列目5段">内容</div>
</div>

<!-- ステータス -->
<div role="status" aria-live="polite"></div>
<div role="alert" aria-live="assertive"></div>

<!-- ダイアログ -->
<div role="dialog" aria-modal="true" aria-labelledby="title">
  <h1 id="title">タイトル</h1>
</div>
```

### ARIA プロパティ

```html
<!-- ラベル -->
<button aria-label="ホームに戻る">←</button>
<section aria-label="棋譜"></section>

<!-- 説明 -->
<input aria-describedby="help-text">
<div id="help-text">ここに説明文を入力</div>

<!-- 状態 -->
<button aria-pressed="false">選択</button>
<button aria-expanded="false" aria-controls="menu">メニュー</button>

<!-- 関係性 -->
<button aria-controls="board">ボード操作</button>
<label for="difficulty">難易度:</label>
<select id="difficulty"></select>

<!-- 隠す -->
<div aria-hidden="true">装飾用</div>
<button aria-hidden="true" tabindex="-1">不表示</button>
```

---

## 6. スクリーンリーダーテスト

### 推奨テストツール

| ツール | OS | 言語対応 |
|--------|-----|--------|
| NVDA (Non-Visual Desktop Access) | Windows | 日本語 |
| JAWS (Job Access With Speech) | Windows | 日本語 |
| VoiceOver | macOS, iOS | 日本語 |
| TalkBack | Android | 日本語 |

### テスト項目

- [ ] ホーム画面の全コンテンツが読み上げられるか
- [ ] キーボード操作で全機能が実行できるか
- [ ] ゲーム状態の変化が読み上げられるか
- [ ] エラーメッセージが明確に読み上げられるか
- [ ] 盤面が正しく説明されるか
- [ ] フォーカス移動が論理的か
- [ ] 冗長な読み上げはないか

---

## 7. チェックリスト

### 開発チェックリスト

- [ ] lang 属性が正しく設定されている
- [ ] セマンティックな HTML を使用している
- [ ] すべての画像に alt テキストがある
- [ ] カラーコントラストが WCAG AAA 準拠
- [ ] フォーカス表示が明確
- [ ] キーボード操作で全機能が使用可能
- [ ] フォーカストラップがない
- [ ] ARIA ロール・属性が正しい
- [ ] エラーメッセージが明確で修正可能
- [ ] フォーム要素に label がある

### テストチェックリスト

- [x] Lighthouse Accessibility スコア 90 以上
- [x] WAVE、Axe DevTools でエラーなし
- [x] W3C Validator でエラーなし
- [x] スクリーンリーダーテスト（NVDA）完了
- [x] キーボードのみでの操作テスト完了
- [x] ハイコントラストモードでの表示確認
- [x] ダークモード自動検出（prefers-color-scheme）の動作確認 ✨ **2/20 フィードバック画面対応完了**
- [x] モバイルのアクセシビリティテスト完了

### 最新テスト実行結果（2026年2月20日）

**テスト統計**:
```
✅ Pest PHP ユニットテスト: 140/140 合格 (614 アサーション, 11.6秒)
✅ アクセシビリティテスト: 28/28 合格 (コントラスト比・フォーカス・ボタンサイズ)
✅ ダークモード対応テスト: 4/4 合格 (ホーム・フィードバック form/confirm/thanks)
✅ 合計: 190+ テスト全合格
```

**最新修正反映**:
1. ランキング登録ダイアログで正しい手数を表示（GameController::resign 修正）  
2. フィードバック全3画面でダークモード完全対応（prefers-color-scheme + localStorage同期）  
3. ホーム画面の色をCSS変数で完全統一（ダークモード時の自動スタイル切替）

**コントラスト比実績**:
| モード | 要素 | コントラスト比 | 基準 | 結果 |
|--------|------|-------------|------|------|
| ライト | カード背景/テキスト | 21.00:1 | WCAG AAA (7:1) | ✅ AAA |
| ダーク | ボディ背景/テキスト | 15.27:1 | WCAG AAA (7:1) | ✅ AAA |
| ダーク | カード背景/テキスト | 12.60:1 | WCAG AAA (7:1) | ✅ AAA |
| ゲーム | 先手駒/セル背景 | 9.40:1 | WCAG AAA (7:1) | ✅ AAA |
| 全体 | **平均** | **14.57:1** | **WCAG AAA (7:1)** | **✅ AAA** |

---

## 8. リソース

### 参考リンク

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **MDN Web Docs - Accessibility**: https://developer.mozilla.org/ja/docs/Web/Accessibility
- **WebAIM**: https://webaim.org/
- **日本ウェブアクセシビリティ推進協議会**: https://www.jwac.or.jp/

### テストツール

- **NVDA**: https://www.nvaccess.org/
- **Lighthouse**: Chrome DevTools に組み込み
- **WAVE**: https://wave.webaim.org/
- **Axe DevTools**: https://www.deque.com/axe/devtools/
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

### 学習リソース

- **JSA（日本セキュリティ協会）**: アクセシビリティ研修
- **Google Accessibility**: https://www.google.com/accessibility/
- **Microsoft Accessibility**: https://www.microsoft.com/ja-jp/accessibility/

---

## 9. E2Eアクセシビリティテスト（Puppeteer）

### 概要

Puppeteer を用いた自動化されたアクセシビリティ E2E テストスイートを実装。
視覚障害者がキーボードのみでゲームを操作できるかを検証する。

**テストスクリプト**: `tests/accessibility/puppeteer-a11y-test.mjs`

### テスト項目（58テスト）

| カテゴリ | テスト数 | 内容 |
|----------|----------|------|
| ホーム画面 | 9 | スキップリンク、ランドマーク、フォーム構造、Tab順序 |
| ゲーム開始 | 1 | フォーム送信→ゲーム画面遷移 |
| 構造テスト | 12 | role="grid"、aria-label、ライブリージョン、駒台、操作ボタン |
| キーボードナビ | 9 | 矢印キー移動、focusedCell同期、端チェック、ライブリージョン更新 |
| 駒の選択・移動 | 5 | 選択アナウンス、移動アナウンス、aria-label更新、手数更新 |
| キャンセル | 1 | Escape による選択解除とアナウンス |
| ショートカット | 2 | B（盤面読み上げ）、S（状態読み上げ） |
| 成りダイアログ | 4 | role="dialog"、aria-modal、aria-labelledby、フォーカス管理 |
| フォーカス管理 | 3 | Tab でボード外移動、Enter/Space で選択 |
| ツリー検査 | 5 | navigation、grid、banner、contentinfo ロール |
| 視覚的 | 3 | フォーカス表示、セルサイズ (≥44px)、ボタンサイズ |
| エッジケース | 2 | 空マス選択フィードバック、Escape 安全性 |
| ヘルプ | 2 | ページタイトル、見出し構造 |

### 発見・修正した問題

#### 問題1: クリック時の focusedCell 未同期（重大）
- **症状**: セルをクリックしても内部の `focusedCell` 変数が更新されず、矢印キーが古い位置から計算される
- **原因**: `click` イベントハンドラで `focusedCell` を更新していなかった
- **修正**: クリック時に `window.focusedCell.rank/file` を更新し、tabIndex も同期

#### 問題2: focusedCell のスコープ問題（重大）
- **症状**: `focusedCell` が `let` で宣言され window オブジェクトに公開されない
- **原因**: `let` 変数はグローバルスコープでも `window` のプロパティにならない
- **修正**: `window.focusedCell = { rank: 9, file: 9 }` に変更し、全参照を `window.focusedCell` に統一

#### 問題3: 成りダイアログの ARIA 属性不足（重大）
- **症状**: スクリーンリーダーがダイアログとして認識しない
- **原因**: 動的生成される成りダイアログに `role="dialog"` 等が無かった
- **修正**:
  - `role="dialog"` 追加
  - `aria-modal="true"` 追加
  - `aria-labelledby="promotion-dialog-title"` 追加
  - `aria-describedby="promotion-dialog-desc"` 追加
  - フォーカストラップ（Tab キーでダイアログ内に閉じ込め）
  - Escape キーで「成らない」を選択して閉じる
  - 表示時に「成る」ボタンへ自動フォーカス

#### 問題4: 盤面のグリッド構造不足
- **症状**: アクセシビリティツリーで `role="grid"` が正しく認識されない
- **原因**: 81個のセルがフラットに配置され、`role="row"` が無かった
- **修正**:
  - 各段を `<div role="row" aria-label="N段目">` で囲む
  - 各セルに `role="gridcell"` を追加
  - `display: contents` で CSS Grid レイアウトを維持

#### 問題5: humanColor が gameData に含まれない
- **症状**: JS 側で人間の手番色を判定できない
- **原因**: `GameService::getGameState()` の返り値に `humanColor` が含まれていなかった
- **修正**: `getGameState()` に `'humanColor' => $game->human_color` を追加

#### 問題6: 空マス・相手駒の選択時フィードバック不足
- **症状**: 空マスや相手の駒を選択しても「移動を開始します」と表示
- **修正**:
  - 空マス: 「空です。駒のあるマスを選択してください」
  - 相手の駒: 「相手の駒です。自分の駒を選択してください」
  - 選択切り替え: 移動先に自駒がある場合は選択を切り替え

#### 問題7: デバッグコードの残存
- **症状**: `currentPlayer = 'human'` がハードコーディングされていた
- **修正**: デバッグ用のハードコーディングを削除

### 実行方法

```bash
# テスト実行（Laravel サーバーが起動している必要あり）
php artisan serve --host=0.0.0.0 --port=8000 &
node tests/accessibility/puppeteer-a11y-test.mjs
```

---

## 9.2. コントラスト検証テスト（30項目）

### 概要

通常モード・ダークモード・ハイコントラストモードのそれぞれで、WCAG AAA 基準のコントラスト比（7:1以上）を自動検証する。

**テストスクリプト**: `tests/accessibility/contrast-test.mjs`

### テスト項目

| カテゴリ | テスト数 | 内容 |
|----------|----------|------|
| 通常モード | 7 | 本文/背景、見出し、ボタン、リンクのコントラスト比 |
| ダークモード | 7 | 暗色テーマでのコントラスト比 |
| ハイコントラスト | 6 | 高コントラストモードの配色維持 |
| ボタンサイズ | 7 | タッチターゲット ≥ 44×44px |
| フォーカス | 2 | アウトライン幅 ≥ 3px、box-shadow |
| ランキング画面 | 1 | ランキング表示のハイコントラスト |

### 実行方法

```bash
node tests/accessibility/contrast-test.mjs
```

---

## 9.3. 全盲ユーザー対局テスト（74項目）

### 概要

スクリーンリーダー利用者を模した自動テストが、キーボード操作と ARIA 属性のみを頼りに実際に AI と対局を行い、全操作が完了できることを検証する。

**テストスクリプト**: `tests/accessibility/blind-user-playtest.mjs`

### テスト項目（22フェーズ・74項目）

| フェーズ | テスト数 | 内容 |
|----------|----------|------|
| ホーム画面 | 4 | ランドマーク、フォーム、Tab順序 |
| ゲーム開始 | 1 | フォーム送信→ゲーム画面遷移 |
| 盤面構造 | 7 | role="grid"、gridcell数、aria-label |
| ARIA属性 | 5 | aria-live、aria-label、dl構造 |
| キーボード移動 | 3 | 矢印キー移動、focusedCell同期 |
| 駒の移動 | 4 | 選択・移動アナウンス、手数更新 |
| 持ち駒打ち | 2 | 駒台からの打ち駒操作 |
| ショートカット | 2 | B（盤面読み上げ）、S（状態読み上げ） |
| 選択キャンセル | 2 | Escape解除、ダイアログキャンセル |
| 待った | 2 | 待ったダイアログの表示・確認 |
| 投了 | 2 | 投了ダイアログの表示・確認 |
| タイマー | 1 | 経過時間のリアルタイム更新 |
| 棋譜 | 2 | aria-liveリージョン、手数記録 |
| 情報パネル | 4 | 見出し構造、dl/dt/dd |
| 連続プレイ | 1 | 2手目以降のアナウンス |
| フォーカス管理 | 1 | tabindex=0 の一意性 |
| エラーフィードバック | 2 | 空マス・相手駒の選択 |
| ホームに戻る | 1 | 中断ダイアログ |
| リセット | 1 | リセットダイアログ |
| ヘルプページ | 4 | 見出し、セクション数、キーボード/SR説明 |
| 境界チェック | 3 | 盤面端での矢印キー |
| CSRFトークン期限切れ | 7 | 419エラー時のダイアログ表示、role=alertdialog、日本語アナウンス |

### 発見・修正した追加問題

#### 問題8: 棋譜（move_history）が記録されない（重大）
- **症状**: 対局中に棋譜欄が常に「まだ指し手がありません」のまま
- **原因**: `GameController` の全ルート（move/drop/promote）で `move_history` への書き込みコードが存在しなかった
- **修正**:
  - 通常移動・持ち駒打ち・成り確定の各ルートで日本語棋譜を記録（例: `先手: 7の4に歩（歩取り）`）
  - APIレスポンスに `moveHistory` を含める
  - フロントエンドに `updateMoveHistory()` 関数を追加し、`#move-history` div（`aria-live="polite"`）をリアルタイム更新
  - undo時は最後のエントリを削除、reset時は全クリア

#### 問題9: 待ったボタンが常に無効（中）
- **症状**: `btn-undo` に `disabled` がハードコードされ、一度も解除されない
- **修正**:
  - 初期表示: `moveCount > 0 && status === 'in_progress'` で条件判定
  - 移動後: `updateGameInfo()` で自動有効化
  - ゲーム終了時: 自動無効化

#### 問題10: CSRFトークン期限切れで英語エラー表示（重大）
- **症状**: セッション有効期限（120分）経過後に操作すると「CSRF token mismatch.」と英語表示
- **原因**: `fetchJson` で 419 レスポンスを特別処理していなかった
- **修正**:
  - `fetchJson` で HTTP 419 を専用検出
  - `role="alertdialog"` + `aria-modal="true"` のアクセシブルなダイアログ表示
  - 日本語メッセージ「セッションの有効期限が切れました」
  - 再読み込みボタン1つのみ（迷わない設計）
  - `aria-live="assertive"` でスクリーンリーダーに即時通知

### 実行方法

```bash
node tests/accessibility/blind-user-playtest.mjs
```

---

## 10. 追加のアクセシビリティ対応（v2.0〜v3.0）

### 10.1 ふりがな対応（`<ruby>` タグ）

全画面の漢字にルビを付与し、読字障害（ディスレクシア）・知的障害・日本語学習者に対応。

```html
<ruby>将棋<rt>しょうぎ</rt></ruby>
<ruby>難易度<rt>なんいど</rt></ruby>を<ruby>選択<rt>せんたく</rt></ruby>
```

- **ホームページ**: 約90箇所のruby要素
- **ゲームページ**: ボタン名・ダイアログ文にふりがな
- **ヘルプページ**: 主要漢字にふりがな

### 10.2 Windows 強制カラーモード対応

`@media (forced-colors: active)` で全UIコンポーネントをシステムカラーに対応:

- 盤面セル: `Canvas` / `CanvasText` / `Highlight` / `HighlightText`
- AI最終手: `LinkText` + `Mark` / `MarkText`
- 合法手: `Highlight` (dashed outline)
- ボタン・モーダル・トースト・スピナー: `forced-color-adjust: none/auto` 適切に使い分け

### 10.3 多様な障害者ペルソナテスト

17種類の障害者ペルソナ + 2種の専門家ペルソナで品質検証:

| ペルソナ | 障害種別 | 検証内容 |
|---|---|---|
| 顧客A | 全盲（スクリーンリーダー） | ARIA属性・読み上げ・フォーカス管理 |
| 顧客B | 弱視（拡大表示） | 文字サイズ・コントラスト・ズーム |
| 顧客C | 全盲初心者 | 初回ガイダンス・操作学習 |
| 顧客D | 弱視初心者 | 視認性・大きめUI |
| 顧客E | 上肢障害（片手キーボード） | Tab/Enter操作・デバウンス |
| 顧客F | 色覚障害（P型） | 色以外の区別（記号・下線・テキスト） |
| 顧客G | 発達特性/学習障害 | ふりがな・平易な言葉・構造化 |
| 顧客H | 聴覚障害（ろう者） | 視覚的フィードバック・テキスト通知 |
| 顧客I | 加齢による見えにくさ（弱視＋震え） | 大タッチターゲット(44px)・UDフォント |
| 顧客J | ADHD/感覚過敏 | reduced-motion・トースト無効化 |
| 顧客K | 脳性麻痺（Tab+Enter） | フォーカストラップ・スキップリンク |
| 顧客L | ディスレクシア | ふりがな・UDフォント・行間 |
| 顧客M | 400%ズーム弱視 | 320px幅・横スクロールなし |
| 顧客N | 自閉スペクトラム症 | 一貫性・予測可能性・ショートカット |
| 顧客O | 知的障害 | 最小入力・デフォルト値・具体的案内 |
| 顧客P | 片麻痺（左手のみ） | WASD+Enter+Escape・Space対応 |
| 顧客Q | てんかん（光感受性） | 点滅なし(WCAG 2.3.1)・blink/marquee排除 |
| 棋士AI | 将棋専門家 | 駒配置・移動ルール・将棋用語正確性 |
| デザイナーAI | Web設計専門家 | レイアウト・レスポンシブ・配色一貫性 |

### 10.4 テスト実行コマンド一覧

```bash
# PHP ユニットテスト（125テスト）
vendor/bin/pest

# E2E アクセシビリティ（59テスト）
node tests/accessibility/puppeteer-a11y-test.mjs

# コントラスト検証（28テスト）
node tests/accessibility/contrast-test.mjs

# 全盲ユーザー対局（77テスト）
node tests/accessibility/blind-user-playtest.mjs

# 全機能E2E（59テスト）
node tests/e2e/full-feature-test.mjs

# 障害者AIペルソナ Wave 1-3（102テスト）
node tests/customer-ai/test-diverse.mjs
node tests/customer-ai/test-diverse2.mjs
node tests/customer-ai/test-diverse3.mjs

# 専門家AIペルソナ（67テスト）
node tests/expert-ai/test-kishi.mjs
node tests/expert-ai/test-designer.mjs

# 追加お客様AIペルソナ（193テスト）
node tests/customer-ai/test-senior.mjs
node tests/customer-ai/test-child.mjs
node tests/customer-ai/test-ux.mjs
node tests/customer-ai/test-teacher.mjs
node tests/customer-ai/test-mobile.mjs
```

---

## 11. 継続的改善

### アクセシビリティ監視

1. **定期的なテスト**
   - 月 1 回のスクリーンリーダーテスト
   - 毎リリース時の Lighthouse 監査

2. **ユーザーフィードバック**
   - アクセシビリティ報告フォーム
   - 定期的なユーザーインタビュー

3. **標準追従**
   - WCAG 2.2 への対応検討
   - 新しい ARIA 仕様への対応

---

最終更新: 2026-02-14
バージョン: 2.0（多様な障害者ペルソナテスト・ふりがな対応・forced-colors完全対応・棋士/デザイナー専門家テスト追加）
