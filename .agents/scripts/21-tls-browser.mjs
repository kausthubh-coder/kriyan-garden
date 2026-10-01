import { chromium } from '@playwright/test';
// Trust only this run's ephemeral loopback certificate in QA browsers.
if(process.env.QA_TLS_SPKI) {
 const launch=chromium.launch.bind(chromium);
 chromium.launch=options=>launch({...options,args:[...(options?.args??[]),`--ignore-certificate-errors-spki-list=${process.env.QA_TLS_SPKI}`]});
}
