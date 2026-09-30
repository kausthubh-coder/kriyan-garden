import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>;
}
