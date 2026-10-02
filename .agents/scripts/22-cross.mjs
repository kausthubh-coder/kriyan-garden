import { chromium, expect } from '@playwright/test';
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { clerkClient } from '../skills/test-kriyan/scripts/lib/users.mjs';
import { prepareClerk, signInPage } from '../skills/test-kriyan/scripts/lib/browser.mjs';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { privatePath } from '../skills/test-kriyan/scripts/lib/config.mjs';
import { backend, ref, prod, save } from './21-common.mjs';
const phase=process.argv[2]??'web-create',base='https://app.kriyan.app';
const browser=await chromium.launch({channel:'chrome'});
try {
 await prepareClerk();const page=await browser.newPage({viewport:{width:1440,height:900}});
 if(phase==='web-create') {
  const email=`kriyan-qa21-web-native-${Date.now()}+clerk_test@example.com`,password=`Qa21!${randomUUID()}X9`;
  await setupClerkTestingToken({page});await page.goto(base+'/sign-up?redirect_url='+encodeURIComponent(base+'/app'));
  await page.getByRole('textbox',{name:'Email address',exact:true}).fill(email);
  await page.getByRole('textbox',{name:'Password',exact:true}).fill(password);
  const verificationSent=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().includes('prepare_verification'));
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  expect((await verificationSent).ok()).toBe(true);
  await page.locator('input[autocomplete="one-time-code"]').fill('424242');
  await expect(page).toHaveURL(/\/(app)?$/,{timeout:30000});
  const found=(await clerkClient().users.getUserList({emailAddress:[email]})).data[0];if(!found)throw new Error('Web signup did not create a user.');
  const owner={id:found.id,email,password};await appendFile(privatePath('21-users.jsonl'),JSON.stringify(owner)+'\n');await writeFile(privatePath('21-web-native-user.json'),JSON.stringify(owner));
  await save('cross-web-created',{id:owner.id,email,createdThroughWeb:true,verifiedEmailCode:true});
  await page.screenshot({path:'.agents/logs/21/cross-web-signup.png'});
 } else if(phase==='web-prepare') {
  const owner=JSON.parse(await readFile(privatePath('21-web-native-user.json'),'utf8'));
  const b=await backend(owner,prod);await b.client.mutation(ref('profiles:ensure'),{timezone:'America/New_York'});await b.client.mutation(ref('profiles:completeOnboarding'),{});
  await signInPage(page,owner.email,{base});await page.goto(base+'/app?view=list');
  await page.getByRole('button',{name:'Add task',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Add a task'});
  await dialog.getByRole('textbox').fill('QA21 web to Android today');await dialog.getByRole('button',{name:'Add task',exact:true}).click();await expect(dialog).not.toBeVisible();
  await expect(page.getByText('QA21 web to Android',{exact:true})).toBeVisible();await b.refresh();const task=(await b.client.query(ref('tasks:list'),{})).find(task=>task.title==='QA21 web to Android');expect(task).toBeTruthy();
  await save('cross-web-task',{id:task._id,createdThroughWeb:true});await page.screenshot({path:'.agents/logs/21/cross-web-task.png'});
 } else if(phase==='web-read-native') {
  const owner=JSON.parse(await readFile(privatePath('21-web-native-user.json'),'utf8'));
  await signInPage(page,owner.email,{base});await page.goto(base+'/app?view=list');await expect(page.getByText('QA21 Android to web',{exact:true})).toBeVisible();
  const b=await backend(owner,prod);const task=(await b.client.query(ref('tasks:list'),{})).find(task=>task.title==='QA21 Android to web');expect(task).toBeTruthy();
  await save('cross-native-task-on-web',{id:task._id,visibleThroughWeb:true});await page.screenshot({path:'.agents/logs/21/cross-native-task-on-web.png'});
 } else {
  const owner=JSON.parse(await readFile(privatePath('21-native-user.json'),'utf8'));
  await setupClerkTestingToken({page});await page.goto(base+'/sign-in');
  await expect(page.getByText('Sign in to Kriyan',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Use email code',exact:true}).click();
  const block=page.getByRole('region',{name:'Sign in with an email code'});
  await block.getByLabel('Email',{exact:true}).fill(owner.email);
  await block.getByRole('button',{name:'Send code',exact:true}).click();
  await block.getByLabel('Verification code',{exact:true}).fill('424242');
  await block.getByRole('button',{name:'Verify code',exact:true}).click();
  await expect(page).toHaveURL(/\/app/,{timeout:60000});
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  const smoke=JSON.parse(await readFile('.agents/logs/21/android-smoke-for-web.json','utf8'));
  await page.goto(base+'/app?view=list');await expect(page.getByText(smoke.taskTitle,{exact:true})).toBeVisible();
  const b=await backend(owner,prod);const task=await b.client.query(ref('tasks:get'),{id:smoke.taskId});expect(task.status).toBe('completed');expect(task.time).toBe('13:00');expect(task.durationMinutes).toBeNull();
  await page.getByRole('button',{name:'Goals',exact:true}).click();await expect(page).toHaveURL(/view=goals/);try{await page.getByRole('button',{name:smoke.goalTitle,exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:smoke.goalTitle,exact:true})).toBeVisible({timeout:30000});}catch(error){await page.screenshot({path:'.agents/logs/21/cross-native-goal-failure.png'});await writeFile(privatePath('cross-native-goal-failure.txt'),await page.locator('body').innerText());throw error;}
  await page.screenshot({path:'.agents/logs/21/cross-native-on-web.png'});
  await save('cross-native-on-web',{id:owner.id,email:owner.email,signedInThroughWeb:true,method:'Production email-code block, code 424242',completedTaskVisible:true,goalVisible:true,taskId:smoke.taskId,goalId:smoke.goalId});
 }
 console.log('Cross-surface web phase passed.');
} catch(error){await save(`cross-${phase}-failure`,{error:error.message.slice(0,600)});console.error(error.message.slice(0,200));process.exitCode=1;}
finally{await browser.close();}
