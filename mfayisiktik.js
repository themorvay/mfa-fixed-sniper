import WebSocket from "ws";
import http2 from "http2";
import fs from "fs/promises";
import tls from "tls";
let mfaToken = null;
let ws = null;
let session = null;
let guilds = {};
let lastSequence = null;
let password = "ingilterelitelepatiamorvay";
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const readMFAToken = async () => { 
    try { 
        mfaToken = await fs.readFile('mfa_token.txt', 'utf8');
    } catch {} 
};
async function extractJsonFromString(str) {
    const jsonRegex = /{[^{}]*}|\[[^\[\]]*\]/g;
    const matches = str.match(jsonRegex) || [];
    const results = [];
    for (const match of matches) {
        try {
            const parsed = JSON.parse(match);
            if (parsed) results.push(parsed);
        } catch {}
    }
    return results;
}
async function handleMfa() {
    try {
      const initialResponse = await sessionManager.request("PATCH", `/api/v9/guilds/0/vanity-url`, { "Content-Type": "application/json" }, JSON.stringify({ code: "" }));
      const data = JSON.parse(initialResponse);
      if (data.code === 60003) {
      const ticket = data.mfa.ticket;
      const mfaResponse = await sessionManager.request("POST", "/api/v9/mfa/finish", { "Content-Type": "application/json" }, JSON.stringify({ ticket: ticket, mfa_type: "password", data: password }));
      const responseData = JSON.parse(mfaResponse);
      if (responseData.token) {
      mfaToken = responseData.token;
      console.log(`mfa gecıldı by ingiltereli morvay telepatia.`);
      } else {
      console.error('Failed to get MFA token:', responseData);
      }
      }
    } catch (error) {
      console.error('Error handling MFA:', error);
    }
}

function connectWebSocket() {
    if(ws) ws.close();
    ws = new WebSocket("wss://gateway-us-east1-d.discord.gg", {
        perMessageDeflate: false
    });
    setTimeout(() => {
        if(ws) ws.close();
    }, 1800000);
    ws.onclose = () => {
        setTimeout(connectWebSocket, 10000);
    };
    ws.onerror = () => {
        ws.close();
    };
    ws.onmessage = async ({data}) => {
        try {
            const {d, op, t, s} = JSON.parse(data);
            if(s) lastSequence = s;
            if(t === "GUILD_UPDATE") {
                const find = guilds[d.guild_id];
                if(find && find !== d.vanity_url_code) {
                    const apiPaths = ["/api/v9/"];
                    for (const v of apiPaths) {
                        await delay(3000 + Math.random() * 2000);
                        const req = session.request({
                            ":authority": "canary.discord.com", 
                            ":scheme": "https",
                            ":method": "PATCH", 
                            ":path": `${v}guilds/1330673007798128680/vanity-url`,
                            "Authorization": "",
                            "Content-Type": "application/json",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
                            "X-Super-Properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiY2xpZW50X21vZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTMyLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzIuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAifQ==",
                            'X-Discord-MFA-Authorization': mfaToken,
                            "Cookie": `__Secure-recent_mfa=${mfaToken}`
                        });  
                        
                        req.on('response', async (headers) => {
                            const statusCode = headers[':status'];
                            const chunks = [];
                            req.on('data', chunk => chunks.push(chunk));
                            req.on('end', async () => {
                                await delay(1000 + Math.random() * 1000);
                                
                                const responseData = Buffer.concat(chunks).toString();
                                let jsonResult;
                                try {
                                    const extractedJson = await extractJsonFromString(responseData);
                                    jsonResult = extractedJson.find(e => e.code) || extractedJson.find(e => e.message) || extractedJson;
                                } catch {
                                    jsonResult = responseData;
                                }
                                
                                console.log(`${find} ${v}`, {
                                    status: statusCode,
                                    data: jsonResult
                                });
                                
                                await delay(2000 + Math.random() * 2000);
                                
                                const webhook = session.request({
                                    ":method": "POST",
                                    ":path": `/api/v9/channels/1340626653319270530/messages`,
                                    ":authority": "canary.discord.com",
                                    ":scheme": "https",
                                    "Authorization": "",
                                    "Content-Type": "application/json",
                                });
                                
                                webhook.write(JSON.stringify({
                                    content: `@everyone ${find}\n\`\`\`json\n${JSON.stringify(jsonResult)}\`\`\``
                                }));
                                
                                webhook.end();
                            });
                        });
                        
                        req.end(JSON.stringify({code: find}));
                    }
                }
            } else if(t === "READY") {
                d.guilds.forEach(({id, vanity_url_code}) => {
                    if(vanity_url_code) guilds[id] = vanity_url_code;
                });
                console.log(guilds);
            }
            
            if(op === 10) {
                const heartbeatInterval = d.heartbeat_interval * 1.3;
                
                setInterval(() => {
                    if(ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            op: 1,
                            d: lastSequence
                        }));
                    }
                }, heartbeatInterval);
                
                await delay(3000);
                
                ws.send(JSON.stringify({
                    op: 2,
                    d: {
                        token: "",
                        intents: 1,
                        properties: { 
                            os: "linux", 
                            browser: "firefox", 
                            device: "" 
                        },
                    }
                }));
                
                setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ op: 1, d: {}, s: null, t: "heartbeat" }));
                    }
                }, heartbeatInterval);
            } else if (op === 7) {
                process.exit();
            }
        } catch (err) {
            console.error("Error processing message:", err);
        }
    };
    
    setInterval(() => {
        const req = session.request({
            ":method": "GET",
            ":path": "/",
            ":authority": "canary.discord.com",
            ":scheme": "https"
        });
        req.end();
    }, 10000);
}

function connectHTTP2() {
    if(session) session.close();
    session = http2.connect("https://canary.discord.com", {
        settings: {
            enablePush: false
        },
        secureContext: tls.createSecureContext({
            secureProtocol: 'TLSv1_2_method'
        })
    });
    
    session.on('error', () => {
        setTimeout(connectHTTP2, 15000);
    });
    
    session.on('close', () => {
        setTimeout(connectHTTP2, 15000);
    });
    
    session.on("connect", () => {
        setTimeout(connectWebSocket, 2000);
    });
}
async function initialize() {
    await readMFAToken();
    await handleMfa();
    connectHTTP2();
    setInterval(readMFAToken, 300000);
}
initialize();
