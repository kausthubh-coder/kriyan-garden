import { useState } from "react";
import { ScrollView } from "react-native";
import { useClerk, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import {
  AreasEditor,
  ProjectsEditor,
  EventsEditor,
  useAction,
} from "./Editors";
import { Button, Field, T, s } from "./ui";
import type { Area, Project, Event, Profile } from "./types";
export function Settings({
  areas,
  projects,
  events,
  profile,
  today,
  close,
  notifications,
}: {
  areas: Area[];
  projects: Project[];
  events: Event[];
  profile: Profile;
  today: string;
  close: () => void;
  notifications: {
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    error: string;
    registered: boolean;
  };
}) {
  const update = useMutation(api.profiles.update),
    reset = useMutation(api.profiles.resetAll),
    action = useAction(),
    { signOut } = useClerk(),
    { user } = useUser();
  const [capacity, setCapacity] = useState(
      String(profile.dailyCapacityMinutes),
    ),
    [start, setStart] = useState(String(profile.dayStartHour)),
    [end, setEnd] = useState(String(profile.dayEndHour)),
    [timezone, setTimezone] = useState(profile.timezone),
    [confirmation, setConfirmation] = useState("");
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <Button label="Return to planner" onPress={close} />
      <T title>Settings</T>
      <AreasEditor areas={areas} />
      <ProjectsEditor areas={areas} projects={projects} />
      <EventsEditor areas={areas} events={events} today={today} />
      <T style={s.subtitle}>Your day</T>
      <Field
        label="Daily capacity in minutes"
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="number-pad"
      />
      <Field
        label="Day start hour"
        value={start}
        onChangeText={setStart}
        keyboardType="number-pad"
      />
      <Field
        label="Day end hour"
        value={end}
        onChangeText={setEnd}
        keyboardType="number-pad"
      />
      <Field
        label="Timezone"
        value={timezone}
        onChangeText={setTimezone}
        autoCapitalize="none"
      />
      <Button
        label="Save preferences"
        primary
        disabled={action.busy}
        onPress={() =>
          void action.run(() =>
            update({
              patch: {
                dailyCapacityMinutes: Number(capacity),
                dayStartHour: Number(start),
                dayEndHour: Number(end),
                timezone,
              },
            }),
          )
        }
      />
      <T style={s.subtitle}>Notifications</T>
      <T quiet>
        Receive task reminders on this device, including tasks added on the web.
      </T>
      <Button
        label={
          notifications.registered
            ? "Turn off notifications"
            : "Enable notifications"
        }
        onPress={() =>
          void action.run(
            notifications.registered
              ? notifications.disable
              : notifications.enable,
          )
        }
      />
      {notifications.error && (
        <T accessibilityRole="alert">{notifications.error}</T>
      )}
      <Button
        label="Sign out"
        disabled={action.busy}
        onPress={() =>
          void action.run(async () => {
            await notifications.disable();
            await signOut();
          })
        }
      />
      <T style={s.subtitle}>Delete account</T>
      <T quiet>
        This removes your planner data and Clerk account. Type DELETE to
        confirm.
      </T>
      <Field
        label="Type DELETE"
        value={confirmation}
        onChangeText={setConfirmation}
      />
      <Button
        label="Delete account"
        disabled={confirmation !== "DELETE" || action.busy || !user}
        onPress={() =>
          void action.run(async () => {
            if (!user) return;
            await notifications.disable();
            await reset({});
            await user.delete();
          })
        }
      />
      {action.error && <T accessibilityRole="alert">{action.error}</T>}
      {action.message && <T quiet>{action.message}</T>}
    </ScrollView>
  );
}
