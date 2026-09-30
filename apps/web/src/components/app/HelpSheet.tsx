import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import s from "./App.module.css";
export function HelpSheet({ close }: { close: () => void }) {
  return (
    <Dialog label="Keyboard shortcuts" className={s.help} close={close}>
      <div className={s.ph}>
        <h3>Keyboard shortcuts</h3>
        <button aria-label="Close shortcuts" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <dl>
        {[
          ["N", "Add a task"],
          ["Ctrl K", "Search and commands"],
          ["1 2 3 4", "Day, List, Week, Goals"],
          ["T", "Jump to today"],
          ["Left Right", "Previous or next day"],
          ["Enter Space", "Open a focused task"],
          ["M", "Move a focused task"],
          ["L", "Set a focused task's length"],
          ["Esc", "Close what is open"],
        ].map(([key, text]) => (
          <div key={key} style={{ display: "contents" }}>
            <dt>
              <span className={s.kbd}>{key}</span>
            </dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
