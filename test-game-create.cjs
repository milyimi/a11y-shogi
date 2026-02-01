const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // エラーをキャプチャ
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });
    
    page.on('response', async response => {
        if (response.url().includes('/game/create')) {
            console.log('Response status:', response.status());
            try {
                const text = await response.text();
                console.log('Response:', text.substring(0, 500));
            } catch (e) {}
        }
    });
    
    console.log('Navigating to home...');
    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
    
    console.log('Checking form...');
    const formInfo = await page.evaluate(() => {
        const form = document.querySelector('form');
        const csrfInput = form?.querySelector('input[name="_token"]');
        return {
            hasForm: !!form,
            hasCsrf: !!csrfInput,
            action: form?.action || '',
            method: form?.method || ''
        };
    });
    console.log('Form info:', formInfo);
    
    console.log('Clicking submit...');
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Current URL:', page.url());
    
    await browser.close();
})();
