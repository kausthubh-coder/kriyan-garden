import type { Page, Browser } from '@playwright/test';
export function prepareClerk(): Promise<void>;
export function launchBrowser(): Promise<Browser>;
export function signInPage(page: Page, email: string, options: { base: string; ui?: boolean; password?: string; destination?: string }): Promise<void>;
export function convexToken(page: Page): Promise<string>;
