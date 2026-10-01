import { SignIn } from "@clerk/nextjs";
import { EmailCodeSignIn } from "@/components/EmailCodeSignIn";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <SignIn />
      <EmailCodeSignIn />
    </main>
  );
}
