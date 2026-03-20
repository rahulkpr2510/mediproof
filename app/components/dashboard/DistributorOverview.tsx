// app/components/dashboard/DistributorOverview.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Shipment } from "../../lib/domain";
import { useWallet } from "../wallet/WalletProvider";
import { IncomingShipments } from "./IncomingShipments";
import { StockPanel } from "./StockPanel";

const STATUS_PILL: Record<string, string> = {
  REQUESTED: "pill bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700",
  APPROVED: "pill bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30",
  DISPATCHED: "pill bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
  DELIVERED: "pill-green",
};

export function DistributorOverview() {
  const { address, role } = useWallet();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [coldForm, setColdForm] = useState({
    shipmentId: "",
    temperature: "",
    location: "",
  });
  const [coldMsg, setColdMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    batchId: "",
    senderWallet: "",
    unitStart: 1,
    unitEnd: 10,
  });
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockKey, setStockKey] = useState(0);

  const loadShipments = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch("/api/distributor/shipments", {
        headers: { "x-wallet-address": address },
      });
      if (!res.ok) return;
      setShipments(((await res.json()) as { items: Shipment[] }).items);
    } catch (err) {
      console.error(err);
    }
  }, [address]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  async function requestShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setReqError(null);
    setReqSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/distributor/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({
          batchId: form.batchId.trim(),
          senderWallet: form.senderWallet.trim(),
          unitStart: Number(form.unitStart),
          unitEnd: Number(form.unitEnd),
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }
      setReqSuccess(
        "Shipment requested. The sender will see it in their dashboard.",
      );
      setForm({ batchId: "", senderWallet: "", unitStart: 1, unitEnd: 10 });
      await loadShipments();
    } catch (err) {
      setReqError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateShipment(
    shipmentId: string,
    action: "approve" | "dispatch" | "confirm",
  ) {
    if (!address) return;
    try {
      const res = await fetch("/api/distributor/shipments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({ shipmentId, action }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        console.error("PATCH failed:", err.error);
      }
      await loadShipments();
    } catch (err) {
      console.error(err);
    }
  }

  async function submitColdLog(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setColdMsg(null);
    try {
      const res = await fetch("/api/cold-chain/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({
          shipmentId: coldForm.shipmentId.trim(),
          temperature: parseFloat(coldForm.temperature),
          location: coldForm.location.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { safe?: boolean };
      setColdMsg(
        data.safe
          ? "✓ Temperature logged — within safe range."
          : "⚠ Temperature breach logged — batch flagged suspicious.",
      );
      setColdForm({ shipmentId: "", temperature: "", location: "" });
    } catch (err) {
      console.error(err);
      setColdMsg("Failed to log temperature.");
    }
  }

  function canAct(s: Shipment, action: "approve" | "dispatch" | "confirm") {
    const norm = address?.toLowerCase();
    if (action === "approve")
      return s.status === "REQUESTED" && s.senderWallet.toLowerCase() === norm;
    if (action === "dispatch")
      return s.status === "APPROVED" && s.senderWallet.toLowerCase() === norm;
    if (action === "confirm")
      return (
        s.status === "DISPATCHED" && s.receiverWallet.toLowerCase() === norm
      );
    return false;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Distributor dashboard
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Request shipments from manufacturers, manage custody transfers, and
          log cold-chain telemetry at each hop.
        </p>
        {role !== "DISTRIBUTOR" && (
          <p className="text-[11px] text-amber-400">
            Connected role: <strong>{role}</strong>. DISTRIBUTOR required.
          </p>
        )}
      </header>

      {/* ── Incoming requests from pharmacies ── */}
      <IncomingShipments
        apiPath="/api/distributor/shipments"
        title="Incoming requests from pharmacies"
        onStockChange={() => setStockKey((k) => k + 1)}
      />

      <div className="page-grid">
        {/* ── Request shipment from manufacturer ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Request shipment
            </h2>
            <p className="text-xs text-zinc-400">
              Request a batch transfer from a manufacturer. They will see it in
              their dashboard and approve + dispatch.
            </p>
          </div>

          <form
            onSubmit={requestShipment}
            className="grid gap-2 md:grid-cols-2"
          >
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-zinc-500">Batch ID</label>
              <input
                value={form.batchId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batchId: e.target.value }))
                }
                placeholder="0x… batch identifier"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-zinc-500">
                Sender wallet (manufacturer)
              </label>
              <input
                value={form.senderWallet}
                onChange={(e) =>
                  setForm((p) => ({ ...p, senderWallet: e.target.value }))
                }
                placeholder="0x… manufacturer wallet address"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">
                Unit start (serial #)
              </label>
              <input
                type="number"
                min={1}
                value={form.unitStart}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unitStart: Number(e.target.value) }))
                }
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">
                Unit end (serial #)
              </label>
              <input
                type="number"
                min={form.unitStart}
                value={form.unitEnd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unitEnd: Number(e.target.value) }))
                }
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="md:col-span-2 rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "Requesting…" : "Request shipment"}
            </button>
          </form>

          {reqError && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <span className="text-rose-400">⚠</span>
              <p className="text-xs text-rose-300">{reqError}</p>
            </div>
          )}
          {reqSuccess && (
            <p className="text-xs text-emerald-400">{reqSuccess}</p>
          )}
        </section>

        {/* ── Cold-chain log ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Log cold-chain reading
            </h2>
            <p className="text-xs text-zinc-400">
              Submit temperature telemetry for a shipment in transit. Safe
              range: 2°C–8°C.
            </p>
          </div>
          <form onSubmit={submitColdLog} className="flex flex-col gap-2">
            <input
              value={coldForm.shipmentId}
              onChange={(e) =>
                setColdForm((p) => ({ ...p, shipmentId: e.target.value }))
              }
              placeholder="Shipment ID (e.g. SHP-0x…)"
              required
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <input
              value={coldForm.temperature}
              onChange={(e) =>
                setColdForm((p) => ({ ...p, temperature: e.target.value }))
              }
              placeholder="Temperature °C (e.g. 5.2)"
              type="number"
              step="0.1"
              required
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <input
              value={coldForm.location}
              onChange={(e) =>
                setColdForm((p) => ({ ...p, location: e.target.value }))
              }
              placeholder="Location (optional, e.g. Hub-Delhi)"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              Submit reading
            </button>
          </form>
          {coldMsg && (
            <p
              className={`text-xs ${
                coldMsg.startsWith("✓") ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {coldMsg}
            </p>
          )}
        </section>
      </div>

      {/* ── My outbound shipments ── */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              My shipments
            </h2>
            <p className="text-xs text-zinc-400">
              Orders you placed with manufacturers. {/* ← updated */}
            </p>
          </div>
          <span className="text-[11px] text-zinc-600">
            {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Shipment</th>
                <th className="px-3 py-2 text-left font-medium">Batch</th>
                <th className="px-3 py-2 text-left font-medium">Units</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {shipments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-xs text-zinc-500"
                  >
                    No shipments yet.
                  </td>
                </tr>
              )}
              {shipments.map((s) => (
                <tr key={s.shipmentId} className="text-xs text-zinc-200">
                  <td
                    className="px-3 py-2 font-mono text-[11px] text-zinc-400"
                    title={s.shipmentId}
                  >
                    {s.shipmentId.slice(0, 14)}…
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-[11px] text-zinc-400"
                    title={s.batchId}
                  >
                    {s.batchId.slice(0, 10)}…
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {s.unitStart}–{s.unitEnd}
                    <span className="ml-1 text-zinc-500">({s.quantity})</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={STATUS_PILL[s.status] ?? "pill"}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      {canAct(s, "approve") && (
                        <button
                          onClick={() =>
                            updateShipment(s.shipmentId, "approve")
                          }
                          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {canAct(s, "dispatch") && (
                        <button
                          onClick={() =>
                            updateShipment(s.shipmentId, "dispatch")
                          }
                          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
                      {canAct(s, "confirm") && (
                        <button
                          onClick={async () => {
                            await updateShipment(s.shipmentId, "confirm");
                            setStockKey((k) => k + 1); // ← refresh stock after confirm
                          }}
                          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-950 transition-colors"
                        >
                          Confirm receipt
                        </button>
                      )}
                      {s.status === "DELIVERED" && (
                        <span className="text-[10px] text-emerald-500">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
