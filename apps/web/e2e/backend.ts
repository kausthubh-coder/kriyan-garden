import type { Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { clerk } from "@clerk/testing/playwright";
export async function backendFor(page: Page) {
  await clerk.loaded({ page });
  const token = await page.evaluate(async () => {
    const sdk = (
      window as Window & {
        Clerk?: {
          session?: {
            getToken: (args: { template: string }) => Promise<string | null>;
          };
        };
      }
    ).Clerk;
    return sdk?.session?.getToken({ template: "convex" }) ?? null;
  });
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!token || !url)
    throw new Error(
      "Test user has no Convex token or NEXT_PUBLIC_CONVEX_URL is missing.",
    );
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}
