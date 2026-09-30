import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return <ClerkProvider><ConvexClientProvider>{children}</ConvexClientProvider></ClerkProvider>;
}
