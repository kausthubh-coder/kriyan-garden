import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {appendFile} from 'node:fs/promises';
import {createTestUser} from '../../../.agents/skills/test-kriyan/scripts/lib/users.mjs';
import {api} from '@kriyan/backend/convex/_generated/api';
import {prepareClerk,signInPage} from '../../../.agents/skills/test-kriyan/scripts/lib/browser.mjs';
import {backend,cleanup} from '../../../.agents/scripts/21-common.mjs';
test('Planning property labels keep contrast on hover and press',async({page})=>{
 test.setTimeout(120000);const owner=await createTestUser({tag:'qa21-planning-contrast'});await appendFile(resolve('../../.agents/test-kriyan/21-users.jsonl'),JSON.stringify({id:owner.id,email:owner.email})+'\n');
 try{const b=await backend(owner);await b.client.mutation(api.profiles.ensure,{timezone:'America/New_York'});await b.client.mutation(api.profiles.completeOnboarding,{});await prepareClerk();await signInPage(page,owner.email,{base:test.info().project.use.baseURL??'http://localhost:3500'});await page.goto('/app/settings/planning');await expect(page.locator('[data-property="capacity"]')).toBeVisible();await page.addScriptTag({path:resolve('../../node_modules/axe-core/axe.min.js')});
 const axe=()=>page.evaluate(async()=>{const runner=(window as unknown as {axe:{run:(options:unknown)=>Promise<{violations:{id:string}[]}>}}).axe;return(await runner.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)});
 for(const name of ['capacity','start','end','timezone']){const button=page.locator(`[data-property="${name}"]`);await button.hover();expect(await axe()).toEqual([]);await page.mouse.down();try{expect(await axe()).toEqual([]);}finally{await page.mouse.up();}}
 }finally{await page.close();await cleanup(owner);}
});
