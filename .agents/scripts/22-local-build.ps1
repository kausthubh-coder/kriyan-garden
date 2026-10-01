$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logDirectory = Join-Path $taskRoot '.agents/logs/22'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$memory = Get-CimInstance Win32_OperatingSystem
$freeCommitGB = [math]::Round($memory.FreeVirtualMemory / 1MB, 2)
while ($memory.FreeVirtualMemory -lt 3MB) {
  Write-Output "Waiting before local build: $freeCommitGB GB free commit; 3 GB required."
  Start-Sleep -Seconds 10
  $memory = Get-CimInstance Win32_OperatingSystem
  $freeCommitGB = [math]::Round($memory.FreeVirtualMemory / 1MB, 2)
}
$heavy = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(emulator|qemu-system|java)' }
if ($heavy) { throw 'An emulator or Java process is already running. Check ownership and stop our process first.' }
$profile = (Get-Content (Join-Path $taskRoot 'apps/mobile/eas.json') -Raw | ConvertFrom-Json).build.production.env
$saved = @{}
try {
  foreach ($property in $profile.PSObject.Properties) {
    $saved[$property.Name] = [Environment]::GetEnvironmentVariable($property.Name, 'Process')
    [Environment]::SetEnvironmentVariable($property.Name, $property.Value, 'Process')
  }
  Write-Output "Memory gate passed: $freeCommitGB GB free commit. Production public configuration selected."
  # OS-level redirection keeps Expo's informational stderr from becoming a
  # terminating NativeCommandError under Windows PowerShell 5.1.
  $build = Start-Process powershell.exe -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-NoProfile', '-File', ('"' + (Join-Path $taskRoot 'scripts/build-android-local.ps1') + '"')) -RedirectStandardOutput (Join-Path $logDirectory 'gradle.stdout.log') -RedirectStandardError (Join-Path $logDirectory 'gradle.stderr.log')
  if ($build.ExitCode -ne 0) { throw "Local build exited $($build.ExitCode). See gradle.stdout.log and gradle.stderr.log." }
} finally {
  foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
