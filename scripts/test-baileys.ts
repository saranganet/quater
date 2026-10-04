import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

console.log("Baileys loaded successfully:", typeof makeWASocket, typeof useMultiFileAuthState);
