$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'GATIQ API'
$entryFile = Join-Path $repoRoot 'desktop\backend_entry.py'
$distRoot = Join-Path $repoRoot 'dist\backend'
$workRoot = Join-Path $repoRoot 'build\pyinstaller'
$specRoot = Join-Path $repoRoot 'build\pyinstaller-spec'
$logRoot = Join-Path $repoRoot 'build\logs'
$logFile = Join-Path $logRoot 'pyinstaller-backend.log'
$errLogFile = Join-Path $logRoot 'pyinstaller-backend.err.log'
$venvPython = Join-Path $backendRoot 'venv\Scripts\python.exe'
$venvSitePackages = Join-Path $backendRoot 'venv\Lib\site-packages'
$cv2PackageDir = Join-Path $venvSitePackages 'cv2'

function Test-PythonExe {
    param(
        [string]$Command,
        [string[]]$Arguments = @('--version')
    )

    try {
        & $Command @Arguments *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

if (Test-PythonExe -Command $venvPython) {
    $pythonExe = $venvPython
    $pythonArgs = @()
} elseif (Test-PythonExe -Command 'py' -Arguments @('-3.14', '--version')) {
    $pythonExe = 'py'
    $pythonArgs = @('-3.14')
} else {
    $pythonExe = 'python'
    $pythonArgs = @()
}

if ($pythonExe -ne $venvPython -and (Test-Path $venvSitePackages)) {
    if ([string]::IsNullOrWhiteSpace($env:PYTHONPATH)) {
        $env:PYTHONPATH = $venvSitePackages
    } else {
        $env:PYTHONPATH = "$venvSitePackages;$env:PYTHONPATH"
    }
}

if (-not (Test-Path $entryFile)) {
    throw "Backend entry file missing: $entryFile"
}

if (-not (Test-Path $backendRoot)) {
    throw "Backend root missing: $backendRoot"
}

& $pythonExe @pythonArgs -m pip show pyinstaller *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'PyInstaller is required. Install it in the backend environment before running npm run dist.'
}

New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null
New-Item -ItemType Directory -Force -Path $specRoot | Out-Null
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

if (Test-Path (Join-Path $distRoot 'GATIQBackend')) {
    Remove-Item -Path (Join-Path $distRoot 'GATIQBackend') -Recurse -Force
}

Write-Host "Starting PyInstaller build. Log: $logFile"

$pyiArgs = @(
    '-m', 'PyInstaller',
    '--noconfirm',
    '--clean',
    '--log-level', 'INFO',
    '--onedir',
    '--name', 'GATIQBackend',
    '--distpath', $distRoot,
    '--workpath', $workRoot,
    '--specpath', $specRoot,
    '--paths', $backendRoot,
    '--hidden-import', 'app.main',
    '--hidden-import', 'app.models',
    '--hidden-import', 'app.database',
    '--hidden-import', 'app.schemas',
    '--hidden-import', 'app.ai_engine',
    '--hidden-import', 'uvicorn.logging',
    '--hidden-import', 'uvicorn.loops.auto',
    '--hidden-import', 'uvicorn.protocols.http.auto',
    '--hidden-import', 'uvicorn.lifespan.on',
    '--hidden-import', 'fastapi.middleware.cors',
    '--hidden-import', 'fastapi.security',
    '--hidden-import', 'sqlalchemy.sql.default_comparator',
    '--hidden-import', 'dotenv',
    '--hidden-import', 'cv2',
    '--hidden-import', 'ultralytics',
    '--hidden-import', 'easyocr',
    '--hidden-import', 'numpy',
    '--exclude-module', 'polars',
    '--exclude-module', '_polars_runtime_32',
    '--collect-all', 'fastapi',
    '--collect-all', 'starlette',
    '--collect-all', 'pydantic',
    '--collect-all', 'anyio',
    '--collect-all', 'sqlalchemy',
    '--collect-all', 'uvicorn',
    '--collect-all', 'ultralytics',
    '--collect-all', 'easyocr',
    '--collect-all', 'onnxruntime',
    '--collect-all', 'onnx',
    '--collect-all', 'lap',
    '--collect-all', 'matplotlib',
    '--collect-all', 'PIL',
    '--collect-all', 'scipy',
    '--collect-all', 'yaml',
    '--collect-all', 'tqdm',
    '--collect-all', 'skimage',
    '--collect-all', 'shapely',
    '--collect-all', 'bidi',
    '--collect-all', 'pyclipper',
    '--collect-binaries', 'cv2',
    '--collect-data', 'cv2',
    '--collect-submodules', 'cv2',
    '--collect-binaries', 'numpy',
    '--collect-data', 'numpy',
    '--collect-all', 'numpy',
    $entryFile
)

if (Test-Path $logFile) { Remove-Item $logFile -Force }
if (Test-Path $errLogFile) { Remove-Item $errLogFile -Force }
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $pythonExe @pythonArgs @pyiArgs 2>&1 | Tee-Object -FilePath $logFile
$pyinstallerExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorAction

if ($pyinstallerExitCode -ne 0) {
    throw "PyInstaller failed with exit code $pyinstallerExitCode. Check log: $logFile"
}

$bundleRoot = Join-Path $distRoot 'GATIQBackend'
$exePath = Join-Path $bundleRoot 'GATIQBackend.exe'
$internalDir = Join-Path $bundleRoot '_internal'

if (-not (Test-Path $bundleRoot)) {
    throw "Build did not produce bundle directory: $bundleRoot"
}
if (-not (Test-Path $exePath)) {
    throw "Build did not produce executable: $exePath"
}
if (-not (Test-Path $internalDir)) {
    throw "Build did not produce runtime directory: $internalDir"
}

# Copy backend assets explicitly to avoid CLI path-separator issues on Windows.
foreach ($asset in @('.env', 'best.onnx', 'yolov8n.pt')) {
    $sourceAsset = Join-Path $backendRoot $asset
    if (Test-Path $sourceAsset) {
        Copy-Item -Path $sourceAsset -Destination (Join-Path $bundleRoot $asset) -Force
    }
}

Write-Host "PyInstaller build complete. Ensuring cv2 binaries exist in _internal..."

New-Item -ItemType Directory -Force -Path (Join-Path $internalDir 'cv2') | Out-Null

if (Test-Path $cv2PackageDir) {
    # Copy cv2 extension and OpenCV runtime DLLs to predictable locations.
    Get-ChildItem -Path $cv2PackageDir -Filter '*.pyd' -Recurse -ErrorAction SilentlyContinue |
        ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $internalDir $_.Name) -Force
            Copy-Item $_.FullName -Destination (Join-Path $internalDir 'cv2') -Force
        }
    Get-ChildItem -Path $cv2PackageDir -Filter '*.dll' -Recurse -ErrorAction SilentlyContinue |
        ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $internalDir $_.Name) -Force
            Copy-Item $_.FullName -Destination (Join-Path $internalDir 'cv2') -Force
        }
} else {
    Write-Warning "cv2 package directory not found at $cv2PackageDir"
}

$cv2pyd = Get-ChildItem $internalDir -Filter 'cv2*.pyd' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $cv2pyd) {
    throw "cv2 native module is missing in frozen output. See log: $logFile"
}

Write-Host "  cv2 native binary: $($cv2pyd.FullName)"
& (Join-Path $PSScriptRoot 'validate-backend-build.ps1') -BundleRoot $bundleRoot -SkipSourceSmoke
if ($LASTEXITCODE -ne 0) {
    throw 'Backend build validation failed after PyInstaller packaging.'
}
Write-Host "Backend build finished successfully!"
