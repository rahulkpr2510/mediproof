"use client";

import Link from "next/link";
import { useWallet } from "./WalletProvider";

export function ConnectWalletButton() {
  const { address, isConnecting, error, connect, disconnect, role } =
    useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-100 shadow-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {address.slice(0, 6)}…{address.slice(-4)}
          {role !== "UNKNOWN" && role !== "NONE" && (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
              {role}
            </span>
          )}
        </Link>
        <button
          onClick={disconnect}
          className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 shadow-sm hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-60 transition-colors"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isConnecting ? "animate-pulse bg-amber-400" : "bg-zinc-600"
          }`}
        />
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>

      {/* Inline error — no alert() */}
      {error && (
        <p className="max-w-55 text-right text-[10px] leading-snug text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
