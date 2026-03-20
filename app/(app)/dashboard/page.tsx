"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../components/wallet/WalletProvider";

export default function DashboardPage() {
  const { address, role, isConnecting, error, connect } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!address) return;
    const map: Record<string, string> = {
      ADMIN: "/dashboard/admin",
      MANUFACTURER: "/dashboard/manufacturer",
      DISTRIBUTOR: "/dashboard/distributor",
      PHARMACY: "/dashboard/pharmacy",
    };
    const target = map[role];
    if (target) router.replace(target);
  }, [address, role, router]);

  if (!address) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <span className="text-2xl">🔐</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-zinc-100">
            Connect your wallet
          </h1>
          <p className="max-w-sm text-sm text-zinc-400">
            MediGuard uses wallet-based authentication. Connect MetaMask to
            access your role dashboard.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={connect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60 transition-colors"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnecting ? "animate-pulse bg-amber-500" : "bg-zinc-400"
              }`}
            />
            {isConnecting ? "Connecting…" : "Connect MetaMask"}
          </button>

          {/* Inline error instead of alert */}
          {error && (
            <div className="flex max-w-xs items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <span className="mt-0.5 text-rose-400">⚠</span>
              <p className="text-left text-xs leading-relaxed text-rose-300">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-zinc-600">
            No wallet?{" "}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline hover:text-zinc-200"
            >
              Install MetaMask
            </a>
          </p>
          <p className="text-[11px] text-zinc-600">
            Testing locally? Switch MetaMask to{" "}
            <span className="font-mono text-zinc-500">
              Hardhat Local (chainId 31337, RPC http://127.0.0.1:8545)
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (role === "NONE" || role === "UNKNOWN") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <span className="text-2xl">⛔</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-zinc-100">
            No role assigned
          </h1>
          <p className="max-w-sm text-sm text-zinc-400">
            Wallet{" "}
            <span className="font-mono text-zinc-300">
              {address.slice(0, 8)}…{address.slice(-4)}
            </span>{" "}
            has no supply chain role. Contact an Admin wallet to get assigned.
          </p>
        </div>
        <a
          href="/verify"
          className="text-sm text-zinc-400 underline hover:text-zinc-200"
        >
          You can still verify medicines publicly →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        Redirecting to your dashboard…
      </div>
    </div>
  );
}
