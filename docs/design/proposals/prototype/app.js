(() => {
  "use strict";

  const HH = 56, H0 = 7, H1 = 23, KEY = "kriyan-proto-v2", CAPACITY = 360;
  const AREAS = {
    school: { name: "School", c: "var(--school)" },
    biz: { name: "Business", c: "var(--biz)" },
    life: { name: "Life", c: "var(--life)" },
  };
  const PROJECTS = {
    cs201: { name: "CS 201", area: "school" },
    calc: { name: "Calculus II", area: "school" },
    econ: { name: "Econ 101", area: "school" },
    launch: { name: "Kriyan mobile launch", area: "biz" },
    hartley: { name: "Hartley website", area: "biz" },
    health: { name: "Health", area: "life" },
    home: { name: "Home and family", area: "life" },
  };
  const GOALS = [
    { id: "launch", area: "biz", title: "Launch Kriyan on mobile", val: "42%", p: 42, e: 48, st: "1 week behind", cls: "tight", sub: "Due 15 December" },
    { id: "gpa", area: "school", title: "3.8 GPA this semester", val: "3.74", p: 68, e: 60, st: "On pace", cls: "ok", sub: "Ends 18 December" },
    { id: "run", area: "life", title: "Run a 10k", val: "6.5 km", p: 65, e: 58, st: "Ahead", cls: "ok", sub: "Race on 22 November" },
  ];
  const DEADLINES = [
    { title: "Problem set 4", area: "school", off: 2, need: 120, free: 300 },
    { title: "Calculus II midterm", area: "school", off: 7, need: 360, free: 420 },
    { title: "TestFlight build", area: "biz", off: 10, need: 720, free: 540 },
  ];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /* ---------- dates and formatting ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const add = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const TODAY = iso(new Date());
  const dayName = (s) => DAYS[toDate(s).getDay()];
  const longDate = (s) => `${toDate(s).getDate()} ${MONTHS[toDate(s).getMonth()]}`;
  const shortDate = (s) => `${dayName(s).slice(0, 3)} ${toDate(s).getDate()} ${MONTHS[toDate(s).getMonth()].slice(0, 3)}`;
  const rel = (s) => (s === TODAY ? "Today" : s === add(TODAY, 1) ? "Tomorrow" : s === add(TODAY, -1) ? "Yesterday" : shortDate(s));
  const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fd = (m) => (m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const monday = (s) => add(s, -((toDate(s).getDay() + 6) % 7));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const uid = () => "t" + Math.random().toString(36).slice(2, 9);
  const isPhone = () => matchMedia("(max-width: 820px)").matches;

  /* ---------- data ---------- */
  function seed() {
    const t = (title, area, project, off, time, dur, x = {}) => ({ id: uid(), title, area, project, date: off == null ? null : add(TODAY, off), time, dur, done: false, goal: null, due: null, ...x });
    return {
      seeded: TODAY,
      tasks: [
        t("Gym, legs", "life", "health", 0, "08:00", 45, { done: true, goal: "run" }),
        t("Read chapter 6, hash tables", "school", "cs201", 0, null, 30, { done: true }),
        t("Problem set 4, linked lists", "school", "cs201", 0, "11:30", 60, { due: add(TODAY, 2) }),
        t("Ship the update_task signing fix", "biz", "launch", 0, "14:30", 60, { goal: "launch" }),
        t("Send the September invoice to Hartley", "biz", "hartley", 0, "16:00", null),
        t("Call Amma", "life", "home", 0, null, null),
        t("Reply to Priya about the launch deck", "biz", "launch", 0, null, 30),
        t("Midterm revision, integration by parts", "school", "calc", 0, "19:00", 75, { goal: "gpa" }),
        t("Read for 20 minutes", "life", null, 0, "21:00", 20),
        t("Econ essay outline", "school", "econ", null, null, 45, { due: add(TODAY, 3) }),
        t("Record the product walkthrough", "biz", "launch", null, null, null, { goal: "launch" }),
        t("Renew passport", "life", "home", null, null, null),
        t("Calculus problem sheet 5", "school", "calc", 1, "10:00", 90, { goal: "gpa" }),
        t("Design the onboarding screens", "biz", "launch", 1, "15:00", 120, { goal: "launch" }),
        t("Buy groceries", "life", "home", 1, null, null),
        t("Finish problem set 4", "school", "cs201", 2, "09:00", 60, { due: add(TODAY, 2) }),
        t("Set up Expo sign in", "biz", "launch", 2, "13:00", 180, { goal: "launch" }),
        t("Midterm revision, series", "school", "calc", 2, "17:00", 120, { goal: "gpa" }),
        t("Long run, 7 km", "life", "health", 2, "07:30", 50, { goal: "run" }),
        t("Write the econ essay outline", "school", "econ", 3, "16:00", 45),
        t("Send Hartley the staging link", "biz", "hartley", 3, null, null),
        t("Easy run, 4 km", "life", "health", 4, "09:00", 30, { goal: "run" }),
        t("Plan next week", "life", null, 5, "18:00", null),
        t("Stand-up notes", "biz", "launch", -1, "09:30", 15, { done: true }),
        t("Calculus lecture notes", "school", "calc", -1, null, 40, { done: true }),
      ],
      events: [
        { title: "CS 201 lecture", area: "school", where: "Room 4.12", off: 0, s: "10:00", e: "11:15" },
        { title: "Calculus II lecture", area: "school", where: "Hall B", off: 0, s: "13:00", e: "13:50" },
        { title: "Econ 101 seminar", area: "school", where: "Room 2.03", off: 1, s: "11:30", e: "12:45" },
        { title: "CS 201 lecture", area: "school", where: "Room 4.12", off: 2, s: "10:00", e: "11:15" },
        { title: "Calculus II lecture", area: "school", where: "Hall B", off: 2, s: "13:00", e: "13:50" },
        { title: "Call with Hartley", area: "biz", where: "Video call", off: 3, s: "14:00", e: "14:30" },
        { title: "Calculus II lecture", area: "school", where: "Hall B", off: -1, s: "13:00", e: "13:50" },
      ].map((e) => ({ ...e, date: add(TODAY, e.off) })),
    };
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.seeded === TODAY && Array.isArray(d.tasks)) return d;
    } catch (e) { /* fall through to a fresh seed */ }
    return seed();
  }
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
  const U = { view: "day", filter: "all", date: TODAY, sel: null, over: null, panelFor: null, scrolled: false, palI: 0 };
  let undoSnap = null, toastTimer = null;

  const $ = (q, el = document) => el.querySelector(q);
  const app = $("#app"), over = $("#over"), toastEl = $("#toast");
  const task = (id) => S.tasks.find((t) => t.id === id);
  const shown = (t) => U.filter === "all" || t.area === U.filter;
  const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99");
  const projName = (t) => (t.project && PROJECTS[t.project] ? PROJECTS[t.project].name : AREAS[t.area].name);

  function mutate(fn, msg) {
    const snap = JSON.stringify(S.tasks);
    fn();
    save();
    render();
    if (msg) toast(msg, snap);
  }
  function toast(msg, snap) {
    undoSnap = snap || null;
    toastEl.innerHTML = `<div class="toast" role="status">${esc(msg)}${snap ? '<button data-act="undo">Undo</button>' : ""}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.innerHTML = ""; undoSnap = null; }, 5000);
  }

  /* ---------- quick add parser ---------- */
  function parse(text) {
    const o = { title: "", area: null, project: null, date: undefined, time: null, dur: null };
    let t = ` ${text} `;
    t = t.replace(/\s(\d+(?:\.\d+)?)\s?h(?:(?:ou)?rs?)?(?:\s?(\d+)\s?m(?:ins?)?)?(?=\s)/i, (m, h, mn) => { o.dur = Math.round(parseFloat(h) * 60) + (parseInt(mn, 10) || 0); return " "; });
    t = t.replace(/\s(\d+)\s?m(?:ins?)?(?=\s)/i, (m, n) => { if (o.dur == null) { o.dur = parseInt(n, 10); return " "; } return m; });
    t = t.replace(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (m, h, mn, ap) => {
      let hh = parseInt(h, 10) % 12; if (/pm/i.test(ap)) hh += 12;
      o.time = hm(hh * 60 + (parseInt(mn, 10) || 0)); return " ";
    });
    t = t.replace(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m, h, mn) => { if (o.time) return m; o.time = hm(parseInt(h, 10) * 60 + parseInt(mn, 10)); return " "; });
    t = t.replace(/\sat\s(\d{1,2})(?=\s)/i, (m, h) => { if (o.time) return m; let hh = parseInt(h, 10); if (hh < 7) hh += 12; if (hh > 23) return m; o.time = hm(hh * 60); return " "; });
    t = t.replace(/\s(today|tonight|tomorrow|tmrw?|tom|later|someday)(?=\s)/i, (m, w) => {
      w = w.toLowerCase();
      o.date = w === "later" || w === "someday" ? null : w === "today" || w === "tonight" ? TODAY : add(TODAY, 1);
      return " ";
    });
    t = t.replace(/\s(?:on\s)?(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?(?=\s)/i, (m, w) => {
      if (o.date !== undefined) return m;
      const i = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(w.toLowerCase().slice(0, 3));
      const diff = (i - toDate(TODAY).getDay() + 7) % 7 || 7;
      o.date = add(TODAY, diff); return " ";
    });
    t = t.replace(/\s#([\w-]+)/g, (m, tag) => {
      tag = tag.toLowerCase();
      const a = Object.keys(AREAS).find((k) => k.startsWith(tag) || AREAS[k].name.toLowerCase().startsWith(tag));
      if (a) { o.area = a; return " "; }
      const p = Object.keys(PROJECTS).find((k) => k.startsWith(tag) || PROJECTS[k].name.toLowerCase().replace(/\s/g, "").startsWith(tag));
      if (p) { o.project = p; o.area = PROJECTS[p].area; return " "; }
      return m;
    });
    o.title = t.replace(/\s+/g, " ").trim();
    if (o.title) o.title = o.title[0].toUpperCase() + o.title.slice(1);
    if (o.date === undefined) o.date = o.time ? (U.view === "day" || U.view === "list" ? U.date : TODAY) : (U.view === "day" || U.view === "list" ? U.date : TODAY);
    if (!o.area) o.area = U.filter !== "all" ? U.filter : "life";
    return o;
  }
  function createFrom(text) {
    const p = parse(text);
    if (!p.title) return false;
    const where = p.date ? `${rel(p.date)}${p.time ? ` at ${p.time}` : ", any time"}` : "No date yet";
    mutate(() => S.tasks.push({ id: uid(), title: p.title, area: p.area, project: p.project, date: p.date, time: p.time, dur: p.dur, done: false, goal: null, due: null }), `Added: ${where}`);
    return true;
  }

  /* ---------- icons ---------- */
  const I = {
    day: '<svg viewBox="0 0 24 24"><path d="M5 4v16M5 7h9a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5M5 14h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    week: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    goals: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 2M12 17h.01"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  /* ---------- render ---------- */
  function rail() {
    const b = (v, tip, key) => `<button data-act="view" data-view="${v}" data-tip="${tip} (${key})" aria-label="${tip}" class="${U.view === v ? "on" : ""}">${I[v]}<span>${tip}</span></button>`;
    return `<nav class="rail" aria-label="Main">
      <b>k</b>
      ${b("day", "Day", "1")}${b("list", "List", "2")}
      <button class="plus" data-act="add" data-tip="Add a task (N)" aria-label="Add a task">${I.plus}</button>
      ${b("week", "Week", "3")}${b("goals", "Goals", "4")}
      <button class="only-d" data-act="pal" data-tip="Search and commands (Ctrl K)" aria-label="Search and commands">${I.search}</button>
      <button class="only-d" data-act="help" data-tip="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">${I.help}</button>
    </nav>`;
  }
  function filters() {
    const f = (k, label, c) => `<button class="f ${U.filter === k ? "on" : ""}" data-act="filter" data-k="${k}"${c ? ` style="--c: ${c}"` : ""}>${c ? '<i class="dot"></i>' : ""}${label}</button>`;
    return `<div class="filters">${f("all", "All")}${Object.entries(AREAS).map(([k, a]) => f(k, a.name, a.c)).join("")}</div>`;
  }
  function head(title, sub, extra = "", sum = "") {
    return `<div class="dh"><h1>${title}</h1><p>${sub}</p>${sum ? `<p class="sum">${sum}</p>` : ""}
      <div class="right">
        <button class="f ic" data-act="nav" data-d="${U.view === "week" ? -7 : -1}" aria-label="Previous">${I.prev}</button>
        <button class="f" data-act="nav" data-d="0">Today</button>
        <button class="f ic" data-act="nav" data-d="${U.view === "week" ? 7 : 1}" aria-label="Next">${I.next}</button>
        ${extra}
      </div></div>`;
  }
  const chk = (t) => `<button class="chk ${t.done ? "is" : ""}" data-act="toggle" data-id="${t.id}" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? "Mark as not done" : "Mark as done"}: ${esc(t.title)}"></button>`;

  function trayItem(t) {
    const due = t.due && !t.done ? `<i>Due ${rel(t.due)}</i>` : "";
    return `<div class="item ${t.done ? "done" : ""}" data-drag="${t.id}" data-open="${t.id}" style="--c: ${AREAS[t.area].c}" tabindex="0">
      ${chk(t)}<b>${esc(t.title)}</b><span>${t.dur ? fd(t.dur) : ""}</span><small>${due}${esc(projName(t))}</small></div>`;
  }

  function layout(items) {
    items.sort((a, b) => a.s - b.s || b.e - a.e);
    let cols = [], group = [], end = -1;
    const flush = () => { group.forEach((i) => (i.n = cols.length)); cols = []; group = []; };
    for (const it of items) {
      if (group.length && it.s >= end) { flush(); end = -1; }
      let c = cols.findIndex((e) => e <= it.s);
      if (c < 0) { c = cols.length; cols.push(0); }
      cols[c] = it.ve; it.c = c; group.push(it); end = Math.max(end, it.ve);
    }
    flush();
    return items;
  }

  function dayStats(date) {
    const ts = S.tasks.filter((t) => t.date === date && shown(t));
    const open = ts.filter((t) => !t.done);
    return {
      all: ts, open,
      planned: open.reduce((n, t) => n + (t.dur || 0), 0),
      total: ts.reduce((n, t) => n + (t.dur || 0), 0),
      nolen: open.filter((t) => !t.dur).length,
      by: Object.keys(AREAS).map((k) => [k, ts.filter((t) => t.area === k).reduce((n, t) => n + (t.dur || 0), 0)]),
    };
  }
  function summary(date) {
    const s = dayStats(date);
    if (!s.all.length) return "Nothing planned.";
    const left = s.open.length;
    const parts = [`<b>${left} ${left === 1 ? "task" : "tasks"} left</b>`];
    if (s.planned) parts.push(`${fd(s.planned)} planned`);
    if (s.nolen) parts.push(`${s.nolen} with no length`);
    return parts.join(", ") + ".";
  }

  function viewDay() {
    const d = U.date;
    const any = S.tasks.filter((t) => t.date === d && !t.time && shown(t)).sort((a, b) => a.done - b.done);
    const later = S.tasks.filter((t) => !t.date && !t.done && shown(t));
    const items = [];
    S.events.filter((e) => e.date === d && shown(e)).forEach((e) => items.push({ ev: e, s: toMin(e.s), e: toMin(e.e) }));
    S.tasks.filter((t) => t.date === d && t.time && shown(t)).forEach((t) => items.push({ t, s: toMin(t.time), e: toMin(t.time) + (t.dur || 0) }));
    items.forEach((i) => (i.ve = Math.max(i.e, i.s + 32)));
    layout(items);

    const hours = [];
    for (let h = H0; h <= H1; h++) hours.push(`<div class="hr" style="top: ${(h - H0) * HH}px"><span>${pad(h)}:00</span></div>`);
    const blocks = items.map((i) => {
      const top = ((i.s - H0 * 60) / 60) * HH + 1;
      const pos = `left: calc(${(i.c / i.n) * 100}% + ${i.c ? 2 : 0}px); width: calc(${100 / i.n}% - ${i.n > 1 ? 4 : 0}px);`;
      if (i.ev) {
        const h = Math.max(((i.e - i.s) / 60) * HH - 3, 30);
        return `<div class="blk ev ${h < 46 ? "sm" : ""}" style="--c: ${AREAS[i.ev.area].c}; top: ${top}px; height: ${h}px; ${pos}">
          <i class="dot"></i><div class="tx"><b>${esc(i.ev.title)}</b><span>Class or meeting, ${esc(i.ev.where)}</span></div><time>${i.ev.s}${i.n > 1 ? "" : ` to ${i.ev.e}`}</time></div>`;
      }
      const t = i.t, c = AREAS[t.area].c;
      const h = t.dur ? Math.max((t.dur / 60) * HH - 3, 30) : 30;
      const sub = t.due && !t.done ? `Due ${rel(t.due)}` : t.goal ? `Goal: ${GOALS.find((g) => g.id === t.goal).title}` : projName(t);
      return `<div class="blk ${t.dur ? "" : "pt"} ${h < 46 ? "sm" : ""} ${t.done ? "isdone" : ""}" data-drag="${t.id}" data-open="${t.id}" tabindex="0" style="--c: ${c}; --bc: ${c}; top: ${top}px; height: ${h}px; ${pos}">
        ${chk(t)}<div class="tx"><b>${esc(t.title)}</b><span>${esc(sub)}</span></div><time>${t.time}${t.dur && i.n === 1 ? ` to ${hm(i.e)}` : ""}</time><i class="rz" title="${t.dur ? "Drag to change the length" : "Drag to give this a length"}"></i></div>`;
    }).join("");

    const anyLabel = d === TODAY ? "Any time today" : `Any time on ${dayName(d)}`;
    return `<div class="view-day" data-scroll="vd">
      <aside class="tray" data-scroll="tray">
        ${filters()}
        <section>
          <h2 class="h">${anyLabel}<em>${any.filter((t) => !t.done).length} left</em></h2>
          ${any.length ? any.map(trayItem).join("") : `<div class="empty">Nothing waiting. <button data-act="add">Add a task</button></div>`}
        </section>
        <section class="later">
          <h2 class="h">No date yet<em>${later.length}</em></h2>
          ${later.length ? later.map(trayItem).join("") : `<div class="empty">Tasks without a date land here.</div>`}
          <p class="hint">Drag a task onto the day to give it a time. A length is optional: drag the bottom edge of a block to set one.</p>
        </section>
      </aside>
      <main class="day" data-scroll="day">
        ${head(dayName(d), longDate(d), `<button class="f only-d" data-act="pal">Ctrl K</button>`, summary(d))}
        <div class="grid" style="height: ${(H1 - H0) * HH}px">${hours.join("")}${blocks}${nowLine(d)}</div>
      </main>
      <aside class="side" data-scroll="side">${sideHtml()}</aside>
    </div>`;
  }
  function nowLine(d) {
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
    if (d !== TODAY || m < H0 * 60 || m > H1 * 60) return "";
    return `<div class="now" style="top: ${((m - H0 * 60) / 60) * HH}px"><span>${hm(m)}</span></div>`;
  }

  function loadHtml() {
    const start = monday(U.date);
    let worst = null;
    const bars = [...Array(7)].map((_, i) => {
      const d = add(start, i), s = dayStats(d);
      if (s.total > CAPACITY && (!worst || s.total > worst.total)) worst = { d, total: s.total };
      const h = Math.round(clamp(s.total / 480, 0, 1) * 66);
      const segs = s.total ? s.by.map(([k, m]) => (m ? `<u style="height: ${(m / s.total) * 100}%; background: ${AREAS[k].c}"></u>` : "")).join("") : "";
      return `<button data-act="goday" data-date="${d}" class="${d === U.date ? "t" : ""}" aria-label="${dayName(d)}, ${s.total ? fd(s.total) : "nothing"} planned">
        <i style="height: ${h}px">${segs}</i>${dayName(d)[0]}<small>${s.total ? fd(s.total) : s.all.length ? `${s.all.length} ${s.all.length === 1 ? "task" : "tasks"}` : "Free"}</small></button>`;
    }).join("");
    const cap = worst
      ? `<p class="cap"><b class="bad">${dayName(worst.d)} is over capacity</b> by ${fd(worst.total - CAPACITY)}. Move something to a lighter day.</p>`
      : `<p class="cap">No day is over ${fd(CAPACITY)}. Tasks with no length are not counted.</p>`;
    return `<div class="load">${bars}</div>${cap}`;
  }
  function deadlinesHtml() {
    return DEADLINES.filter((d) => U.filter === "all" || d.area === U.filter).map((d) => {
      const spare = d.free - d.need, cls = spare < 0 ? "bad" : spare <= 60 ? "tight" : "ok";
      return `<div class="dl" style="--c: ${spare < 0 ? "var(--hot)" : AREAS[d.area].c}"><div class="top"><i class="dot" style="--c: ${AREAS[d.area].c}"></i>${esc(d.title)}<span>${shortDate(add(TODAY, d.off))}</span></div>
        <div class="cush" style="--need: ${clamp((d.need / d.free) * 100, 0, 100)}"><i></i></div>
        <p>${fd(d.need)} needed, ${fd(d.free)} free<b class="${cls}">${spare < 0 ? `${fd(-spare)} short` : `${fd(spare)} to spare`}</b></p></div>`;
    }).join("") || `<div class="empty">No deadlines in this area.</div>`;
  }
  function sideHtml() {
    const goals = GOALS.filter((g) => U.filter === "all" || g.area === U.filter);
    return `<div><h2 class="h">Week of ${longDate(monday(U.date))}</h2>${loadHtml()}</div>
      <div><h2 class="h">Deadlines<em>Time needed against time free</em></h2>${deadlinesHtml()}</div>
      <div><h2 class="h">Goals<em>${goals.length} active</em></h2>${goals.map((g) => `<button class="goal" data-act="view" data-view="goals" style="--c: ${AREAS[g.area].c}"><i class="ring" style="--p: ${g.p}"></i>${esc(g.title)}<span class="${g.cls}">${g.val}</span></button>`).join("")}</div>`;
  }

  function row(t, withDate) {
    const g = t.goal ? GOALS.find((x) => x.id === t.goal) : null;
    return `<div class="row ${t.done ? "done" : ""}" data-open="${t.id}" tabindex="0" style="--c: ${AREAS[t.area].c}">
      ${chk(t)}<span class="t">${esc(t.title)}</span>
      <div class="meta">${t.due && !t.done ? `<span class="due">Due ${rel(t.due)}</span>` : ""}${g ? `<span class="gl">${esc(g.title)}</span>` : ""}<span>${esc(projName(t))}</span>${withDate && t.date ? `<span>${rel(t.date)}</span>` : ""}${t.time ? `<span class="tm">${t.time}</span>` : ""}${t.dur ? `<span>${fd(t.dur)}</span>` : ""}</div></div>`;
  }
  function viewList() {
    const d = U.date;
    const secs = Object.entries(AREAS).filter(([k]) => U.filter === "all" || U.filter === k).map(([k, a]) => {
      const ts = S.tasks.filter((t) => t.date === d && t.area === k).sort((x, y) => x.done - y.done || byTime(x, y));
      if (!ts.length) return "";
      const mins = ts.reduce((n, t) => n + (t.dur || 0), 0);
      return `<section class="sec" style="--c: ${a.c}"><h2><i class="dot"></i>${a.name}<em>${ts.filter((t) => !t.done).length} left${mins ? `, ${fd(mins)}` : ""}</em></h2>${ts.map((t) => row(t)).join("")}</section>`;
    }).join("");
    const later = S.tasks.filter((t) => !t.date && !t.done && shown(t));
    return `<div class="page" data-scroll="list">
      ${head(d === TODAY ? "Today" : dayName(d), longDate(d), "", summary(d))}
      <div class="col">
        ${filters()}
        <button class="addrow" data-act="add">${I.plus}<span>Add a task, for example "econ outline fri 5pm #econ 45m"</span><i class="kbd only-d" style="font-style: normal">N</i></button>
        ${secs || `<div class="empty" style="margin-top: 24px">Nothing planned for ${rel(d).toLowerCase()}. <button data-act="add">Add a task</button></div>`}
        ${later.length ? `<section class="sec"><h2>No date yet<em>${later.length}</em></h2>${later.map((t) => row(t)).join("")}</section>` : ""}
      </div></div>`;
  }
  function viewWeek() {
    const start = monday(U.date);
    const cols = [...Array(7)].map((_, i) => {
      const d = add(start, i), s = dayStats(d);
      const evs = S.events.filter((e) => e.date === d && shown(e)).map((e) => ({ k: e.s, h: `<div class="wt ev" style="--c: ${AREAS[e.area].c}"><i class="dot"></i><span>${esc(e.title)}<small>${e.s} to ${e.e}</small></span></div>` }));
      const ts = s.all.map((t) => ({ k: t.time || "99", h: `<button class="wt ${t.done ? "done" : ""}" data-open="${t.id}" style="--c: ${AREAS[t.area].c}"><i class="dot"></i><span>${esc(t.title)}<small>${t.time || "Any time"}${t.dur ? `, ${fd(t.dur)}` : ""}</small></span></button>` }));
      const all = [...evs, ...ts].sort((a, b) => a.k.localeCompare(b.k));
      return `<div class="wd ${d === TODAY ? "t" : ""}"><button data-act="goday" data-date="${d}">${dayName(d).slice(0, 3)}<em>${toDate(d).getDate()}</em><span class="${s.total > CAPACITY ? "bad" : ""}">${s.total ? fd(s.total) : ""}</span></button>
        ${all.map((x) => x.h).join("") || `<div class="empty" style="padding: 12px 10px">Free</div>`}</div>`;
    }).join("");
    return `<div class="page" data-scroll="week">
      ${head("Week", `${longDate(start)} to ${longDate(add(start, 6))}`)}
      ${filters()}
      <div class="week" style="margin-top: 18px">${cols}</div>
      <div class="cols2">
        <div><h2 class="h">Load<em>Hours with a length, by area</em></h2>${loadHtml()}</div>
        <div><h2 class="h">Deadlines<em>Time needed against time free</em></h2>${deadlinesHtml()}</div>
      </div></div>`;
  }
  function viewGoals() {
    const goals = GOALS.filter((g) => U.filter === "all" || g.area === U.filter);
    return `<div class="page" data-scroll="goals">
      <div class="dh"><h1>Goals</h1><p>${goals.length} active</p></div>
      ${filters()}
      ${goals.map((g) => {
        const ts = S.tasks.filter((t) => t.goal === g.id).sort((a, b) => a.done - b.done || (a.date || "9").localeCompare(b.date || "9"));
        return `<section class="gcard" style="--c: ${AREAS[g.area].c}">
          <div class="gt"><b>${g.val}</b><div>${esc(g.title)}<small>${AREAS[g.area].name}. ${g.sub}</small></div><span class="${g.cls}">${g.st}</span></div>
          <div class="pace" style="--p: ${g.p}; --e: ${g.e}"><i></i><u></u></div>
          <p>The marker shows where you should be today. ${ts.filter((t) => t.done).length} of ${ts.length} linked tasks done.</p>
          ${ts.map((t) => row(t, true)).join("")}</section>`;
      }).join("") || `<div class="empty" style="margin-top: 24px">No goals in this area yet.</div>`}
    </div>`;
  }

  function render() {
    const keep = {};
    document.querySelectorAll("[data-scroll]").forEach((el) => (keep[el.dataset.scroll] = el.scrollTop));
    app.innerHTML = rail() + { day: viewDay, list: viewList, week: viewWeek, goals: viewGoals }[U.view]();
    document.querySelectorAll("[data-scroll]").forEach((el) => { if (keep[el.dataset.scroll] != null) el.scrollTop = keep[el.dataset.scroll]; });
    if (U.view === "day" && !U.scrolled) {
      const n = new Date(), m = clamp(n.getHours() * 60 + n.getMinutes(), 9 * 60, 20 * 60);
      const el = $(".day");
      if (el && !isPhone()) el.scrollTop = ((m - H0 * 60) / 60) * HH - 170;
      U.scrolled = true;
    }
    renderOver();
  }

  /* ---------- overlays ---------- */
  function renderOver() {
    if (U.over === "qa" || U.over === "pal") return; // these manage their own DOM while open
    if (U.over === "help") { over.innerHTML = helpHtml(); return; }
    const t = U.sel && task(U.sel);
    if (!t) { over.innerHTML = ""; U.sel = null; U.panelFor = null; return; }
    const fresh = U.panelFor !== t.id;
    U.panelFor = t.id;
    const opt = (k, v, label, on) => `<button class="f ${on ? "on" : ""}" data-act="set" data-k="${k}" data-v="${v}">${label}</button>`;
    const projs = Object.entries(PROJECTS).filter(([, p]) => p.area === t.area);
    over.innerHTML = `<div class="scrim pscrim" data-act="close"></div>
      <aside class="panel" ${fresh ? "" : 'style="animation: none"'} aria-label="Task details">
        <div class="ph"><i class="dot" style="--c: ${AREAS[t.area].c}"></i>${esc(projName(t))}<button data-act="close" aria-label="Close">${I.x}</button></div>
        <div class="tt" style="--c: ${AREAS[t.area].c}">${chk(t)}<textarea data-in="title" rows="1" aria-label="Task title">${esc(t.title)}</textarea></div>
        <div class="fld"><label>Area</label><div class="opts">${Object.entries(AREAS).map(([k, a]) => `<button class="f ${t.area === k ? "on" : ""}" data-act="set" data-k="area" data-v="${k}" style="--c: ${a.c}"><i class="dot"></i>${a.name}</button>`).join("")}</div></div>
        <div class="fld"><label for="p-proj">Project or course</label><select id="p-proj" data-in="project"><option value="">None</option>${projs.map(([k, p]) => `<option value="${k}" ${t.project === k ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
        <div class="fld"><label>Day</label><div class="opts">
          ${opt("date", TODAY, "Today", t.date === TODAY)}${opt("date", add(TODAY, 1), "Tomorrow", t.date === add(TODAY, 1))}${opt("date", "null", "No date", !t.date)}
          <input type="date" data-in="date" value="${t.date || ""}" aria-label="Pick a day"></div></div>
        <div class="fld"><label>Time</label><div class="opts">
          ${opt("time", "null", "Any time", !t.time)}
          <input type="time" data-in="time" step="900" value="${t.time || ""}" aria-label="Start time"></div></div>
        <div class="fld"><label>Length</label><div class="opts">
          ${opt("dur", "null", "None", !t.dur)}${[15, 30, 45, 60, 90, 120].map((m) => opt("dur", m, fd(m), t.dur === m)).join("")}
          ${t.dur && ![15, 30, 45, 60, 90, 120].includes(t.dur) ? opt("dur", t.dur, fd(t.dur), true) : ""}</div>
          <p>${t.dur ? (t.time ? `Runs from ${t.time} to ${hm(toMin(t.time) + t.dur)}.` : "Counts toward the day's planned hours.") : "Optional. Without a length this shows as a marker at its start time."}</p></div>
        ${t.due ? `<div class="fld"><label>Deadline</label><p style="margin: 0; color: var(--hot); font-weight: 600">Due ${rel(t.due)}</p></div>` : ""}
        ${t.goal ? `<div class="fld"><label>Goal</label><p style="margin: 0; color: var(--ink)">${esc(GOALS.find((g) => g.id === t.goal).title)}</p></div>` : ""}
        <div class="pf"><button class="btn danger" data-act="del" data-id="${t.id}">Delete task</button><button class="btn ghosty" data-act="close">Done</button></div>
      </aside>`;
  }
  function helpHtml() {
    const k = (...a) => a.map((x) => `<span class="kbd">${x}</span>`).join("");
    return `<div class="scrim" data-act="close"></div><div class="help" role="dialog" aria-label="Keyboard shortcuts"><h3>Keyboard shortcuts</h3><dl>
      <dt>${k("N")}</dt><dd>Add a task</dd>
      <dt>${k("Ctrl", "K")}</dt><dd>Search and commands</dd>
      <dt>${k("1", "2", "3", "4")}</dt><dd>Day, List, Week, Goals</dd>
      <dt>${k("T")}</dt><dd>Jump to today</dd>
      <dt>${k("←", "→")}</dt><dd>Previous or next day</dd>
      <dt>${k("Esc")}</dt><dd>Close what is open</dd>
    </dl></div>`;
  }

  function openQA(prefill = "") {
    U.over = "qa"; U.sel = null; U.panelFor = null;
    over.innerHTML = `<div class="scrim" data-act="close"></div><div class="qa" role="dialog" aria-label="Add a task">
      <input id="qa-in" autocomplete="off" spellcheck="false" placeholder="econ outline fri 5pm #econ 45m" aria-label="Task" value="${esc(prefill)}">
      <div class="chips" id="qa-chips"></div>
      <div class="qa-foot"><span>Type a day, a time, a length or a #tag. All optional.</span><button class="btn" data-act="qa-add">Add task</button></div></div>`;
    const inp = $("#qa-in");
    inp.focus();
    inp.addEventListener("input", qaChips);
    qaChips();
  }
  function qaChips() {
    const v = $("#qa-in").value, el = $("#qa-chips");
    if (!v.trim()) { el.innerHTML = `<span class="chip off">Try: gym tomorrow 7am</span><span class="chip off">call amma</span><span class="chip off">essay fri #econ 2h</span>`; return; }
    const p = parse(v), a = AREAS[p.area];
    el.innerHTML = `<span class="chip" style="--c: ${a.c}"><i class="dot"></i>${a.name}${p.project ? `<small>${esc(PROJECTS[p.project].name)}</small>` : ""}</span>
      <span class="chip">${p.date ? rel(p.date) : "No date yet"}</span>
      <span class="chip ${p.time ? "" : "off"}">${p.time || "Any time"}</span>
      <span class="chip ${p.dur ? "" : "off"}">${p.dur ? fd(p.dur) : "No length"}</span>`;
  }

  function palItems(q) {
    q = q.trim().toLowerCase();
    const go = (v) => () => { U.view = v; };
    const cmds = [
      { l: "Add a task", k: "N", run: () => setTimeout(openQA) },
      { l: "Go to Day", k: "1", run: go("day") }, { l: "Go to List", k: "2", run: go("list") },
      { l: "Go to Week", k: "3", run: go("week") }, { l: "Go to Goals", k: "4", run: go("goals") },
      { l: "Jump to today", k: "T", run: () => { U.date = TODAY; } },
      { l: "Show all areas", run: () => { U.filter = "all"; } },
      ...Object.entries(AREAS).map(([k, a]) => ({ l: `Show only ${a.name}`, c: a.c, run: () => { U.filter = k; } })),
      { l: "Keyboard shortcuts", k: "?", run: () => setTimeout(() => { U.over = "help"; renderOver(); }) },
      { l: "Reset the demo data", run: () => { S = seed(); save(); toast("Demo data reset"); } },
    ].filter((c) => !q || c.l.toLowerCase().includes(q));
    const ts = q ? S.tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8).map((t) => ({
      l: t.title, c: AREAS[t.area].c, k: t.date ? rel(t.date) : "No date", run: () => { U.sel = t.id; if (t.date) U.date = t.date; },
    })) : [];
    const out = [...ts, ...cmds];
    if (q && !out.length) out.push({ l: `Add "${q}" as a task`, run: () => createFrom(q) });
    return out;
  }
  let palList = [];
  function openPal() {
    U.over = "pal"; U.palI = 0; U.sel = null; U.panelFor = null;
    over.innerHTML = `<div class="scrim" style="animation: none" data-act="close"></div><div class="pal" role="dialog" aria-label="Search and commands">
      <input id="pal-in" autocomplete="off" spellcheck="false" placeholder="Search tasks or run a command" aria-label="Search"><ul id="pal-ul"></ul></div>`;
    const inp = $("#pal-in");
    inp.focus();
    inp.addEventListener("input", () => { U.palI = 0; palDraw(); });
    palDraw();
  }
  function palDraw() {
    palList = palItems($("#pal-in").value);
    $("#pal-ul").innerHTML = palList.map((c, i) => `<li class="${i === U.palI ? "on" : ""}" data-act="pal-run" data-i="${i}">${c.c ? `<i class="dot" style="--c: ${c.c}"></i>` : ""}${esc(c.l)}${c.k ? `<small>${esc(c.k)}</small>` : ""}</li>`).join("");
    const on = $("#pal-ul .on"); if (on) on.scrollIntoView({ block: "nearest" });
  }
  function palRun(i) {
    const c = palList[i]; if (!c) return;
    U.over = null; over.innerHTML = "";
    c.run();
    render();
  }
  function closeAll() {
    U.over = null; U.sel = null; U.panelFor = null;
    over.innerHTML = "";
  }

  /* ---------- actions ---------- */
  function toggle(id) {
    const t = task(id); if (!t) return;
    mutate(() => { t.done = !t.done; }, t.done ? null : `Done: ${t.title}`);
  }
  function setField(t, k, v) {
    if (k === "area") { t.area = v; if (t.project && PROJECTS[t.project].area !== v) t.project = null; }
    else if (k === "project") { t.project = v || null; if (v) t.area = PROJECTS[v].area; }
    else if (k === "date") { t.date = v || null; if (!t.date) t.time = null; }
    else if (k === "time") { t.time = v || null; if (t.time && !t.date) t.date = U.date; }
    else if (k === "dur") { t.dur = v ? Number(v) : null; }
    else if (k === "title") { if (String(v).trim()) t.title = String(v).trim(); }
  }

  document.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    const a = e.target.closest("[data-act]");
    if (a) {
      const act = a.dataset.act;
      if (act === "toggle") { e.stopPropagation(); toggle(a.dataset.id); }
      else if (act === "view") { U.view = a.dataset.view; closeAll(); render(); }
      else if (act === "filter") { U.filter = a.dataset.k; render(); }
      else if (act === "nav") { const d = Number(a.dataset.d); U.date = d ? add(U.date, d) : TODAY; if (!d) U.scrolled = false; render(); }
      else if (act === "goday") { U.date = a.dataset.date; U.view = "day"; render(); }
      else if (act === "add") openQA();
      else if (act === "pal") openPal();
      else if (act === "help") { closeAll(); U.over = "help"; renderOver(); }
      else if (act === "close") { closeAll(); }
      else if (act === "qa-add") { const v = $("#qa-in").value; if (v.trim()) { closeAll(); createFrom(v); } else $("#qa-in").focus(); }
      else if (act === "pal-run") palRun(Number(a.dataset.i));
      else if (act === "undo") { if (undoSnap) { S.tasks = JSON.parse(undoSnap); save(); undoSnap = null; toastEl.innerHTML = ""; render(); } }
      else if (act === "set") { const t = task(U.sel); if (t) mutate(() => setField(t, a.dataset.k, a.dataset.v === "null" ? null : a.dataset.v)); }
      else if (act === "del") { const t = task(a.dataset.id); if (t) { closeAll(); mutate(() => { S.tasks = S.tasks.filter((x) => x.id !== t.id); }, `Deleted: ${t.title}`); } }
      return;
    }
    const o = e.target.closest("[data-open]");
    if (o) { U.over = null; U.sel = o.dataset.open; renderOver(); }
  });
  document.addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.in;
    const t = task(U.sel);
    if (k && t) mutate(() => setField(t, k, e.target.value));
  });

  /* ---------- drag (mouse only; touch uses the details sheet) ---------- */
  let drag = null, suppressClick = false;
  const yToMin = (y, grid, snap = 15) => {
    const m = H0 * 60 + ((y - grid.getBoundingClientRect().top) / HH) * 60;
    return clamp(Math.round(m / snap) * snap, H0 * 60, H1 * 60);
  };
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest("[data-act]")) return;
    const el = e.target.closest("[data-drag]"), grid = $(".grid");
    if (!el || !grid) return;
    const t = task(el.dataset.drag); if (!t) return;
    drag = { t, el, grid, x: e.clientX, y: e.clientY, on: false, min: null, dur: null,
      mode: e.target.closest(".rz") ? "size" : el.classList.contains("blk") ? "move" : "place",
      off: e.clientY - el.getBoundingClientRect().top };
    e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      drag.on = true;
      if (drag.mode === "place") {
        drag.ghost = document.createElement("div"); drag.ghost.className = "ghost"; drag.ghost.textContent = drag.t.title; document.body.appendChild(drag.ghost);
        drag.mark = document.createElement("div"); drag.mark.className = "drop"; drag.mark.hidden = true; drag.grid.appendChild(drag.mark);
        drag.el.style.opacity = "0.4";
      } else drag.el.classList.add("drag");
    }
    const tm = $("time", drag.el);
    if (drag.mode === "move") {
      const len = drag.t.dur || 30;
      drag.min = clamp(yToMin(e.clientY - drag.off, drag.grid), H0 * 60, H1 * 60 - Math.min(len, 60));
      drag.el.style.top = `${((drag.min - H0 * 60) / 60) * HH + 1}px`;
      if (tm) tm.textContent = hm(drag.min) + (drag.t.dur ? ` to ${hm(drag.min + drag.t.dur)}` : "");
    } else if (drag.mode === "size") {
      const s = toMin(drag.t.time);
      drag.dur = Math.max(15, yToMin(e.clientY, drag.grid) - s);
      drag.el.style.height = `${Math.max((drag.dur / 60) * HH - 3, 30)}px`;
      drag.el.classList.remove("pt");
      if (tm) tm.textContent = `${drag.t.time} to ${hm(s + drag.dur)}`;
    } else {
      drag.ghost.style.left = `${e.clientX + 12}px`; drag.ghost.style.top = `${e.clientY + 8}px`;
      const r = drag.grid.getBoundingClientRect(), box = $(".day").getBoundingClientRect();
      const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > Math.max(r.top, box.top) && e.clientY < Math.min(r.bottom, box.bottom);
      drag.min = inside ? clamp(yToMin(e.clientY, drag.grid), H0 * 60, H1 * 60 - 15) : null;
      drag.mark.hidden = !inside;
      if (inside) {
        drag.mark.style.top = `${((drag.min - H0 * 60) / 60) * HH + 1}px`;
        drag.mark.style.height = `${drag.t.dur ? Math.max((drag.t.dur / 60) * HH - 3, 30) : 30}px`;
        drag.mark.textContent = hm(drag.min) + (drag.t.dur ? ` to ${hm(drag.min + drag.t.dur)}` : "");
      }
    }
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    if (!d.on) return;
    suppressClick = true; setTimeout(() => (suppressClick = false), 0);
    if (d.mode === "size" && d.dur) mutate(() => { d.t.dur = d.dur; }, `Length set to ${fd(d.dur)}`);
    else if (d.min != null) mutate(() => { d.t.time = hm(d.min); d.t.date = U.date; }, d.mode === "place" ? `Scheduled for ${hm(d.min)}` : null);
    else render();
  });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); U.over === "pal" ? closeAll() : openPal(); return; }
    if (e.key === "Escape") { if (U.over || U.sel) { closeAll(); } return; }
    if (U.over === "qa") { if (e.key === "Enter") { e.preventDefault(); $('[data-act="qa-add"]').click(); } return; }
    if (U.over === "pal") {
      if (e.key === "ArrowDown") { e.preventDefault(); U.palI = Math.min(U.palI + 1, palList.length - 1); palDraw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); U.palI = Math.max(U.palI - 1, 0); palDraw(); }
      else if (e.key === "Enter") { e.preventDefault(); palRun(U.palI); }
      return;
    }
    if (typing) { if (e.key === "Enter" && e.target.dataset.in === "title") e.target.blur(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.open) { e.preventDefault(); U.sel = e.target.dataset.open; renderOver(); return; }
    const k = e.key.toLowerCase();
    if (k === "n") { e.preventDefault(); openQA(); }
    else if (k === "?") { U.over = "help"; U.sel = null; renderOver(); }
    else if (k === "t") { U.date = TODAY; U.scrolled = false; render(); }
    else if ("1234".includes(k) && k) { U.view = ["day", "list", "week", "goals"][Number(k) - 1]; closeAll(); render(); }
    else if (e.key === "ArrowLeft") { U.date = add(U.date, U.view === "week" ? -7 : -1); render(); }
    else if (e.key === "ArrowRight") { U.date = add(U.date, U.view === "week" ? 7 : 1); render(); }
  });

  setInterval(() => {
    const el = $(".now"); if (!el || drag) return;
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
    el.style.top = `${((m - H0 * 60) / 60) * HH}px`; $("span", el).textContent = hm(m);
  }, 30000);

  window.kriyan = { parse, state: () => S, ui: U };
  render();
})();
