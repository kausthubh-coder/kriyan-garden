import { Icon } from "./Icon";
import type { View } from "./types";
import s from "./App.module.css";
export function Rail({
  view,
  navigate,
  add,
  palette,
  help,
}: {
  view: View;
  navigate: (view: View) => void;
  add: () => void;
  palette: () => void;
  help: () => void;
}) {
  const button = (
    key: "day" | "list" | "week" | "goals",
    label: string,
    shortcut: number,
  ) => (
    <button
      key={key}
      data-view={key}
      data-tip={`${label} (${shortcut})`}
      aria-label={label}
      aria-current={view === key ? "page" : undefined}
      className={view === key ? s.on : undefined}
      onClick={() => navigate(key)}
    >
      <Icon name={key} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav className={s.rail} aria-label="Main">
      <b>k</b>
      {button("day", "Day", 1)}
      {button("list", "List", 2)}
      <button
        className={s.plus}
        data-tip="Add a task (N)"
        aria-label="Add task"
        onClick={add}
      >
        <Icon name="plus" />
        <span>Add task</span>
      </button>
      {button("week", "Week", 3)}
      {button("goals", "Goals", 4)}
      <button
        className={s["only-d"]}
        data-tip="Search and commands (Ctrl K)"
        aria-label="Search and commands"
        onClick={palette}
      >
        <Icon name="search" />
      </button>
      <button
        className={s["only-d"]}
        data-tip="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        onClick={help}
      >
        <Icon name="help" />
      </button>
      <button
        className={s.settingsLink}
        aria-label="Settings"
        aria-current={view === "settings" ? "page" : undefined}
        onClick={() => navigate("settings")}
      >
        <Icon name="settings" />
        <span>Settings</span>
      </button>
    </nav>
  );
}
