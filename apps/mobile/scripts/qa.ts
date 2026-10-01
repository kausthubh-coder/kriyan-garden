// Test identity and credentials stay in memory and are never logged or saved.
import { createTestUser, deleteTestUser, clerkClient } from "../../../.agents/skills/test-kriyan/scripts/lib/users.mjs";
import { configuration } from "../../../.agents/skills/test-kriyan/scripts/lib/config.mjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../packages/backend/convex/_generated/api";
import { localClock } from "@kriyan/core";
const url = configuration().NEXT_PUBLIC_CONVEX_URL;
const clerk = clerkClient();
const user = await createTestUser({ tag: "android-ui", password: true });
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
  await command.exited;
  if (command.exitCode !== 0) throw new Error("Test UI operation failed.");
}
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  await deleteTestUser(user.id);
  cleaned = true;
  await Bun.write(
    ".agents/logs/11-cleanup.json",
    JSON.stringify({ plannerDataRemoved: true, clerkTestUserRemoved: true }),
  );
}
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4781,
  idleTimeout: 60,
  async fetch(request) {
    const route = new URL(request.url).pathname;
    try {
      await refresh();
      if (route === "/sign-in") {
        await ui("tap", "Email");
        await ui("input", email);
        await ui("tap", "Password");
        await ui("input", password);
        await ui("back");
        await ui("tap", "Sign in");
        return Response.json({ submitted: true });
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
  "Disposable Clerk test user ready. UI QA helper on 127.0.0.1:4781.",
);
