import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { clerkClient, listTestUsers } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { prepareClerk, signInPage } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { save, backend, prod, ref } from './21-common.mjs';
const users=await listTestUsers();const leftover=users.find(u=>u.email.startsWith('kriyan-smoke-'));
if(!leftover){await save('delete-smoke',{status:'pass',alreadyAbsent:true});console.log('No leftover smoke user remains.');process.exit(0);}
const browser=await chromium.launch({channel:'chrome'});
let page;
try {
 const b=await backend(leftover,prod);
 await b.client.mutation(ref('profiles:completeOnboarding'),{});
 await prepareClerk();page=await browser.newPage({viewport:{width:1440,height:900}});
 await signInPage(page,leftover.email,{base:'https://app.kriyan.app'});
 await page.goto('https://app.kriyan.app/app/settings/account');
 await page.getByRole('button',{name:'Security',exact:true}).click();
 await page.getByRole('button',{name:'Delete account',exact:true}).click();
 await page.screenshot({path:'.agents/logs/21/delete-account-confirmation.png'});
 const password=page.getByLabel('Password',{exact:true});
 if(await password.isVisible())throw new Error('Pre-existing smoke user requires its password to delete through the account dialog.');
 await page.getByPlaceholder('Delete account',{exact:true}).fill('Delete account');
 await page.getByRole('button',{name:'Delete account',exact:true}).last().click();
 await expect.poll(async()=> (await listTestUsers()).some(u=>u.id===leftover.id),{timeout:30000}).toBe(false);
 await save('delete-smoke',{status:'pass',id:leftover.id,email:leftover.email,deletedThroughApp:true});
 console.log('Deleted leftover smoke identity through the production app.');
} catch(error){if(page){await page.screenshot({path:'.agents/logs/21/delete-account-failure.png'});await save('delete-smoke-page',{url:page.url(),text:await page.locator('body').innerText()});}await save('delete-smoke',{status:'fail',id:leftover.id,email:leftover.email,error:error.message.slice(0,450)});console.error(error.message.slice(0,200));process.exitCode=1;}
finally{await browser.close();}
