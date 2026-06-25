# start-expo-tunnel.ps1
# This script integrates Cloudflare Tunnel with Expo's Packager Proxy

$PORT = 8081
$LINK_FILE = "tunnel_link.txt"

Write-Host "--- Integrated Cloudflare & Expo Setup ---" -ForegroundColor Cyan

# 1. Detect LAN IP
$LAN_IP = (Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4).IPAddress
if ($null -eq $LAN_IP) { $LAN_IP = "192.168.100.24" } # Fallback
Write-Host "Detected LAN IP: $LAN_IP" -ForegroundColor Gray

# 2. Start Cloudflare Tunnel
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Cyan
$tempOutput = New-TemporaryFile
$tunnelProcess = Start-Process cmd -ArgumentList "/c cloudflared tunnel --url http://$($LAN_IP):$PORT" -RedirectStandardError $tempOutput.FullName -PassThru -WindowStyle Hidden

# 3. Wait for URL
Write-Host "Waiting for tunnel URL..." -ForegroundColor Cyan
$tunnelUrl = $null
$retryCount = 0
while ($null -eq $tunnelUrl -and $retryCount -lt 30) {
    Start-Sleep -Seconds 2
    if (Test-Path $tempOutput.FullName) {
        $content = Get-Content $tempOutput.FullName -Raw
        if ($content -match "https://(?!api)[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
        }
    }
    $retryCount++
}

if ($null -eq $tunnelUrl) {
    Write-Host "Failed to start tunnel. Check cloudflared installation." -ForegroundColor Red
    exit 1
}

$expUrl = $tunnelUrl.Replace("https://", "exp://")
Write-Host "Tunnel ready: $tunnelUrl" -ForegroundColor Green
Write-Host "Expo Go URL: $expUrl" -ForegroundColor Green
$tunnelUrl | Out-File -FilePath $LINK_FILE
Write-Host "URL saved to $LINK_FILE" -ForegroundColor Gray

# 4. Set Environment Variable and Start Expo
Write-Host "Setting EXPO_PACKAGER_PROXY_URL and starting Expo..." -ForegroundColor Cyan
$env:EXPO_PACKAGER_PROXY_URL = $tunnelUrl

# Run npx expo start
try {
    npx expo start
} finally {
    # Cleanup tunnel on exit
    Write-Host "`nStopping tunnel..." -ForegroundColor Yellow
    if ($tunnelProcess) { Stop-Process -Id $tunnelProcess.Id -ErrorAction SilentlyContinue }
    if (Test-Path $tempOutput.FullName) { Remove-Item $tempOutput.FullName -Force }
}
