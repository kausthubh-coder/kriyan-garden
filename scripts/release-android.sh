#!/usr/bin/env bash
set -euo pipefail
version="${1:?Supply an Android version, for example 1.0.0}"
source_apk="${2:-}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Use a version such as 1.0.0.' >&2; exit 1; }
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$task_root"
repository="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
[[ "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo 'Could not resolve the current GitHub repository.' >&2; exit 1; }
target_commit="$(git rev-parse HEAD)"
mkdir -p -- .agents/builds
configured_version="$(bun -e 'console.log((await Bun.file("apps/mobile/app.json").json()).expo.version)')"
if [[ "$configured_version" != "$version" ]]; then
  [[ -z "$source_apk" ]] || { echo 'APK version must match apps/mobile/app.json.' >&2; exit 1; }
  bun run scripts/bump-android.ts "$version"
fi
if [[ -z "$source_apk" ]]; then
  cd -- apps/mobile
  build_json="$task_root/.agents/builds/android-$version-build.json"
  bunx eas-cli@24.8.0 build --platform android --profile production --non-interactive --wait --json > "$build_json"
  artifact_url="$(bun -e 'const b=(await Bun.file(process.argv[1]).json())[0]; if(b.status!=="FINISHED" || new URL(b.artifacts.buildUrl).protocol!=="https:") throw new Error("No finished HTTPS APK artifact"); console.log(b.artifacts.buildUrl)' "$build_json")"
  source_apk="$task_root/.agents/builds/kriyan-$version.apk"
  curl --fail --location --proto '=https' --proto-redir '=https' --output "$source_apk" "$artifact_url"
  cd -- "$task_root"
fi
source_apk="$(cd -- "$(dirname -- "$source_apk")" && pwd)/$(basename -- "$source_apk")"
versioned="$task_root/.agents/builds/kriyan-$version.apk"
stable="$task_root/.agents/builds/kriyan.apk"
[[ "$source_apk" == "$versioned" ]] || cp -- "$source_apk" "$versioned"
cp -- "$versioned" "$stable"
sha256="$(sha256sum -- "$stable" | cut -d ' ' -f 1)"
size="$(wc -c < "$stable" | tr -d '[:space:]')"
notes="$task_root/.agents/builds/android-$version-notes.md"
cat > "$notes" <<EOF
Kriyan Android $version

Requires Android 7.0 (API 24) or newer.

1. Download kriyan.apk below.
2. When Android asks, allow installs from your browser in Settings.
3. Open the APK and tap Install.

Android will warn about installing outside the Play Store; tap Settings and allow installs from your browser.

SHA-256: $sha256
Size: $size bytes.
EOF
gh release create "android-v$version" "$stable" "$versioned" --repo "$repository" --target "$target_commit" --title "Kriyan Android $version" --notes-file "$notes"
