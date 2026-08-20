[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "Run scripts/setup.ps1 first." }

Set-Location $projectRoot
& $python -m compileall app tests
& $python -m pytest -q
