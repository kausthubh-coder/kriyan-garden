import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import * as Linking from "expo-linking";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { Button, Field, T, s } from "./ui";
import { theme } from "./theme";

export function Auth() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError("");
    try {
      if (creating) {
        if (!needsCode) {
          const created = await signUp.password({ emailAddress: email.trim(), password });
          if (created.error) throw new Error("Account could not be created.");
          const sent = await signUp.verifications.sendEmailCode();
          if (sent.error) throw new Error("Verification could not be sent.");
          setNeedsCode(true);
        } else {
          const verified = await signUp.verifications.verifyEmailCode({ code });
          if (verified.error) throw new Error("Verification failed.");
          if (signUp.status === "complete") {
            const finalized = await signUp.finalize();
            if (finalized.error) throw new Error("Session could not be activated.");
          } else setError("Your account needs more information. Finish creating it on the web, then sign in here.");
        }
        return;
      }
      const result = needsCode
        ? needsMfa ? await signIn.mfa.verifyEmailCode({ code }) : await signIn.emailCode.verifyCode({ code })
        : usePassword ? await signIn.password({ emailAddress: email.trim(), password }) : await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (result.error) throw new Error("Email verification failed.");
      if (signIn.status === "complete") {
        const finalized = await signIn.finalize();
        if (finalized.error) throw new Error("Session could not be activated.");
      } else if (!needsCode && !usePassword) setNeedsCode(true);
      else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        const sent = await signIn.mfa.sendEmailCode();
        if (sent.error) throw new Error("Verification could not be sent.");
        setNeedsCode(true);
        setNeedsMfa(true);
      } else setError("Your account needs another verification method. Finish sign-in on the web, then try again.");
    } catch {
      setError(needsCode
        ? "The code could not be verified. Check the code and try again."
        : creating ? "Your account could not be created. Check your email, use a stronger password and try again."
        : usePassword ? "Sign-in failed. Check your email and password, then try again."
        : "A sign-in code could not be sent. Check your email and connection, then try again.");
    } finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior="height"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { flexGrow: 1, justifyContent: "center", paddingVertical: theme.spacing[6] }]}>
    <T title>Kriyan</T>
    <T quiet>Organise your life with the AI you already use.</T>
    <T style={s.subtitle}>{creating ? "Create your Kriyan account" : "Sign in"}</T>
    <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy && !needsCode} />
    {(creating || usePassword) && !needsCode && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={creating ? "new-password" : "current-password"} editable={!busy} />}
    {needsCode && <>
      <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" editable={!busy} />
      <T quiet>Enter the code sent to your email.</T>
    </>}
    <Button label={busy ? creating ? "Creating account" : "Signing in" : needsCode ? "Verify code" : creating ? "Create account" : usePassword ? "Sign in" : "Send code"} primary disabled={busy || !email.trim() || (needsCode ? !code : (creating || usePassword) && !password)} onPress={() => void submit()} />
    {needsCode && <Button label="Change email" disabled={busy} onPress={() => { setNeedsCode(false); setNeedsMfa(false); setCode(""); setError(""); }} />}
    {!needsCode && <>
      {!creating && <Button label={usePassword ? "Use email code" : "Use password"} textOnly disabled={busy} onPress={() => { setUsePassword(!usePassword); setError(""); }} />}
      <Button label={creating ? "Sign in instead" : "Create account"} textOnly disabled={busy} onPress={() => { setCreating(!creating); setPassword(""); setError(""); }} />
    </>}
    <Button label="Continue with Google" disabled={busy} onPress={() => {
      setBusy(true); setError("");
      void startSSOFlow({ strategy: "oauth_google", redirectUrl: Linking.createURL("sso-callback"), oidcPrompt: "select_account" })
        .catch(() => setError("Google sign-in could not finish. Try again or use an email code."))
        .finally(() => setBusy(false));
    }} />
    {error && <T accessibilityRole="alert">{error}</T>}
  </ScrollView></KeyboardAvoidingView>;
}
