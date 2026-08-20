[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "Run scripts/setup.ps1 first." }

Set-Location $projectRoot
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    $localOnlyLine = Get-Content $envFile | Where-Object { $_ -match '^LOCAL_FILES_ONLY=' } | Select-Object -First 1
    if ($localOnlyLine -and $localOnlyLine.Substring("LOCAL_FILES_ONLY=".Length).Trim().ToLowerInvariant() -eq "true") {
        # Prevent cached Transformers tokenizers from attempting Hugging Face metadata calls.
        $env:HF_HUB_OFFLINE = "1"
    }
}
$logFile = Join-Path $projectRoot "server-service.log"
# Keep the hidden service launch observable after restarts. Python's unbuffered
# output lets validation errors and model-response previews reach this log promptly.
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $python -u -m app.main *>> $logFile
$pythonExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
exit $pythonExitCode
