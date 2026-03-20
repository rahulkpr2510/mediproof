"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ConnectWalletButton } from "../wallet/ConnectWalletButton";
import { useWallet } from "../wallet/WalletProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, role } = useWallet();

  const isLanding = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-700">
              <span className="text-xs font-bold tracking-tight">MP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight leading-none">
                MediProof
              </span>
              <span className="text-[10px] text-zinc-500 leading-none mt-0.5">
                Anti-counterfeit trust network
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/verify"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                pathname === "/verify"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              Verify medicine
            </Link>
            {address && role !== "NONE" && role !== "UNKNOWN" && (
              <Link
                href="/dashboard"
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname.startsWith("/dashboard")
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                Dashboard
                {role !== null && (
                  <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {role}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Wallet */}
          <ConnectWalletButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {isLanding ? children : <div className="page-shell">{children}</div>}
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-[11px] text-zinc-600 md:px-6 lg:px-8">
          <span>MediGuard © 2026 — Supply chain trust infrastructure</span>
          <span className="hidden sm:inline">
            Blockchain + anomaly intelligence
          </span>
        </div>
      </footer>
    </div>
  );
}
