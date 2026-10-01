// Test identity and credentials stay in memory and are never logged or saved.
import { createTestUser, deleteTestUser, clerkClient } from "../../../.agents/skills/test-kriyan/scripts/lib/users.mjs";
import { configuration } from "../../../.agents/skills/test-kriyan/scripts/lib/config.mjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../packages/backend/convex/_generated/api";
import { localClock } from "@kriyan/core";
const production = process.argv.includes("--production");
const url = production ? "https://calm-salamander-183.convex.cloud" : configuration().NEXT_PUBLIC_CONVEX_URL;
const clerk = clerkClient();
const user = await createTestUser({ tag: process.env.KRIYAN_QA_TAG ?? "android-release", password: true });
const { email, password } = user;
if (!password) throw new Error("The QA user needs a password.");
const session = await clerk.sessions
  .createSession({ userId: user.id })
  .catch(async () => {
    await deleteTestUser(user.id);
    throw new Error("Test session failed; the test user was removed.");
  });
const client = new ConvexHttpClient(url);
const refresh = async () => {
  const token = await clerk.sessions.getToken(session.id, "convex");
  client.setAuth(token.jwt);
};
async function ui(...args: string[]) {
  const command = Bun.spawn(["bun", "apps/mobile/scripts/ui.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(command.stdout).text();
  await command.exited;
  if (command.exitCode !== 0) throw new Error("Test UI operation failed.");
  return output;
}
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  if (production) {
    await refresh();
    await client.mutation(api.profiles.resetAll, {});
    const deadline = Date.now() + 120_000;
    while (await client.query(api.profiles.get, {})) {
      if (Date.now() > deadline) throw new Error("Production test data cleanup is still pending.");
      await Bun.sleep(1500);
    }
  }
  await deleteTestUser(user.id);
  cleaned = true;
  await Bun.write(
    `.agents/logs/20-cleanup-${user.id}.json`,
    JSON.stringify({ plannerDataRemoved: true, clerkTestUserRemoved: true }),
  );
}
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.KRIYAN_QA_PORT ?? 4781),
  idleTimeout: 60,
  async fetch(request) {
    const route = new URL(request.url).pathname;
    try {
      await refresh();
      if (route === "/sign-in") {
        await ui("wait", "Email");
        const hasPassword = (await ui("dump")).includes('"label":"Password"');
        await ui("tap", "Email");
        await ui("input", email);
        if (hasPassword) {
          await ui("tap", "Password");
          await ui("input", password);
        }
        await ui("back");
        await ui("tap", hasPassword ? "Sign in" : "Send code");
        return Response.json({ submitted: true });
      }
      if (route === "/identity") return Response.json({ id: user.id, email, production });
      if (route === "/context") return Response.json({
        profile: await client.query(api.profiles.get, {}),
        tasks: await client.query(api.tasks.list, {}),
        goals: await client.query(api.goals.list, {}),
      });
      if (route === "/sample") {
        await client.mutation(api.profiles.seedSample, { today: localClock(new Date(), "America/New_York").today });
        return Response.json({ loaded: true });
      }
      if (route === "/empty") {
        await client.mutation(api.profiles.resetAll, {});
        const deadline = Date.now() + 120_000;
        while (await client.query(api.profiles.get, {})) {
          if (Date.now() > deadline) throw new Error("Test reset pending.");
          await Bun.sleep(1500);
        }
        await client.mutation(api.profiles.ensure, { timezone: "America/New_York" });
        await client.mutation(api.profiles.completeOnboarding, {});
        return Response.json({ emptied: true });
      }
      if (route === "/profile")
        return Response.json({
          onboardingComplete: (await client.query(api.profiles.get, {}))
            ?.onboardingComplete,
        });
      if (route === "/tasks")
        return Response.json(
          (await client.query(api.tasks.list, {})).map(
            ({ title, date, time, durationMinutes, status, reminders }) => ({
              title,
              date,
              time,
              durationMinutes,
              status,
              reminders,
            }),
          ),
        );
      if (route === "/onboarding") {
        await client.mutation(api.profiles.update, {
          patch: { onboardingComplete: false },
        });
        return Response.json({ reset: true });
      }
      if (route === "/cleanup") {
        await cleanup();
        setTimeout(() => {
          server.stop(true);
          process.exit(0);
        }, 100);
        return Response.json({ cleaned: true });
      }
      if (route === "/today")
        return Response.json({
          today: localClock(new Date(), "America/New_York").today,
        });
      return Response.json(
        { error: "Unknown test operation." },
        { status: 404 },
      );
    } catch {
      console.log(`Test operation failed: ${route}. No credentials logged.`);
      return Response.json(
        { error: "Test operation failed." },
        { status: 500 },
      );
    }
  },
});
process.on("SIGINT", () => {
  void cleanup()
    .then(() => process.exit(0))
    .catch(() => console.log("Cleanup failed. Retry the cleanup endpoint."));
});
console.log(
  `Disposable Clerk test user ready. UI QA helper on 127.0.0.1:${server.port}.`,
);
