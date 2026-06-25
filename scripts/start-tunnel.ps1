# start-tunnel.ps1
# This script starts the Cloudflare tunnel and updates tunnel_link.txt

$PORT = 8081
$LINK_FILE = "tunnel_link.txt"

Write-Host "Starting Cloudflare Tunnel on port $PORT..." -ForegroundColor Cyan

# Start cloudflared using cmd /c to handle shims and scripts reliably
# Detect LAN IP or use the one from Metro output
$LAN_IP = (Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4).IPAddress
if ($null -eq $LAN_IP) { $LAN_IP = "192.168.100.24" } # Fallback to user's known IP

$tempOutput = New-TemporaryFile
$process = Start-Process cmd -ArgumentList "/c cloudflared tunnel --url http://$($LAN_IP):$PORT" -RedirectStandardError $tempOutput.FullName -PassThru -WindowStyle Hidden

Write-Host "Waiting for tunnel URL..." -ForegroundColor Cyan

$tunnelUrl = $null
$retryCount = 0
$maxRetries = 30 

while ($null -eq $tunnelUrl -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 2
    if (Test-Path $tempOutput.FullName) {
        $content = Get-Content $tempOutput.FullName -Raw
        # Improved regex to avoid matching api.trycloudflare.com and catch the real tunnel URL
        if ($content -match "https://(?!api)[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
        }
    }
    $retryCount++
}

if ($null -ne $tunnelUrl) {
    $expUrl = $tunnelUrl.Replace("https://", "exp://")
    Write-Host "Tunnel established!" -ForegroundColor Green
    Write-Host "HTTPS URL: $tunnelUrl" -ForegroundColor White
    Write-Host "Expo Go URL: $expUrl" -ForegroundColor Green
    
    $fileContent = "Expo Go Link (copy to Expo Go):`n$expUrl`n`nBrowser Link:`n$tunnelUrl"
    $fileContent | Out-File -FilePath $LINK_FILE
    
    Write-Host "`nLinks saved to $LINK_FILE" -ForegroundColor Cyan
} else {
    Write-Host "Failed to retrieve tunnel URL. " -ForegroundColor Red
    Write-Host "Please ensure 'npx expo start' is running and cloudflared is installed." -ForegroundColor Yellow
    if (Test-Path $tempOutput.FullName) {
        Write-Host "Last error from cloudflared:" -ForegroundColor Gray
        Get-Content $tempOutput.FullName -Tail 5
    }
}

# Keep the script running to maintain the tunnel
Write-Host "`nPress Ctrl+C to stop the tunnel." -ForegroundColor Yellow
try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    if ($process) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
    if (Test-Path $tempOutput.FullName) { Remove-Item $tempOutput.FullName -Force }
}
