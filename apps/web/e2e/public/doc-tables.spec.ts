import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test('Phone documentation tables remain reachable and scrollable by keyboard',async({page})=>{
 test.setTimeout(90000);
 for(const route of ['/docs/quick-add','/docs/self-hosting']){
  await page.goto(route);
  const table=page.locator('main table').first();await expect(table).toBeVisible();
  const region=table.locator('..');await expect(region).toHaveAttribute('tabindex','0');await expect(region).toHaveAttribute('role','region');await expect(region).toHaveAttribute('aria-label','Documentation table');
  await page.addScriptTag({path:resolve('../../node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(options:unknown)=>Promise<{violations:{id:string}[]}>}}).axe;return(await axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)});expect(violations).toEqual([]);
  let reached=false;for(let step=0;step<80;step++){await page.keyboard.press('Tab');if(await region.evaluate(node=>node===document.activeElement)){reached=true;break;}}expect(reached).toBe(true);await expect(region).toBeFocused();
  if(await region.evaluate(node=>node.scrollWidth>node.clientWidth)){await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);}
 }
});
