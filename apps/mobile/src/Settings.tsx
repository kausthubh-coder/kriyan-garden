import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { BackHandler, ScrollView, View } from "react-native";
import { useClerk, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { formatMinutes, timeOf } from "@kriyan/core";
import {
  AreasEditor,
  ProjectsEditor,
  EventsEditor,
  useAction,
} from "./Editors";
import { DateField } from "./DateField";
import {
  Chip,
  Field,
  Header,
  ListRow,
  PrimaryButton,
  QuietButton,
  TextButton,
  T,
  s,
  ui,
} from "./ui";
import { Habits } from "./Habits";
import type { Area, Project, Event, Profile } from "./types";
type Screen =
  | "Areas"
  | "Projects and courses"
  | "Classes and meetings"
  | "Habits"
  | "Daily capacity"
  | "Day starts and ends"
  | "Daily summary"
  | "Notifications"
  | "Account"
  | "Delete account and data";
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
    { user } = useUser(),
    habits = useQuery(api.habits.list, {});
  const [screen, setScreen] = useState<Screen | null>(null),
    [capacity, setCapacity] = useState(String(profile.dailyCapacityMinutes)),
    [start, setStart] = useState(String(profile.dayStartHour)),
    [end, setEnd] = useState(String(profile.dayEndHour)),
    [timezone, setTimezone] = useState(profile.timezone),
    [confirmation, setConfirmation] = useState("");
  const back = () => {
    if (screen) {
      setScreen(null);
      setConfirmation("");
    } else close();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (screen) {
          setScreen(null);
          setConfirmation("");
        } else close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [screen, close]);
  return (
    <ScrollView
      key={screen ?? "settings"}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      {screen !== "Areas" && (
        <Header title={screen ?? "Settings"} back={back} />
      )}
      {!screen && (
        <View>
          <ListRow
            label="Areas"
            value={String(areas.length)}
            onPress={() => setScreen("Areas")}
          />
          <ListRow
            label="Projects and courses"
            value={String(projects.length)}
            onPress={() => setScreen("Projects and courses")}
          />
          <ListRow
            label="Classes and meetings"
            value={String(events.length)}
            onPress={() => setScreen("Classes and meetings")}
          />
          <ListRow
            label="Habits"
            value={habits ? String(habits.length) : "Loading"}
            onPress={() => setScreen("Habits")}
          />
          <ListRow
            label="Daily capacity"
            value={formatMinutes(profile.dailyCapacityMinutes)}
            onPress={() => setScreen("Daily capacity")}
          />
          <ListRow
            label="Day starts and ends"
            value={`${timeOf(profile.dayStartHour * 60)} to ${timeOf(profile.dayEndHour * 60)}`}
            onPress={() => setScreen("Day starts and ends")}
          />
          <ListRow
            label="Daily summary"
            value={profile.dailySummaryTime ?? "Off"}
            onPress={() => setScreen("Daily summary")}
          />
          <ListRow
            label="Notifications"
            value={notifications.registered ? "On" : "Off"}
            onPress={() => setScreen("Notifications")}
          />
          <ListRow
            label="Account"
            value={user?.primaryEmailAddress?.emailAddress}
            onPress={() => setScreen("Account")}
          />
          <TextButton
            label="Sign out"
            style={{ alignItems: "flex-start" }}
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await notifications.disable();
                await signOut();
              })
            }
          />
          <TextButton
            label="Delete account and data"
            style={{ alignItems: "flex-start" }}
            danger
            onPress={() => setScreen("Delete account and data")}
          />
          <T quiet style={{ marginTop: ui.spacing[4] }}>
            Kriyan {Constants.expoConfig?.version}. Open source under the MIT
            licence.
          </T>
        </View>
      )}
      {screen === "Areas" && (
        <AreasEditor areas={areas} projects={projects} back={back} />
      )}
      {screen === "Projects and courses" && (
        <ProjectsEditor areas={areas} projects={projects} />
      )}
      {screen === "Classes and meetings" && (
        <EventsEditor areas={areas} events={events} today={today} />
      )}
      {screen === "Habits" && <Habits areas={areas} today={today} />}
      {screen === "Daily capacity" && (
        <>
          <T quiet>Choose how much task time fits in a day.</T>
          <Field
            label="Daily capacity in minutes"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
          <PrimaryButton
            label="Save capacity"
            disabled={action.busy}
            onPress={() =>
              void action.run(() =>
                update({ patch: { dailyCapacityMinutes: Number(capacity) } }),
              )
            }
          />
        </>
      )}
      {screen === "Daily summary" && (
        <>
          <T quiet>
            A notification at this time with today&apos;s tasks and this
            week&apos;s deadlines.
          </T>
          <View style={s.wrap}>
            {[null, "07:00", "08:00", "09:00"].map((time) => (
              <Chip
                key={time ?? "off"}
                label={time ?? "Off"}
                selected={(profile.dailySummaryTime ?? null) === time}
                disabled={action.busy}
                onPress={() =>
                  void action.run(() =>
                    update({ patch: { dailySummaryTime: time } }),
                  )
                }
              />
            ))}
            <DateField
              label="Other time"
              mode="time"
              value={null}
              change={(time) =>
                void action.run(() =>
                  update({ patch: { dailySummaryTime: time } }),
                )
              }
            />
          </View>
          {!notifications.registered && (
            <T quiet>Turn on notifications to receive the summary.</T>
          )}
        </>
      )}
      {screen === "Day starts and ends" && (
        <>
          <T quiet>Choose the hours shown on your timeline.</T>
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
          <PrimaryButton
            label="Save day hours"
            disabled={action.busy}
            onPress={() =>
              void action.run(() =>
                update({
                  patch: {
                    dayStartHour: Number(start),
                    dayEndHour: Number(end),
                  },
                }),
              )
            }
          />
        </>
      )}
      {screen === "Notifications" && (
        <>
          <T>
            Receive task reminders on this device, including tasks added on the
            web.
          </T>
          <QuietButton
            label={
              notifications.registered
                ? "Turn off notifications"
                : "Enable notifications"
            }
            disabled={action.busy}
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
        </>
      )}
      {screen === "Account" && (
        <>
          <T>{user?.primaryEmailAddress?.emailAddress ?? "Your account"}</T>
          <Field
            label="Timezone"
            value={timezone}
            onChangeText={setTimezone}
            autoCapitalize="none"
          />
          <PrimaryButton
            label="Save timezone"
            disabled={action.busy}
            onPress={() =>
              void action.run(() => update({ patch: { timezone } }))
            }
          />
        </>
      )}
      {screen === "Delete account and data" && (
        <>
          <T>
            This removes your planner data and your account. Type DELETE to
            confirm.
          </T>
          <Field
            label="Type DELETE"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
          />
          <TextButton
            label="Delete account and data"
            danger
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
        </>
      )}
      {action.error && <T accessibilityRole="alert">{action.error}</T>}
      {action.message && <T quiet>{action.message}</T>}
    </ScrollView>
  );
}
