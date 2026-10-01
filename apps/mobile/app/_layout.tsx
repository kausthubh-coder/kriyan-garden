import { Component, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ShareIntentProvider } from "expo-share-intent";
import { StatusBar, View } from "react-native";
import { Status } from "../src/ui";
import { theme } from "../src/theme";
const url = process.env.EXPO_PUBLIC_CONVEX_URL;
function AccountBackend({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
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
function StartupStatus({ message, loading = false }: { message: string; loading?: boolean }) {
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", padding: theme.layout.phonePadding }}><StatusBar barStyle="light-content" /><Status message={message} loading={loading} /></View>;
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
  const [fonts, error] = useFonts({
    Schibsted400: require("@expo-google-fonts/schibsted-grotesk/400Regular/SchibstedGrotesk_400Regular.ttf"),
    Schibsted500: require("@expo-google-fonts/schibsted-grotesk/500Medium/SchibstedGrotesk_500Medium.ttf"),
    Schibsted600: require("@expo-google-fonts/schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf"),
    Schibsted700: require("@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf"),
  });
  if (error)
    return (
      <StartupStatus message="The app font could not load. Restart the app to try again." />
    );
  if (!fonts) return <StartupStatus loading message="Loading Kriyan." />;
  if (!url || !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <StartupStatus message="App configuration is missing. Add the public Clerk and Convex configuration and rebuild the app." />
    );
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
    >
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <Boundary>
            <ShareIntentProvider>
              <ClerkProvider
                tokenCache={tokenCache}
                publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
              >
                <AccountBackend>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: theme.colors.bg },
                    }}
                  />
                </AccountBackend>
              </ClerkProvider>
            </ShareIntentProvider>
          </Boundary>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
