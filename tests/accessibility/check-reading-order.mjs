import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:8000/feedback', {waitUntil: 'networkidle0'});

console.log('━━━━ 📖 音声読み上げ順序確認 ━━━━\n');

console.log('1️⃣ 見出し階層:');
const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els => 
  els.map(el => ({tag: el.tagName, text: el.textContent.trim()}))
);
headings.forEach(h => console.log(`  ${h.tag}: ${h.text}`));

console.log('\n2️⃣ ランドマーク要素:');
const landmarks = await page.$$eval('main, nav, header, footer, aside', els => 
  els.map(el => el.tagName)
);
console.log(`  ${landmarks.join(', ')}`);

console.log('\n3️⃣ スキップリンク:');
const skipLink = await page.$eval('a.skip-link, a[href="#main-content"]', el => ({
  text: el.textContent.trim(),
  href: el.getAttribute('href')
}));
console.log(`  "${skipLink.text}" → ${skipLink.href}`);

console.log('\n4️⃣ Tab順序（最初の10要素）:');
const focusable = await page.$$eval(
  'a, button, input, textarea',
  els => els.map((el, i) => {
    const tag = el.tagName.toLowerCase();
    const type = el.type || '';
    const name = el.name || '';
    const text = el.textContent?.trim().substring(0, 25) || '';
    const label = el.getAttribute('aria-label') || '';
    return `${tag}${type ? `[${type}]` : ''}${name ? `(${name})` : ''} - ${text || label}`;
  })
);
focusable.slice(0, 10).forEach((el, i) => console.log(`  ${i + 1}. ${el}`));

console.log('\n5️⃣ フォームフィールドのラベル:');
const fields = await page.$$eval('input[name], textarea[name]', els =>
  els.map(el => {
    const label = document.querySelector(`label[for="${el.id}"]`);
    return {
      name: el.name,
      hasLabel: !!label,
      labelText: label?.textContent.trim().replace(/\s+/g, ' ')
    };
  })
);
fields.forEach(f => {
  const status = f.hasLabel ? '✅' : '❌';
  console.log(`  ${status} ${f.name}: ${f.labelText || '(ラベルなし)'}`);
});

console.log('\n6️⃣ 必須フィールド:');
const required = await page.$$eval('[required]', els =>
  els.map(el => `${el.name || el.id} (${el.tagName.toLowerCase()})`)
);
required.forEach(r => console.log(`  ✅ ${r}`));

await browser.close();
