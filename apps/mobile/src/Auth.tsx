import { useState } from "react";
import { useSignIn } from "@clerk/expo";
import { useSignInWithGoogle } from "@clerk/expo/google";
import { ScrollView } from "react-native";
import { Button, Field, T, s } from "./ui";
import { theme } from "./theme";
export function Auth() {
  const { signIn } = useSignIn();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [needsCode, setNeedsCode] = useState(false),
    [factor, setFactor] = useState<"email_code" | "totp" | "backup_code">("email_code"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = needsCode
        ? factor === "totp" ? await signIn.mfa.verifyTOTP({ code })
          : factor === "backup_code" ? await signIn.mfa.verifyBackupCode({ code })
          : await signIn.mfa.verifyEmailCode({ code })
        : await signIn.password({ emailAddress: email, password });
      if (result.error) throw new Error("Verification failed.");
      if (signIn.status === "complete") {
        const finalized = await signIn.finalize();
        if (finalized.error) throw new Error("Session could not be activated.");
      } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        const factors = signIn.supportedSecondFactors ?? [];
        if (factors.some(value => value.strategy === "email_code")) {
          const sent = await signIn.mfa.sendEmailCode();
          if (sent.error) throw new Error("Verification code could not be sent.");
          setFactor("email_code"); setNeedsCode(true);
        } else if (factors.some(value => value.strategy === "totp")) {
          setFactor("totp"); setNeedsCode(true);
        } else if (factors.some(value => value.strategy === "backup_code")) {
          setFactor("backup_code"); setNeedsCode(true);
        } else setError("This account needs another verification method. Finish sign-in on the web, then try again.");
      } else
        setError(
          "Sign-in needs another verification step. Open your account on the web to finish it, then try again.",
        );
    } catch {
      setError(
        "Sign-in failed. Check your email, password or verification code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.page, { paddingTop: theme.spacing[6] }]}
    >
      <T title>Kriyan</T>
      <T quiet>Make room for School, Business and Life.</T>
      <T style={s.subtitle}>Sign in</T>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy && !needsCode}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        editable={!busy && !needsCode}
      />
      {needsCode && (
        <Field
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType={factor === "backup_code" ? "default" : "number-pad"}
          autoComplete="one-time-code"
        />
      )}
      {needsCode && <T quiet>{factor === "email_code" ? "Verify your email to sign in on this device." : factor === "totp" ? "Enter a code from your authenticator app." : "Enter one of your account's backup codes."}</T>}
      <Button
        label={busy ? "Signing in" : needsCode ? "Verify code" : "Sign in"}
        primary
        disabled={busy || !email || !password || (needsCode && !code)}
        onPress={() => void submit()}
      />
      <Button
        label="Sign in with Google"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError("");
          void startGoogleAuthenticationFlow()
            .then(async (result) => {
              if (result.createdSessionId && result.setActive)
                await result.setActive({ session: result.createdSessionId });
            })
            .catch(() =>
              setError(
                "Google sign-in failed. Try email sign-in or check the Android Google configuration.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      />
      {error && <T accessibilityRole="alert">{error}</T>}
    </ScrollView>
  );
}
