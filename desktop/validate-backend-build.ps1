param(
    [string]$BundleRoot = "",
    [switch]$SkipSourceSmoke,
    [switch]$SkipRuntimeSmoke
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'GATIQ API'
$defaultBundleRoot = Join-Path $repoRoot 'dist\backend\GATIQBackend'
$bundleRoot = if ([string]::IsNullOrWhiteSpace($BundleRoot)) { $defaultBundleRoot } else { $BundleRoot }
$venvPython = Join-Path $backendRoot 'venv\Scripts\python.exe'
$pythonExe = if (Test-Path $venvPython) { $venvPython } else { 'python' }
$entryFile = Join-Path $repoRoot 'desktop\backend_entry.py'
$exePath = Join-Path $bundleRoot 'GATIQBackend.exe'
$internalDir = Join-Path $bundleRoot '_internal'
$smokePort = 8011
$smokeApiKey = 'GATIQ-SMOKE-VALIDATION'

function Assert-Path {
    param(
        [string]$PathValue,
        [string]$Label
    )
    if (-not (Test-Path $PathValue)) {
        throw "$Label missing: $PathValue"
    }
}

Write-Host "Validating backend build inputs and outputs..."

Assert-Path -PathValue $backendRoot -Label 'Backend root'
Assert-Path -PathValue $entryFile -Label 'Backend entry'

if (-not $SkipSourceSmoke) {
    Write-Host "Running backend source import smoke test..."
    $sourceSmoke = @"
import importlib
import json
import os
import sys
from pathlib import Path

repo_root = Path(r"$repoRoot")
backend_root = repo_root / "GATIQ API"
sys.path.insert(0, str(backend_root))
os.environ.setdefault("GATIQ_API_KEY", "$smokeApiKey")
os.environ.setdefault("GATIQ_ENV_FILE", str(backend_root / ".env"))
import fastapi
import uvicorn
import cv2
import sqlalchemy
import dotenv
module = importlib.import_module("app.main")
print(json.dumps({
    "fastapi": getattr(fastapi, "__version__", "unknown"),
    "cv2": getattr(cv2, "__version__", "unknown"),
    "routes": len(module.app.routes)
}))
"@
    $sourceSmoke | & $pythonExe -
    if ($LASTEXITCODE -ne 0) {
        throw 'Backend source smoke test failed.'
    }
}

Assert-Path -PathValue $bundleRoot -Label 'Backend bundle root'
Assert-Path -PathValue $exePath -Label 'Backend executable'
Assert-Path -PathValue $internalDir -Label 'Backend _internal directory'

foreach ($required in @(
    (Join-Path $bundleRoot '.env'),
    (Join-Path $bundleRoot 'best.onnx'),
    (Join-Path $bundleRoot 'yolov8n.pt'),
    (Join-Path $internalDir 'python314.dll'),
    (Join-Path $internalDir 'sqlite3.dll')
)) {
    Assert-Path -PathValue $required -Label 'Required backend runtime file'
}

$cv2Binary = Get-ChildItem -Path $internalDir -Filter 'cv2*.pyd' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $cv2Binary) {
    throw "cv2 binary missing from backend bundle: $internalDir"
}

if (-not $SkipRuntimeSmoke) {
    Write-Host "Running frozen backend runtime smoke test on port $smokePort..."
    $stdoutLog = Join-Path $repoRoot 'build\logs\backend-smoke.stdout.log'
    $stderrLog = Join-Path $repoRoot 'build\logs\backend-smoke.stderr.log'
    New-Item -ItemType Directory -Force -Path (Split-Path $stdoutLog -Parent) | Out-Null

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $exePath
    $psi.WorkingDirectory = $bundleRoot
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Environment["GATIQ_API_KEY"] = $smokeApiKey
    $psi.Environment["GATIQ_HOST"] = "127.0.0.1"
    $psi.Environment["GATIQ_PORT"] = "$smokePort"
    $psi.Environment["GATIQ_DATA_DIR"] = (Join-Path $repoRoot 'build\smoke-data')

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()

    try {
        $deadline = (Get-Date).AddSeconds(45)
        $healthy = $false
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 1500
            try {
                $response = Invoke-RestMethod -Uri "http://127.0.0.1:$smokePort/health" -Headers @{ 'X-API-Key' = $smokeApiKey } -Method Get -TimeoutSec 4
                $hasHealthStatus = ($null -ne $response.status) -or ($null -ne $response.local_ai_loaded) -or ($null -ne $response.ai_engine_loading)
                if ($hasHealthStatus) {
                    $healthy = $true
                    break
                }
            } catch {
                if ($process.HasExited) {
                    throw "Frozen backend exited during smoke test with code $($process.ExitCode)."
                }
            }
        }

        if (-not $healthy) {
            throw "Frozen backend health check did not succeed before timeout."
        }
    } finally {
        if (-not $process.HasExited) {
            $process.Kill()
            $process.WaitForExit()
        }
        $stdoutTask.Result | Set-Content -Path $stdoutLog
        $stderrTask.Result | Set-Content -Path $stderrLog
    }
}

Write-Host "Backend build validation passed."
