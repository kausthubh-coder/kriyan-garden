import { mkdir } from "node:fs/promises";
const adb = `${process.cwd()}/.agents/android-sdk/platform-tools/adb.exe`;
const args = process.argv.slice(2);
async function run(arguments_: string[]) {
  const p = Bun.spawn([adb, "-s", "emulator-5554", ...arguments_], { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(p.stdout).arrayBuffer();
  if (await p.exited !== 0) throw new Error("ADB command failed.");
  return output;
}
async function nodes() {
  await run(["shell", "uiautomator", "dump", "/sdcard/kriyan-qa-ui.xml"]);
  const xml = new TextDecoder().decode(await run(["exec-out", "cat", "/sdcard/kriyan-qa-ui.xml"]));
  return { xml, rows: xml.match(/<node\b[^>]*>/g) ?? [] };
}
function bounds(row: string) {
  const match = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(row);
  if (!match) throw new Error("Control bounds missing.");
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}
await mkdir(".agents/screenshots/06", { recursive: true });
if (args[0] === "dump") {
  const { rows } = await nodes();
  for (const row of rows) {
    const desc = /content-desc="([^"]*)"/.exec(row)?.[1];
    const text = row.includes('class="android.widget.EditText"') ? "[input]" : /text="([^"]*)"/.exec(row)?.[1];
    if (desc || text) console.log(JSON.stringify({ desc, text, bounds: bounds(row) }));
  }
} else if (args[0] === "tap") {
  const { rows } = await nodes();
  const row = rows.find(row => row.includes(`content-desc="${args[1]}"`)) ?? rows.find(row => row.includes(`text="${args[1]}"`));
  if (!row) throw new Error("Control not found.");
  const [x1, y1, x2, y2] = bounds(row);
  await run(["shell", "input", "tap", String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2))]);
  console.log("Tapped control.");
} else if (args[0] === "capture") {
  if (!args[1] || !/^[a-z0-9-]+$/.test(args[1])) throw new Error("Screenshot name required.");
  const path = `.agents/screenshots/06/${args[1]}`;
  await Bun.write(`${path}.png`, await run(["exec-out", "screencap", "-p"]));
  await Bun.write(`${path}.xml`, (await nodes()).xml);
  console.log(`${path}.png`);
} else if (args[0] === "targets") {
  const { rows } = await nodes();
  const densityText = new TextDecoder().decode(await run(["shell", "wm", "density"]));
  const densityMatches = [...densityText.matchAll(/density: (\d+)/g)];
  const density = Number(densityMatches.at(-1)?.[1]) / 160;
  if (!density) throw new Error("Device density unavailable.");
  const controls = rows.filter(row => row.includes('clickable="true"') && row.includes('package="app.kriyan.android"') && /content-desc="[^"]+"/.test(row));
  const small = controls.filter(row => { const [x1, y1, x2, y2] = bounds(row); return (x2-x1)/density < 43.5 || (y2-y1)/density < 43.5; });
  console.log(JSON.stringify({ visibleControls: controls.length, minimumTargetDp: 44, undersizedControls: small.map(row => /content-desc="([^"]*)"/.exec(row)?.[1]) }));
  if (!controls.length || small.length) throw new Error("Visible target-size check did not pass.");
} else if (args[0] === "input") {
  await run(["shell", "input", "text", args.slice(1).join("%s")]);
} else if (args[0] === "swipe") {
  await run(["shell", "input", "swipe", ...args.slice(1)]);
} else if (args[0] === "back") {
  await run(["shell", "input", "keyevent", "4"]);
} else throw new Error("Use dump, tap, capture, targets, input, swipe or back.");
