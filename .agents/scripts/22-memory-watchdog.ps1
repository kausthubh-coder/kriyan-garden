param([Parameter(Mandatory=$true)][int]$OwnedPid, [Parameter(Mandatory=$true)][string]$Receipt, [switch]$Build)
$ErrorActionPreference = 'Stop'
$tracked = @{}
$started = Get-Date
while ($true) {
  $cycle = [System.Diagnostics.Stopwatch]::StartNew()
  $processes = @(Get-CimInstance Win32_Process | Where-Object ProcessId -ne $PID)
  $root = $processes | Where-Object ProcessId -eq $OwnedPid
  if ($root -and -not $tracked.ContainsKey($OwnedPid)) { $tracked[$OwnedPid] = $root.CreationDate }
  # Keep descendants after an emulator launcher exits. Creation times prevent
  # PID reuse from turning a former child into an unrelated process target.
  $live = @($processes | Where-Object { $tracked.ContainsKey([int]$_.ProcessId) -and $tracked[[int]$_.ProcessId] -eq $_.CreationDate })
  $ids = @($live.ProcessId)
  # A former root PID may be reused by an owner application. Only follow
  # its orphaned children while that PID is absent, never after PID reuse.
  if (-not $root -and $tracked.ContainsKey($OwnedPid)) { $ids += @($OwnedPid) }
  do {
    $children = @($processes | Where-Object { $ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId -and $_.CreationDate -ge $started.AddSeconds(-15) })
    foreach ($child in $children) { $tracked[[int]$child.ProcessId] = $child.CreationDate }
    $ids += @($children.ProcessId)
  } while ($children.Count)
  $live = @($processes | Where-Object { $tracked.ContainsKey([int]$_.ProcessId) -and $tracked[[int]$_.ProcessId] -eq $_.CreationDate })
  if (-not $live.Count) { break }
  $freeKB = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory
  @{ time = (Get-Date).ToString('o'); freeCommitKB = $freeKB; ownedPids = @($live.ProcessId); owners = @($live | ForEach-Object { @{ pid = $_.ProcessId; name = $_.Name; created = $_.CreationDate.ToString('o') } }); action = $(if ($freeKB -lt 1MB) { 'stop' } else { 'monitor' }) } | ConvertTo-Json -Depth 4 -Compress | Add-Content -LiteralPath $Receipt
  if ($freeKB -lt 1MB) {
    # Let the build's PowerShell finally block restore its drive/environment.
    $targets = @($live | Where-Object { -not $Build -or $_.Name -notmatch '^(powershell|cmd)\.exe$' } | Sort-Object CreationDate -Descending)
    foreach ($target in $targets) {
      $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($target.ProcessId)"
      if ($current -and $current.CreationDate -eq $target.CreationDate) { Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue }
    }
    break
  }
  Start-Sleep -Milliseconds ([math]::Max(1, 10000 - $cycle.ElapsedMilliseconds))
}
