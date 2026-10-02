function Get-KriyanNativeFingerprint([string]$TaskRoot) {
  $inputs = @('apps/mobile/app.json', 'apps/mobile/app.config.ts', 'apps/mobile/package.json', 'apps/mobile/src/theme.ts', 'package.json', 'bun.lock')
  $inputs += @(Get-ChildItem -LiteralPath (Join-Path $TaskRoot 'apps/mobile/assets') -Recurse -File | ForEach-Object { $_.FullName.Substring($TaskRoot.Length + 1).Replace('\', '/') })
  $hashes = @($inputs | Sort-Object | ForEach-Object {
    $inputPath = Join-Path $TaskRoot $_
    if (-not (Test-Path -LiteralPath $inputPath)) { throw "Native input is missing: $_" }
    $_ + ':' + (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash
  })
  $servicesFile = [Environment]::GetEnvironmentVariable('ANDROID_GOOGLE_SERVICES_FILE', 'Process')
  if ($servicesFile) { $hashes += 'google-services:' + (Get-FileHash -LiteralPath $servicesFile -Algorithm SHA256).Hash }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(($hashes -join "`n"))))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
