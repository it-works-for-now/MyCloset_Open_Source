#Requires -Version 5.1
<#
.SYNOPSIS
    세 컴포넌트의 설정 파일을 만들고 의존성을 설치한다.
.DESCRIPTION
    최초 1회만 실행하면 된다. 이미 있는 설정 파일은 덮어쓰지 않는다.
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Copy-IfMissing($from, $to) {
    if (Test-Path $to) {
        Write-Host "  건너뜀 (이미 있음): $to"
    } else {
        Copy-Item $from $to
        Write-Host "  생성: $to"
    }
}

Write-Host "`n[1/3] 설정 파일"
Copy-IfMissing "$root\back\src\main\resources\application-local.yml.example" "$root\back\src\main\resources\application-local.yml"
Copy-IfMissing "$root\front\.env.example" "$root\front\.env"
Copy-IfMissing "$root\ai\.env.example"    "$root\ai\.env"

Write-Host "`n[2/3] 프론트엔드 의존성"
Push-Location "$root\front"; npm install; Pop-Location

Write-Host "`n[3/3] AI 서버 가상환경"
if (-not (Test-Path "$root\ai\.venv")) { python -m venv "$root\ai\.venv" }
& "$root\ai\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "$root\ai\.venv\Scripts\python.exe" -m pip install -r "$root\ai\requirements.txt"

Write-Host "`n준비 완료. 다음 값을 직접 채운 뒤 scripts\dev.ps1 을 실행하세요."
Write-Host "  back\src\main\resources\application-local.yml : DB 접속 정보, JWT_SECRET, WEATHER_API_KEY"
