import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { clerkAppearance } from "@/lib/clerkAppearance";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return <ClerkProvider appearance={clerkAppearance}><ConvexClientProvider>{children}</ConvexClientProvider></ClerkProvider>;
}
