import { test, expect } from "@playwright/test";
const route="/tests/production-pause/index.html";
test("an Odim administrator outside the pilot cannot enable operator features",async({page})=>{
 await page.goto(route+"?odim&user=535&admin");
 await expect(page.getByTestId("capabilities")).toContainText('"operator":false',{timeout:20000});
 await expect(page.getByTestId("readonly")).toHaveText("true");
 await expect(page.getByRole("region",{name:"Pausa do operador"})).toHaveCount(0);
});
test("only server-authorized Odim operator has controls; other tenants keep existing behavior",async({page})=>{
 await page.goto(route+"?odim&user=534");
 const bar=page.getByRole("region",{name:"Pausa do operador"});
 await expect(bar).toBeVisible({timeout:20000});
 await expect(page.getByTestId("capabilities")).toContainText('"crm":true');
 await expect(page.getByTestId("readonly")).toHaveText("false");
 await page.evaluate(()=>(window as any).productionFixture.switchIdentity("odim",535));
 await expect(bar).toHaveCount(0);
 await expect(page.getByTestId("capabilities")).toContainText('"operator":false');
 await expect(page.getByTestId("readonly")).toHaveText("true");
 await page.getByLabel("Message draft",{exact:true}).fill("read only text");
 await page.getByRole("button",{name:"Send fixture",exact:true}).click();
 expect(await page.evaluate(()=>(window as any).productionFixture.state.sends.length)).toBe(0);
 await page.evaluate(()=>(window as any).productionFixture.switchIdentity("other",534));
 await expect(bar).toBeVisible();
 await expect(page.getByTestId("readonly")).toHaveText("false");
});
test("Odim capabilities fail closed while loading or unavailable, including malicious local parameter flags",async({page})=>{
 await page.goto(route+"?odim&user=534&hold-features");
 await expect(page.getByTestId("readonly")).toHaveText("true",{timeout:20000});
 await expect(page.getByRole("region",{name:"Pausa do operador"})).toHaveCount(0);
 await expect(page.getByTestId("capabilities")).toHaveText("null");
 await page.evaluate(()=>(window as any).productionFixture.releaseFeatures());
 await expect(page.getByRole("region",{name:"Pausa do operador"})).toBeVisible();
 await page.goto(route+"?odim&user=534&features-error");
 await expect(page.getByTestId("readonly")).toHaveText("true");
 await expect(page.getByRole("region",{name:"Pausa do operador"})).toHaveCount(0);
});
test("a delayed capability response cannot grant the previous user's access after switching identities",async({page})=>{
 await page.goto(route+"?odim&user=534&hold-features");
 await expect(page.getByTestId("readonly")).toHaveText("true",{timeout:20000});
 await page.evaluate(()=>{const f=(window as any).productionFixture;f.holdFeatures=false;f.switchIdentity("odim",535);});
 await expect(page.getByTestId("capabilities")).toContainText('"operator":false');
 await page.evaluate(()=>(window as any).productionFixture.releaseFeatures());
 await expect(page.getByTestId("readonly")).toHaveText("true");
 await expect(page.getByRole("region",{name:"Pausa do operador"})).toHaveCount(0);
});
test("definitive runtime denial clears cached global controls and does not send SIP",async({page})=>{
 await page.goto(route+"?odim&user=534");
 const bar=page.getByRole("region",{name:"Pausa do operador"});await expect(bar).toBeVisible({timeout:20000});
 await page.evaluate(async()=>{const f=(window as any).productionFixture;f.revoke=true;await f.runtime.refreshState().catch(()=>{});});
 await expect(bar).toHaveCount(0);
 const modern=await page.evaluate(()=>(window as any).productionFixture.variant==="modern");
 if(modern){await page.getByRole("button",{name:"Dial fixture",exact:true}).click();expect(await page.evaluate(()=>(window as any).phoneHarness.calls.length)).toBe(0);}
});
