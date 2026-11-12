const { chromium } = require('@playwright/test');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage();
 let observed;
 await page.route('**/api/auth/login', async route => { observed = {url:route.request().url(), method:route.request().method()}; await route.fulfill({status:401, headers:{'access-control-allow-origin':'http://127.0.0.1:4311','access-control-allow-credentials':'true'}, contentType:'application/json', body:'{}'}); });
 await page.goto('http://127.0.0.1:4311/nova/odim/login');
 await page.getByPlaceholder('Digite seu login').fill('fixture');
 await page.getByPlaceholder('Digite sua senha').fill('fixture');
 await page.getByRole('button',{name:'Entrar'}).click();
 await page.waitForTimeout(1000);
 if (observed?.url !== 'https://inpulse.infotecrs.inf.br/api/auth/login' || observed.method !== 'POST') throw new Error('Unexpected target: '+JSON.stringify(observed));
 console.log(JSON.stringify(observed));
 await browser.close();
})().catch(e => {console.error(e.message); process.exit(1)});
