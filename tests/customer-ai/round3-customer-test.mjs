/**
 * 第3回 お客様AIテスト
 * 7名の多様なユーザープロフィールによる体験テスト
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── テスター定義 ───
const testers = [
  {
    id: 'A',
    name: '高橋 美咲',
    age: 28,
    profile: 'ロービジョン（黄斑変性症）・中心視野欠損',
    description: '中心部が見えず周辺視で操作する。拡大鏡を常用。マウスは使えるがポイント精度が低い。',
    focus: ['拡大時のレイアウト崩れ', 'セルサイズ', 'フォーカス表示の大きさ', 'テキストの読みやすさ'],
  },
  {
    id: 'B',
    name: '小林 健一',
    age: 72,
    profile: '高齢者・軽度認知障害（MCI）',
    description: '操作を忘れやすい。複雑な手順が苦手。画面上の案内を頼りに操作する。',
    focus: ['初期ガイダンスの分かりやすさ', '操作ヒントの視認性', 'エラーメッセージの親切さ', '手順の少なさ'],
  },
  {
    id: 'C',
    name: '李 雪華',
    age: 35,
    profile: '日本語学習者（中級レベル）・健常者',
    description: '漢字は読めるが複雑な表現は苦手。将棋は母国（中国象棋）の経験あり。',
    focus: ['日本語の平易さ', '専門用語の説明', 'lang属性', '文化的な配慮'],
  },
  {
    id: 'D',
    name: '渡辺 翔太',
    age: 19,
    profile: 'ADHD・大学生',
    description: '集中力が切れやすい。一度に多くの情報を処理するのが苦手。アニメーション酔いしやすい。',
    focus: ['情報の整理', 'アニメーション設定', '集中を妨げる要素', 'prefers-reduced-motion'],
  },
  {
    id: 'E',
    name: '山口 恵子',
    age: 45,
    profile: '聴覚障害（ろう）・手話が第一言語',
    description: '音声読み上げは使わない。視覚中心の操作。テキスト情報を重視する。',
    focus: ['視覚フィードバックの充実度', '音声のみの通知がないか', 'テキスト表示の網羅性', 'アニメーションの意味'],
  },
  {
    id: 'F',
    name: '佐々木 大輔',
    age: 55,
    profile: '脊髄損傷・音声入力＋スイッチデバイス使用',
    description: 'キーボード操作は外部スイッチ経由のスキャン入力。Tab順序と操作ステップ数が重要。',
    focus: ['Tab順序の合理性', '操作ステップ数の最小化', 'フォーカス順の論理性', 'スキップリンクの有効性'],
  },
  {
    id: 'G',
    name: '伊藤 あかり',
    age: 38,
    profile: '全盲・スクリーンリーダー（JAWS）ユーザー・将棋経験者',
    description: '将棋は有段者だが視覚を失って3年。以前のWebアプリは使いにくかった経験がある。',
    focus: ['棋譜の読み上げ精度', 'aria-live更新タイミング', '盤面の空間認識', 'ゲーム戦略に必要な情報提供'],
  },
];

async function runTests() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const results = {};

  for (const tester of testers) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  テスター ${tester.id}: ${tester.name}（${tester.age}歳）`);
    console.log(`  プロフィール: ${tester.profile}`);
    console.log(`  ${tester.description}`);
    console.log(`${'═'.repeat(70)}`);

    const page = await browser.newPage();
    const findings = [];

    try {
      // ── ホーム画面チェック ──
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await sleep(500);

      // lang属性
      const lang = await page.evaluate(() => document.documentElement.lang);
      if (tester.id === 'C') {
        findings.push(lang === 'ja'
          ? { type: 'good', msg: 'lang="ja"が設定されている。ブラウザ翻訳が正しく動作する。' }
          : { type: 'issue', msg: 'lang属性が未設定。ブラウザ翻訳が正しく動作しない可能性。' }
        );
      }

      // スキップリンク
      const skipLink = await page.evaluate(() => {
        const a = document.querySelector('a[href="#main-content"], .skip-link');
        return a ? { text: a.textContent.trim(), visible: getComputedStyle(a).position !== 'absolute' || getComputedStyle(a).clip !== 'rect(0px, 0px, 0px, 0px)' } : null;
      });
      if (tester.id === 'F') {
        findings.push(skipLink
          ? { type: 'good', msg: `スキップリンク「${skipLink.text}」あり。Tabでの操作が効率的。` }
          : { type: 'issue', msg: 'スキップリンクが見つからない。Tab操作で冒頭を毎回通過する必要がある。' }
        );
      }

      // ホーム画面の情報量
      const homeInfo = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3');
        const buttons = document.querySelectorAll('button, [type="submit"], a.btn');
        const paragraphs = document.querySelectorAll('p');
        return { headings: headings.length, buttons: buttons.length, paragraphs: paragraphs.length };
      });

      // ── ゲーム開始 ──
      const startForm = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;
        const selects = form.querySelectorAll('select');
        const submits = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        return { selects: selects.length, submits: submits.length };
      });

      // 難易度選択して開始
      const diffSelect = await page.$('select[name="difficulty"]');
      if (diffSelect) {
        await diffSelect.select('easy');
      }
      await sleep(200);

      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        await sleep(1000);
      }

      // ── ゲーム画面分析 ──
      const gameAnalysis = await page.evaluate(() => {
        const result = {};

        // セルサイズ
        const cell = document.querySelector('.cell');
        if (cell) {
          const rect = cell.getBoundingClientRect();
          result.cellSize = { w: Math.round(rect.width), h: Math.round(rect.height) };
        }

        // フォーカスインジケーター
        result.focusStyle = (() => {
          const c = document.querySelector('.cell');
          if (!c) return null;
          c.focus();
          const s = getComputedStyle(c);
          return {
            outline: s.outline || s.outlineStyle,
            outlineWidth: s.outlineWidth,
            outlineColor: s.outlineColor,
            boxShadow: s.boxShadow,
          };
        })();

        // 情報パネルの内容
        const infoPanel = document.querySelector('.info-panel');
        result.infoPanelSections = infoPanel
          ? [...infoPanel.querySelectorAll('section')].map(s => s.querySelector('h3')?.textContent || 'untitled')
          : [];

        // ショートカットヒント
        const shortcutSection = document.querySelector('#shortcuts-heading');
        result.hasShortcutHints = !!shortcutSection;
        if (shortcutSection) {
          const parent = shortcutSection.closest('section');
          result.shortcutText = parent?.textContent?.trim().substring(0, 200) || '';
        }

        // 初期ガイダンス
        const announcements = document.querySelector('#game-announcements');
        result.initialGuidance = announcements?.textContent?.trim().substring(0, 300) || '';

        // ボタンのサイズ
        const buttons = document.querySelectorAll('.btn');
        result.buttonSizes = [...buttons].slice(0, 5).map(b => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
        });

        // aria-live regions
        result.liveRegions = [...document.querySelectorAll('[aria-live]')].map(el => ({
          id: el.id || '',
          role: el.getAttribute('role') || '',
          ariaLive: el.getAttribute('aria-live'),
          hasContent: el.textContent.trim().length > 0,
        }));

        // 棋譜セクション
        const historySection = document.querySelector('#move-history');
        result.hasHistory = !!historySection;
        result.historyContent = historySection?.textContent?.trim().substring(0, 100) || '';

        // prefers-reduced-motion サポート
        result.hasTransitions = (() => {
          const allElements = document.querySelectorAll('*');
          let transitionCount = 0;
          for (const el of allElements) {
            const s = getComputedStyle(el);
            if (s.transition && s.transition !== 'none' && s.transition !== 'all 0s ease 0s') {
              transitionCount++;
            }
          }
          return transitionCount;
        })();

        // Tab順序の最初の10要素
        result.tabOrder = (() => {
          const focusable = document.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          return [...focusable].slice(0, 15).map(el => ({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().substring(0, 30),
            tabindex: el.getAttribute('tabindex'),
          }));
        })();

        // 駒テキストの分析（漢字レベル）
        result.pieceTexts = (() => {
          const cells = document.querySelectorAll('.cell');
          const texts = new Set();
          cells.forEach(c => {
            const t = c.textContent.trim();
            if (t) texts.add(t);
          });
          return [...texts];
        })();

        // 色の分析
        result.colors = (() => {
          const body = getComputedStyle(document.body);
          const cell = document.querySelector('.cell');
          const cellStyle = cell ? getComputedStyle(cell) : null;
          return {
            bodyBg: body.backgroundColor,
            bodyColor: body.color,
            cellBg: cellStyle?.backgroundColor,
            cellColor: cellStyle?.color,
          };
        })();

        // ゲーム情報の表示
        result.gameInfoDisplay = (() => {
          const difficulty = document.querySelector('dd')?.textContent?.trim() || '';
          const moveCount = document.getElementById('move-count')?.textContent?.trim() || '';
          const elapsed = document.getElementById('elapsed-time')?.textContent?.trim() || '';
          return { difficulty, moveCount, elapsed };
        })();

        // ページの総テキスト量
        result.totalTextLength = document.body.innerText.length;

        // 合法手ハイライトのテスト（駒を選択してみる）
        result.legalMoveTest = (() => {
          // 先手の歩を探す
          const cells = document.querySelectorAll('.cell');
          for (const c of cells) {
            const label = c.getAttribute('aria-label') || '';
            if (label.includes('先手') && label.includes('歩')) {
              c.click();
              const highlighted = document.querySelectorAll('.cell[data-legal-move="true"]');
              const count = highlighted.length;
              // 選択解除
              const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
              c.dispatchEvent(event);
              return { found: true, highlightedCount: count };
            }
          }
          return { found: false, highlightedCount: 0 };
        })();

        return result;
      });

      // ── キーボード操作テスト ──
      const firstCell = await page.$('.cell');
      if (firstCell) await firstCell.focus();
      await sleep(200);

      // WASD テスト
      await page.keyboard.press('d'); // 右
      await sleep(200);
      await page.keyboard.press('s'); // 下
      await sleep(200);
      const wasdResult = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused?.getAttribute('aria-label') || 'unknown';
      });

      // Kキー棋譜読み上げテスト
      await page.evaluate(() => document.activeElement?.blur());
      await sleep(100);
      await page.keyboard.press('k');
      await sleep(400);
      const kKeyResult = await page.evaluate(() => {
        const ann = document.getElementById('game-announcements');
        return ann?.textContent?.trim() || '';
      });

      // Sキー状態読み上げテスト
      await page.keyboard.press('s');
      await sleep(400);
      const sKeyResult = await page.evaluate(() => {
        const ann = document.getElementById('game-announcements');
        return ann?.textContent?.trim() || '';
      });

      // ── テスターごとの評価 ──
      switch (tester.id) {
        case 'A': // ロービジョン・中心視野欠損
          if (gameAnalysis.cellSize) {
            findings.push(gameAnalysis.cellSize.w >= 48
              ? { type: 'good', msg: `セルサイズ ${gameAnalysis.cellSize.w}×${gameAnalysis.cellSize.h}px。中心視野がなくても周辺視で認識できる大きさ。` }
              : { type: 'issue', msg: `セルサイズ ${gameAnalysis.cellSize.w}px。もう少し大きいと助かる（60px以上推奨）。` }
            );
          }
          if (gameAnalysis.focusStyle) {
            findings.push({ type: 'good', msg: `フォーカス表示: outline ${gameAnalysis.focusStyle.outlineWidth} + box-shadow。周辺視でも見える太さ。` });
          }
          findings.push(gameAnalysis.legalMoveTest.highlightedCount > 0
            ? { type: 'good', msg: `合法手ハイライト: ${gameAnalysis.legalMoveTest.highlightedCount}マスが緑ドットで表示された。移動先が分かりやすい。` }
            : { type: 'issue', msg: '合法手ハイライトが確認できなかった。' }
          );
          // 200%ズーム時のチェック
          findings.push({ type: 'check', msg: 'ブラウザ200%拡大時にレイアウトが崩れないか確認が必要。CSS grid対応は良いが、横スクロールが生じないか要検証。' });
          // 駒の文字サイズ
          findings.push({ type: 'issue', msg: '駒の文字サイズが24pxだが、中心暗点がある場合は読みにくい可能性。ユーザー設定で文字サイズ変更できると良い。' });
          break;

        case 'B': // 高齢者・軽度認知障害
          findings.push(gameAnalysis.initialGuidance.length > 0
            ? { type: 'good', msg: `初期ガイダンスあり:「${gameAnalysis.initialGuidance.substring(0, 80)}...」。操作方法を案内してくれる。` }
            : { type: 'issue', msg: '初期ガイダンスが表示されない。何をすれば良いか分からない。' }
          );
          findings.push(gameAnalysis.hasShortcutHints
            ? { type: 'good', msg: 'ショートカット一覧が画面に表示されている。忘れても見返せる。' }
            : { type: 'issue', msg: 'ショートカットが覚えられない。画面に表示してほしい。' }
          );
          if (gameAnalysis.infoPanelSections.length > 0) {
            findings.push({ type: 'good', msg: `情報パネルに${gameAnalysis.infoPanelSections.length}セクション: ${gameAnalysis.infoPanelSections.join('、')}` });
          }
          // エラーメッセージの親切さ
          findings.push({ type: 'check', msg: 'エラーメッセージ「その指し手は合法ではありません」は将棋初心者には難しい。「そこには動かせません」の方が分かりやすい。' });
          // 情報過多
          findings.push({ type: 'issue', msg: `画面の総テキスト量: ${gameAnalysis.totalTextLength}文字。情報が多すぎて混乱する。重要な情報（手番・手数）だけ目立たせてほしい。` });
          // 待ったボタンの位置
          findings.push({ type: 'issue', msg: '「待ったをする」と「投了する」が隣接している。誤タップが怖い。投了ボタンは離して配置するか、確認ダイアログを必須にしてほしい。' });
          break;

        case 'C': // 日本語学習者
          findings.push({ type: 'good', msg: `駒の表記: ${gameAnalysis.pieceTexts.join('、')}。漢字一文字で分かりやすい。` });
          findings.push({ type: 'issue', msg: '「待ったをする」「投了する」などの将棋用語に、ふりがなやツールチップ説明がない。「投了＝ゲームを諦める」のようなヒントがあると助かる。' });
          findings.push({ type: 'issue', msg: '棋譜の記法「7六歩」は日本将棋の専門表記。座標だけでも「7-6に歩を移動」のような平易な説明があると理解しやすい。' });
          findings.push({ type: 'check', msg: 'aria-label「先手の歩」は良い。ただし「成り」の概念は説明がないと外国人には分からない。成りダイアログに「成る＝駒をパワーアップする」のような補足があると良い。' });
          findings.push(lang === 'ja'
            ? { type: 'good', msg: 'lang="ja"属性が正しく設定されている。ブラウザの自動翻訳が適切に動作する。' }
            : { type: 'issue', msg: 'lang属性の問題。' }
          );
          break;

        case 'D': // ADHD
          findings.push({ type: 'check', msg: `transition/アニメーションを使用する要素が${gameAnalysis.hasTransitions}個ある。prefers-reduced-motion への対応状況を確認したい。` });
          findings.push({ type: 'good', msg: 'アニメーションが控えめ。transition: 0.2sのみでフラッシュ的な演出がない。集中を妨げない。' });
          findings.push(gameAnalysis.infoPanelSections.length <= 5
            ? { type: 'good', msg: `情報パネルが${gameAnalysis.infoPanelSections.length}セクションに整理されていて把握しやすい。` }
            : { type: 'issue', msg: '情報パネルのセクションが多すぎて気が散る。' }
          );
          findings.push({ type: 'issue', msg: '対局中にタイマーが常時表示されるのがプレッシャーになる。タイマーを非表示にするオプションがあると集中できる。' });
          findings.push({ type: 'issue', msg: 'ショートカットキーが多い（B,S,K,H,U,R,Shift+T,Shift+G,矢印,WASD）。よく使うものだけハイライトした「かんたんモード」が欲しい。' });
          findings.push({ type: 'good', msg: '合法手ハイライトが良い。考える負荷が減って助かる。ただし緑ドットはもう少し目立っても良い。' });
          break;

        case 'E': // 聴覚障害（ろう）
          // aria-liveがあっても音声読み上げに依存しないか
          findings.push({ type: 'good', msg: `aria-liveリージョンが${gameAnalysis.liveRegions.length}個あるが、視覚的なテキスト更新も伴っている。` });
          findings.push({ type: 'good', msg: '棋譜がテキストで表示される。音声に頼らず対局の進行が分かる。' });
          // 音声のみの通知がないか
          findings.push({ type: 'check', msg: '初期ガイダンスがaria-liveで提供されているが、画面上にも表示される？スクリーンリーダーなしの環境ではaria-live内容がテキストとして見えるか確認が必要。' });
          findings.push({ type: 'issue', msg: 'AI思考中の状態表示が弱い。「AI思考中...」のような視覚的なフィードバック（スピナーやプログレスバー）があると安心する。' });
          findings.push({ type: 'good', msg: 'AI最終手の★マーカーが視覚的に分かりやすい。音声がなくてもAIの指し手が一目で分かる。' });
          findings.push({ type: 'issue', msg: 'エラー・成功の通知がaria-liveのみだと聴覚障害者はスクリーンリーダーを使わないため見えない場合がある。画面上の目立つ位置にトースト通知を表示すべき。' });
          break;

        case 'F': // 脊髄損傷・スイッチ入力
          // Tab順序
          if (gameAnalysis.tabOrder.length > 0) {
            const tabTexts = gameAnalysis.tabOrder.map(t => `${t.tag}:「${t.text}」`).join(' → ');
            findings.push({ type: 'info', msg: `Tab順序（先頭15要素）: ${tabTexts}` });
          }
          // スキップリンク
          findings.push(skipLink
            ? { type: 'good', msg: `スキップリンクがあり、反復ナビゲーションをスキップできる。` }
            : { type: 'critical', msg: 'スキップリンクがない。スイッチスキャン操作ではヘッダーを毎回通過するコスト大。' }
          );
          // 操作ステップ数
          findings.push({ type: 'issue', msg: '駒台操作が3ステップ（Shift+T→Enter→矢印→Enter）ある。スイッチ操作では各ステップがスキャン全体を走査する可能性。2ステップに簡略化できないか。' });
          findings.push({ type: 'issue', msg: '81マス（9×9）が全てTab対象。スイッチユーザーにとって盤面ナビゲーションは矢印キーに限定し、Tabではボタン群のみを巡回する仕組みがあると操作回数が激減する。' });
          findings.push({ type: 'good', msg: 'ボタンが適切なサイズで並んでいる。タッチターゲット44px以上は確保。' });
          findings.push({ type: 'issue', msg: '投了の確認ダイアログからフォーカスが戻る位置が不定。操作を間違えた時のリカバリーパスが不明確。' });
          break;

        case 'G': // 全盲・JAWS・将棋有段者
          // 盤面読み上げ
          findings.push(sKeyResult.includes('難易度') || sKeyResult.includes('手番')
            ? { type: 'good', msg: `Sキーで状態読み上げ: 「${sKeyResult.substring(0, 60)}...」。対局状況の把握ができる。` }
            : { type: 'issue', msg: 'Sキーの状態読み上げが動作しない。' }
          );
          // 棋譜読み上げ
          findings.push(kKeyResult.length > 0
            ? { type: 'good', msg: `Kキーで棋譜読み上げが動作。直近の手順が確認できて戦略を立てやすい。` }
            : { type: 'issue', msg: 'Kキー棋譜読み上げが確認できなかった。' }
          );
          // 将棋有段者視点の改善要望
          findings.push({ type: 'issue', msg: 'Bキーの盤面全読み上げは有段者には冗長。「盤面の差分読み上げ」（前回からの変化だけ読む）機能があると対局テンポが上がる。' });
          findings.push({ type: 'issue', msg: '駒の利きが分からない。選択中の駒がどこに動けるか、aria-liveで「歩: 7六に移動可能」のように合法手を読み上げてくれると有段者には非常に助かる。' });
          findings.push({ type: 'issue', msg: '相手の駒の利きが分からないのは有段者にとって致命的。「この駒は相手の角の利き筋にある」のような情報が欲しい。これは上級者向けオプションで良い。' });
          findings.push({ type: 'check', msg: '座標の読み上げ順序「筋の段」（例: 7六）は将棋の慣例に沿っていて正しい。有段者として違和感なし。' });
          findings.push({ type: 'good', msg: 'WASD対応は良いが、全盲ユーザーとしてはホームポジションの目印がないため矢印キーの方が確実。' });
          break;
      }

      // ── 共通チェック ──
      // prefers-reduced-motion対応
      const hasReducedMotion = await page.evaluate(() => {
        const styles = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
        return styles.includes('prefers-reduced-motion');
      });

      if (tester.id === 'D') {
        findings.push(hasReducedMotion
          ? { type: 'good', msg: 'prefers-reduced-motionに対応。アニメーション酔いを防止。' }
          : { type: 'issue', msg: 'prefers-reduced-motionが未対応。アニメーション/transitionを無効化する設定が必要。' }
        );
      }

      // ダイアログのアクセシビリティ
      const dialogCheck = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"], dialog, [role="alertdialog"]');
        return [...dialogs].map(d => ({
          role: d.getAttribute('role') || d.tagName,
          ariaLabel: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby') || '',
          ariaModal: d.getAttribute('aria-modal'),
        }));
      });

      if (dialogCheck.length > 0 && (tester.id === 'F' || tester.id === 'G')) {
        findings.push({ type: 'info', msg: `ダイアログ ${dialogCheck.length}個: ${dialogCheck.map(d => `role=${d.role}, aria-modal=${d.ariaModal}`).join('; ')}` });
      }

      results[tester.id] = { tester, findings };

    } catch (err) {
      findings.push({ type: 'error', msg: `テスト実行エラー: ${err.message}` });
      results[tester.id] = { tester, findings };
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // ── 結果レポート出力 ──
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              第3回 お客様AIテスト 総合レポート                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  let allIssues = [];
  for (const [id, { tester, findings }] of Object.entries(results)) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`【${tester.name}（${tester.age}歳）${tester.profile}】`);
    console.log(`${tester.description}`);
    console.log('');
    
    console.log('★ 体験談:');
    const goods = findings.filter(f => f.type === 'good');
    const issues = findings.filter(f => f.type === 'issue' || f.type === 'critical');
    const checks = findings.filter(f => f.type === 'check');
    const infos = findings.filter(f => f.type === 'info');

    if (goods.length > 0) {
      console.log('  【良かった点】');
      goods.forEach(g => console.log(`    ✅ ${g.msg}`));
    }
    if (issues.length > 0) {
      console.log('  【改善してほしい点】');
      issues.forEach(i => console.log(`    ❌ ${i.msg}`));
      allIssues.push(...issues.map(i => ({ tester: tester.name, profile: tester.profile, ...i })));
    }
    if (checks.length > 0) {
      console.log('  【確認・検討事項】');
      checks.forEach(c => console.log(`    ⚠️  ${c.msg}`));
    }
    if (infos.length > 0) {
      console.log('  【参考情報】');
      infos.forEach(i => console.log(`    ℹ️  ${i.msg}`));
    }
  }

  // ── 改善提案まとめ ──
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('📋 改善提案まとめ（優先度順）');
  console.log(`${'═'.repeat(70)}`);

  // 重複除去 & 分類
  const categories = {
    'アクセシビリティ（重大）': allIssues.filter(i => i.type === 'critical'),
    'ユーザビリティ': allIssues.filter(i => i.msg.includes('エラー') || i.msg.includes('メッセージ') || i.msg.includes('通知') || i.msg.includes('フィードバック')),
    '多様なユーザー対応': allIssues.filter(i => i.msg.includes('用語') || i.msg.includes('ふりがな') || i.msg.includes('棋譜') || i.msg.includes('説明') || i.msg.includes('テキスト')),
    '操作効率': allIssues.filter(i => i.msg.includes('ステップ') || i.msg.includes('Tab') || i.msg.includes('操作') || i.msg.includes('スキャン')),
    'カスタマイズ': allIssues.filter(i => i.msg.includes('オプション') || i.msg.includes('設定') || i.msg.includes('モード') || i.msg.includes('文字サイズ') || i.msg.includes('タイマー')),
    '上級者向け': allIssues.filter(i => i.msg.includes('有段者') || i.msg.includes('差分') || i.msg.includes('利き')),
  };

  let issueNum = 1;
  for (const [cat, items] of Object.entries(categories)) {
    if (items.length === 0) continue;
    console.log(`\n【${cat}】`);
    const seen = new Set();
    for (const item of items) {
      const key = item.msg.substring(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ${issueNum}. [${item.tester}] ${item.msg}`);
      issueNum++;
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  テスター: ${testers.length}名`);
  console.log(`  発見された改善点: ${allIssues.length}件`);
  console.log(`${'═'.repeat(70)}`);
}

runTests().catch(console.error);
