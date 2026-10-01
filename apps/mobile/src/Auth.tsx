import { useState } from "react";
import { useSignIn } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import * as Linking from "expo-linking";
import { ScrollView } from "react-native";
import { Button, Field, T, s } from "./ui";
import { theme } from "./theme";

export function Auth() {
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError("");
    try {
      const result = needsCode
        ? await signIn.emailCode.verifyCode({ code })
        : await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (result.error) throw new Error("Email verification failed.");
      if (!needsCode) setNeedsCode(true);
      else if (signIn.status === "complete") {
        const finalized = await signIn.finalize();
        if (finalized.error) throw new Error("Session could not be activated.");
      } else setError("Your account needs another verification method. Finish sign-in on the web, then try again.");
    } catch {
      setError(needsCode
        ? "The code could not be verified. Check the code and try again."
        : "A sign-in code could not be sent. Check your email and connection, then try again.");
    } finally { setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: theme.spacing[6] }]}>
    <T title>Kriyan</T>
    <T quiet>Organise your life with the AI you already use.</T>
    <T style={s.subtitle}>Sign in</T>
    <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy && !needsCode} />
    {needsCode && <>
      <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" editable={!busy} />
      <T quiet>Enter the code sent to your email.</T>
    </>}
    <Button label={busy ? "Signing in" : needsCode ? "Verify code" : "Send code"} primary disabled={busy || !email.trim() || (needsCode && !code)} onPress={() => void submit()} />
    {needsCode && <Button label="Change email" disabled={busy} onPress={() => { setNeedsCode(false); setCode(""); setError(""); }} />}
    <Button label="Continue with Google" disabled={busy} onPress={() => {
      setBusy(true); setError("");
      void startSSOFlow({ strategy: "oauth_google", redirectUrl: Linking.createURL("sso-callback"), oidcPrompt: "select_account" })
        .catch(() => setError("Google sign-in could not finish. Try again or use an email code."))
        .finally(() => setBusy(false));
    }} />
    {error && <T accessibilityRole="alert">{error}</T>}
  </ScrollView>;
}
