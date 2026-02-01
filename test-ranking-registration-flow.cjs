const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('=== 完全なランキング登録フローテスト ===\n');
  
  try {
    console.log('1. ゲームページにアクセス...');
    await page.goto('http://localhost:8000/game/96', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    console.log('   ✓ ページ読み込み完了\n');
    
    console.log('2. 8-5の飛車を選択...');
    await page.click('[data-rank="8"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('   ✓ 飛車選択\n');
    
    console.log('3. 7-5に移動して王を取る...');
    await page.click('[data-rank="7"][data-file="5"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('   ✓ 王を取得\n');
    
    console.log('4. ランキング登録ダイアログで登録...');
    
    // ニックネーム入力
    await page.type('#ranking-nickname-input', 'テストプレイヤー');
    console.log('   ✓ ニックネーム入力完了');
    
    // 登録ボタンをクリック
    await page.click('#btn-register-ranking');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('   ✓ 登録ボタンクリック\n');
    
    // 登録後の状態を確認
    console.log('5. 登録後の状態確認...');
    const postRegistration = await page.evaluate(() => {
      const dialog = document.getElementById('ranking-registration-dialog');
      const announcement = document.getElementById('game-announcements')?.textContent;
      const rankingLink = document.querySelector('a[href*="ranking"]');
      const focusedElement = document.activeElement?.textContent?.substring(0, 20) || 'unknown';
      
      return {
        dialogClosed: dialog.style.display === 'none',
        announcement: announcement,
        hasRankingLink: !!rankingLink,
        rankingLinkText: rankingLink?.textContent,
        focusedElement: focusedElement
      };
    });
    
    console.log('   ダイアログが閉じた:', postRegistration.dialogClosed ? '✓' : '✗');
    console.log('   スクリーンリーダー通知:', postRegistration.announcement);
    console.log('   ランキングリンク表示:', postRegistration.hasRankingLink ? '✓' : '✗');
    console.log('   ランキングリンクテキスト:', postRegistration.rankingLinkText);
    console.log('   フォーカス位置:', postRegistration.focusedElement);
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('✗ エラー:', error.message);
  }
  
  await browser.close();
})();
