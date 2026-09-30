import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
export const push = new PushNotifications<Id<"pushTokens">>(
  components.pushNotifications,
);
