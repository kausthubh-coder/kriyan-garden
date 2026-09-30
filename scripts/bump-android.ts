const version = Bun.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Supply a version such as 0.2.0.");
const path = new URL("../apps/mobile/app.json", import.meta.url);
const config: { expo: { version: string; android: { versionCode: number } } } = await Bun.file(path).json();
if (config.expo.version === version) throw new Error("Choose a new Android version.");
config.expo.version = version;
config.expo.android.versionCode += 1;
await Bun.write(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared Android version ${version}, code ${config.expo.android.versionCode}.`);
