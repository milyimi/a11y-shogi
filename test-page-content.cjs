const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:8000/game/1', { waitUntil: 'networkidle0' });
    
    const html = await page.content();
    console.log(html.substring(0, 3000));
    
    await browser.close();
})();
