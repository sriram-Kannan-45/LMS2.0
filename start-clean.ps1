# Clean Startup Script
# Run this if you encounter "Cannot read properties of null (reading 'useState')" or cached UI errors.

Write-Host "🧹 Cleaning Node processes and Vite cache..." -ForegroundColor Cyan

# Stop any running node processes (backend + frontend dev servers)
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Clean Vite cache in frontend folder
$frontendPath = "$PSScriptRoot\frontend"
if (Test-Path "$frontendPath\.vite") {
    Remove-Item -Recurse -Force "$frontendPath\.vite" -ErrorAction SilentlyContinue
}
if (Test-Path "$frontendPath\node_modules\.vite") {
    Remove-Item -Recurse -Force "$frontendPath\node_modules\.vite" -ErrorAction SilentlyContinue
}
if (Test-Path "$frontendPath\dist") {
    Remove-Item -Recurse -Force "$frontendPath\dist" -ErrorAction SilentlyContinue
}

Write-Host "✅ Cache cleared" -ForegroundColor Green

# Invoke start-all.ps1 to start all services
& "$PSScriptRoot\start-all.ps1"
