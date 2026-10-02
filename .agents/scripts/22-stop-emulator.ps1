$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logDirectory = Join-Path $taskRoot '.agents/logs/22'
$owner = Get-Content -LiteralPath (Join-Path $logDirectory 'emulator-owner.json') -Raw | ConvertFrom-Json
$tracked = @{}
Get-Content -LiteralPath (Join-Path $logDirectory 'emulator-memory.jsonl') | ForEach-Object {
  $row = $_ | ConvertFrom-Json
  foreach ($process in $row.owners) {
    if ([DateTimeOffset]::Parse($process.created) -ge [DateTimeOffset]::Parse($owner.started).AddSeconds(-2)) {
      $tracked[[int]$process.pid] = $process.created
    }
  }
}
function Get-OwnedProcesses {
  @(Get-CimInstance Win32_Process | Where-Object {
    $tracked.ContainsKey([int]$_.ProcessId) -and $tracked[[int]$_.ProcessId] -eq $_.CreationDate.ToString('o')
  })
}
if (Get-OwnedProcesses | Where-Object Name -like 'qemu-system*') {
  & (Join-Path $taskRoot '.agents/android-sdk/platform-tools/adb.exe') -s emulator-5554 emu kill
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-OwnedProcesses | Where-Object Name -like 'qemu-system*') -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }
}
$stopped = @()
foreach ($process in (Get-OwnedProcesses | Sort-Object CreationDate -Descending)) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  $stopped += $process.ProcessId
}
$watchdog = Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.watchdogPid)"
if ($watchdog -and $watchdog.CommandLine -like '*22-memory-watchdog.ps1*' -and $watchdog.CommandLine -like "*$($owner.pid)*") {
  Stop-Process -Id $watchdog.ProcessId -Force -ErrorAction SilentlyContinue
  $stopped += $watchdog.ProcessId
}
$remaining = @(Get-OwnedProcesses)
@{ checkedAt = (Get-Date).ToString('o'); stoppedPids = $stopped; remainingOwnedPids = @($remaining | ForEach-Object { $_.ProcessId }) } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory 'emulator-stop.json')
if ($remaining.Count) { throw 'An owned emulator helper is still running.' }
Write-Output 'Owned emulator unit and watchdog stopped.'
