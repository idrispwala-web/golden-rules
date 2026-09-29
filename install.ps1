# Installs golden-rules.exe to %LOCALAPPDATA%\Programs\golden-rules (or $env:INSTALL_DIR), adds it to the user PATH, and runs it.
# Usage: irm https://raw.githubusercontent.com/idrispwala-web/golden-rules/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repo = 'idrispwala-web/golden-rules'
$dir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\golden-rules' }
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }

$tag = (Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest").tag_name
$zip = Join-Path $env:TEMP "golden-rules-$tag.zip"
Invoke-WebRequest "https://github.com/$repo/releases/download/$tag/golden-rules_$($tag.TrimStart('v'))_windows_$arch.zip" -OutFile $zip
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Expand-Archive $zip -DestinationPath $dir -Force
Remove-Item $zip
Write-Host "installed golden-rules $tag to $dir"

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $dir) {
    [Environment]::SetEnvironmentVariable('Path', "$userPath;$dir", 'User')
    Write-Host "added $dir to your user PATH (new terminals pick it up)"
}
$env:Path = "$env:Path;$dir"

& (Join-Path $dir 'golden-rules.exe') @args
