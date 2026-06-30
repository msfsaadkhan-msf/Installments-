/**
 * start-expo-tunnel.js
 * Launches Cloudflare Tunnel, extracts the URL, sets EXPO_PACKAGER_PROXY_URL,
 * displays it prominently in the terminal, writes to tunnel_link.txt, and starts Expo.
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LINK_FILE = path.join(__dirname, '..', 'tunnel_link.txt');
const PORT = 8081;

// Get local IP
let LAN_IP = '127.0.0.1';
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      LAN_IP = iface.address;
      break;
    }
  }
}

console.log('');
console.log('=====================================================');
console.log('   CLOUDFLARE EXPO TUNNEL - Starting...              ');
console.log('=====================================================');
console.log(`Detected IP: ${LAN_IP}`);
console.log('Starting Cloudflare tunnel and waiting for URL...');
console.log('');

// Start Cloudflared
const cloudflared = spawn('cmd', ['/c', `cloudflared tunnel --url http://${LAN_IP}:${PORT}`], {
  windowsHide: true,
  cwd: path.join(__dirname, '..'),
});

let tunnelUrl = null;
let expoChild = null;
let expoStarted = false;

function checkCloudflareUrl(data) {
  const text = data.toString();
  if (expoStarted) return;
  
  // Look for trycloudflare.com
  const match = text.match(/(https:\/\/(?!api)[a-zA-Z0-9-]+\.trycloudflare\.com)/);
  if (match) {
    tunnelUrl = match[1];
    expoStarted = true;
    
    let expUrl = tunnelUrl.replace('https://', 'exp://');

    // Display prominently
    console.log('=====================================================');
    console.log('   ✅ TUNNEL LINK READY!                            ');
    console.log('=====================================================');
    console.log('');
    console.log(`  Tunnel URL : ${tunnelUrl}`);
    console.log(`  Expo Go    : ${expUrl}`);
    console.log('');
    console.log('=====================================================');
    console.log('Starting Expo server with Tunnel URL injected...');
    console.log('');

    // Write to tunnel_link.txt
    const timestamp = new Date().toLocaleString();
    const fileContent = [
      '=====================================================',
      `  TUNNEL LINK (Generated: ${timestamp})`,
      '=====================================================',
      '',
      'Expo Go Link (paste in Expo Go app):',
      expUrl,
      '',
      'Browser/HTTPS Link:',
      tunnelUrl,
      '',
      '=====================================================',
    ].join('\n');

    fs.writeFileSync(LINK_FILE, fileContent, 'utf8');

    // Start Expo with EXPO_PACKAGER_PROXY_URL
    const env = Object.assign({}, process.env, {
      EXPO_PACKAGER_PROXY_URL: tunnelUrl
    });

    expoChild = spawn('npx', ['expo', 'start'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: env,
      stdio: 'inherit' // pipe all Expo output normally
    });

    expoChild.on('close', (code) => {
      console.log(`\nExpo process exited with code ${code}`);
      process.exit(code || 0);
    });
  }
}

cloudflared.stderr.on('data', checkCloudflareUrl);
cloudflared.stdout.on('data', checkCloudflareUrl);

cloudflared.on('close', (code) => {
  if (!expoStarted) {
    console.error('\nCloudflared exited before URL could be extracted (Code: ' + code + ')');
    console.error('Make sure cloudflared is installed on the system.');
    process.exit(code || 1);
  }
});

// Cleanup logic
function cleanup() {
  if (cloudflared) {
    cloudflared.kill();
  }
  if (expoChild) {
    expoChild.kill();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
