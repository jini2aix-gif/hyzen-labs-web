import http from 'http';
import os from 'os';

const PORT = 3005;

function getLocalExternalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

const checkUrl = (hostname) => {
    return new Promise((resolve) => {
        const options = {
            hostname: hostname,
            port: PORT,
            path: '/',
            method: 'GET',
            timeout: 2000
        };

        const req = http.request(options, (res) => {
            console.log(`[SUCCESS] Connected to http://${hostname}:${PORT}`);
            console.log(`- Status: ${res.statusCode}`);
            console.log(`- Headers: ${JSON.stringify(res.headers['content-type'])}`);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const titleMatch = data.match(/<title>(.*?)<\/title>/);
                const title = titleMatch ? titleMatch[1] : 'No Title Found';
                console.log(`- Page Title: "${title}"`);
                console.log(`- Content Length: ${data.length} bytes`);
                resolve(true);
            });
        });

        req.on('error', (e) => {
            console.log(`[FAILED] Could not connect to http://${hostname}:${PORT}`);
            console.log(`- Error: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`[TIMEOUT] Connection timed out for http://${hostname}:${PORT}`);
            resolve(false);
        });

        req.end();
    });
};

async function runDiagnostics() {
    console.log("=== Starting Deep Connectivity Diagnostics ===");

    // 1. Check Localhost
    await checkUrl('localhost');

    // 2. Check IPv4 Loopback
    await checkUrl('127.0.0.1');

    // 3. Check External IP
    const externalIP = getLocalExternalIP();
    if (externalIP !== '0.0.0.0') {
        await checkUrl(externalIP);
    }

    console.log("=== Diagnostics Complete ===");
}

runDiagnostics();
