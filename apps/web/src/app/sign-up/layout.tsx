import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { clerkLocalization } from "@/lib/clerkLocalization";
import { headers } from "next/headers";
import { ui } from "@clerk/ui";

export default async function SignUpLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <ClerkProvider ui={ui} dynamic nonce={nonce} appearance={clerkAppearance} localization={clerkLocalization}>{children}</ClerkProvider>;
}
