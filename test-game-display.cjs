const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('ゲームページにアクセス中...');
  
  try {
    await page.goto('http://localhost:8000/game/96', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    console.log('✓ ページが正常に読み込まれました');
    
    // エラーがないか確認
    const pageContent = await page.content();
    if (pageContent.includes('ErrorException') || pageContent.includes('TypeError')) {
      console.error('✗ ページにエラーが表示されています');
      
      // エラーメッセージを取得
      const errorMessage = await page.evaluate(() => {
        const errorElement = document.querySelector('body');
        return errorElement ? errorElement.textContent.substring(0, 500) : 'エラーメッセージを取得できません';
      });
      console.error('エラー内容:', errorMessage);
    } else {
      console.log('✓ エラーは検出されませんでした');
      
      // 盤面が表示されているか確認
      const boardExists = await page.$('.board');
      if (boardExists) {
        console.log('✓ 盤面が表示されています');
      }
      
      // 待機して手動で確認できるようにする
      console.log('\nブラウザを開いています。確認後、Ctrl+Cで終了してください。');
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5分待機
    }
    
  } catch (error) {
    console.error('✗ エラーが発生しました:', error.message);
  }
  
  await browser.close();
})();
