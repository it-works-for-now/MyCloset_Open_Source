[CmdletBinding()]
param(
    [string]$TaskName = "myCloset-AI-Coordination"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceScript = Join-Path $PSScriptRoot "run-service.cmd"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$serviceScript`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Description "MyCloset AI server" -Force | Out-Null
Write-Host "Registered scheduled task: $TaskName"
