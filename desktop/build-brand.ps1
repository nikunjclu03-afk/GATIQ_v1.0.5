$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'GATIQ API'
$venvPython = Join-Path $backendRoot 'venv\Scripts\python.exe'
$venvSitePackages = Join-Path $backendRoot 'venv\Lib\site-packages'
$brandScript = Join-Path $PSScriptRoot 'generate_brand_assets.py'

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
    $pythonCommand = $venvPython
} elseif (Test-PythonExe -Command 'py' -Arguments @('-3.14', '--version')) {
    $pythonCommand = 'py'
    $pythonArgs = @('-3.14')
} elseif (Test-PythonExe -Command 'python') {
    $pythonCommand = 'python'
} else {
    throw 'No working Python interpreter was found for branding assets.'
}

if (Test-Path $venvSitePackages) {
    if ([string]::IsNullOrWhiteSpace($env:PYTHONPATH)) {
        $env:PYTHONPATH = $venvSitePackages
    } else {
        $env:PYTHONPATH = "$venvSitePackages;$env:PYTHONPATH"
    }
}

if (-not $pythonArgs) {
    $pythonArgs = @()
}

& $pythonCommand @pythonArgs $brandScript
if ($LASTEXITCODE -ne 0) {
    throw "Brand asset generation failed with exit code $LASTEXITCODE."
}
