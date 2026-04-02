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
$setupExe = Get-ChildItem -Path (Join-Path $repoRoot 'release') -Filter 'GATIQ-Setup-*.exe' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

function Assert-Path {
    param(
        [string]$PathValue,
        [string]$Label
    )
    if (-not (Test-Path $PathValue)) {
        throw "$Label missing: $PathValue"
    }
}

function Assert-FileAbsent {
    param(
        [string]$PathValue,
        [string]$Label
    )
    if (Test-Path $PathValue) {
        throw "$Label should not be packaged: $PathValue"
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

foreach ($forbidden in @(
    (Join-Path $resourcesRoot 'private.pem'),
    (Join-Path $resourcesRoot 'license.dat'),
    (Join-Path $backendRoot 'private.pem'),
    (Join-Path $backendRoot 'license.dat')
)) {
    Assert-FileAbsent -PathValue $forbidden -Label 'Sensitive licensing file'
}

if ($setupExe) {
    Write-Host "Installer found: $($setupExe.FullName)"
} else {
    Write-Warning "Installer not found under $(Join-Path $repoRoot 'release')"
}

if (-not $SkipBackendSmoke) {
    & (Join-Path $repoRoot 'desktop\validate-backend-build.ps1') -BundleRoot $backendRoot -SkipSourceSmoke
}

Write-Host "Packaged desktop release validation passed."
