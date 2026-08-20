[CmdletBinding()]
param(
    [string]$TaskName = "myCloset-AI-Coordination"
)

$ErrorActionPreference = "Stop"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
Write-Host "Removed scheduled task: $TaskName"
