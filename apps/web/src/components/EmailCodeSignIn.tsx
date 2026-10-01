"use client";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function EmailCodeSignIn() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="email-code-sign-in" aria-label="Sign in with an email code">
    <button type="button" className="email-code-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>Use email code</button>
    {open && <form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const result = sent ? await signIn.emailCode.verifyCode({ code }) : await signIn.emailCode.sendCode({ emailAddress: email.trim() });
        if (result.error) throw new Error("Email verification failed.");
        if (!sent) setSent(true);
        else if (signIn.status === "complete") {
          const finalized = await signIn.finalize();
          if (finalized.error) throw new Error("Session activation failed.");
          router.push("/app");
        } else setError("Your account needs another verification method. Use the sign-in options above.");
      } catch { setError(sent ? "The code could not be verified. Check it and try again." : "A code could not be sent. Check your email and connection, then try again."); }
      finally { setBusy(false); }
    }}>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy || sent} required /></label>
      {sent && <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} required /></label>}
      <button type="submit" className="email-code-submit" disabled={busy || !email.trim() || (sent && !code)}>{busy ? "Signing in" : sent ? "Verify code" : "Send code"}</button>
      {sent && <button type="button" className="email-code-toggle" disabled={busy} onClick={() => { setSent(false); setCode(""); setError(""); }}>Change email</button>}
      {error && <p role="alert">{error}</p>}
    </form>}
  </section>;
}
