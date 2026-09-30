import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import s from "./App.module.css";
export function HelpSheet({ close }: { close: () => void }) {
  return (
    <Dialog label="Keyboard shortcuts" className={s.help} close={close}>
      <div className={s.ph}>
        <h3>Keyboard shortcuts</h3>
        <button
          className={s.iconButton}
          aria-label="Close shortcuts"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <dl>
        {[
          ["N", "Add a task"],
          ["Ctrl K", "Search and commands"],
          ["1 2 3 4", "Day, List, Week, Goals"],
          ["T", "Jump to today"],
          ["← →", "Previous or next day"],
          ["Enter", "Open the focused task"],
          ["M", "Move the focused task"],
          ["L", "Set the focused task's length"],
          ["Esc", "Close what is open"],
        ].map(([key, text]) => (
          <div key={key} style={{ display: "contents" }}>
            <dt>
              {key.split(" ").map((part) => (
                <span className={s.kbd} key={part}>
                  {part}
                </span>
              ))}
            </dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
