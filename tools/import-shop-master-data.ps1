param(
    [string]$LegacyAssetsDir = "assets",
    [string]$TargetDir = "content/master"
)

$ErrorActionPreference = "Stop"

$files = @(
    "treasure_shop.json",
    "general_shop.json",
    "star_grain_shop.json",
    "boss_coin_shop.json",
    "boss_coin_shop_item_category_map.json",
    "event_item_shop.json",
    "event_item_shop_id_map.json"
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

Write-Host "Shop master data imported."
