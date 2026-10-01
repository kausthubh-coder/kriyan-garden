import { KRIYAN_REPOSITORY } from "./origins";
import fallback from "./android-release-info.json";

export const KRIYAN_APK = `${KRIYAN_REPOSITORY}/releases/latest/download/kriyan.apk`;
// The build script refreshes this snapshot. It is also the offline fallback.
export function androidRelease() { return fallback; }
export async function fetchAndroidRelease() {
  try {
    const repository = new URL(KRIYAN_REPOSITORY).pathname;
    const response = await fetch(`https://api.github.com/repos${repository}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fallback;
    const release: unknown = await response.json();
    if (!release || typeof release !== "object" || !("tag_name" in release) || !("assets" in release) || typeof release.tag_name !== "string" || !Array.isArray(release.assets)) return fallback;
    const assets: unknown[] = release.assets;
    const asset = assets.find((value) => value && typeof value === "object" && "name" in value && value.name === "kriyan.apk");
    if (!asset || typeof asset !== "object" || !("size" in asset) || typeof asset.size !== "number" || asset.size <= 0 || !/^android-v\d+\.\d+\.\d+$/.test(release.tag_name)) return fallback;
    return { version: release.tag_name.replace("android-v", ""), size: asset.size };
  } catch { return fallback; }
}
export function apkLabel(release: { version: string; size: number }) {
  return `Android ${release.version}${release.size ? `, ${(release.size / 1024 / 1024).toFixed(1)} MB` : ""}`;
}
