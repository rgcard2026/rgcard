const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('console', msg => console.log('BROWSER', msg.type(), msg.text()));
  await page.goto('http://localhost:3001/admin/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[name="username"], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[type="password"]', 'Admin@12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 60000 });
  await page.goto('http://localhost:3001/admin/users', { waitUntil: 'networkidle', timeout: 60000 });
  const info = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder], input, textarea');
    if (!input) return { error: 'no input' };
    const r = input.getBoundingClientRect();
    const x = r.left + Math.min(20, Math.max(1, r.width / 2));
    const y = r.top + Math.min(20, Math.max(1, r.height / 2));
    const el = document.elementFromPoint(x, y);
    function describe(node) {
      if (!node) return null;
      const cs = getComputedStyle(node);
      return {
        tag: node.tagName,
        id: node.id,
        cls: node.className,
        text: (node.textContent || '').slice(0, 80),
        pointerEvents: cs.pointerEvents,
        zIndex: cs.zIndex,
        position: cs.position,
        opacity: cs.opacity,
        visibility: cs.visibility,
        rect: (() => { const rr = node.getBoundingClientRect(); return { x: rr.x, y: rr.y, w: rr.width, h: rr.height }; })()
      };
    }
    return { input: describe(input), atPoint: describe(el), activeBefore: document.activeElement?.tagName, x, y };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.mouse.click(info.x, info.y);
  const after = await page.evaluate(() => ({ active: document.activeElement && { tag: document.activeElement.tagName, cls: document.activeElement.className, placeholder: document.activeElement.getAttribute('placeholder'), value: document.activeElement.value }, bodyClasses: document.body.className, htmlClasses: document.documentElement.className }));
  console.log('AFTER', JSON.stringify(after, null, 2));
  await page.screenshot({ path: 'users-debug.png', fullPage: true });
  await browser.close();
})();
