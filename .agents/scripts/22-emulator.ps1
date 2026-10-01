$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logDirectory = Join-Path $taskRoot '.agents/logs/22'
$memory = Get-CimInstance Win32_OperatingSystem
if ($memory.FreeVirtualMemory -lt 5MB) { throw "Emulator memory gate: $([math]::Round($memory.FreeVirtualMemory / 1MB, 2)) GB free commit; 5 GB required." }
if (Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(java|emulator|qemu-system)' }) { throw 'Java or an emulator is running. Stop our heavy process first.' }
$avdRoot = Join-Path $taskRoot '.agents/android-avd'
$avd = Join-Path $avdRoot 'kriyan22.avd'
New-Item -ItemType Directory -Force -Path $avd, $logDirectory | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $avdRoot 'kriyan22.ini'))) {
  @"
avd.ini.encoding=UTF-8
path=$avd
target=android-36
"@ | Set-Content -LiteralPath (Join-Path $avdRoot 'kriyan22.ini') -Encoding ASCII
  @'
AvdId=kriyan22
avd.ini.displayname=Kriyan brief 22
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=1024
hw.lcd.width=1080
hw.lcd.height=2400
hw.lcd.density=420
hw.keyboard=yes
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader
disk.dataPartition.size=3G
image.sysdir.1=system-images/android-36/google_apis/x86_64/
tag.id=google_apis
tag.display=Google APIs
PlayStore.enabled=false
fastboot.forceColdBoot=yes
'@ | Set-Content -LiteralPath (Join-Path $avd 'config.ini') -Encoding ASCII
}
$savedAvd = $env:ANDROID_AVD_HOME
$savedSdk = $env:ANDROID_HOME
try {
  $env:ANDROID_AVD_HOME = $avdRoot
  $env:ANDROID_HOME = Join-Path $taskRoot '.agents/android-sdk'
  $arguments = @('-avd', 'kriyan22', '-no-window', '-no-audio', '-no-snapshot', '-memory', '1024', '-dns-server', '8.8.8.8,1.1.1.1', '-no-boot-anim', '-gpu', 'swiftshader', '-feature', '-Vulkan')
  $emulator = Start-Process (Join-Path $env:ANDROID_HOME 'emulator/emulator.exe') -WindowStyle Hidden -ArgumentList $arguments -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'emulator.stdout.log') -RedirectStandardError (Join-Path $logDirectory 'emulator.stderr.log')
  @{ pid = $emulator.Id; started = (Get-Date).ToString('o'); args = $arguments; freeCommitKB = $memory.FreeVirtualMemory } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory 'emulator-owner.json')
  Write-Output "Started owned headless emulator PID $($emulator.Id). Confirm a real device network request before testing."
} finally { $env:ANDROID_AVD_HOME = $savedAvd; $env:ANDROID_HOME = $savedSdk }
