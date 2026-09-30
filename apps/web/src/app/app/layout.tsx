import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { headers } from "next/headers";
import { ui } from "@clerk/ui";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <ClerkProvider ui={ui} dynamic nonce={nonce} appearance={clerkAppearance}><ConvexClientProvider>{children}</ConvexClientProvider></ClerkProvider>;
}
