param([ValidateSet(30,36)][int]$ApiLevel = 36)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logDirectory = Join-Path $taskRoot '.agents/logs/22'
$memory = Get-CimInstance Win32_OperatingSystem
if ($memory.FreeVirtualMemory -lt 3MB) { throw "Emulator memory gate: $([math]::Round($memory.FreeVirtualMemory / 1MB, 2)) GB free commit; 3 GB required." }
$heavy = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(java|emulator|qemu-system)' })
if ($heavy.Count) { throw "Java or an emulator is running: $($heavy | ForEach-Object { $_.Name + ' PID ' + $_.ProcessId }). Stop our heavy process first." }
$avdRoot = Join-Path $taskRoot '.agents/android-avd'
$avdName = if ($ApiLevel -eq 36) { 'kriyan22' } else { "kriyan22-api$ApiLevel" }
$avd = Join-Path $avdRoot "$avdName.avd"
New-Item -ItemType Directory -Force -Path $avd, $logDirectory | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $avdRoot "$avdName.ini"))) {
  @"
avd.ini.encoding=UTF-8
path=$avd
target=android-$ApiLevel
"@ | Set-Content -LiteralPath (Join-Path $avdRoot "$avdName.ini") -Encoding ASCII
  @"
AvdId=$avdName
avd.ini.displayname=Kriyan brief 22
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=1024
hw.lcd.width=540
hw.lcd.height=1200
hw.lcd.density=210
hw.keyboard=yes
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader
disk.dataPartition.size=3G
image.sysdir.1=system-images/android-$ApiLevel/google_apis/x86_64/
tag.id=google_apis
tag.display=Google APIs
PlayStore.enabled=false
fastboot.forceColdBoot=yes
"@ | Set-Content -LiteralPath (Join-Path $avd 'config.ini') -Encoding ASCII
}
$savedAvd = $env:ANDROID_AVD_HOME
$savedSdk = $env:ANDROID_HOME
try {
  $env:ANDROID_AVD_HOME = $avdRoot
  $env:ANDROID_HOME = Join-Path $taskRoot '.agents/android-sdk'
  $dnsServers = @('8.8.8.8', '1.1.1.1')
  # Campus Ethernet refuses public DNS and Android stops after REFUSED.
  # Prioritize connected-network DNS while retaining both requested servers.
  # This changes the emulator only, never the host's network configuration.
  $connected = @(Get-NetIPInterface -AddressFamily IPv4 | Where-Object ConnectionState -eq 'Connected' | Select-Object -ExpandProperty InterfaceIndex)
  $fallback = @(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $connected -contains $_.InterfaceIndex } | ForEach-Object ServerAddresses)
  $dnsServers = @($fallback + $dnsServers | Select-Object -Unique | Select-Object -First 4)
  # Keep the requested headless flags. API 36 enforces a 2560 MB minimum;
  # the watchdog guards its real allocation. API 30 supports a 1 GB guest.
  $arguments = @('-avd', $avdName, '-no-window', '-no-audio', '-no-snapshot', '-memory', '1024', '-dns-server', ($dnsServers -join ','), '-no-boot-anim', '-gpu', 'swiftshader', '-feature', '-Vulkan')
  if ($ApiLevel -eq 30) { $arguments += @('-qemu', '-m', '1024') }
  $emulator = Start-Process (Join-Path $env:ANDROID_HOME 'emulator/emulator.exe') -WindowStyle Hidden -ArgumentList $arguments -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'emulator.stdout.log') -RedirectStandardError (Join-Path $logDirectory 'emulator.stderr.log')
  $watchdog = Start-Process powershell.exe -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-File', ('"' + (Join-Path $PSScriptRoot '22-memory-watchdog.ps1') + '"'), '-OwnedPid', $emulator.Id, '-Receipt', ('"' + (Join-Path $logDirectory 'emulator-memory.jsonl') + '"'))
  @{ pid = $emulator.Id; watchdogPid = $watchdog.Id; started = (Get-Date).ToString('o'); args = $arguments; freeCommitKB = $memory.FreeVirtualMemory } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory 'emulator-owner.json')
  Write-Output "Started owned headless emulator PID $($emulator.Id). Confirm a real device network request before testing."
} finally { $env:ANDROID_AVD_HOME = $savedAvd; $env:ANDROID_HOME = $savedSdk }
