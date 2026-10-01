import { mkdir, writeFile } from "node:fs/promises";
import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect, type Page } from "@playwright/test";
import { api } from "@kriyan/backend/convex/_generated/api";
import { makeFunctionReference } from "convex/server";
import { ConvexHttpClient } from "convex/browser";
import { backendFor } from "./backend";
import { measureRenderedAccount } from "./account-measurements";

async function disposable(page: Page) {
  const secret = process.env.CLERK_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secret?.startsWith("sk_test_") || !publishable?.startsWith("pk_test_")) throw new Error("Only disposable development identities are allowed.");
  process.env.CLERK_PUBLISHABLE_KEY = publishable;
  await clerkSetup();
  const client = createClerkClient({ secretKey: secret });
  const email = `kriyan-hardening-${crypto.randomUUID()}+clerk_test@example.com`;
  const user = await client.users.createUser({ emailAddress: [email], skipPasswordRequirement: true });
  const cleanupSession = await client.sessions.createSession({ userId: user.id });
  const cleanupBackend = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "", { logger: false });
  async function cleanup() {
    if (!page.isClosed()) await page.close();
    cleanupBackend.setAuth((await client.sessions.getToken(cleanupSession.id, "convex")).jwt);
    await cleanupBackend.mutation(api.profiles.resetAll, {});
    await expect.poll(() => cleanupBackend.query(api.profiles.get, {})).toBeNull();
    await client.users.deleteUser(user.id);
  }
  // No credentials or storage state are persisted by this suite.
  let backend: Awaited<ReturnType<typeof backendFor>> | undefined;
  try {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await clerk.signIn({ page, emailAddress: email });
    await page.goto("/app");
    backend = await backendFor(page);
    await backend.mutation(api.profiles.ensure, {});
    await backend.mutation(api.profiles.completeOnboarding, {});
    return { client, user, backend, cleanup };
  } catch (failure) {
    await cleanup();
    throw failure;
  }
}

test("authenticated CSP, account contrast, keyboard focus and phone controls", async ({ page }) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      // Record directives only; blocked URLs may contain credentials.
      console.warn(`CSP violation: ${event.effectiveDirective}`);
    });
  });
  page.on("console", (message) => { if (message.text().startsWith("CSP violation:")) violations.push(message.text()); });
  const fixture = await disposable(page);
  try {
    await fixture.backend.mutation(api.tasks.create, { title: "Disposable security check" });
    const response = await page.goto("/app/settings");
    const csp = response?.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    if (process.env.E2E_EXPECT_PRODUCTION === "1") {
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("ws://localhost");
    }
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Account", exact: true }).click();
    const badge = page.locator(".cl-badge").filter({ hasText: "Primary" }).first();
    await expect(badge).toBeVisible();
    await mkdir("../../.agents/screenshots/07", { recursive: true });
    const measurements = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      measurements.push(await page.evaluate(() => {
        const badge = [...document.querySelectorAll<HTMLElement>(".cl-badge")].find((item) => item.textContent?.includes("Primary"));
        if (!badge) throw new Error("Primary badge not rendered.");
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable.");
        function rgba(css: string) { if (!context) throw new Error("Canvas unavailable."); context.clearRect(0, 0, 1, 1); context.fillStyle = css; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].map((n, i) => i === 3 ? n / 255 : n); }
        function over(fg: number[], bg: number[]) { return fg.slice(0, 3).map((n, i) => n * fg[3] + bg[i] * (1 - fg[3])); }
        const chain: HTMLElement[] = []; let element: HTMLElement | null = badge;
        while (element) { chain.unshift(element); element = element.parentElement; }
        let background = [0, 0, 0];
        for (const item of chain) background = over(rgba(getComputedStyle(item).backgroundColor), background);
        const style = getComputedStyle(badge);
        const foreground = over(rgba(style.color), background);
        function luminance(color: number[]) { return color.map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((total, c, i) => total + c * [.2126, .7152, .0722][i], 0); }
        const a = luminance(foreground), b = luminance(background);
        const controls = [...document.querySelectorAll<HTMLElement>(".cl-userProfile-root button, .cl-userProfile-root a, .cl-userProfile-root input")].filter((item) => item.getBoundingClientRect().width > 0 && getComputedStyle(item).visibility !== "hidden");
        const textStyles = [...document.querySelectorAll<HTMLElement>(".cl-userProfile-root *")].filter((item) => item.getBoundingClientRect().width > 0 && getComputedStyle(item).visibility !== "hidden" && [...item.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())).map((item) => {
          let element: HTMLElement | null = item; const chain: HTMLElement[] = [];
          while (element) { chain.unshift(element); element = element.parentElement; }
          let surface = [0, 0, 0];
          for (const parent of chain) surface = over(rgba(getComputedStyle(parent).backgroundColor), surface);
          const fg = rgba(getComputedStyle(item).color);
          fg[3] *= chain.reduce((opacity, parent) => opacity * Number(getComputedStyle(parent).opacity), 1);
          const a = luminance(over(fg, surface)), b = luminance(surface);
          return { selector: [...item.classList].filter((name) => name.startsWith("cl-")).join(" "), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        });
        return { width: innerWidth, badge: { color: style.color, background: style.backgroundColor, foreground, surface: background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), opacity: style.opacity }, textStyles, controls: controls.map((item) => { const rect = item.getBoundingClientRect(); return { tag: item.tagName, selector: [...item.classList].filter((name) => name.startsWith("cl-")).join(" "), width: rect.width, height: rect.height, minHeight: getComputedStyle(item).minHeight }; }), overflow: document.documentElement.scrollWidth > innerWidth };
      }));
      await page.screenshot({ path: `../../.agents/screenshots/07/account-${width}.png`, animations: "disabled" });
    }
    await writeFile("../../.agents/screenshots/07/account-measurements.json", JSON.stringify(measurements, null, 2));
    console.log("Account measurements:", JSON.stringify(measurements));
    for (const result of measurements) {
      expect(result.badge.ratio).toBeGreaterThanOrEqual(4.5);
      for (const style of result.textStyles) expect(style.ratio, style.selector).toBeGreaterThanOrEqual(4.5);
      expect(result.overflow).toBe(false);
    }
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    expect(await focused.evaluate((item) => getComputedStyle(item).outlineStyle)).not.toBe("none");
    const focusChecks = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".cl-userProfile-root button, .cl-userProfile-root a, .cl-userProfile-root input")].filter((item) => item.getBoundingClientRect().width > 0 && !item.matches(":disabled")).map((item) => {
      item.focus(); const style = getComputedStyle(item);
      return { focused: document.activeElement === item, ring: style.outlineStyle, animation: style.animationName, transition: style.transitionDuration };
    }));
    for (const check of focusChecks) { expect(check.focused).toBe(true); expect(check.ring).not.toBe("none"); expect(check.animation).toBe("none"); expect(check.transition).toBe("0s"); }
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".cl-badge").first().evaluate((item) => getComputedStyle(item).animationName)).toBe("none");
    expect(violations).toEqual([]);
    // Inject into the HTML response, not through CDP evaluation (which is a
    // trusted automation context and is unsuitable for testing CSP rejection).
    await page.route("**/app/settings", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("</body>", "<script>document.documentElement.dataset.cspProbe = 'executed'</script></body>") });
    });
    await page.goto("/app/settings");
    expect(await page.evaluate(() => document.documentElement.dataset.cspProbe)).toBeUndefined();
    await expect.poll(() => violations).toContain("CSP violation: script-src-elem");
    const home = await page.goto("/");
    expect(home?.headers()["x-frame-options"]).toBe("DENY");
    expect(home?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    for (const path of ["/demo", "/docs", "/docs/mcp", "/privacy", "/terms"]) {
      const response = await page.request.get(path);
      expect(response.headers()["x-frame-options"]).toBe(path === "/demo" ? "SAMEORIGIN" : "DENY");
      expect(response.headers()["content-security-policy"]).toContain(path === "/demo" ? "frame-ancestors 'self'" : "frame-ancestors 'none'");
    }
    await page.evaluate(() => {
      for (const [id, src] of [["public-frame", "/demo"], ["private-frame", "/app/settings"], ["marketing-frame", "/"], ["docs-frame", "/docs"]]) {
        const iframe = document.createElement("iframe"); iframe.id = id; iframe.src = src; document.body.append(iframe);
      }
    });
    await expect(page.frameLocator("#public-frame").getByRole("button", { name: "Add task", exact: true }).first()).toBeVisible();
    await expect(page.frameLocator("#private-frame").getByRole("heading", { name: "Settings", exact: true })).toHaveCount(0);
    await expect(page.frameLocator("#marketing-frame").getByRole("heading", { name: "Your day on one timeline.", exact: true })).toHaveCount(0);
    await expect(page.frameLocator("#docs-frame").getByRole("heading", { name: "Getting started", exact: true })).toHaveCount(0);
    for (const result of measurements) for (const control of result.controls) {
      expect(control.height).toBeGreaterThanOrEqual(result.width === 390 ? 44 : 32);
      expect(control.width).toBeGreaterThanOrEqual(result.width === 390 ? 44 : 32);
    }
  } finally { await fixture.cleanup(); }
});

test("account security and deletion confirmation remain accessible without deleting the identity", async ({ page }) => {
  const fixture = await disposable(page);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app/settings");
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Account", exact: true }).click();
    await page.locator(".cl-navbarButton__security").click();
    await expect(page.getByRole("button", { name: "Delete account", exact: true })).toBeVisible();
    const measurements = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.keyboard.press("Tab");
      const measurement = await page.evaluate(measureRenderedAccount);
      measurements.push(measurement);
      for (const text of measurement.textStyles) expect(text.ratio, text.selector).toBeGreaterThanOrEqual(4.5);
      for (const control of measurement.controls) { expect(control.ring).not.toBe("none"); expect(control.focused).toBe(true); }
      expect(measurement.overflow).toBe(false);
      await page.screenshot({ path: `../../.agents/screenshots/07/security-${width}.png`, animations: "disabled" });
    }
    await page.getByRole("button", { name: "Delete account", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Delete account", exact: true })).toBeVisible();
    const confirmation = page.getByRole("textbox").last();
    await confirmation.scrollIntoViewIfNeeded();
    await expect(confirmation).toBeVisible();
    const remove = page.getByRole("button", { name: "Delete account", exact: true }).last();
    await expect(remove).toBeDisabled();
    await confirmation.fill("delete account");
    await expect(remove).toBeDisabled();
    await confirmation.fill("Delete account");
    await expect(remove).toBeEnabled();
    await confirmation.fill("wrong");
    await expect(remove).toBeDisabled();
    // Opening the confirmation is reversible. Live cleanup is gated on webhook
    // registration, so this test deliberately does not confirm identity removal.
    await page.screenshot({ path: "../../.agents/screenshots/07/delete-confirmation-390.png", animations: "disabled" });
    await writeFile("../../.agents/screenshots/07/security-measurements.json", JSON.stringify(measurements, null, 2));
    console.log("Account security minimum contrast:", Math.min(...measurements.flatMap((result) => result.textStyles.map((text) => text.ratio))));
    for (const result of measurements) for (const control of result.controls) {
      expect(control.height).toBeGreaterThanOrEqual(result.width === 390 ? 44 : 32);
      expect(control.width).toBeGreaterThanOrEqual(result.width === 390 ? 44 : 32);
    }
  } finally { await fixture.cleanup(); }
});

test("the live own-only reset clears the disposable planner and preserves a second disposable owner", async ({ page, browser }) => {
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  const a = await disposable(page);
  let b: Awaited<ReturnType<typeof disposable>> | undefined;
  try {
    b = await disposable(otherPage);
    const own = await a.backend.mutation(api.tasks.create, { title: "Disposable reset record" });
    const other = await b.backend.mutation(api.tasks.create, { title: "Disposable preserved record" });
    await page.goto("/app/settings");
    await page.goto("/app/settings/reset");
    const reset = page.getByRole("button", { name: "Reset everything", exact: true });
    await expect(reset).toBeDisabled();
    await page.getByLabel("Type RESET").fill("reset");
    await expect(reset).toBeDisabled();
    await page.getByLabel("Type RESET").fill("RESET");
    await reset.click();
    await expect(page).toHaveURL(/\/app\/welcome$/);
    await expect.poll(() => a.backend.query(api.tasks.list, {})).toEqual([]);
    expect(await b.backend.query(api.tasks.get, { id: other._id })).toEqual(other);
    await expect(b.backend.query(api.tasks.get, { id: own._id })).rejects.toThrow();
  } finally { await a.cleanup(); if (b) await b.cleanup(); await otherContext.close(); }
});

test("signed account cleanup live deployment gate", async ({ page }) => {
  const fixture = await disposable(page);
  try {
    const cleanup = makeFunctionReference<"action", { ownerId: string; timestamp: number; nonce: string; signature: string }, null>("accountDeletion:cleanup");
    try {
      // Intentionally invalid signature: a deployment probe cannot delete data.
      await fixture.backend.action(cleanup, { ownerId: fixture.user.id, timestamp: Date.now(), nonce: crypto.randomUUID(), signature: "0".repeat(64) });
      throw new Error("The backend accepted an invalid signature.");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "";
      test.skip(message.includes("Could not find public function"), "accountDeletion:cleanup is undeployed. Supervisor deployment and Clerk user.deleted registration are required for live deletion cleanup.");
      expect(message).toContain("Invalid service signature");
    }
  } finally { await fixture.cleanup(); }
});
