[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$legacyRoot = Join-Path $projectRoot "src/routes"
$targets = @("api", "web", "web_api") | ForEach-Object { Join-Path $legacyRoot $_ }

foreach ($target in $targets) {
    if ((Test-Path -LiteralPath $target) -and $PSCmdlet.ShouldProcess($target, "Remove legacy route directory")) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Host "Removed $target"
    }
}

if ((Test-Path -LiteralPath $legacyRoot) -and
    -not (Get-ChildItem -LiteralPath $legacyRoot -Force | Select-Object -First 1)) {
    Remove-Item -LiteralPath $legacyRoot -Force
}

Write-Host "Legacy route cleanup complete."
