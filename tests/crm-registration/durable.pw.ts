import { test, expect } from "@playwright/test";
const journal = (page:any) => page.evaluate(async()=>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open("inpulse-crm-operation-journal",1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{return await new Promise<any[]>((resolve,reject)=>{const request=db.transaction("operations").objectStore("operations").getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
});
test("COMMITTED receipt with failed readback remains durable across reload until data can actually be read",async({page})=>{
 await page.goto("/tests/crm-registration/index.html?pilot&transport");
 await page.getByLabel("Nome fantasia",{exact:true}).fill("Readback still pending");
 await page.getByRole("button",{name:"Salvar cadastro",exact:true}).click();
 await expect(page.getByRole("button",{name:"Verificar registro",exact:true})).toBeVisible();
 await page.evaluate(()=>{window.registrationTest.failure="verify";window.registrationTest.failRead=true;sessionStorage.setItem("registration-readback-fails","true");});
 await page.getByRole("button",{name:"Verificar registro",exact:true}).click();
 await expect.poll(async()=> (await journal(page))[0]?.confirmed).toBe(true);
 await page.reload();
 expect(await journal(page)).toHaveLength(1);
 await page.evaluate(()=>{window.registrationTest.failure="verify";window.registrationTest.failRead=false;sessionStorage.removeItem("registration-readback-fails");});
 await page.getByRole("button",{name:"Verificar registro",exact:true}).click();
 await expect.poll(async()=> (await journal(page)).length).toBe(0);
 expect(await page.evaluate(()=>window.registrationTest.writes.length)).toBe(1);
});
test("Odim ACTIVE pilot preserves the durable create across reload and verifies the receipt without a second write",async({page})=>{
 await page.goto("/tests/crm-registration/index.html?new&pilot&transport");
 await page.getByLabel("Razão social ou nome *",{exact:true}).fill("Durable pilot draft");
 await page.getByRole("button",{name:"Salvar cadastro",exact:true}).click();
 await expect(page.getByRole("button",{name:"Verificar registro",exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel("Razão social ou nome *",{exact:true})).toHaveValue("Durable pilot draft");
 await expect(page.getByRole("button",{name:"Salvar cadastro",exact:true})).toBeDisabled();
 await page.getByRole("button",{name:"Verificar registro",exact:true}).click();
 expect(await page.evaluate(()=>window.registrationTest.writes.length)).toBe(1);
 await page.evaluate(()=>{window.registrationTest.failure="verify";});
 await page.getByRole("button",{name:"Verificar registro",exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.registrationTest.navigation)).toContain("/odim/crm-customers/52");
 expect(await page.evaluate(()=>window.registrationTest.writes.length)).toBe(1);
});
test("confirmed update receipt reads back current data and clears the old draft without replay",async({page})=>{
 await page.goto("/tests/crm-registration/index.html?pilot&transport");
 await page.getByLabel("Nome fantasia",{exact:true}).fill("Durable update");
 await page.getByRole("button",{name:"Salvar cadastro",exact:true}).click();
 await page.reload();
 await expect(page.getByLabel("Nome fantasia",{exact:true})).toHaveValue("Durable update");
 await page.evaluate(()=>{window.registrationTest.failure="verify";});
 await page.getByRole("button",{name:"Verificar registro",exact:true}).click();
 await expect(page.getByRole("button",{name:"Verificar registro",exact:true})).toHaveCount(0);
 await expect(page.getByText("Dados conferidos e atualizados.")).toBeVisible();
 expect(await page.evaluate(()=>window.registrationTest.writes.length)).toBe(1);
});
