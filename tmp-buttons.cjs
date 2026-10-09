const { chromium } = require('@playwright/test');
(async () => {
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1366,height:900}});
 await page.goto('http://localhost:3001/admin/users',{waitUntil:'networkidle',timeout:60000});
 console.log('url', page.url());
 console.log(await page.locator('button').evaluateAll(btns=>btns.map((b,i)=>({i,text:b.textContent, cls:b.className, rect:(()=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()}))));
 await browser.close();
})();
