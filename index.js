const express = require("express");
const { exec } = require("child_process");
const app = express();

// Environment variables
const uuid = process.env.UUID || "de04add9-5c68-8bab-950c-08cd5320df18";
const wsPath = process.env.WSPATH || "argo";

// Start Xray when serverless function initializes
let xrayStarted = false;
function startXray() {
    if (xrayStarted) return;
    xrayStarted = true;
    
    // Create config.json in /tmp (only writable location on Vercel)
    const config = {
        log: { loglevel: "warning" },
        inbounds: [{
            port: 443,
            protocol: "vless",
            settings: { clients: [{ id: uuid }], decryption: "none" },
            streamSettings: { network: "ws", wsSettings: { path: `/${wsPath}-vless` } }
        }],
        outbounds: [{ protocol: "freedom", tag: "direct" }]
    };
    
    require("fs").writeFileSync("/tmp/config.json", JSON.stringify(config));
    
    // Download and run xray
    exec("curl -L -o /tmp/xray https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip && unzip -p /tmp/xray xray > /tmp/xray && chmod +x /tmp/xray && /tmp/xray run -config /tmp/config.json &");
}

// Routes
app.get("/", (req, res) => res.send("VLESS Server Running"));
app.get("/status", (req, res) => exec("ps -ef", (err, stdout) => res.send(`<pre>${stdout || err}</pre>`)));
app.get("/list", (req, res) => {
    res.send(`
        <pre>
VLESS: vless://${uuid}@${req.hostname}:443?path=/${wsPath}-vless&security=tls&encryption=none&type=ws#VLESS
        </pre>
    `);
});

// Start Xray on first request
app.use((req, res, next) => { startXray(); next(); });

// Export for Vercel serverless
module.exports = app;
