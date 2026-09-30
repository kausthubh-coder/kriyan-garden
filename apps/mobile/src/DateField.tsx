import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { View } from "react-native";
import { Button, s } from "./ui";
import { localClock, shortDate, timeOf } from "@kriyan/core";
export function DateField({
  label,
  value,
  mode = "date",
  change,
}: {
  label: string;
  value: string | null;
  mode?: "date" | "time";
  change: (value: string) => void;
}) {
  return (
    <View style={s.field}>
      <Button
        label={`${label}${value ? `: ${mode === "date" ? shortDate(value) : value}` : ""}`}
        onPress={() => {
          const initial =
            mode === "date"
              ? new Date(`${value ?? localClock(new Date()).today}T12:00:00`)
              : new Date(`2000-01-01T${value ?? "09:00"}:00`);
          DateTimePickerAndroid.open({
            value: initial,
            mode,
            is24Hour: true,
            onChange: (event, selected) => {
              if (event.type !== "set" || !selected) return;
              change(
                mode === "time"
                  ? timeOf(selected.getHours() * 60 + selected.getMinutes())
                  : `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`,
              );
            },
          });
        }}
      />
    </View>
  );
}
