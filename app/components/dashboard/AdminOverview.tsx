"use client";

import { FormEvent, useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";

type AssignableRole = "MANUFACTURER" | "DISTRIBUTOR" | "PHARMACY" | "ADMIN";

interface RoleEntry {
  id: string;
  wallet: string;
  role: AssignableRole;
  createdAt: string;
}

const ROLE_COLORS: Record<AssignableRole, string> = {
  MANUFACTURER: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
  DISTRIBUTOR: "bg-violet-500/10 text-violet-400 ring-violet-500/30",
  PHARMACY: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  ADMIN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
};

export function AdminOverview() {
  const { address, role } = useWallet();
  const [items, setItems] = useState<RoleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState<AssignableRole>("MANUFACTURER");
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<AssignableRole | "ALL">("ALL");

  async function load() {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { "x-wallet-address": address },
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: RoleEntry[] };
      setItems(data.items ?? []);
    } catch {
      setError("Unable to load roles.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [address]); // eslint-disable-line

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newAddress.trim()) {
      setError("Address required");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address ?? "",
        },
        body: JSON.stringify({ address: newAddress.trim(), role: newRole }),
      });
      if (!res.ok) throw new Error();
      setNewAddress("");
      await load();
    } catch {
      setError("Failed to assign role. Ensure your wallet is ADMIN on-chain.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(wallet: string) {
    if (!window.confirm(`Revoke role from ${wallet}?`)) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address ?? "",
        },
        body: JSON.stringify({ address: wallet }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Failed to revoke role.");
    }
  }

  const filtered =
    filter === "ALL" ? items : items.filter((i) => i.role === filter);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Admin — Role management
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Assign and revoke roles for all supply chain actors. All changes are
          mirrored to the on-chain RoleManager contract.
        </p>
        {role !== "ADMIN" && (
          <p className="text-[11px] text-amber-400">
            Connected wallet role: <strong>{role}</strong>. Only ADMIN wallets
            can modify roles.
          </p>
        )}
      </header>

      <div className="page-grid">
        <section className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">Assign role</h2>
            <p className="text-xs text-zinc-400">
              Assign any supply chain role to a wallet address.
            </p>
          </div>
          <form onSubmit={handleAssign} className="flex flex-col gap-3">
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="0x… wallet address"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AssignableRole)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
            >
              <option value="MANUFACTURER">MANUFACTURER</option>
              <option value="DISTRIBUTOR">DISTRIBUTOR</option>
              <option value="PHARMACY">PHARMACY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : `Assign ${newRole}`}
            </button>
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </form>
        </section>

        <section className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">All roles</h2>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as AssignableRole | "ALL")
              }
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="MANUFACTURER">Manufacturers</option>
              <option value="DISTRIBUTOR">Distributors</option>
              <option value="PHARMACY">Pharmacies</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Wallet</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Since</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-xs text-zinc-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-xs text-zinc-500"
                    >
                      No roles assigned.
                    </td>
                  </tr>
                )}
                {filtered.map((item) => (
                  <tr key={item.id} className="text-xs text-zinc-200">
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                      {item.wallet.slice(0, 8)}…{item.wallet.slice(-4)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`pill ring-1 ${ROLE_COLORS[item.role]}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleRevoke(item.wallet)}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-rose-400"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
