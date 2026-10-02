import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
/** Android shows at most three buttons. They act without opening the app. */
const REMINDER_ACTIONS: Notifications.NotificationAction[] = [
  { identifier: "done", buttonTitle: "Done", options: { opensAppToForeground: false } },
  { identifier: "snooze", buttonTitle: "Snooze 15 min", options: { opensAppToForeground: false } },
  { identifier: "tomorrow", buttonTitle: "Tomorrow", options: { opensAppToForeground: false } },
];
/** 09:00 tomorrow on this phone's clock. */
function tomorrowMorning(now = new Date()) {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.getTime();
}
export function useNotifications(
  enabled: boolean,
  openTask: (id: string) => void,
) {
  const register = useMutation(api.pushTokens.register),
    unregister = useMutation(api.pushTokens.unregister),
    complete = useMutation(api.tasks.complete),
    snooze = useMutation(api.tasks.snoozeReminder);
  // A response can arrive both live and as the launch response; act on it once.
  const handled = useRef(new Set<string>());
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
      await Notifications.setNotificationCategoryAsync("task-reminder", REMINDER_ACTIONS);
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
    const respond = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      const id: unknown = response.notification.request.content.data?.taskId;
      if (typeof id !== "string") return;
      const task = id as Id<"tasks">;
      const action = response.actionIdentifier;
      if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) return openTask(id);
      const write =
        action === "done" ? complete({ id: task })
        : action === "snooze" ? snooze({ id: task, until: Date.now() + 15 * 60_000 })
        : action === "tomorrow" ? snooze({ id: task, until: tomorrowMorning() })
        : null;
      if (!write) return;
      void write
        .then(() => Notifications.dismissNotificationAsync(response.notification.request.identifier))
        .catch(() => openTask(id));
    };
    const tapped = Notifications.addNotificationResponseReceivedListener(respond);
    void Notifications.getLastNotificationResponseAsync().then(respond);
    return () => {
      changed.remove();
      tapped.remove();
    };
    // Re-register on each authenticated owner session; native token changes call enable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, openTask, preferenceKey]);
  return { enable, disable, error, registered: token !== null, prompted, markPrompted };
}
