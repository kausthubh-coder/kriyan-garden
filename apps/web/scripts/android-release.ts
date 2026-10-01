import { fetchAndroidRelease, apkLabel } from "../src/lib/android-release";
const release = await fetchAndroidRelease();
await Bun.write(new URL("../src/lib/android-release-info.json", import.meta.url), `${JSON.stringify(release, null, 2)}\n`);
console.log(`Android release metadata: ${apkLabel(release)}.`);
