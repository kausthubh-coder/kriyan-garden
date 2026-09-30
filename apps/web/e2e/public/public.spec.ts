import { test, expect } from "@playwright/test";
test.describe("Demo goals", () => {
  test.use({ actionTimeout: 10_000 });
  test("demo goal panels, milestones, creation and delete Undo use local transport and URL selection", async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    const external: string[] = [],
      errors: string[] = [];
    page.on("request", (request) => {
      if (/convex|clerk/i.test(new URL(request.url()).hostname))
        external.push(request.url());
    });
    page.on("websocket", (socket) => {
      if (/convex|clerk/i.test(new URL(socket.url()).hostname))
        external.push(socket.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/demo?view=goals&goal=run");
    const panel = page.getByRole("dialog", { name: "Goal details" });
    await expect(panel).toBeVisible();
    await expect(panel.getByLabel("Goal title", { exact: true })).toHaveValue(
      "Run a 10k",
    );
    if (info.project.name === "desktop")
      await expect(
        panel.getByLabel("Goal title", { exact: true }),
      ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(page).toHaveURL(/view=goals/);
    expect(new URL(page.url()).searchParams.has("goal")).toBe(false);
    await expect(
      page.getByLabel("Current value", { exact: false }),
    ).toHaveCount(0);
    const details = page.getByRole("button", {
      name: "Run a 10k",
      exact: true,
    });
    await details.click();
    await expect(page).toHaveURL(/goal=run/);
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(details).toBeFocused();
    await details.click();
    const row = (id: string) => panel.locator(`[data-property="${id}"]`);
    const edit = async (id: string, label: string, value: string) => {
      await row(id).click();
      await panel.getByLabel(label, { exact: true }).fill(value);
      await row(id).focus();
      await expect(row(id)).toContainText(value);
    };
    await panel
      .getByLabel("Goal title", { exact: true })
      .fill("Run the river route");
    await panel.getByLabel("Goal title", { exact: true }).blur();
    await expect(panel.getByRole("status")).toHaveText("Changes saved.");
    await row("area").click();
    await panel
      .getByRole("group", { name: "Area editor" })
      .getByRole("button", { name: "School", exact: true })
      .click();
    await expect(row("area")).toContainText("School");
    for (const [id, label, value, formatted] of [
      ["targetDate", "Target date", "2029-06-30", "Sat 30 Jun"],
      ["startDate", "Start date", "2028-06-01", "Thu 1 Jun"],
    ]) {
      await row(id).click();
      await panel.getByRole("button", { name: "Pick a day" }).click();
      await panel.getByLabel(label, { exact: true }).fill(value);
      await expect(row(id)).toContainText(formatted);
    }
    await edit("current", "Current value", "7.25");
    await edit("target", "Target value", "12");
    await edit("unit", "Unit", "km");
    await row("status").click();
    await panel.getByRole("button", { name: "Archived", exact: true }).click();
    await expect(row("status")).toContainText("Archived");
    await panel
      .getByRole("textbox", { name: "Note", exact: true })
      .fill("Use the river path");
    await panel.getByRole("textbox", { name: "Note", exact: true }).blur();
    await expect(panel.getByRole("status")).toHaveText("Changes saved.");
    await panel.getByRole("button", { name: "Close goal details" }).click();
    await page
      .getByRole("button", { name: "Run the river route", exact: true })
      .click();
    await expect(panel.getByLabel("Goal title", { exact: true })).toHaveValue(
      "Run the river route",
    );
    await expect(row("area")).toContainText("School");
    await expect(row("targetDate")).toContainText("Sat 30 Jun");
    await expect(row("startDate")).toContainText("Thu 1 Jun");
    await expect(row("current")).toContainText("7.25");
    await expect(row("target")).toContainText("12");
    await expect(row("unit")).toContainText("km");
    await expect(row("status")).toContainText("Archived");
    await expect(
      panel.getByRole("textbox", { name: "Note", exact: true }),
    ).toHaveValue("Use the river path");
    await row("measure").click();
    await panel
      .getByRole("button", { name: "Milestones", exact: true })
      .click();
    await expect(row("measure")).toContainText("Milestones");
    await row("status").click();
    await panel.getByRole("button", { name: "Active", exact: true }).click();
    await expect(row("status")).toContainText("Active");
    await panel.getByLabel("New milestone", { exact: true }).fill("Plan route");
    await panel
      .getByLabel("New milestone date", { exact: true })
      .fill("2029-05-01");
    await panel
      .getByRole("button", { name: "Add milestone", exact: true })
      .click();
    await expect(
      panel.getByLabel("Milestone title", { exact: true }),
    ).toHaveValue("Plan route");
    await panel
      .getByLabel("Milestone title", { exact: true })
      .fill("Finish route");
    await panel
      .getByLabel("Milestone date", { exact: true })
      .fill("2029-05-02");
    await panel
      .getByRole("button", { name: "Save milestone", exact: true })
      .click();
    await expect(
      panel.getByRole("checkbox", { name: "Complete milestone: Finish route" }),
    ).toBeVisible();
    await panel
      .getByRole("checkbox", { name: "Complete milestone: Finish route" })
      .click();
    await expect(
      panel.getByRole("checkbox", { name: "Complete milestone: Finish route" }),
    ).toBeChecked();
    await panel.getByRole("button", { name: "Close goal details" }).click();
    const card = page
      .locator("section")
      .filter({
        has: page.getByRole("button", {
          name: "Run the river route",
          exact: true,
        }),
      });
    await expect(
      card.getByText("1 of 1 milestone done.", { exact: false }),
    ).toBeVisible();
    await expect(card.locator("s")).toHaveText("Finish route");
    await page
      .getByRole("button", { name: "Run the river route", exact: true })
      .click();
    await expect(
      panel.getByLabel("Milestone date", { exact: true }),
    ).toHaveValue("2029-05-02");
    await panel
      .getByRole("checkbox", { name: "Complete milestone: Finish route" })
      .click();
    await expect(
      panel.getByRole("checkbox", { name: "Complete milestone: Finish route" }),
    ).not.toBeChecked();
    await panel
      .getByRole("button", { name: "Delete milestone", exact: true })
      .click();
    await expect(
      panel.getByLabel("Milestone title", { exact: true }),
    ).toHaveCount(0);
    await panel
      .getByLabel("New milestone", { exact: true })
      .fill("Keep for Undo");
    await panel
      .getByRole("button", { name: "Add milestone", exact: true })
      .click();
    await expect(
      panel.getByLabel("Milestone title", { exact: true }),
    ).toHaveValue("Keep for Undo");
    await panel
      .getByRole("button", { name: "Delete goal", exact: true })
      .click();
    await expect(panel).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Run the river route", exact: true }),
    ).toHaveCount(0);
    await expect(page).toHaveURL((url) => !url.searchParams.has("goal"));
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Run the river route", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Run the river route", exact: true })
      .click();
    await expect(panel).toBeVisible();
    const restoredId = new URL(page.url()).searchParams.get("goal");
    expect(restoredId).toBeTruthy();
    expect(restoredId).not.toBe("run");
    await expect(
      panel.getByLabel("Milestone title", { exact: true }),
    ).toHaveValue("Keep for Undo");
    await panel.getByRole("button", { name: "Close goal details" }).click();
    await expect(
      card.getByRole("button", {
        name: "Open task: Long run, 7 km",
        exact: true,
      }),
    ).toBeVisible();
    await card
      .getByRole("button", { name: "Open task: Long run, 7 km", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Task details" }),
    ).toBeVisible();
    const taskUrl = new URL(page.url());
    expect(taskUrl.searchParams.get("task")).toBeTruthy();
    expect(taskUrl.searchParams.has("goal")).toBe(false);
    await page
      .getByRole("dialog", { name: "Task details" })
      .getByRole("button", { name: "Close task details" })
      .click();
    await page.getByRole("button", { name: "Add goal", exact: true }).click();
    const adding = page.getByRole("dialog", { name: "Add goal", exact: true });
    await adding
      .getByLabel("Goal title", { exact: true })
      .fill("Demo new goal");
    await adding.getByLabel("Target date", { exact: true }).fill("2029-12-31");
    await adding.getByRole("button", { name: "Add goal", exact: true }).click();
    await expect(adding).not.toBeVisible();
    await page
      .getByRole("button", { name: "Demo new goal", exact: true })
      .click();
    await expect(panel).toBeVisible();
    await expect(row("measure")).toContainText("Tasks");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page).toHaveURL(/view=week/);
    expect(new URL(page.url()).searchParams.has("goal")).toBe(false);
    await page.goto("/demo?view=goals&goal=optimistic-goal");
    await expect(
      page.getByRole("heading", { name: "Goals", exact: true }),
    ).toBeVisible();
    await expect(panel).toHaveCount(0);
    await page.goto("/demo?view=goals&goal=missing");
    await expect(
      page.getByRole("heading", { name: "Goals", exact: true }),
    ).toBeVisible();
    await expect(panel).toHaveCount(0);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
});
test("demo creates, edits, completes and resets without backend traffic", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (/convex|clerk/.test(new URL(request.url()).hostname))
      external.push(request.url());
  });
  page.on("websocket", (socket) => {
    if (/convex|clerk/.test(new URL(socket.url()).hostname))
      external.push(socket.url());
  });
  await page.goto("/demo");
  await expect(
    page.getByText("Demo with sample data. Nothing is saved."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add a task" });
  await dialog.getByRole("textbox").fill("demo proof today 11am #life");
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByText("Demo proof", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Demo proof, 11:00, no length", exact: true })
    .click();
  const details = page.getByRole("dialog", { name: "Task details" });
  await details.locator('[data-property="length"]').click();
  await details.getByRole("button", { name: "30m", exact: true }).click();
  await expect(details.locator('[data-property="time"]')).toContainText("11:00 to 11:30");
  await details.getByRole("button", { name: "Close task details" }).click();
  await expect(details).not.toBeVisible();
  await page
    .getByRole("checkbox", { name: /Mark as done: Demo proof/ })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Mark as not done: Demo proof/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Mark as done: Demo proof/ }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(page.getByRole("progressbar").first()).toBeVisible();
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Week", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Demo proof", { exact: true })).toHaveCount(0);
  expect(external).toEqual([]);
});
test("landing parser, iframe, keyboard tabs and copy are usable", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your day on one timeline.");
  await expect(page.frameLocator("iframe").getByRole("button", { name: "Add task", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "essay fri #econ 2h", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("School / Econ 101");
  await expect(page.getByRole("status").first()).toContainText("2h");
  const first = page.getByRole("tab", { name: "Claude", exact: true });
  await first.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Claude Code", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("claude mcp add");
  await page.getByRole("button", { name: "Copy setup" }).click();
  await expect(page.getByText("Setup copied.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("docs, legal, metadata and planned download route respond", async ({ page, request }, info) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Getting started", exact: true })).toBeVisible();
  if (info.project.name === "mobile") await page.getByText("Browse docs", { exact: true }).click();
  await page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Quick add", exact: true }).click();
  await expect(page.getByRole("table").first()).toBeVisible();
  for (const route of ["/docs/mcp", "/docs/api", "/docs/cli", "/docs/android", "/docs/self-hosting", "/privacy", "/terms", "/sitemap.xml", "/robots.txt", "/opengraph-image"]) {
    const result = await request.get(route); expect(result.status(), route).toBe(200);
  }
  expect((await request.get("/docs/missing")).status()).toBe(404);
  const legacy = await request.get("/garden", { maxRedirects: 0 });
  expect(legacy.status()).toBe(307);
  expect(new URL(legacy.headers().location, "http://localhost:3004").pathname).toBe("/app");
  const release = await request.get("/download", { maxRedirects: 0 });
  expect(release.status()).toBe(307);
  expect(release.headers().location).toBe("https://github.com/kausthubh-coder/kriyan-garden/releases/latest");
  const headers = (await request.get("/demo")).headers();
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  for (const route of ["/app", "/sign-in", "/sign-up", "/mcp", "/api/v1/tasks"]) {
    const redirect = await request.get(`${route}?proof=1`, { headers: { host: "kriyan.app" }, maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    expect(redirect.headers().location).toBe(`https://app.kriyan.app${route}?proof=1`);
  }
  expect((await request.get("/docs", { headers: { host: "www.kriyan.app" }, maxRedirects: 0 })).status()).toBe(200);
  const appRoot = await request.get("/", { headers: { host: "app.kriyan.app" }, maxRedirects: 0 });
  expect(appRoot.headers().location).toBe("https://app.kriyan.app/app");
});
test("desktop drag schedules, moves and resizes the shared Day task", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Touch uses task details to set time and length; desktop uses pointer drag.");
  await page.goto("/demo");
  const tray = page.locator('[data-drag="place"]').filter({ hasText: "Call Amma" });
  const timeline = page.locator("[data-timeline]");
  await tray.waitFor();
  await page.locator("[data-day-scroll]").evaluate((el) => { el.scrollTop = 0; });
  const box = await timeline.boundingBox(), card = await tray.boundingBox();
  expect(box).not.toBeNull(); expect(card).not.toBeNull();
  if (!box || !card) return;
  await page.mouse.move(card.x + card.width / 2, card.y + 15); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 56 * 5, { steps: 15 }); await page.mouse.up();
  const moved = page.locator('[data-drag="move"]').filter({ hasText: "Call Amma" });
  await expect(moved).toBeVisible();
  const first = await moved.boundingBox();
  if (!first) throw new Error("Scheduled task missing");
  await page.mouse.move(first.x + first.width / 2, first.y + 12); await page.mouse.down();
  await page.mouse.move(first.x + first.width / 2, first.y + 68, { steps: 10 }); await page.mouse.up();
  await expect(moved).toHaveAttribute("aria-label", /13:00/);
  const edge = await moved.locator("[data-resize]").boundingBox();
  if (!edge) throw new Error("Resize target missing");
  await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2); await page.mouse.down();
  await page.mouse.move(edge.x + edge.width / 2, box.y + 56 * 7, { steps: 10 }); await page.mouse.up();
  await expect(moved).toHaveAttribute("aria-label", /to 14:00/);
});
