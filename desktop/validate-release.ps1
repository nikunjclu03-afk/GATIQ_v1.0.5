param(
    [string]$ReleaseRoot = "",
    [switch]$SkipBackendSmoke
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
    Join-Path $repoRoot 'release\win-unpacked'
} else {
    $ReleaseRoot
}

$resourcesRoot = Join-Path $releaseRoot 'resources'
$backendRoot = Join-Path $resourcesRoot 'backend'
$setupExe = Join-Path $repoRoot 'release\GATIQ-Setup-1.0.5.exe'

function Assert-Path {
    param(
        [string]$PathValue,
        [string]$Label
    )
    if (-not (Test-Path $PathValue)) {
        throw "$Label missing: $PathValue"
    }
}

Write-Host "Validating packaged desktop release at $releaseRoot"

foreach ($required in @(
    $releaseRoot,
    (Join-Path $releaseRoot 'GATIQ.exe'),
    $resourcesRoot,
    (Join-Path $resourcesRoot 'app.asar'),
    $backendRoot,
    (Join-Path $backendRoot 'GATIQBackend.exe'),
    (Join-Path $backendRoot '.env'),
    (Join-Path $backendRoot 'best.onnx'),
    (Join-Path $backendRoot 'yolov8n.pt'),
    (Join-Path $backendRoot '_internal'),
    (Join-Path $backendRoot '_internal\cv2.pyd')
)) {
    Assert-Path -PathValue $required -Label 'Release artifact'
}

if (Test-Path $setupExe) {
    Write-Host "Installer found: $setupExe"
} else {
    Write-Warning "Installer not found at $setupExe"
}

if (-not $SkipBackendSmoke) {
    & (Join-Path $repoRoot 'desktop\validate-backend-build.ps1') -BundleRoot $backendRoot -SkipSourceSmoke
}

Write-Host "Packaged desktop release validation passed."
