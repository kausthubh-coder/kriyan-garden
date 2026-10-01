param([ValidatePattern('^[D-Z]$')][string]$Drive = 'K')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$previousLocation = Get-Location
$mappedHere = $false
$savedEnvironment = @{}
$environmentNames = @('ANDROID_HOME', 'ANDROID_SDK_ROOT', 'GRADLE_USER_HOME', 'TEMP', 'TMP', 'CI', 'NODE_ENV')
foreach ($name in $environmentNames) { $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'An existing Java installation is required. Install a supported JDK before building.' }
  $sdk = Join-Path $taskRoot '.agents/android-sdk'
  if (-not (Test-Path -LiteralPath (Join-Path $sdk 'cmake/3.31.6/bin/cmake.exe'))) { throw 'Install the Android SDK and CMake 3.31.6 inside .agents/android-sdk before building.' }
  Set-Location $taskRoot
  if (Test-Path "$Drive`:/") {
    $mapping = & subst
    if (-not ($mapping | Where-Object { $_ -eq "$Drive`:\: => $taskRoot" })) { throw "Drive $Drive is already in use. Choose another unused drive with -Drive." }
  } else {
    & subst "$Drive`:" $taskRoot
    if ($LASTEXITCODE -ne 0) { throw 'The temporary short path could not be created.' }
    $mappedHere = $true
  }
  $env:CI = '1'
  $env:NODE_ENV = 'production'
  Set-Location (Join-Path $taskRoot 'apps/mobile')
  & bunx expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
  $nativeDirectory = Join-Path $taskRoot 'apps/mobile/android'
  $prefix = $taskRoot.Replace('\', '/')
  # Only generated, ignored native files are adjusted. Source and host settings are untouched.
  $settingsPath = Join-Path $nativeDirectory 'settings.gradle'
  $settings = Get-Content -LiteralPath $settingsPath -Raw
  $oldMapping = @'
(?ms)\r?\nrootProject\.children\.each \{ descriptor ->\r?\n  def original = descriptor\.projectDir\.absolutePath\.replace\([^\r\n]+\)\r?\n  def prefix = '[^\r\n]+'\r?\n  if \(original\.startsWith\(prefix\)\) descriptor\.projectDir = new File\([^\r\n]+\)\r?\n\}\r?\n?
'@
  Set-Content -LiteralPath $settingsPath -Value ([regex]::Replace($settings, $oldMapping.Trim(), ''))
  Add-Content -LiteralPath $settingsPath -Value @"

rootProject.children.each { descriptor ->
  def original = descriptor.projectDir.absolutePath.replace('\\', '/')
  def prefix = '$prefix'
  if (original.startsWith(prefix)) descriptor.projectDir = new File('$Drive`:' + original.substring(prefix.length()))
}
"@
  $appGradle = Join-Path $nativeDirectory 'app/build.gradle'
  $gradle = Get-Content -LiteralPath $appGradle -Raw
  $gradle = [regex]::Replace($gradle, '(?m)^    extraPackagerArgs = .*--max-workers.*\r?\n', '')
  $oldCli = @'
(?m)^    cliFile = file\('[D-Z]:/scripts/expo-cli-local\.cjs'\)\r?\n
'@
  $gradle = [regex]::Replace($gradle, $oldCli.Trim(), '')
  $gradle = $gradle.Replace('react {', "react {`n    extraPackagerArgs = ['--max-workers', '1']")
  $gradle = [regex]::Replace($gradle, '(?m)^    bundleCommand = .*export:embed.*$', "    bundleCommand = 'export:embed'`n    cliFile = file('$Drive`:/scripts/expo-cli-local.cjs')")
  Set-Content -LiteralPath $appGradle -Value $gradle
  $initFile = Join-Path $taskRoot '.agents/android-cmake.init.gradle'
  @'
allprojects {
  afterEvaluate { project ->
    if (project.hasProperty('android')) project.android.externalNativeBuild.cmake.version = '3.31.6'
  }
}
'@ | Set-Content -LiteralPath $initFile
  $env:ANDROID_HOME = "$Drive`:/.agents/android-sdk"
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:GRADLE_USER_HOME = "$Drive`:/.agents/gradle"
  New-Item -ItemType Directory -Force -Path (Join-Path $taskRoot '.agents/cache') | Out-Null
  $env:TEMP = "$Drive`:/.agents/cache"
  $env:TMP = $env:TEMP
  $env:CI = '1'
  $env:NODE_ENV = 'production'
  Set-Location "$Drive`:/apps/mobile/android"
  $freeCommitKB = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory
  while ($freeCommitKB -lt 5MB) {
    Write-Output "Waiting before Gradle: $([math]::Round($freeCommitKB / 1MB, 2)) GB free commit; 5 GB required."
    Start-Sleep -Seconds 10
    $freeCommitKB = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory
  }
  Write-Output "Gradle memory gate passed: $([math]::Round($freeCommitKB / 1MB, 2)) GB free commit."
  if (Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(emulator|qemu-system)' }) { throw 'Stop our emulator before starting Gradle.' }
  & ./gradlew.bat :app:assembleRelease --console=plain --no-daemon -PreactNativeArchitectures=x86_64 --max-workers=1 -Pkotlin.compiler.execution.strategy=in-process '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m' -I "$Drive`:/.agents/android-cmake.init.gradle"
  if ($LASTEXITCODE -ne 0) { throw 'Local APK build failed. Inspect the Gradle output.' }
  $artifactDirectory = Join-Path $taskRoot '.agents/builds'
  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  $apk = Join-Path $artifactDirectory 'kriyan-local-x86_64.apk'
  Copy-Item -LiteralPath (Join-Path $nativeDirectory 'app/build/outputs/apk/release/app-release.apk') -Destination $apk
  Write-Output "Development-signed emulator APK: $apk"
} finally {
  Set-Location $previousLocation
  foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process') }
  if ($mappedHere) { & subst "$Drive`:" /D }
}
