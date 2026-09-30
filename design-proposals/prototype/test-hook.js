// Dev only: drives the prototype from the URL hash so headless screenshots can show each state.
(() => {
  const steps = decodeURIComponent(location.hash.slice(1)).split("|").filter(Boolean);
  const log = [];
  const click = (el) => el && el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const key = (k, o = {}) => document.body.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...o }));
  for (const s of steps) {
    const [cmd, arg] = [s.split(":")[0], s.split(":").slice(1).join(":")];
    try {
      if (cmd === "key") key(arg);
      else if (cmd === "pal") { key("k", { ctrlKey: true }); const i = document.querySelector("#pal-in"); i.value = arg; i.dispatchEvent(new Event("input")); }
      else if (cmd === "qa") { key("n"); const i = document.querySelector("#qa-in"); i.value = arg; i.dispatchEvent(new Event("input")); }
      else if (cmd === "enter") document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      else if (cmd === "open") click([...document.querySelectorAll("[data-open]")].find((e) => e.textContent.includes(arg)));
      else if (cmd === "toggle") click([...document.querySelectorAll("[data-open]")].find((e) => e.textContent.includes(arg)).querySelector(".chk"));
      else if (cmd === "click") click(document.querySelector(arg));
      else if (cmd === "drag" || cmd === "size" || cmd === "move") {
        const el = [...document.querySelectorAll("[data-drag]")].find((e) => e.textContent.includes(arg));
        const from = (cmd === "size" ? el.querySelector(".rz") : el), r = from.getBoundingClientRect(), g = document.querySelector(".grid").getBoundingClientRect();
        const pe = (type, x, y, target) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "mouse", button: 0, clientX: x, clientY: y }));
        const sx = r.left + 40, sy = r.top + 4;
        const ex = cmd === "drag" ? g.left + 100 : sx, ey = cmd === "drag" ? g.top + 56 * 10.5 : sy + 56;
        pe("pointerdown", sx, sy, from); pe("pointermove", (sx + ex) / 2, (sy + ey) / 2, document.body); pe("pointermove", ex, ey, document.body); pe("pointerup", ex, ey, document.body);
        const t = window.kriyan.state().tasks.find((t) => t.title.includes(arg));
        log.push(cmd + " " + arg + " => " + JSON.stringify({ date: t.date, time: t.time, dur: t.dur }));
      }
      else if (cmd === "parse") log.push(arg + " => " + JSON.stringify(window.kriyan.parse(arg)));
    } catch (e) { log.push("ERR " + s + ": " + e.message); }
  }
  window.addEventListener("error", (e) => log.push("JSERR " + e.message));
  const pre = document.createElement("pre"); pre.id = "log"; pre.hidden = true; pre.textContent = log.join("\n"); document.body.appendChild(pre);
})();
