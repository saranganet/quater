"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, ArrowLeftRight } from "lucide-react";

export function ChamberHeaderActions() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/firm", { method: "DELETE" });
      router.refresh();
      window.location.reload();
    } catch (err) {
      console.error("Error signing out:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isLoggingOut}
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors disabled:opacity-50"
    >
      {isLoggingOut ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-500" />
      )}
      <span>Switch Chamber</span>
    </button>
  );
}
