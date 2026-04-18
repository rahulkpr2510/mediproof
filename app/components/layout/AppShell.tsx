"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { ConnectWalletButton } from "../wallet/ConnectWalletButton";
import { useWallet } from "../wallet/WalletProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, role } = useWallet();

  const isLanding = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group" id="nav-logo">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 ring-0 transition group-hover:border-zinc-500">
              <span className="font-display text-xs font-semibold text-zinc-200 italic">M</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                MediProof
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5 hidden sm:block">
                Anti-counterfeit trust network
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/#features"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            >
              Features
            </Link>
            <Link
              href="/verify"
              id="nav-verify"
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
                id="nav-dashboard"
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname.startsWith("/dashboard")
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                Dashboard
                {role !== null && (
                  <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {role}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Auth + Wallet */}
          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-3.5 py-1.5 text-[11px] font-semibold text-zinc-900 transition hover:bg-white md:hidden"
            >
              Verify
            </Link>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              >
                Sign in
              </Link>
            </Show>
            <Show when="signed-in">
              <ConnectWalletButton />
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </Show>
          </div>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {isLanding ? children : <div className="page-shell">{children}</div>}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900">
                <span className="font-display text-[10px] font-semibold italic text-zinc-400">M</span>
              </div>
              <span className="text-[11px] text-zinc-600">
                MediProof © 2026 — Supply-chain trust infrastructure
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-zinc-600">
              <Link href="/verify" className="hover:text-zinc-400 transition-colors">
                Verify medicine
              </Link>
              <span className="text-zinc-800">·</span>
              <Link href="/contact" className="hover:text-zinc-400 transition-colors">
                Contact us
              </Link>
              <span className="text-zinc-800">·</span>
              <Link href="/report" className="hover:text-zinc-400 transition-colors">
                Report issue
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
