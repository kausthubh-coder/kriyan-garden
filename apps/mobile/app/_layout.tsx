import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, getClerkInstance, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { hideAsync } from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ShareIntentProvider } from "expo-share-intent";
import { StatusBar, View } from "react-native";
import { Status } from "../src/ui";
import { theme } from "../src/theme";
const url = process.env.EXPO_PUBLIC_CONVEX_URL;
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
function AccountBackend({ children, fonts, onReady }: { children: ReactNode; fonts: boolean; onReady: () => void }) {
  const { isLoaded, userId } = useAuth();
  useEffect(() => { if (isLoaded && fonts) onReady(); }, [isLoaded, fonts, onReady]);
  if (!fonts) return <StartupStatus loading message="Loading Kriyan." />;
  if (!isLoaded) return <StartupStatus loading message="Loading your account." />;
  return <UserBackend key={userId ?? "signed-out"}>{children}</UserBackend>;
}
function UserBackend({ children }: { children: ReactNode }) {
  const [client] = useState(() => url ? new ConvexReactClient(url, { unsavedChangesWarning: false }) : null);
  useEffect(() => () => {
    // Let the provider clear its auth listeners before closing the connection.
    setTimeout(() => { void client?.close(); }, 0);
  }, [client]);
  if (!client) return <StartupStatus message="App configuration is missing. Rebuild the app with its public configuration." />;
  return <ConvexProviderWithClerk client={client} useAuth={useAuth}>{children}</ConvexProviderWithClerk>;
}
function StartupStatus({ message, loading = false, retry }: { message: string; loading?: boolean; retry?: () => void }) {
  return <View onLayout={() => { if (retry) console.info("Kriyan startup: sign-in retry frame"); }} style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", padding: theme.layout.phonePadding }}><StatusBar barStyle="light-content" /><Status message={message} loading={loading} retry={retry} retryLabel="Try again" /></View>;
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Status
        message="Your planner could not load. Check your connection and try loading again."
        retry={() => this.setState({ failed: false })}
      />
    ) : (
      this.props.children
    );
  }
}
export default function Layout() {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const onReady = useCallback(() => {
    console.info("Kriyan startup: account and fonts ready");
    setReady(true);
  }, []);
  // This timer lives outside Clerk: it still runs if its provider cannot load.
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      console.info("Kriyan startup: sign-in deadline reached");
      setExpired(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [attempt, ready]);
  function retry() {
    setExpired(false);
    setAttempt(value => value + 1);
    // load() otherwise restores Clerk's browser defaults instead of Expo's
    // native, headless options after an offline initialization failed.
    void getClerkInstance().load({
      standardBrowser: false,
      experimental: { runtimeEnvironment: "headless" },
    }).catch(() => setExpired(true));
  }
  const [fonts, error] = useFonts({
    Schibsted400: require("@expo-google-fonts/schibsted-grotesk/400Regular/SchibstedGrotesk_400Regular.ttf"),
    Schibsted500: require("@expo-google-fonts/schibsted-grotesk/500Medium/SchibstedGrotesk_500Medium.ttf"),
    Schibsted600: require("@expo-google-fonts/schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf"),
    Schibsted700: require("@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf"),
  });
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      onLayout={() => { console.info("Kriyan startup: first app frame"); void hideAsync(); }}
    >
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          {error ? <StartupStatus message="The app font could not load. Restart the app to try again." />
            : !url || !publishableKey ? <StartupStatus message="App configuration is missing. Add the public Clerk and Convex configuration and rebuild the app." />
            : <Boundary key={attempt}>
            <ShareIntentProvider>
              <ClerkProvider
                tokenCache={tokenCache}
                publishableKey={publishableKey}
                __experimental_disableNativeClientSync
              >
                <AccountBackend fonts={fonts} onReady={onReady}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: theme.colors.bg },
                    }}
                  />
                </AccountBackend>
              </ClerkProvider>
            </ShareIntentProvider>
          </Boundary>}
          {!error && url && publishableKey && expired && !ready && <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
            <StartupStatus message="Kriyan could not reach the sign-in service. Check your connection and try again." retry={retry} />
          </View>}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
