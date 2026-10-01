$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(emulator|qemu-system|java)' }) { throw 'Stop our heavy process before installing an emulator image.' }
$freeKB = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory
if ($freeKB -lt 3MB) { throw 'Image setup needs 3 GB free commit.' }
$log = Join-Path $taskRoot '.agents/logs/22/image-memory.jsonl'
$watchdog = Start-Process powershell.exe -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-File', ('"' + (Join-Path $PSScriptRoot '22-memory-watchdog.ps1') + '"'), '-OwnedPid', $PID, '-Receipt', ('"' + $log + '"'), '-Build')
try {
  $sdk = Join-Path $taskRoot '.agents/android-sdk'
  & (Join-Path $sdk 'cmdline-tools/latest/bin/sdkmanager.bat') "--sdk_root=$sdk" 'system-images;android-30;google_apis;x86_64'
  if ($LASTEXITCODE -ne 0) { throw 'Android API 30 image setup failed.' }
} finally { if (-not $watchdog.HasExited) { Stop-Process -Id $watchdog.Id -ErrorAction SilentlyContinue } }
