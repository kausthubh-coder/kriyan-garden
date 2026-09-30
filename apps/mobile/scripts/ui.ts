import { mkdir } from "node:fs/promises";
const serial = "emulator-5554";
const adb = `${process.cwd()}/.agents/android-sdk/platform-tools/adb.exe`;
const directory = ".agents/screenshots/11";
async function run(args: string[]) {
  const command = Bun.spawn([adb, "-s", serial, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(command.stdout).arrayBuffer();
  if ((await command.exited) !== 0) throw new Error("ADB operation failed.");
  return output;
}
async function nodes() {
  await run(["shell", "uiautomator", "dump", "/sdcard/kriyan11.xml"]);
  return new TextDecoder().decode(
    await run(["exec-out", "cat", "/sdcard/kriyan11.xml"]),
  );
}
function bounds(node: string) {
  const match = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
  if (!match) throw new Error("UI bounds missing.");
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}
const [operation, value] = process.argv.slice(2);
await mkdir(directory, { recursive: true });
if (operation === "capture") {
  if (!value || !/^[a-z0-9-]+$/.test(value))
    throw new Error("Invalid capture name.");
  await Bun.write(
    `${directory}/${value}.png`,
    await run(["exec-out", "screencap", "-p"]),
  );
  await Bun.write(`${directory}/${value}.xml`, await nodes());
  console.log(`Saved ${directory}/${value}.png`);
} else if (operation === "dump" || operation === "targets") {
  const xml = await nodes(),
    rows = xml.match(/<node\b[^>]*>/g) ?? [];
  if (operation === "dump")
    for (const node of rows) {
      const label = /content-desc="([^"]*)"/.exec(node)?.[1],
        text = node.includes('class="android.widget.EditText"')
          ? "[input]"
          : /text="([^"]*)"/.exec(node)?.[1];
      if (label || text)
        console.log(JSON.stringify({ label, text, bounds: bounds(node) }));
    }
  else {
    const densityText = new TextDecoder().decode(
      await run(["shell", "wm", "density"]),
    );
    const density =
      Number([...densityText.matchAll(/density: (\d+)/g)].at(-1)?.[1]) / 160;
    const allControls = rows.filter(
      (node) =>
        node.includes('clickable="true"') &&
        node.includes('package="app.kriyan.android"') &&
        /content-desc="[^"]+"/.test(node),
    );
    const scrollBounds = rows
      .filter((node) => node.includes('scrollable="true"'))
      .map(bounds);
    const controls = allControls.filter((node) => {
      const [left, top, right, bottom] = bounds(node);
      if (right <= left || bottom <= top) return false;
      return !scrollBounds.some(
        ([sLeft, sTop, sRight, sBottom]) =>
          left >= sLeft &&
          right <= sRight &&
          ((top <= sTop && bottom >= sTop) ||
            (top <= sBottom && bottom >= sBottom)) &&
          ((right - left) / density < 43.5 || (bottom - top) / density < 43.5),
      );
    });
    const small = controls.filter((node) => {
      const [left, top, right, bottom] = bounds(node);
      return (right - left) / density < 43.5 || (bottom - top) / density < 43.5;
    });
    console.log(
      JSON.stringify({
        controls: controls.length,
        clippedOrOffscreen: allControls.length - controls.length,
        undersized: small.map(
          (node) => /content-desc="([^"]*)"/.exec(node)?.[1],
        ),
      }),
    );
    if (!density || !controls.length || small.length)
      throw new Error("Touch target check failed.");
  }
} else if (
  operation === "tap" ||
  operation === "hold" ||
  operation === "right" ||
  operation === "left"
) {
  const rows = (await nodes()).match(/<node\b[^>]*>/g) ?? [];
  const node =
    rows.find((node) => node.includes(`content-desc="${value}"`)) ??
    rows.find((node) => node.includes(`text="${value}"`));
  if (!node) throw new Error(`UI control missing: ${value}`);
  const [left, top, right, bottom] = bounds(node),
    x = Math.round((left + right) / 2),
    y = Math.round((top + bottom) / 2);
  if (right <= left || bottom <= top)
    throw new Error("Scroll this UI control into view first.");
  if (operation === "tap")
    await run(["shell", "input", "tap", String(x), String(y)]);
  else if (operation === "hold")
    await run([
      "shell",
      "input",
      "swipe",
      String(x),
      String(y),
      String(x),
      String(y),
      "800",
    ]);
  else
    await run([
      "shell",
      "input",
      "swipe",
      String(x),
      String(y),
      String(operation === "right" ? right - 10 : left + 10),
      String(y),
      "350",
    ]);
} else if (operation === "back") await run(["shell", "input", "keyevent", "4"]);
else if (operation === "home") await run(["shell", "input", "keyevent", "3"]);
else if (operation === "input") {
  await run(["shell", "input", "keycombination", "113", "29"]);
  await run(["shell", "input", "keyevent", "67"]);
  for (const character of process.argv.slice(3).join(" ")) {
    await run([
      "shell",
      "input",
      "text",
      character === " " ? "%s" : `'${character.replaceAll("'", "'\\''")}'`,
    ]);
    await Bun.sleep(100);
  }
} else if (operation === "scroll") {
  const rows = (await nodes()).match(/<node\b[^>]*>/g) ?? [],
    node = rows.find((node) => node.includes('scrollable="true"'));
  if (!node) throw new Error("No scrollable UI target.");
  const [left, top, right, bottom] = bounds(node),
    x = Math.round((left + right) / 2);
  await run([
    "shell",
    "input",
    "swipe",
    String(x),
    String(Math.round(top + (bottom - top) * 0.8)),
    String(x),
    String(Math.round(top + (bottom - top) * 0.2)),
    "450",
  ]);
} else
  throw new Error(
    "Use dump, capture, targets, tap, hold, home, left, right, back, input or scroll.",
  );
