const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto('http://localhost:3001/admin/login', { waitUntil: 'networkidle', timeout: 60000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin');
  await inputs.nth(1).fill('Admin@12345');
  await page.locator('button').last().click();
  await page.waitForURL('**/admin/**', { timeout: 60000 });
  await page.goto('http://localhost:3001/admin/users', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('buttons', await page.locator('button').evaluateAll(btns=>btns.map((b,i)=>({i,text:b.textContent, cls:String(b.className)}))));
  const add = page.locator('button').nth(17); // maybe inspect if needed
  await page.locator('button').filter({ has: page.locator('svg[data-testid="PersonAddAltRoundedIcon"]') }).click().catch(async () => { await page.locator('button').nth(8).click(); });
  await page.waitForSelector('.rg-admin-side-panel', { timeout: 10000 });
  const info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.rg-admin-side-panel input, .rg-admin-side-panel textarea'));
    return inputs.map((input) => {
      const r = input.getBoundingClientRect(); const x = r.left + 20; const y = r.top + 20; const top = document.elementFromPoint(x, y);
      const d = (node) => node ? { tag: node.tagName, cls: String(node.className), id: node.id, pe: getComputedStyle(node).pointerEvents, z: getComputedStyle(node).zIndex, pos: getComputedStyle(node).position, text: (node.textContent||'').slice(0,50), rect: (()=>{const rr=node.getBoundingClientRect();return {x:rr.x,y:rr.y,w:rr.width,h:rr.height}})() } : null;
      return { input: d(input), top: d(top), x, y };
    });
  });
  console.log(JSON.stringify(info, null, 2));
  const first = info[0]; await page.mouse.click(first.x, first.y); await page.keyboard.type('Test Name');
  console.log('active/value', await page.evaluate(() => ({ tag: document.activeElement?.tagName, cls: String(document.activeElement?.className), value: document.activeElement?.value })));
  await browser.close();
})();
