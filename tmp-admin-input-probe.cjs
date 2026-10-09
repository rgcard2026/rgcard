const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('console', (message) => console.log('BROWSER:', message.text()));
  page.on('pageerror', (error) => console.log('PAGEERROR:', error.message));

  await page.goto('http://localhost:3001/admin/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel('اسم المستخدم').fill('admin');
  await page.getByLabel('كلمة المرور').fill('Admin@12345');
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForTimeout(3000);
  console.log('AFTER LOGIN URL:', page.url());
  console.log('AFTER LOGIN BUTTONS:', JSON.stringify(await page.locator('button').allTextContents()));
  await page.goto('http://localhost:3001/admin/users', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('USERS URL:', page.url());
  console.log('USERS BUTTONS:', JSON.stringify(await page.locator('button').allTextContents()));
  await page.getByRole('button', { name: /إضافة مستخدم|Add user/i }).click();
  await page.locator('.rg-admin-side-panel').waitFor({ state: 'visible', timeout: 30000 });

  const input = page.locator('.rg-admin-side-panel input').first();
  const box = await input.boundingBox();
  if (!box) throw new Error('No input found in side panel');
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    const style = element ? getComputedStyle(element) : null;
    return {
      tag: element?.tagName,
      className: element?.className,
      pointerEvents: style?.pointerEvents,
      zIndex: style?.zIndex,
      position: style?.position,
      text: element?.textContent?.trim().slice(0, 80),
    };
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    className: document.activeElement?.className,
    value: document.activeElement?.value,
    pointerEvents: document.activeElement ? getComputedStyle(document.activeElement).pointerEvents : null,
  }));
  console.log(JSON.stringify({ hit, focus, url: page.url(), inputCount: await page.locator('.rg-admin-side-panel input').count() }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
