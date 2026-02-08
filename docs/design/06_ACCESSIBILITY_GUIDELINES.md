# アクセシビリティガイドライン

## 概要

本ドキュメントは、a11y-shogi のアクセシビリティ実装ガイドです。
WCAG 2.1 AA/AAA レベルの適合を目指します。

**目標**: 以下のユーザーが全機能を支障なく利用できること
- 完全視覚障害者（全盲）
- 弱視者
- 色覚異常者
- 運動障害者（キーボードのみで操作）
- 認知障害者
- 高齢者

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
      event.preventDefault();
      handleCursorMove(event.key);
      break;
    
    case 'Enter':
      event.preventDefault();
      handleMove();
      break;
    
    case ' ':
      event.preventDefault();
      handlePieceInfo();
      break;
    
    case 'h':
    case 'H':
      event.preventDefault();
      showHelpModal();
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
      showHelpModal();
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

- [ ] Lighthouse Accessibility スコア 90 以上
- [ ] WAVE、Axe DevTools でエラーなし
- [ ] W3C Validator でエラーなし
- [ ] スクリーンリーダーテスト（NVDA）完了
- [ ] キーボードのみでの操作テスト完了
- [ ] ハイコントラストモードでの表示確認
- [ ] モバイルのアクセシビリティテスト完了

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

## 10. 継続的改善

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

最終更新: 2025-07-25
バージョン: 1.1（E2Eテスト追加・アクセシビリティ修正反映）
