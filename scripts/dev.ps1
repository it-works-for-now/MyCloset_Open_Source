#Requires -Version 5.1
<#
.SYNOPSIS
    front · back · ai 를 각각 새 창에서 띄운다.
.PARAMETER SkipAi
    GPU 가 없을 때 AI 서버를 건너뛴다. AI 기능을 제외한 화면 전체는 그대로 동작한다.
#>
param([switch]$SkipAi)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Start-Server($title, $workDir, $command) {
    Write-Host "  $title 시작"
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$workDir'; $command"
    )
}

Start-Server "MyCloset back  :8080"  "$root\back"  ".\gradlew bootRun"
Start-Server "MyCloset front :5173"  "$root\front" "npm run dev"
if (-not $SkipAi) {
    Start-Server "MyCloset ai    :8001" "$root\ai" ".\.venv\Scripts\python.exe -m app.main"
}

Write-Host "`n브라우저에서 http://localhost:5173 을 여세요."
