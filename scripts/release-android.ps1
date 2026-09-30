param([Parameter(Mandatory=$true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$previousLocation = Get-Location
try {
  Set-Location $taskRoot
  $env:BUN_INSTALL_CACHE_DIR = Join-Path $taskRoot '.agents/cache/bun'
  $artifactDirectory = Join-Path $taskRoot '.agents/builds'
  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  & bun run scripts/bump-android.ts $Version
  if ($LASTEXITCODE -ne 0) { throw 'Version bump failed.' }
  Set-Location (Join-Path $taskRoot 'apps/mobile')
  $buildJson = Join-Path $artifactDirectory "android-$Version-build.json"
  & bunx eas-cli@24.8.0 build --platform android --profile production --non-interactive --wait --json | Set-Content -LiteralPath $buildJson
  if ($LASTEXITCODE -ne 0) { throw 'EAS build failed. Inspect the build before retrying.' }
  $build = @(Get-Content -LiteralPath $buildJson -Raw | ConvertFrom-Json)[0]
  if ($build.status -ne 'FINISHED') { throw 'EAS did not return a finished build.' }
  $downloadUri = [Uri]$build.artifacts.buildUrl
  if ($downloadUri.Scheme -ne 'https') { throw 'EAS artifact URL must use HTTPS.' }
  $apk = Join-Path $artifactDirectory "kriyan-$Version.apk"
  Invoke-WebRequest -Uri $downloadUri -OutFile $apk
  & gh release create "android-v$Version" $apk --repo kausthubh-coder/kriyan-garden --title "Kriyan Android $Version" --notes "Android APK. Download and install kriyan-$Version.apk."
  if ($LASTEXITCODE -ne 0) { throw 'GitHub release failed. The APK remains in .agents/builds.' }
} finally { Set-Location $previousLocation }
