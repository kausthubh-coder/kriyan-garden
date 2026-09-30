import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Icon, Surface, T, s } from "./index";
import { ui } from "./tokens";
import { areaColor, type Area } from "../types";
const c = ui.colors;

export function Dot({
  color,
  large = false,
}: {
  color: string;
  large?: boolean;
}) {
  return (
    <View
      style={{
        width: large ? ui.spacing[2] : ui.spacing[1],
        height: large ? ui.spacing[2] : ui.spacing[1],
        borderRadius: ui.radii[6],
        backgroundColor: color,
      }}
    />
  );
}
export function Tag({
  label,
  color,
  outline = false,
}: {
  label: string;
  color?: string;
  outline?: boolean;
}) {
  return (
    <View
      style={{
        minHeight: ui.spacing[4] + ui.spacing[0],
        flexDirection: "row",
        alignItems: "center",
        gap: ui.spacing[1],
        paddingHorizontal: ui.spacing[2],
        paddingVertical: ui.spacing[0],
        borderRadius: ui.radii[0],
        backgroundColor: outline ? "transparent" : c.s3,
        borderWidth: 1,
        borderColor: c.s3,
      }}
    >
      {color && <Dot color={color} />}
      <T
        style={{
          fontSize: ui.type.meta,
          color: outline ? c["ink-3"] : c["ink-2"],
          fontFamily: "Schibsted500",
        }}
      >
        {label}
      </T>
    </View>
  );
}
export function Chip({
  label,
  color,
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const [focus, setFocus] = useState(false),
    [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => ({
        minHeight: ui.control.touch,
        minWidth: ui.control.touch,
        justifyContent: "center",
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <View
        style={[
          p.chip,
          {
            backgroundColor: selected ? c.ink : hover ? c.s2 : "transparent",
            borderColor: focus ? c.ink : selected ? c.ink : c.line,
          },
        ]}
      >
        {color && <Dot color={color} />}
        <T
          style={{
            color: selected ? c.on : c["ink-2"],
            fontSize: ui.typeSizes[5],
            fontFamily: "Schibsted500",
          }}
        >
          {label}
        </T>
      </View>
    </Pressable>
  );
}
type ButtonProps = Omit<Parameters<typeof Button>[0], "primary">;
export const PrimaryButton = (props: ButtonProps) => (
  <Button
    {...props}
    primary
    style={{
      minHeight: ui.control.row,
      borderRadius: ui.radii[5],
      ...props.style,
    }}
  />
);
export const QuietButton = (props: ButtonProps) => <Button {...props} />;
export const TextButton = ({
  danger,
  ...props
}: ButtonProps & { danger?: boolean }) => (
  <Button {...props} textOnly color={danger ? c.hot : undefined} />
);

export function Header({
  title,
  right,
  back,
  summary,
}: {
  title: string;
  right?: ReactNode;
  back?: () => void;
  summary?: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const isWeekday =
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/.test(title);
  const heading =
    isWeekday && width / fontScale < 360 ? title.slice(0, 3) : title;
  return (
    <View>
      <View style={p.header}>
        {back && <TextButton label="Back" icon="prev" onPress={back} />}
        <T
          title
          accessibilityRole="header"
          accessibilityLabel={title}
          style={{ flex: 1 }}
        >
          {heading}
        </T>
        {right}
      </View>
      {summary && (
        <T
          quiet
          style={{ fontSize: ui.type.section, marginTop: ui.spacing[0] }}
        >
          {summary}
        </T>
      )}
    </View>
  );
}
export function SegmentedNav({
  previous,
  today,
  next,
  unit = "day",
}: {
  previous: () => void;
  today: () => void;
  next: () => void;
  unit?: "day" | "week";
}) {
  return (
    <View style={p.segment}>
      {[
        { label: `Previous ${unit}`, icon: "prev" as const, action: previous },
        { label: "Today", icon: undefined, action: today },
        { label: `Next ${unit}`, icon: "next" as const, action: next },
      ].map((item, index) => (
        <TextButton
          key={item.label}
          label={item.label}
          icon={item.icon}
          onPress={item.action}
          style={{
            borderRadius: 0,
            paddingHorizontal: item.icon ? 0 : ui.spacing[1],
            borderLeftWidth: index ? 1 : 0,
            borderLeftColor: c.line,
          }}
        />
      ))}
    </View>
  );
}
export function Check({
  label,
  checked,
  color = c["ink-2"],
  onPress,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [focus, setFocus] = useState(false),
    [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => [
        p.checkTarget,
        {
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          backgroundColor: hover ? c.scrim : "transparent",
          borderColor: focus ? c.ink : "transparent",
        },
      ]}
    >
      <View
        style={[
          p.check,
          {
            borderColor: color,
            backgroundColor: checked ? color : "transparent",
          },
        ]}
      >
        {checked && <Icon name="check" color={c.on} />}
      </View>
    </Pressable>
  );
}
export function SectionHeading({
  title,
  color,
  value,
}: {
  title: string;
  color?: string;
  value?: string;
}) {
  return (
    <View style={p.section}>
      {color && <Dot color={color} />}
      <T style={s.subtitle}>{title}</T>
      {value && (
        <T quiet style={{ marginLeft: "auto" }}>
          {value}
        </T>
      )}
    </View>
  );
}
export function PropertyList({ children }: { children: ReactNode }) {
  return <View style={p.properties}>{children}</View>;
}
export function PropertyRow({
  label,
  value,
  color,
  urgent,
  open,
  onPress,
  children,
  disabled,
}: {
  label: string;
  value: string;
  color?: string;
  urgent?: boolean;
  open: boolean;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <View style={p.property}>
      <Surface
        label={`${label}: ${value}`}
        state={{ expanded: open }}
        onPress={onPress}
        disabled={disabled}
        style={p.propertyHead}
      >
        <T
          quiet
          style={{
            width: ui.layout.phoneTabWidth + ui.spacing[5],
            fontSize: ui.type.section,
          }}
        >
          {label}
        </T>
        <View style={p.propertyValue}>
          {color && <Dot color={color} />}
          <T
            style={{
              flexShrink: 1,
              fontFamily: "Schibsted500",
              color: urgent ? c.hot : c["ink-2"],
            }}
          >
            {value}
          </T>
        </View>
        <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
          <Icon name="next" color={c["ink-3"]} />
        </View>
      </Surface>
      {open && <View style={p.editor}>{children}</View>}
    </View>
  );
}
export function ListRow({
  label,
  value,
  color,
  onPress,
  danger = false,
  disclosure = true,
}: {
  label: string;
  value?: string;
  color?: string;
  onPress: () => void;
  danger?: boolean;
  disclosure?: boolean;
}) {
  return (
    <Surface label={label} onPress={onPress} style={p.listRow}>
      {color && <Dot color={color} large />}
      <T
        style={{
          flex: 1,
          fontFamily: "Schibsted500",
          color: danger ? c.hot : c.ink,
        }}
      >
        {label}
      </T>
      {value && (
        <T quiet numberOfLines={1} style={{ maxWidth: "50%", flexShrink: 1 }}>
          {value}
        </T>
      )}
      {disclosure && <Icon name="next" color={c["ink-3"]} />}
    </Surface>
  );
}
export const areaColors: readonly { value: Area["color"]; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "orange", label: "Orange" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
  { value: "yellow", label: "Yellow" },
  { value: "purple", label: "Purple" },
  { value: "teal", label: "Teal" },
  { value: "grey", label: "Grey" },
];
export function Swatches({
  value,
  change,
  disabled,
}: {
  value: Area["color"];
  change: (color: Area["color"]) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.wrap}>
      {areaColors.map((color) => (
        <Surface
          key={color.value}
          label={color.label}
          state={{ selected: color.value === value }}
          disabled={disabled}
          onPress={() => change(color.value)}
          style={{
            width: ui.control.touch,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: ui.radii[6],
          }}
        >
          <View
            style={{
              width: ui.control.visual,
              height: ui.control.visual,
              borderRadius: ui.control.visual / 2,
              backgroundColor: areaColor({ color: color.value }),
              borderWidth: color.value === value ? 2 : 0,
              borderColor: c.ink,
            }}
          />
        </Surface>
      ))}
    </View>
  );
}
export const p = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: ui.spacing[0] },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: ui.radii[1],
    overflow: "hidden",
  },
  chip: {
    minHeight: ui.control.visual,
    paddingHorizontal: ui.spacing[1],
    borderRadius: ui.radii[1],
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing[1],
  },
  checkTarget: {
    width: ui.control.touch,
    minHeight: ui.control.touch,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  check: {
    width: ui.spacing[4],
    height: ui.spacing[4],
    borderRadius: ui.spacing[2],
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing[1],
    paddingTop: ui.spacing[3],
    paddingBottom: ui.spacing[1],
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  properties: {
    marginTop: ui.spacing[2],
    borderTopWidth: 1,
    borderColor: c.line,
  },
  property: { borderBottomWidth: 1, borderColor: c.line },
  propertyHead: {
    minHeight: ui.control.row,
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing[1],
  },
  propertyValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing[1],
  },
  editor: { gap: ui.spacing[1], paddingBottom: ui.spacing[2] },
  listRow: {
    minHeight: ui.control.row + ui.spacing[0],
    paddingVertical: ui.spacing[1],
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing[2],
    borderBottomWidth: 1,
    borderColor: c.line,
  },
});
