# GhostAssist one-click installer for Windows
#   irm https://raw.githubusercontent.com/kuenane/GhostAssist/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$repo = 'kuenane/GhostAssist'
Write-Host '==> GhostAssist installer (Windows)'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'ghostassist-installer' }
$asset = $release.assets | Where-Object { $_.name -match 'x64.*-setup\.exe$' } | Select-Object -First 1
if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -match 'x64.*\.msi$' } | Select-Object -First 1 }
if (-not $asset) { throw 'No Windows installer found in the latest release.' }
$out = Join-Path $env:TEMP $asset.name
Write-Host "==> Downloading $($asset.name)"
Invoke-WebRequest $asset.browser_download_url -OutFile $out
Write-Host '==> Installing'
if ($out -like '*.msi') { Start-Process msiexec.exe -ArgumentList "/i `"$out`" /passive" -Wait }
else { Start-Process $out -ArgumentList '/S' -Wait }
Remove-Item $out -Force
Write-Host '==> Done. Launch GhostAssist from the Start menu.'
