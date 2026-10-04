"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  LogOut,
  Send,
  Loader2,
  X,
  RefreshCw,
  Check,
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
  const [testMessage, setTestMessage] = useState("QUATER UPDATE: Automated court notification gateway connected.");
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
      setStatus({
        status: "DISCONNECTED",
        qrCodeDataUrl: null,
        rawQr: null,
        connectedPhone: null,
        connectedName: null,
        lastError: "Gateway offline",
        updatedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, isOpen ? 3000 : 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleLogout = async () => {
    if (!confirm("Disconnect this WhatsApp number?")) return;
    setLoading(true);
    try {
      await fetch("/api/whatsapp/logout", { method: "POST" });
      await fetchStatus();
    } catch (err: any) {
      alert("Failed: " + err.message);
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
          message: data.info || "Delivered to WhatsApp.",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to send.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Gateway unreachable.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = status?.status === "CONNECTED";
  const isScan = status?.status === "SCAN_QR";

  return (
    <>
      {/* Top Navbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium border border-neutral-300 hover:border-black bg-white text-neutral-900 transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? "bg-emerald-600"
              : isScan
              ? "bg-amber-500 animate-pulse"
              : "bg-neutral-400"
          }`}
        />
        {isConnected ? (
          <span>+{status?.connectedPhone}</span>
        ) : isScan ? (
          <span>Scan WhatsApp QR</span>
        ) : (
          <span>WhatsApp Disconnected</span>
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-neutral-200 rounded-xl p-6 shadow-2xl text-neutral-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  WhatsApp Device Gateway
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Link dedicated business number via QR
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Based on Status */}
            {isConnected ? (
              <div className="space-y-5">
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-black">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Connected: +{status.connectedPhone}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    All case updates will dispatch automatically from this phone.
                  </p>
                </div>

                {/* Test Message Box */}
                <form onSubmit={handleSendTest} className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Test Live Dispatch
                  </label>
                  <input
                    type="text"
                    placeholder="Phone number (+91 98...)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs font-mono text-black placeholder-neutral-400 focus:outline-none focus:border-black"
                    required
                  />
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    disabled={sendingTest || !testPhone}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-black hover:bg-neutral-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Test Ping
                      </>
                    )}
                  </button>
                </form>

                {testResult && (
                  <div
                    className={`p-3 rounded-md text-xs border font-mono ${
                      testResult.success
                        ? "bg-neutral-50 border-neutral-300 text-neutral-900"
                        : "bg-neutral-50 border-rose-300 text-rose-700"
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}

                {/* Disconnect Button */}
                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-rose-600 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Unlink Number
                  </button>
                </div>
              </div>
            ) : isScan ? (
              <div className="space-y-4 text-center">
                <p className="text-xs text-neutral-600">
                  Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device.
                </p>

                {/* QR Code Render */}
                <div className="flex justify-center py-2">
                  <div className="p-3 bg-white border border-neutral-300 rounded-lg shadow-sm">
                    {status.qrCodeDataUrl ? (
                      <img
                        src={status.qrCodeDataUrl}
                        alt="WhatsApp Web QR Code"
                        className="w-56 h-56"
                      />
                    ) : (
                      <div className="w-56 h-56 flex flex-col items-center justify-center text-neutral-400 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-black" />
                        Generating code...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-neutral-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Refreshing QR code every 3s
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4 text-center">
                <p className="text-xs text-neutral-600">
                  Gateway offline. Starting service in background...
                </p>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="px-3 py-1.5 rounded-md border border-neutral-300 hover:border-black text-xs font-mono"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
