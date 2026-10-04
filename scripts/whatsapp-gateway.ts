import http from "http";
import path from "path";
import fs from "fs";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

const PORT = parseInt(process.env.WHATSAPP_GATEWAY_PORT || "3001", 10);
const AUTH_DIR = path.join(process.cwd(), ".whatsapp_auth");

// Ensure auth dir exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export type GatewayStatus = "CONNECTING" | "SCAN_QR" | "CONNECTED" | "DISCONNECTED";

interface GatewayState {
  status: GatewayStatus;
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
  updatedAt: string;
}

const state: GatewayState = {
  status: "CONNECTING",
  qrCodeDataUrl: null,
  rawQr: null,
  connectedPhone: null,
  connectedName: null,
  lastError: null,
  updatedAt: new Date().toISOString(),
};

let sock: WASocket | null = null;
let isStarting = false;

// Format phone number to WhatsApp JID (e.g. 919876543210@s.whatsapp.net)
function formatToJid(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  // Default to India (91) if 10 digits provided
  if (clean.length === 10) {
    clean = "91" + clean;
  }
  return `${clean}@s.whatsapp.net`;
}

// Small sleep utility for rate limiting
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWhatsAppGateway() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp Gateway] Using WA Web v${version.join(".")}, isLatest: ${isLatest}`);

    sock = makeWASocket({
      version,
      auth: authState,
      logger: pino({ level: "silent" }),
      printQRInTerminal: true, // Also prints to terminal for convenience
      browser: ["Quater Case Updates", "Chrome", "1.0.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.status = "SCAN_QR";
        state.rawQr = qr;
        try {
          state.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        } catch (e: any) {
          console.error("[WhatsApp Gateway] Error generating QR data URL:", e.message);
        }
        state.updatedAt = new Date().toISOString();
        console.log("[WhatsApp Gateway] New QR code generated. Waiting for scan...");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[WhatsApp Gateway] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`
        );

        state.status = "DISCONNECTED";
        state.connectedPhone = null;
        state.connectedName = null;
        state.lastError = lastDisconnect?.error?.message || "Connection closed";
        state.updatedAt = new Date().toISOString();

        if (statusCode === DisconnectReason.loggedOut) {
          console.log("[WhatsApp Gateway] Logged out. Clearing credentials directory.");
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (err: any) {
            console.error("[WhatsApp Gateway] Failed to reset auth dir:", err.message);
          }
        }

        isStarting = false;
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppGateway(), 4000);
        }
      } else if (connection === "open") {
        const userJid = sock?.user?.id || "";
        const userPhone = userJid.split(":")[0]?.split("@")[0] || userJid;
        const userName = sock?.user?.name || "Quater Host";

        state.status = "CONNECTED";
        state.qrCodeDataUrl = null;
        state.rawQr = null;
        state.connectedPhone = userPhone;
        state.connectedName = userName;
        state.lastError = null;
        state.updatedAt = new Date().toISOString();

        console.log(`[WhatsApp Gateway] ✅ SUCCESSFULLY CONNECTED as +${userPhone} (${userName})`);
        isStarting = false;
      }
    });
  } catch (error: any) {
    console.error("[WhatsApp Gateway] Fatal error during initialization:", error);
    state.status = "DISCONNECTED";
    state.lastError = error.message;
    state.updatedAt = new Date().toISOString();
    isStarting = false;
    setTimeout(() => startWhatsAppGateway(), 5000);
  }
}

// HTTP API Server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // 1. Status / QR Endpoint
  if (req.method === "GET" && (url.pathname === "/status" || url.pathname === "/api/status")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(state));
    return;
  }

  // 2. Send Message Endpoint
  if (req.method === "POST" && (url.pathname === "/send" || url.pathname === "/api/send")) {
    if (state.status !== "CONNECTED" || !sock) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: "WhatsApp gateway is not connected. Please scan the QR code first.",
          status: state.status,
        })
      );
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const { to, message } = payload;

        if (!to || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Missing 'to' or 'message' parameter" }));
          return;
        }

        const jid = formatToJid(to);
        console.log(`[WhatsApp Gateway] Dispatching message to ${jid}...`);

        // Human-like pause (1.5 seconds) to avoid trigger flags
        await sleep(1500);

        if (!sock) {
          throw new Error("WhatsApp socket connection lost. Please reconnect.");
        }

        const sent = await sock.sendMessage(jid, { text: message });
        const messageId = sent?.key?.id || `wa_msg_${Date.now()}`;

        console.log(`[WhatsApp Gateway] ✅ Message sent to ${jid} (ID: ${messageId})`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, messageId, to: jid }));
      } catch (sendErr: any) {
        console.error("[WhatsApp Gateway] Error sending message:", sendErr);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: sendErr.message }));
      }
    });
    return;
  }

  // 3. Logout Endpoint
  if (req.method === "POST" && (url.pathname === "/logout" || url.pathname === "/api/logout")) {
    try {
      console.log("[WhatsApp Gateway] Logging out upon user request...");
      if (sock) {
        await sock.logout();
      }
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });

      state.status = "CONNECTING";
      state.connectedPhone = null;
      state.connectedName = null;
      state.qrCodeDataUrl = null;

      setTimeout(() => startWhatsAppGateway(), 1000);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Logged out successfully" }));
    } catch (logoutErr: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: logoutErr.message }));
    }
    return;
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found" }));
});

// Start Gateway
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Quater WhatsApp Gateway running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  - GET  /status : Current connection status & QR code`);
  console.log(`  - POST /send   : Send outbound WhatsApp text message`);
  console.log(`  - POST /logout : Disconnect & reset session`);
  console.log(`====================================================`);
  startWhatsAppGateway();
});
