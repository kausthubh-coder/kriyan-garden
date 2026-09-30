#!/usr/bin/env bash
set -euo pipefail
version="${1:?Supply an Android version, for example 0.2.0}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Use a version such as 0.2.0.' >&2; exit 1; }
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$task_root"
export BUN_INSTALL_CACHE_DIR="$task_root/.agents/cache/bun"
mkdir -p -- .agents/builds
bun run scripts/bump-android.ts "$version"
cd -- apps/mobile
build_json="$task_root/.agents/builds/android-$version-build.json"
bunx eas-cli@24.8.0 build --platform android --profile production --non-interactive --wait --json > "$build_json"
artifact_url="$(bun -e 'const b=(await Bun.file(process.argv[1]).json())[0]; if(b.status!=="FINISHED" || new URL(b.artifacts.buildUrl).protocol!=="https:") throw new Error("No finished HTTPS APK artifact"); console.log(b.artifacts.buildUrl)' "$build_json")"
apk="$task_root/.agents/builds/kriyan-$version.apk"
curl --fail --location --proto '=https' --proto-redir '=https' --output "$apk" "$artifact_url"
gh release create "android-v$version" "$apk" --repo kausthubh-coder/kriyan-garden --title "Kriyan Android $version" --notes "Android APK. Download and install kriyan-$version.apk."
