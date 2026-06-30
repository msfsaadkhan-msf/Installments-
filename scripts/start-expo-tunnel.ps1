# start-expo-tunnel.ps1
# Starts Expo in --tunnel mode, captures the tunnel URL, displays it, and writes it to tunnel_link.txt

$LINK_FILE = Join-Path $PSScriptRoot "..\tunnel_link.txt"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   EXPO TUNNEL MODE - Starting...                    " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Start expo in tunnel mode as a background job, capturing output
$tempLog = New-TemporaryFile

# Start the process and tee output to both console and file
$process = Start-Process -FilePath "npx" -ArgumentList "expo","start","--tunnel" `
    -WorkingDirectory (Join-Path $PSScriptRoot "..") `
    -RedirectStandardOutput $tempLog.FullName `
    -PassThru -WindowStyle Hidden

# Also start a job to stream stdout to console in real-time
$streamJob = Start-Job -ScriptBlock {
    param($logPath)
    $lastPos = 0
    while ($true) {
        if (Test-Path $logPath) {
            $content = Get-Content $logPath -Raw
            if ($content -and $content.Length -gt $lastPos) {
                $newContent = $content.Substring($lastPos)
                Write-Output $newContent
                $lastPos = $content.Length
            }
        }
        Start-Sleep -Milliseconds 500
    }
} -ArgumentList $tempLog.FullName

# Wait for the tunnel URL to appear in the output
Write-Host "Waiting for tunnel URL (this may take 15-30 seconds)..." -ForegroundColor Yellow
$tunnelUrl = $null
$retryCount = 0
$maxRetries = 60  # up to 2 minutes

while ($null -eq $tunnelUrl -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 2
    if (Test-Path $tempLog.FullName) {
        $content = Get-Content $tempLog.FullName -Raw
        # Match the ngrok/expo tunnel URL pattern  
        if ($content -match "(https?://[a-zA-Z0-9._-]+\.ngrok[a-zA-Z0-9._-]*\.[a-zA-Z]+)") {
            $tunnelUrl = $Matches[1]
        }
        # Also check for expo tunnel format
        elseif ($content -match "(exp://[a-zA-Z0-9._-]+\.ngrok[a-zA-Z0-9._-]*\.[a-zA-Z]+:[0-9]+)") {
            $tunnelUrl = $Matches[1]
        }
        # Broad match for any tunnel-like URL in Metro output
        elseif ($content -match "Metro waiting on (exp://[^\s]+)") {
            $tunnelUrl = $Matches[1]
        }
        elseif ($content -match "Metro waiting on (https?://[^\s]+)") {
            $tunnelUrl = $Matches[1]
        }
    }
    $retryCount++
}

# Stop the streaming job
Stop-Job $streamJob -ErrorAction SilentlyContinue
Remove-Job $streamJob -ErrorAction SilentlyContinue

if ($null -ne $tunnelUrl) {
    # Build the exp:// URL if we got an https URL
    if ($tunnelUrl -match "^https://") {
        $expUrl = $tunnelUrl -replace "^https://", "exp://"
    } else {
        $expUrl = $tunnelUrl
    }

    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "   TUNNEL LINK READY!                                " -ForegroundColor Green  
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tunnel URL : $tunnelUrl" -ForegroundColor White
    Write-Host "  Expo Go    : $expUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""

    # Write to tunnel_link.txt
    $fileContent = @"
=====================================================
  TUNNEL LINK (Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
=====================================================

Expo Go Link (paste in Expo Go app):
$expUrl

Browser/HTTPS Link:
$tunnelUrl

=====================================================
"@
    $fileContent | Out-File -FilePath $LINK_FILE -Encoding utf8
    Write-Host "Links saved to tunnel_link.txt" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host "   FAILED to detect tunnel URL                       " -ForegroundColor Red
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  - @expo/ngrok not installed (run: npm install -D @expo/ngrok)" -ForegroundColor Yellow
    Write-Host "  - Network/firewall blocking ngrok" -ForegroundColor Yellow
    Write-Host ""
    # Still show whatever output we captured
    if (Test-Path $tempLog.FullName) {
        Write-Host "--- Expo Output ---" -ForegroundColor Gray
        Get-Content $tempLog.FullName
    }
}

# Now stream the expo process output live  
Write-Host "--- Expo Dev Server (live) ---" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

try {
    $lastPos = 0
    while (-not $process.HasExited) {
        if (Test-Path $tempLog.FullName) {
            $content = Get-Content $tempLog.FullName -Raw
            if ($content -and $content.Length -gt $lastPos) {
                $newContent = $content.Substring($lastPos)
                Write-Host $newContent -NoNewline
                $lastPos = $content.Length
            }
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`nStopping Expo..." -ForegroundColor Yellow
    if ($process -and -not $process.HasExited) { 
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue 
    }
    if (Test-Path $tempLog.FullName) { Remove-Item $tempLog.FullName -Force }
}
