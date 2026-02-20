/**
 * ダークモード + ハイコントラストモード でのスクリーンショット撮影
 * CSS注入でダークモード/ハイコントラストをシミュレート
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

console.log('📸 アクセシビリティスクリーンショット撮影\n');

// ===== 1. 通常モード =====
console.log('1️⃣ 通常モード（ライトモード）:');
await page.goto('http://127.0.0.1:8000/feedback', { waitUntil: 'load', timeout: 10000 });
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-light.png' });
console.log('  ✅ feedback-light.png');

// ===== 2. ダークモード =====
console.log('\n2️⃣ ダークモード:');
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' }
]);
await page.goto('http://127.0.0.1:8000/feedback', { waitUntil: 'load', timeout: 10000 });
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-dark.png' });
console.log('  ✅ feedback-dark.png');

// ===== 3. ハイコントラストモード（CSS注入） =====
console.log('\n3️⃣ ハイコントラストモード（Shift + Alt + Print Screen相当）:');
await page.goto('http://127.0.0.1:8000/feedback', { waitUntil: 'load', timeout: 10000 });
await page.addStyleTag({ content: `
  body { background-color: #000 !important; color: #fff !important; }
  input, textarea, select { background-color: #fff !important; color: #000 !important; border: 2px solid #000 !important; }
  button { background-color: #000 !important; color: #fff !important; border: 2px solid #fff !important; font-weight: bold !important; }
  a { color: #00f !important; text-decoration: underline !important; }
  .text-gray-900, .text-gray-600 { color: #000 !important; }
  .bg-white { background-color: #fff !important; }
  .border { border-color: #000 !important; }
` });
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-high-contrast.png' });
console.log('  ✅ feedback-high-contrast.png');

// ===== 4. ダーク + ハイコントラスト =====
console.log('\n4️⃣ ダークモード + ハイコントラスト:');
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' }
]);
await page.goto('http://127.0.0.1:8000/feedback', { waitUntil: 'load', timeout: 10000 });
await page.addStyleTag({ content: `
  body { background-color: #1a1a1a !important; color: #fff !important; }
  input, textarea, select { background-color: #333 !important; color: #fff !important; border: 2px solid #fff !important; }
  button { background-color: #444 !important; color: #fff !important; border: 2px solid #fff !important; font-weight: bold !important; }
  a { color: #ffff00 !important; text-decoration: underline !important; }
` });
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-dark-high-contrast.png' });
console.log('  ✅ feedback-dark-high-contrast.png');

// ===== 5. 確認画面 - ハイコントラスト =====
console.log('\n5️⃣ 確認画面（ハイコントラスト）:');
await page.emulateMediaFeatures([]);
await page.goto('http://127.0.0.1:8000/feedback', { waitUntil: 'load', timeout: 10000 });
await page.addStyleTag({ content: `body { background-color: #000; color: #fff; }` });
await page.click('input[value="general"]', { delay: 30 });
await page.type('textarea[name="message"]', 'ハイコントラスト確認画面テスト', { delay: 10 });
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'load', timeout: 10000 });
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-confirm-high-contrast.png' });
console.log('  ✅ feedback-confirm-high-contrast.png');

// ===== 6. 完了画面 - ダークモード =====
console.log('\n6️⃣ 完了画面（ダークモード）:');
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' }
]);
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'load', timeout: 10000 });
await page.screenshot({ path: 'tests/accessibility/screenshots/feedback-thanks-dark.png' });
console.log('  ✅ feedback-thanks-dark.png');

// スクリーンショットファイルの確認
console.log('\n📁 撮影済みスクリーンショット:');
const screenshotDir = 'tests/accessibility/screenshots';
if (fs.existsSync(screenshotDir)) {
  const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
  let totalSize = 0;
  files.forEach(file => {
    const stats = fs.statSync(`${screenshotDir}/${file}`);
    totalSize += stats.size;
    console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
  });
  console.log(`\n  📊 合計: ${(totalSize / 1024).toFixed(1)}KB`);
}

await browser.close();
console.log('\n✅ スクリーンショット撮影完了！');
