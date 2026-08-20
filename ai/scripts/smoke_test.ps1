[CmdletBinding()]
param(
    [string]$BaseUrl = "http://127.0.0.1:8001"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"
$headers = @{}

# The key is read only for the request header and is never written to terminal output.
if (Test-Path $envFile) {
    $keyLine = Get-Content $envFile | Where-Object { $_ -match '^AI_API_KEY=' } | Select-Object -First 1
    if ($keyLine) {
        $apiKey = $keyLine.Substring("AI_API_KEY=".Length).Trim()
        if ($apiKey) { $headers["X-API-Key"] = $apiKey }
    }
}

$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
if ($health.status -ne "ready") { throw "Server is not ready: $($health.status)" }

$recommendPayload = @{
    situation = "가을 주말 카페 방문"
    closet = @(
        @{ clothesId = 101; category = "TOP"; subcategory = "SHIRT"; colors = @("WHITE"); seasons = @("FALL"); styleTags = @("CASUAL") },
        @{ clothesId = 202; category = "BOTTOM"; subcategory = "SLACKS"; colors = @("BLACK"); seasons = @("FALL"); styleTags = @("MINIMAL") },
        @{ clothesId = 303; category = "SHOES"; subcategory = "SNEAKERS"; colors = @("WHITE"); seasons = @("FALL"); styleTags = @("CASUAL") }
    )
} | ConvertTo-Json -Depth 6

$recommendation = Invoke-RestMethod -Uri "$BaseUrl/v1/daily-look/recommend" -Method Post -ContentType "application/json" -Headers $headers -Body $recommendPayload
if (-not $recommendation.recommendations) { throw "Recommendation response was empty." }

$imagePayload = @{
    items = @(
        @{ slot = "top"; category = "TOP"; subcategory = "SHIRT"; colors = @("WHITE") },
        @{ slot = "bottom"; category = "BOTTOM"; subcategory = "SLACKS"; colors = @("BLACK") },
        @{ slot = "shoes"; category = "SHOES"; subcategory = "SNEAKERS"; colors = @("WHITE") }
    )
    styleKeywords = $recommendation.recommendations[0].styleKeywords
} | ConvertTo-Json -Depth 6

$imagePath = Join-Path $env:TEMP "mycloset-smoke-test.png"
Invoke-WebRequest -Uri "$BaseUrl/v1/daily-look/image" -Method Post -ContentType "application/json" -Headers $headers -Body $imagePayload -OutFile $imagePath
if ((Get-Item $imagePath).Length -lt 100) { throw "Generated image output was unexpectedly small." }
Remove-Item -LiteralPath $imagePath
Write-Host "Smoke test passed."
