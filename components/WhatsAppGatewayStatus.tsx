"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  LogOut,
  Send,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";

interface GatewayStatus {
  status: "CONNECTING" | "SCAN_QR" | "CONNECTED" | "DISCONNECTED";
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
  updatedAt: string;
}

export function WhatsAppGatewayStatus() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Test message states
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from Quater! ⚖️ Your automated court case notification system is connected.");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Offline
      setStatus({
        status: "DISCONNECTED",
        qrCodeDataUrl: null,
        rawQr: null,
        connectedPhone: null,
        connectedName: null,
        lastError: "Cannot reach gateway",
        updatedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds while modal is open, or every 10 seconds in background
    const interval = setInterval(fetchStatus, isOpen ? 3000 : 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp number?")) return;
    setLoading(true);
    try {
      await fetch("/api/whatsapp/logout", { method: "POST" });
      await fetchStatus();
    } catch (err: any) {
      alert("Failed to disconnect: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.info || "WhatsApp message delivered successfully!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to send message",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to connect to gateway",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = status?.status === "CONNECTED";
  const isScan = status?.status === "SCAN_QR";
  const isDisconnected = status?.status === "DISCONNECTED";

  return (
    <>
      {/* Top Navbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          isConnected
            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
            : isScan
            ? "bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse hover:bg-amber-900/60"
            : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : isScan
              ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
              : "bg-rose-500"
          }`}
        />
        {isConnected ? (
          <span>WhatsApp: +{status?.connectedPhone}</span>
        ) : isScan ? (
          <span>Scan WhatsApp QR</span>
        ) : (
          <span>WhatsApp Gateway</span>
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Quater WhatsApp Gateway</h3>
                  <p className="text-xs text-slate-400">
                    Connect your dedicated WhatsApp Business number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Based on Status */}
            {isConnected ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">
                      Connected to +{status.connectedPhone}
                    </div>
                    <div className="text-xs text-emerald-300/80">
                      All court case alerts for both Lawyers and Clients will be dispatched automatically from this number.
                    </div>
                  </div>
                </div>

                {/* Test Message Box */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-400" />
                    Send Live Test WhatsApp Message
                  </h4>
                  <p className="text-xs text-slate-400">
                    Enter your phone number below to test real-time message delivery right now:
                  </p>
                  <form onSubmit={handleSendTest} className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210 or 9876543210"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingTest || !testPhone}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                    >
                      {sendingTest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending via Quater WhatsApp...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Dispatch Test Message
                        </>
                      )}
                    </button>
                  </form>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg text-xs border ${
                        testResult.success
                          ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                          : "bg-rose-950/50 border-rose-500/40 text-rose-200"
                      }`}
                    >
                      {testResult.message}
                    </div>
                  )}
                </div>

                {/* Disconnect Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 py-1.5 px-3 rounded-lg border border-rose-500/20 hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Number / Scan Different SIM
                  </button>
                </div>
              </div>
            ) : isScan ? (
              <div className="text-center space-y-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-300">
                    Scan with WhatsApp on your Phone
                  </h4>
                  <p className="text-xs text-slate-400">
                    Use your dedicated test SIM card number to link Quater
                  </p>
                </div>

                {/* QR Code Render */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/20">
                    {status.qrCodeDataUrl ? (
                      <img
                        src={status.qrCodeDataUrl}
                        alt="WhatsApp Web QR Code"
                        className="w-64 h-64 rounded-lg"
                      />
                    ) : (
                      <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                        <span className="text-xs mt-2">Generating QR Code...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step by step guide */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-white">How to link:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap <strong className="text-slate-200">Settings</strong> (or 3 dots on Android)</li>
                    <li>Select <strong className="text-slate-200">Linked Devices</strong></li>
                    <li>Tap <strong className="text-slate-200">Link a Device</strong> and point your camera here</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Auto-refreshing QR code every 3 seconds...
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl inline-block text-rose-400">
                  <AlertCircle className="w-8 h-8 mx-auto" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    Gateway Connecting or Offline
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {status?.lastError || "The WhatsApp background service is initializing. Please wait a moment."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Connection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
