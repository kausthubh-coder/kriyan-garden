param(
  [Parameter(Mandatory=$true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version,
  [string]$Apk,
  [ValidatePattern('^[a-f0-9]{40}$')][string]$TargetCommit
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$previousLocation = Get-Location
try {
  Set-Location $taskRoot
  $repository = (& gh repo view --json nameWithOwner --jq .nameWithOwner).Trim()
  if ($LASTEXITCODE -ne 0 -or $repository -ne 'kausthubh-coder/kriyan-garden') { throw 'Android releases are permitted only on kausthubh-coder/kriyan-garden.' }
  $sourceCommit = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Could not resolve the release commit.' }
  if (-not $TargetCommit) { $TargetCommit = $sourceCommit }
  # A no-push release may point to a published baseline while EAS builds the
  # local source. Never create an unrelated commit or push to make a tag work.
  $publishedCommit = (& gh api "repos/$repository/commits/$TargetCommit" --jq .sha 2>$null)
  if ($LASTEXITCODE -ne 0 -or $publishedCommit.Trim() -ne $TargetCommit) { throw 'The release target is not published. Pass an existing published commit with -TargetCommit when pushing is not authorized.' }
  $artifactDirectory = Join-Path $taskRoot '.agents/builds'
  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  $config = Get-Content apps/mobile/app.json -Raw | ConvertFrom-Json
  if ($config.expo.version -ne $Version) {
    if ($Apk) { throw 'APK version must match apps/mobile/app.json.' }
    & bun run scripts/bump-android.ts $Version
    if ($LASTEXITCODE -ne 0) { throw 'Version bump failed.' }
  }
  if (-not $Apk) {
    Set-Location (Join-Path $taskRoot 'apps/mobile')
    $buildJson = Join-Path $artifactDirectory "android-$Version-build.json"
    & bunx eas-cli@24.8.0 build --platform android --profile production --non-interactive --wait --json | Set-Content -LiteralPath $buildJson
    if ($LASTEXITCODE -ne 0) { throw 'EAS build failed. Inspect the build before retrying.' }
    $build = @(Get-Content -LiteralPath $buildJson -Raw | ConvertFrom-Json)[0]
    if ($build.status -ne 'FINISHED') { throw 'EAS did not return a finished build.' }
    $downloadUri = [Uri]$build.artifacts.buildUrl
    if ($downloadUri.Scheme -ne 'https') { throw 'EAS artifact URL must use HTTPS.' }
    $Apk = Join-Path $artifactDirectory "kriyan-$Version.apk"
    Invoke-WebRequest -Uri $downloadUri -OutFile $Apk
  }
  $sourceApk = (Resolve-Path -LiteralPath $Apk).Path
  Set-Location $taskRoot
  $versioned = Join-Path $artifactDirectory "kriyan-$Version.apk"
  $stable = Join-Path $artifactDirectory 'kriyan.apk'
  if ($sourceApk -ne $versioned) { Copy-Item -LiteralPath $sourceApk -Destination $versioned }
  Copy-Item -LiteralPath $versioned -Destination $stable
  $sha256 = (Get-FileHash -LiteralPath $stable -Algorithm SHA256).Hash.ToLowerInvariant()
  $notes = Join-Path $artifactDirectory "android-$Version-notes.md"
  @"
Kriyan Android $Version

Requires Android 7.0 (API 24) or newer.

1. Download kriyan.apk below.
2. When Android asks, allow installs from your browser in Settings.
3. Open the APK and tap Install.

Android will warn about installing outside the Play Store; tap Settings and allow installs from your browser.

SHA-256: $sha256
Size: $((Get-Item -LiteralPath $stable).Length) bytes.

Source checkpoint: $sourceCommit. Android version code: $($config.expo.android.versionCode).
Release tag target: $TargetCommit.
"@ | Set-Content -LiteralPath $notes
  & gh release create "android-v$Version" $stable $versioned --repo $repository --target $TargetCommit --title "Kriyan Android $Version" --notes-file $notes
  if ($LASTEXITCODE -ne 0) { throw 'GitHub release failed. The APK remains in .agents/builds.' }
} finally { Set-Location $previousLocation }
