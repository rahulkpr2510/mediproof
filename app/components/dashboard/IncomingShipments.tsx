"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";

interface IncomingShipment {
  shipmentId: string;
  batchId: string;
  senderWallet: string;
  receiverWallet: string;
  requestedBy?: string;
  unitStart: number;
  unitEnd: number;
  quantity: number;
  status: string;
  requestedAt: string;
  batch?: { medicineName: string };
}

const STATUS_PILL: Record<string, string> = {
  REQUESTED: "pill bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700",
  APPROVED: "pill bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30",
  DISPATCHED: "pill bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
  DELIVERED: "pill-green",
};

interface Props {
  apiPath: string;
  patchPath?: string; // ← PATCH endpoint, defaults to apiPath
  title?: string;
  onStockChange?: () => void;
}

export function IncomingShipments({
  apiPath,
  patchPath,
  title = "Incoming shipment requests",
  onStockChange,
}: Props) {
  const { address } = useWallet();
  const [shipments, setShipments] = useState<IncomingShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiPath, {
        headers: { "x-wallet-address": address },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: IncomingShipment[] };
      const norm = address.toLowerCase();
      setShipments(
        data.items.filter((s) => s.senderWallet.toLowerCase() === norm),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [address, apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    shipmentId: string,
    action: "approve" | "dispatch" | "confirm",
  ) {
    if (!address) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(patchPath ?? apiPath, {
        // ← use patchPath
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({ shipmentId, action }),
      });
      if (!res.ok) {
        let msg = "Action failed";
        try {
          const err = (await res.json()) as { error?: string };
          msg = err.error ?? msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }
      const label =
        action === "approve"
          ? "approved"
          : action === "dispatch"
          ? "dispatched"
          : "confirmed";
      setActionSuccess(`Shipment ${label} successfully.`);
      await load();
      onStockChange?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
  }

  const pending = shipments.filter((s) =>
    ["REQUESTED", "APPROVED"].includes(s.status),
  );
  const past = shipments.filter((s) =>
    ["DISPATCHED", "DELIVERED"].includes(s.status),
  );

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-400">
            Approve then dispatch to transfer custody on-chain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
              {pending.length}
            </span>
          )}
          <button
            onClick={() => void load()}
            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
          <span className="text-rose-400">⚠</span>
          <p className="text-xs text-rose-300">{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <p className="text-xs text-emerald-400">{actionSuccess}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        </div>
      ) : shipments.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-500">
          No incoming shipment requests yet.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400">
                Needs action ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map((s) => (
                  <div
                    key={s.shipmentId}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        {s.batch && (
                          <p className="text-xs font-medium text-zinc-100">
                            {s.batch.medicineName}
                          </p>
                        )}
                        <p className="font-mono text-[11px] text-zinc-400">
                          {s.shipmentId.slice(0, 18)}…
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Units {s.unitStart}–{s.unitEnd} · {s.quantity} units
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          Requested by:{" "}
                          <span className="font-mono">
                            {(s.requestedBy ?? s.receiverWallet).slice(0, 10)}…
                          </span>{" "}
                          · {new Date(s.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={STATUS_PILL[s.status] ?? "pill"}>
                          {s.status}
                        </span>
                        <div className="flex gap-1.5">
                          {s.status === "REQUESTED" && (
                            <button
                              onClick={() => void act(s.shipmentId, "approve")}
                              className="rounded border border-blue-700/50 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {s.status === "APPROVED" && (
                            <button
                              onClick={() => void act(s.shipmentId, "dispatch")}
                              className="rounded border border-amber-700/50 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                            >
                              Dispatch →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                History ({past.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-zinc-800/60">
                <table className="min-w-full divide-y divide-zinc-800 text-xs">
                  <thead className="bg-zinc-950/80 text-[10px] uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Shipment</th>
                      <th className="px-3 py-2 text-left">Medicine</th>
                      <th className="px-3 py-2 text-left">Units</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {past.map((s) => (
                      <tr key={s.shipmentId} className="text-zinc-300">
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">
                          {s.shipmentId.slice(0, 14)}…
                        </td>
                        <td className="px-3 py-2">
                          {s.batch?.medicineName ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">
                          {s.unitStart}–{s.unitEnd}
                        </td>
                        <td className="px-3 py-2">
                          <span className={STATUS_PILL[s.status] ?? "pill"}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
