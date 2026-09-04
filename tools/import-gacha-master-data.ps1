param(
    [string]$LegacyAssetsDir = "assets",
    [string]$TargetDir = "content/master"
)

$ErrorActionPreference = "Stop"

$files = @(
    "gacha.json",
    "gacha_campaign.json",
    "gacha_movie_seeds.json",
    "gacha_rate_up_movie_seeds.json"
)

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

foreach ($file in $files) {
    $source = Join-Path $LegacyAssetsDir $file
    if (-not (Test-Path $source -PathType Leaf)) {
        throw "Missing legacy master-data file: $source"
    }

    $target = Join-Path $TargetDir $file
    Copy-Item $source $target -Force
    Write-Host "Copied $source -> $target"
}

Write-Host "Gacha master data imported."
