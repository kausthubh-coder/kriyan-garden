import { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
  type AccessibilityState,
  type AccessibilityRole,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { theme } from "../theme";
import { ui } from "./tokens";
import { Chip } from "./primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export * from "./primitives";
export { TaskRow, TaskCard } from "./TaskRow";
export { ui } from "./tokens";
const c = theme.colors;
const bezier = theme.motion.easeOut
  .replace(/^cubic-bezier\(|\)$/g, "")
  .split(",")
  .map(Number);
const pressEasing = Easing.bezier(
  bezier[0] ?? 0,
  bezier[1] ?? 0,
  bezier[2] ?? 1,
  bezier[3] ?? 1,
);
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => subscription.remove();
  }, []);
  return reduced;
}
export function T({
  children,
  quiet,
  title,
  style,
  ...props
}: TextProps & { quiet?: boolean; title?: boolean }) {
  return (
    <Text
      {...props}
      maxFontSizeMultiplier={1.3}
      style={[s.text, quiet && s.quiet, title && s.title, style]}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  primary = false,
  selected = false,
  icon,
  color,
  style,
  textOnly = false,
  showLabel = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  selected?: boolean;
  icon?: IconName;
  color?: string;
  style?: ViewStyle;
  textOnly?: boolean;
  showLabel?: boolean;
}) {
  const [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false);
  const reduced = useReducedMotion();
  const [press] = useState(() => new Animated.Value(0));
  const feedback = (down: boolean) => {
    press.stopAnimation();
    if (reduced) {
      press.setValue(0);
      return;
    }
    Animated.timing(press, {
      toValue: down ? 1 : 0,
      duration: theme.motion.press,
      easing: pressEasing,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onTouchStart={() => feedback(true)}
      onTouchEnd={() => feedback(false)}
      onTouchCancel={() => feedback(false)}
      style={({ pressed }) => [
        s.button,
        textOnly && {
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        (primary || selected) && s.primary,
        hover && !(primary || selected) && { backgroundColor: c.s3 },
        focus && { borderColor: c.ink, borderWidth: 2 },
        pressed && { opacity: 0.8 },
        style,
        disabled && { backgroundColor: c["disabled-bg"], borderColor: c.line },
      ]}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: ui.spacing[1],
          transform: [
            {
              scale: press.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.97],
              }),
            },
          ],
        }}
      >
        {icon && (
          <Icon
            name={icon}
            color={disabled ? c["disabled-ink"] : primary || selected ? c.on : (color ?? c.ink)}
          />
        )}
        {(!icon || showLabel) && (
          <T
            style={{
              color: disabled ? c["disabled-ink"] : primary || selected ? c.on : (color ?? c["ink-2"]),
              fontFamily: "Schibsted500",
            }}
          >
            {label}
          </T>
        )}
      </Animated.View>
    </Pressable>
  );
}
export function Surface({
  label,
  onPress,
  children,
  style,
  disabled = false,
  state,
  role = "button",
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  state?: AccessibilityState;
  role?: AccessibilityRole;
}) {
  const [focus, setFocus] = useState(false),
    [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled, ...state }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => [
        {
          minHeight: theme.layout.controlHeight,
          borderWidth: 0,
          borderColor: focus ? c.ink : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
        focus && { borderWidth: 1, borderColor: c.ink },
        hover && { opacity: 0.85 },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <T quiet>{label}</T>
      <TextInput
        maxFontSizeMultiplier={1.3}
        accessibilityLabel={label}
        placeholderTextColor={c["ink-3"]}
        selectionColor={c.ink}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          s.input,
          focused && { borderColor: c.ink },
          props.editable === false && { opacity: 0.45 },
          props.style,
        ]}
      />
    </View>
  );
}
export function Sheet({
  title,
  close,
  children,
  heading,
  hideHeading = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  heading?: ReactNode;
  hideHeading?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" style={s.scrim}>
        <Pressable
          accessibilityLabel="Close sheet"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            s.sheet,
            { paddingBottom: Math.max(insets.bottom, theme.spacing[3]) },
          ]}
        >
          <View style={s.grab} />
          {!hideHeading && (
            <View style={s.heading}>
              {heading ?? <T style={s.subtitle}>{title}</T>}
              <Button
                label={`Close ${title.toLowerCase()}`}
                textOnly
                icon="close"
                onPress={close}
              />
            </View>
          )}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetContent}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Status({
  message,
  retry,
  retryLabel = "Retry loading",
  loading = false,
}: {
  message: string;
  retry?: () => void;
  retryLabel?: string;
  loading?: boolean;
}) {
  return (
    <View style={s.status}>
      {loading && <ActivityIndicator color={c.ink} />}
      <T accessibilityRole={retry ? "alert" : undefined} quiet>
        {message}
      </T>
      {retry && <Button label={retryLabel} onPress={retry} />}
    </View>
  );
}
export function Choices<TValue extends string>({
  label,
  value,
  choices,
  change,
}: {
  label: string;
  value: TValue;
  choices: readonly { value: TValue; label: string; color?: string }[];
  change: (value: TValue) => void;
}) {
  return (
    <View style={s.field}>
      <T quiet>{label}</T>
      <View style={s.wrap}>
        {choices.map((choice) => (
          <Chip
            key={choice.value}
            label={choice.label}
            color={choice.color}
            selected={choice.value === value}
            onPress={() => change(choice.value)}
          />
        ))}
      </View>
    </View>
  );
}
export type IconName =
  | "day"
  | "list"
  | "week"
  | "goals"
  | "plus"
  | "close"
  | "prev"
  | "next"
  | "settings"
  | "resize"
  | "check";
export function Icon({
  name,
  color = c.ink,
}: {
  name: IconName;
  color?: string;
}) {
  const paths: Record<IconName, string> = {
    day: "M5 4v16M5 7h9a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5M5 14h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5",
    list: "M9 6h11M9 12h11M9 18h11",
    week: "M4 10h16M9 3v4M15 3v4",
    goals: "",
    plus: "M12 5v14M5 12h14",
    close: "M6 6l12 12M18 6L6 18",
    prev: "M15 5l-7 7 7 7",
    next: "M9 5l7 7-7 7",
    settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
    check: "M5 12l4 4L19 6",
    resize: "M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4",
  };
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name]} />
      {name === "goals" && (
        <>
          <Circle cx={12} cy={12} r={8} />
          <Circle cx={12} cy={12} r={3.5} />
        </>
      )}
      {name === "settings" && <Circle cx={12} cy={12} r={3} />}
      {name === "week" && <Rect x={4} y={5} width={16} height={15} rx={2} />}
      {name === "list" &&
        [6, 12, 18].map((y) => <Circle key={y} cx={4.5} cy={y} r={1} />)}
    </Svg>
  );
}
export const s = StyleSheet.create({
  text: {
    color: c.ink,
    fontFamily: "Schibsted400",
    fontSize: theme.typeSizes[8],
    lineHeight: 23,
  },
  quiet: {
    color: c["ink-3"],
    fontSize: ui.type.meta,
    lineHeight: ui.type.meta * 1.4,
  },
  title: {
    fontFamily: "Schibsted700",
    fontSize: ui.type.title,
    lineHeight: ui.type.title * 1.2,
  },
  subtitle: { fontFamily: "Schibsted600", fontSize: ui.type.section },
  button: {
    minWidth: theme.layout.controlHeight,
    minHeight: theme.layout.controlHeight,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radii[1],
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.s1,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: c.ink, borderColor: c.ink },
  field: { gap: theme.spacing[1], marginVertical: theme.spacing[1] },
  input: {
    minHeight: theme.layout.controlHeight,
    backgroundColor: c.s2,
    borderRadius: theme.radii[1],
    borderWidth: 1,
    borderColor: c.line,
    padding: theme.spacing[2],
    fontFamily: "Schibsted400",
    fontSize: theme.typeSizes[8],
    color: c.ink,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[1] },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  status: {
    padding: theme.spacing[3],
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: theme.radii[3],
    gap: theme.spacing[1],
  },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    padding: theme.layout.phoneSheetPadding,
    backgroundColor: c.s1,
    borderTopLeftRadius: theme.layout.phoneSheetRadius,
    borderTopRightRadius: theme.layout.phoneSheetRadius,
  },
  sheetContent: { paddingBottom: theme.spacing[4], gap: theme.spacing[1] },
  page: {
    padding: theme.layout.phonePadding,
    paddingBottom: theme.spacing[5],
    gap: theme.spacing[1],
  },
  card: {
    backgroundColor: c.s2,
    borderRadius: theme.radii[3],
    padding: theme.spacing[2],
    marginVertical: theme.spacing[0],
  },
  grab: {
    width: theme.spacing[5] + theme.spacing[0],
    height: theme.spacing[0],
    borderRadius: theme.spacing[0] / 2,
    backgroundColor: c.s3,
    alignSelf: "center",
    marginBottom: theme.spacing[1],
  },
});
