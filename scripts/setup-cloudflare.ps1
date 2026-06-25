# setup-cloudflare.ps1
# This script helps install and verify cloudflared for Expo tunneling

Write-Host "Checking for cloudflared..." -ForegroundColor Cyan

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Write-Host "cloudflared is already installed." -ForegroundColor Green
} else {
    Write-Host "cloudflared is NOT installed." -ForegroundColor Yellow
    Write-Host "Please install cloudflared using winget:" -ForegroundColor Cyan
    Write-Host "winget install Cloudflare.cloudflared" -ForegroundColor White
    
    # Try to install automatically if winget is available
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Attempting to install cloudflared via winget..."
        winget install Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
    } else {
        Write-Host "winget not found. Please download cloudflared manually from https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Red
    }
}

Write-Host "Cloudflare setup check complete." -ForegroundColor Green
