import{test,expect}from'@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/options/**',async route=>{const kind=new URL(route.request().url()).pathname.split('/').pop();const records:Record<string,Array<{id:string,label:string}>>={groups:[{id:'2',label:'Grupo A'}],brands:[{id:'7',label:'Marca A'}],states:[{id:'SP',label:'São Paulo'}]};await route.fulfill({json:{data:records[kind!]??[],page:{current:1,hasNext:false}}})})});
test('combines real catalog picks with phone/email and serializes all criteria',async({page})=>{
  await page.goto('/tests/customer-search/index.html');
  for(const[label,option]of[['Grupos de clientes','Grupo A (#2)'],['Marcas','Marca A (#7)'],['Estados','São Paulo (#SP)']]){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();await page.keyboard.press('Escape')}
  await page.getByRole('textbox',{name:'Telefone contém',exact:true}).fill('11999991234');await page.getByRole('textbox',{name:'E-mail contém',exact:true}).fill('@test.local');
  const value=await page.getByTestId('filters').textContent();expect(JSON.parse(value!)).toEqual({groupIds:'2',brandIds:'7',states:'SP',phone:'11999991234',email:'@test.local'});
});
test('supports paginated options without losing an earlier selected label',async({page})=>{
  await page.route('**/options/groups?**',async route=>{const current=Number(new URL(route.request().url()).searchParams.get('page'));await route.fulfill({json:{data:[{id:current===1?'2':'3',label:current===1?'Primeiro':'Segundo'}],page:{current,hasNext:current===1}}})});
  await page.goto('/tests/customer-search/index.html');await page.getByRole('combobox',{name:'Grupos de clientes',exact:true}).click();await page.getByRole('option',{name:'Primeiro (#2)',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Carregar mais opções',exact:true}).click();await page.getByRole('combobox',{name:'Grupos de clientes',exact:true}).click();await expect(page.getByRole('option',{name:'Segundo (#3)',exact:true})).toBeVisible();await expect(page.getByText('Primeiro (#2)',{exact:true}).first()).toBeVisible();
});
test('discards a late catalog response after the tenant changes',async({page})=>{
  await page.route('**/options/groups?**',async route=>{const old=route.request().headers()['x-fixture-token']==='token-a';if(old)await new Promise(resolve=>setTimeout(resolve,800));await route.fulfill({json:{data:[{id:'2',label:old?'Empresa anterior':'Empresa atual'}],page:{current:1,hasNext:false}}})});
  await page.goto('/tests/customer-search/index.html');await page.waitForRequest(request=>request.url().includes('/options/groups'));await page.getByRole('button',{name:'Trocar tenant',exact:true}).click();await page.getByRole('combobox',{name:'Grupos de clientes',exact:true}).click();await expect(page.getByRole('option',{name:'Empresa atual (#2)',exact:true})).toBeVisible();await page.waitForTimeout(900);await expect(page.getByRole('option',{name:'Empresa anterior (#2)',exact:true})).toHaveCount(0);
});
