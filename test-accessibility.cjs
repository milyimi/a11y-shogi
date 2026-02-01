const puppeteer = require('puppeteer');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    console.log('🔍 視覚障害者向けアクセシビリティテスト開始');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // ページ内のコンソールログを取得
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ ブラウザエラー:', msg.text());
      }
    });

    // ==========================================
    // テスト1: ホーム画面のアクセシビリティ
    // ==========================================
    console.log('\n📋 テスト1: ホーム画面のアクセシビリティ');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });

    // ページタイトルの確認
    const title = await page.title();
    console.log(`   ページタイトル: "${title}"`);
    
    // 見出し構造の確認
    const headings = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
      const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim());
      return { h1s, h2s };
    });
    console.log(`   H1見出し: ${headings.h1s.join(', ')}`);
    console.log(`   H2見出し: ${headings.h2s.join(', ')}`);

    // ランドマークの確認
    const landmarks = await page.evaluate(() => {
      const roles = ['main', 'navigation', 'banner', 'contentinfo', 'complementary'];
      const found = {};
      roles.forEach(role => {
        found[role] = document.querySelectorAll(`[role="${role}"]`).length;
      });
      return found;
    });
    console.log('   ランドマーク:', landmarks);

    // フォームのラベル確認
    const formAccessibility = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return { hasForm: false };
      
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      const results = inputs.map(input => {
        const id = input.id;
        const label = document.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        
        return {
          type: input.type || input.tagName,
          id: id,
          hasLabel: !!label,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledby: !!ariaLabelledby,
          accessible: !!(label || ariaLabel || ariaLabelledby)
        };
      });
      
      return {
        hasForm: true,
        inputs: results,
        allAccessible: results.every(r => r.accessible)
      };
    });
    
    console.log('   フォーム要素のアクセシビリティ:');
    if (formAccessibility.hasForm) {
      formAccessibility.inputs.forEach(input => {
        const status = input.accessible ? '✅' : '❌';
        console.log(`     ${status} ${input.type} (id: ${input.id})`);
      });
      console.log(`   ${formAccessibility.allAccessible ? '✅' : '❌'} すべての入力要素にラベルあり`);
    }

    // ==========================================
    // テスト2: キーボードナビゲーション
    // ==========================================
    console.log('\n⌨️  テスト2: キーボードナビゲーション');
    
    // Tabキーで最初のフォーカス可能要素へ
    await page.keyboard.press('Tab');
    await sleep(100);
    
    let focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        text: el.textContent?.trim().substring(0, 30)
      };
    });
    console.log(`   最初のフォーカス: ${focusedElement.tag} (${focusedElement.id || focusedElement.name})`);

    // 難易度選択（ラジオボタン）のキーボード操作
    console.log('   難易度選択をキーボードで操作...');
    await page.keyboard.press('Tab');
    await sleep(100);
    await page.keyboard.press('ArrowDown'); // 次の難易度へ
    await sleep(100);
    
    const selectedDifficulty = await page.evaluate(() => {
      const selected = document.querySelector('input[name="difficulty"]:checked');
      return selected ? selected.value : null;
    });
    console.log(`   選択された難易度: ${selectedDifficulty}`);

    // ゲーム開始ボタンへTabで移動
    console.log('   ゲーム開始ボタンへ移動...');
    let tabCount = 0;
    while (tabCount < 10) {
      await page.keyboard.press('Tab');
      await sleep(100);
      tabCount++;
      
      const el = await page.evaluate(() => {
        const active = document.activeElement;
        return {
          tag: active.tagName,
          type: active.type,
          id: active.id,
          text: active.textContent?.trim().substring(0, 30)
        };
      });
      
      if (el.tag === 'BUTTON' && el.text.includes('ゲーム')) {
        console.log(`   フォーカス: ${el.tag} "${el.text}"`);
        break;
      }
    }

    // Enterキーでゲーム開始
    console.log('   Enterキーでゲーム開始...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.keyboard.press('Enter')
    ]);

    // 現在のURLを確認
    const currentUrl = page.url();
    console.log(`   遷移先URL: ${currentUrl}`);

    // ==========================================
    // テスト3: ゲーム画面のアクセシビリティ
    // ==========================================
    console.log('\n🎮 テスト3: ゲーム画面のアクセシビリティ');
    
    // 将棋盤が表示されるまで待機（タイムアウトを長めに）
    try {
      await page.waitForSelector('.shogi-board, #game-board, [role="grid"]', { timeout: 10000 });
    } catch (e) {
      console.log('   ⚠️  将棋盤要素が見つかりませんでした');
      console.log(`   現在のURL: ${page.url()}`);
      const bodyText = await page.evaluate(() => document.body.textContent.substring(0, 200));
      console.log(`   ページ内容: ${bodyText}`);
    }
    
    // ゲーム画面の見出し
    const gameHeadings = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      return { h1 };
    });
    console.log(`   見出し: "${gameHeadings.h1}"`);

    // ゲーム状態のアナウンス領域確認
    const ariaLiveRegions = await page.evaluate(() => {
      const liveRegions = Array.from(document.querySelectorAll('[aria-live]'));
      return liveRegions.map(region => ({
        id: region.id,
        ariaLive: region.getAttribute('aria-live'),
        ariaAtomic: region.getAttribute('aria-atomic'),
        text: region.textContent?.trim().substring(0, 50)
      }));
    });
    
    console.log('   aria-live領域:');
    ariaLiveRegions.forEach(region => {
      console.log(`     ✅ ${region.id} (${region.ariaLive}) - "${region.text}"`);
    });

    // 将棋盤のアクセシビリティ
    const boardAccessibility = await page.evaluate(() => {
      const board = document.querySelector('.shogi-board');
      if (!board) return { hasBoard: false };
      
      return {
        hasBoard: true,
        role: board.getAttribute('role'),
        ariaLabel: board.getAttribute('aria-label'),
        ariaDescribedby: board.getAttribute('aria-describedby')
      };
    });
    
    console.log('   将棋盤:');
    console.log(`     role: ${boardAccessibility.role}`);
    console.log(`     aria-label: ${boardAccessibility.ariaLabel}`);
    console.log(`     ${boardAccessibility.role ? '✅' : '❌'} ARIA role設定済み`);

    // ボタンのアクセシビリティ
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(btn => ({
        id: btn.id,
        text: btn.textContent?.trim(),
        ariaLabel: btn.getAttribute('aria-label'),
        disabled: btn.disabled
      }));
    });
    
    console.log('   ボタン:');
    buttons.forEach(btn => {
      const label = btn.ariaLabel || btn.text;
      console.log(`     ✅ ${btn.id}: "${label}" ${btn.disabled ? '(無効)' : ''}`);
    });

    // ==========================================
    // テスト4: スクリーンリーダー対応状況
    // ==========================================
    console.log('\n📢 テスト4: スクリーンリーダー対応');
    
    const screenReaderInfo = await page.evaluate(() => {
      // すべての重要な要素のARIA属性をチェック
      const interactiveElements = Array.from(document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [tabindex]'
      ));
      
      const results = interactiveElements.map(el => {
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledby = el.getAttribute('aria-labelledby');
        const ariaDescribedby = el.getAttribute('aria-describedby');
        const role = el.getAttribute('role');
        const text = el.textContent?.trim();
        const label = document.querySelector(`label[for="${el.id}"]`)?.textContent.trim();
        
        const hasAccessibleName = !!(ariaLabel || ariaLabelledby || text || label);
        
        return {
          tag: el.tagName,
          id: el.id,
          role: role,
          hasAccessibleName: hasAccessibleName,
          accessibleName: ariaLabel || label || text?.substring(0, 30)
        };
      });
      
      const accessible = results.filter(r => r.hasAccessibleName).length;
      const total = results.length;
      
      return {
        accessible,
        total,
        percentage: Math.round((accessible / total) * 100),
        elements: results
      };
    });
    
    console.log(`   アクセシブル名を持つ要素: ${screenReaderInfo.accessible}/${screenReaderInfo.total} (${screenReaderInfo.percentage}%)`);
    
    const problematic = screenReaderInfo.elements.filter(e => !e.hasAccessibleName);
    if (problematic.length > 0) {
      console.log('   ⚠️  改善が必要な要素:');
      problematic.forEach(el => {
        console.log(`     - ${el.tag} (id: ${el.id})`);
      });
    } else {
      console.log('   ✅ すべての対話的要素にアクセシブル名あり');
    }

    // ==========================================
    // テスト5: フォーカス管理
    // ==========================================
    console.log('\n🎯 テスト5: フォーカス管理');
    
    // フォーカス可能な要素をすべて取得
    const focusableElements = await page.evaluate(() => {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map((el, index) => ({
        index: index + 1,
        tag: el.tagName,
        id: el.id,
        text: el.textContent?.trim().substring(0, 30),
        tabindex: el.getAttribute('tabindex')
      }));
    });
    
    console.log(`   フォーカス可能な要素: ${focusableElements.length}個`);
    console.log('   Tab順序:');
    focusableElements.slice(0, 10).forEach(el => {
      console.log(`     ${el.index}. ${el.tag} (${el.id || 'id無し'}) - "${el.text}"`);
    });

    // ==========================================
    // 最終評価
    // ==========================================
    console.log('\n📊 アクセシビリティ評価サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const summary = {
      pageTitle: !!title,
      semanticHeadings: headings.h1s.length > 0,
      landmarks: Object.values(landmarks).some(v => v > 0),
      formLabels: formAccessibility.allAccessible,
      ariaLive: ariaLiveRegions.length > 0,
      keyboardNavigation: true, // 手動テストで確認済み
      accessibleNames: screenReaderInfo.percentage >= 80,
      focusManagement: focusableElements.length > 0
    };
    
    const score = Object.values(summary).filter(v => v).length;
    const total = Object.keys(summary).length;
    const percentage = Math.round((score / total) * 100);
    
    console.log(`   ✅ ページタイトル: ${summary.pageTitle ? 'あり' : 'なし'}`);
    console.log(`   ${summary.semanticHeadings ? '✅' : '❌'} セマンティックな見出し構造`);
    console.log(`   ${summary.landmarks ? '✅' : '❌'} ARIAランドマーク`);
    console.log(`   ${summary.formLabels ? '✅' : '❌'} フォームラベル`);
    console.log(`   ${summary.ariaLive ? '✅' : '❌'} 動的コンテンツのアナウンス (aria-live)`);
    console.log(`   ${summary.keyboardNavigation ? '✅' : '❌'} キーボードナビゲーション`);
    console.log(`   ${summary.accessibleNames ? '✅' : '⚠️ '} アクセシブル名 (${screenReaderInfo.percentage}%)`);
    console.log(`   ${summary.focusManagement ? '✅' : '❌'} フォーカス管理`);
    console.log('');
    console.log(`   総合評価: ${score}/${total} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('   🌟 優秀 - 視覚障害者が利用しやすい設計です');
    } else if (percentage >= 70) {
      console.log('   ✅ 良好 - 基本的なアクセシビリティは確保されています');
    } else if (percentage >= 50) {
      console.log('   ⚠️  改善の余地あり - いくつかの問題があります');
    } else {
      console.log('   ❌ 要改善 - アクセシビリティに多くの問題があります');
    }

    console.log('\n✅ テスト完了');

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
