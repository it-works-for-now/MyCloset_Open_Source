[CmdletBinding()]
param(
    [ValidateSet("3.12", "3.13")]
    [string]$PythonVersion = "3.12",
    [string]$TorchIndexUrl = "https://download.pytorch.org/whl/cu128"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    $venvCreated = $false
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $versions = @($PythonVersion)
        if ($PythonVersion -ne "3.13") { $versions += "3.13" }
        foreach ($version in $versions) {
            & py "-$version" -c "import sys" 2>$null
            if ($LASTEXITCODE -eq 0) {
                & py "-$version" -m venv .venv
                if ($LASTEXITCODE -ne 0) { throw "Unable to create the virtual environment with Python $version." }
                $venvCreated = $true
                break
            }
        }
    }
    if (-not $venvCreated -and (Get-Command python -ErrorAction SilentlyContinue)) {
        & python -c "import sys; assert sys.version_info >= (3, 12)" 2>$null
        if ($LASTEXITCODE -eq 0) {
            & python -m venv .venv
            if ($LASTEXITCODE -ne 0) { throw "Unable to create the virtual environment with Python." }
            $venvCreated = $true
        }
    }
    if (-not $venvCreated) {
        throw "Python 3.12 or 3.13 was not found. Install Python, then run this script again."
    }
}

$python = Join-Path $projectRoot ".venv\Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install --index-url $TorchIndexUrl torch torchvision
& $python -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env. Set AI_API_KEY before exposing this server beyond localhost."
}

& $python -c "import torch; print('torch=', torch.__version__); print('cuda_available=', torch.cuda.is_available())"
