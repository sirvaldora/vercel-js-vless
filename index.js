const express = require("express");
const { exec } = require("child_process");
const app = express();

// Environment variables
const uuid = process.env.UUID || "70b9879e-173b-4099-a905-807fc2a12a90";
const wsPath = process.env.WSPATH || "baron";  // Changed from "argo" to "hydra"
const useXHTTP = process.env.XHTTP === "true" || true;  // Enable XHTTP by default

// Start Xray
let xrayStarted = false;
function startXray() {
    if (xrayStarted) return;
    xrayStarted = true;
    
    const config = {
        log: { loglevel: "warning" },
        inbounds: [{
            port: 8080,
            protocol: "vless",
            settings: { clients: [{ id: uuid }], decryption: "none" },
            streamSettings: { 
                network: useXHTTP ? "xhttp" : "ws",
                xhttpSettings: useXHTTP ? { path: `/${wsPath}` } : undefined,
                wsSettings: !useXHTTP ? { path: `/${wsPath}` } : undefined
            }
        }],
        outbounds: [{ protocol: "freedom", tag: "direct" }]
    };
    
    require("fs").writeFileSync("/tmp/config.json", JSON.stringify(config));
    
    exec("curl -L -o /tmp/xray https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip && unzip -p /tmp/xray xray > /tmp/xray && chmod +x /tmp/xray && /tmp/xray run -config /tmp/config.json &");
}

// Routes
app.get("/", (req, res) => res.send("VLESS XHTTP Server Running"));
app.get("/status", (req, res) => exec("ps -ef", (err, stdout) => res.send(`<pre>${stdout || err}</pre>`)));
app.get("/list", (req, res) => {
    const mode = "auto";
    const alpn = "h3,h2,http/1.1";
    const host = req.hostname;
    const path = `/${wsPath}`;
    const type = useXHTTP ? "xhttp" : "ws";
    
    res.send(`
        <pre>
VLESS (XHTTP): vless://${uuid}@${req.hostname}:443?mode=${mode}&path=${encodeURIComponent(path)}&security=tls&alpn=${encodeURIComponent(alpn)}&encryption=none&host=${host}&type=${type}&sni=${host}#VLESS-XHTTP
        </pre>
    `);
});

app.use((req, res, next) => { startXray(); next(); });

module.exports = app;
