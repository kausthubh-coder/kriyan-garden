import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
export function useNotifications(
  enabled: boolean,
  openTask: (id: string) => void,
) {
  const register = useMutation(api.pushTokens.register),
    unregister = useMutation(api.pushTokens.unregister);
  const { userId } = useAuth();
  const preferenceKey = `notifications-${userId ?? "signed-out"}`;
  const promptKey = `notification-prompt-${userId ?? "signed-out"}`;
  const [token, setToken] = useState<string | null>(null),
    [error, setError] = useState(""), [prompted, setPrompted] = useState(true);
  useEffect(() => { void SecureStore.getItemAsync(promptKey).then(value => setPrompted(value === "shown")); }, [promptKey]);
  const markPrompted = async () => { await SecureStore.setItemAsync(promptKey, "shown"); setPrompted(true); };
  async function enable() {
    try {
      await Notifications.setNotificationChannelAsync("Reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
      });
      const permission = await Notifications.requestPermissionsAsync();
      await markPrompted();
      if (permission.status !== "granted") {
        setError(
          "Notifications are off. Allow notifications in Android settings to receive reminders.",
        );
        return;
      }
      await SecureStore.setItemAsync(preferenceKey, "enabled");
      const projectId = Constants.easConfig?.projectId;
      if (!projectId) {
        setError(
          "Push setup is missing an Expo project ID. Add the project ID and rebuild to receive reminders.",
        );
        return;
      }
      const result = await Notifications.getExpoPushTokenAsync({ projectId });
      await register({ token: result.data, platform: "android" });
      setToken(result.data);
      setError("");
    } catch {
      setError(
        "Notifications could not be registered. Check your connection and push configuration, then retry.",
      );
    }
  }
  async function disable() {
    try {
      if (token) await unregister({ token });
      await SecureStore.setItemAsync(preferenceKey, "disabled");
      setToken(null);
      setError("");
    } catch {
      setError(
        "Notifications could not be turned off. Reconnect and try again before signing out.",
      );
      throw new Error("Notifications could not be turned off.");
    }
  }
  useEffect(() => {
    if (!enabled) return;
    void Promise.all([Notifications.getPermissionsAsync(), SecureStore.getItemAsync(preferenceKey)]).then(([permission, preference]) => {
      if (permission.status === "granted" && preference !== "disabled") void enable();
    });
    const changed = Notifications.addPushTokenListener(() => {
      void SecureStore.getItemAsync(preferenceKey).then(value => { if (value !== "disabled") void enable(); });
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id: unknown = response.notification.request.content.data?.taskId;
        if (typeof id === "string") openTask(id);
      },
    );
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const id: unknown = response?.notification.request.content.data?.taskId;
      if (typeof id === "string") openTask(id);
    });
    return () => {
      changed.remove();
      tapped.remove();
    };
    // Re-register on each authenticated owner session; native token changes call enable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, openTask, preferenceKey]);
  return { enable, disable, error, registered: token !== null, prompted, markPrompted };
}
