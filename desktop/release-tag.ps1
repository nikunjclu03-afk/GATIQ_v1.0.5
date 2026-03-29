param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [switch]$Commit,
    [switch]$Tag,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot 'package.json'
$packageLockPath = Join-Path $repoRoot 'package-lock.json'
$normalizedVersion = $Version.Trim()

if ($normalizedVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "Version must be in semver format like 1.0.6"
}

function Update-JsonVersion {
    param(
        [string]$PathValue
    )

    if (-not (Test-Path $PathValue)) {
        return
    }

    $json = Get-Content $PathValue -Raw | ConvertFrom-Json
    if ($null -ne $json.version) {
        $json.version = $normalizedVersion
    }
    if ($null -ne $json.packages -and $null -ne $json.packages.'') {
        $json.packages.''.version = $normalizedVersion
    }
    $json | ConvertTo-Json -Depth 100 | Set-Content $PathValue
}

Update-JsonVersion -PathValue $packageJsonPath
Update-JsonVersion -PathValue $packageLockPath

Write-Host "Updated package version to $normalizedVersion"

if ($Commit) {
    git add -- $packageJsonPath $packageLockPath
    git commit -m "chore: release v$normalizedVersion"
    Write-Host "Created commit for v$normalizedVersion"
}

if ($Tag) {
    git tag "v$normalizedVersion"
    Write-Host "Created git tag v$normalizedVersion"
}

if ($Push) {
    git push
    if ($Tag) {
        git push origin "v$normalizedVersion"
    }
    Write-Host "Pushed changes to origin"
}
