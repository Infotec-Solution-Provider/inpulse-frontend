import {expect,test} from '@playwright/test';
test('CRM1 and globalWA12 stay separate; foreign1 is never requested or offered',async({page})=>{
 await page.goto('/');await expect(page.getByTestId('wa-sector')).toHaveText('12');await expect(page.getByTestId('original-crm')).toHaveText('1');
 await expect(page.getByTestId('wa-options')).not.toContainText('INFOTEC');await expect(page.getByTestId('crm-options')).toHaveText('[{"id":1,"name":"ODIM principal"},{"id":2,"name":"ODIM apoio"}]');
 expect(await page.evaluate(()=>(window as any).sectorTest.state.calls)).toEqual([{url:'/api/whatsapp/session/parameters',instance:'odim'},{url:'/api/whatsapp/sectors',instance:'odim'},{url:'/api/whatsapp/sector/12/clients',instance:'odim'}]);
});
for(const invalid of ['missing','ambiguous','missing-root'])test(`active ${invalid} mapping fails closed before sector/client requests`,async({page})=>{
 await page.goto('/?'+invalid);await expect(page.getByText('Mapeamento indisponível')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).sectorTest.state.calls)).toEqual([{url:'/api/whatsapp/session/parameters',instance:'odim'}]);
});
test('default-off preserves the old sector URL',async({page})=>{
 await page.goto('/?off');await expect(page.getByTestId('wa-sector')).toHaveText('1');
 expect(await page.evaluate(()=>(window as any).sectorTest.state.calls.at(-1).url)).toBe('/api/whatsapp/sector/1/clients');
});
test('logout during a delayed policy request cannot request sectors afterward',async({page})=>{
 await page.goto('/?delay=params');await expect.poll(()=>page.evaluate(()=>(window as any).sectorTest.state.calls.length)).toBe(1);
 await page.evaluate(()=>(window as any).sectorTest.update({token:null}));await expect(page.getByText('Sessão encerrada')).toBeVisible();await page.waitForTimeout(550);
 expect(await page.evaluate(()=>(window as any).sectorTest.state.calls.length)).toBe(1);
});
test('tenant change discards the old namespace and uses legacy behavior for another tenant',async({page})=>{
 await page.goto('/?delay=sectors');await expect.poll(()=>page.evaluate(()=>(window as any).sectorTest.state.calls.length)).toBe(2);
 await page.evaluate(()=>(window as any).sectorTest.update({instance:'other',token:'other-fixture'}));await expect(page.getByTestId('wa-sector')).toHaveText('1');
 expect(await page.evaluate(()=>(window as any).sectorTest.state.calls.filter((call:any)=>call.url.includes('/clients')))).toEqual([{url:'/api/whatsapp/sector/1/clients',instance:'other'}]);
});
test('the basic/legacy operator dropdown saves CRM1 after selecting approved WhatsApp sector12',async({page})=>{
 await page.goto('/?form=legacy');await expect(page.getByTestId('wa-sector')).toHaveText('12');await page.getByRole('button',{name:'Editar operador',exact:true}).click();
 await page.getByRole('combobox',{name:'Setor'}).click();await expect(page.getByRole('option',{name:'INFOTEC foreign'})).toHaveCount(0);await page.getByRole('option',{name:'ODIM principal',exact:true}).click();
 await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).sectorTest.state.writes.length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).sectorTest.state.writes[0].data.SETOR)).toBe(1);
});
test('the new registration dropdown also saves CRM1 instead of global12',async({page})=>{
 test.skip(!test.info().config.metadata.registration,'Only the new interface has the complete registration form');
 await page.goto('/?form=registration');await expect(page.getByTestId('wa-sector')).toHaveText('12');await page.getByRole('button',{name:'Editar operador',exact:true}).click();
 await page.getByRole('combobox',{name:/^Setor/}).click();await page.getByRole('option',{name:/^ODIM principal/}).click();await page.getByRole('button',{name:'Salvar usuário',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).sectorTest.state.writes.length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).sectorTest.state.writes[0])).toEqual({kind:'registration-update',data:{SETOR:1}});
});
