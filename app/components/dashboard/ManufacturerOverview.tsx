// app/components/dashboard/ManufacturerOverview.tsx
"use client";

import { useEffect, useState } from "react";
import { Batch, ManufacturerReputation, ColdChainLog } from "../../lib/domain";
import { useWallet } from "../wallet/WalletProvider";
import { QRExportModal } from "../qr/QRExportModal";
import { IncomingShipments } from "./IncomingShipments";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "pill-green",
  RECALLED: "pill-red",
  EXPIRED: "pill-red",
  SUSPICIOUS: "pill-amber",
};

export function ManufacturerOverview() {
  const { address, role } = useWallet();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [reputation, setReputation] = useState<ManufacturerReputation | null>(
    null,
  );
  const [coldLogs, setColdLogs] = useState<ColdChainLog[]>([]);
  const [form, setForm] = useState({
    medicineName: "",
    manufactureDate: "",
    expiryDate: "",
    totalQuantity: 100,
    batchNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [qrBatch, setQrBatch] = useState<{
    batchId: string;
    medicineName: string;
  } | null>(null);

  async function loadAll() {
    if (!address) return;
    try {
      const [bRes, rRes, cRes] = await Promise.all([
        fetch("/api/manufacturer/batches", {
          headers: { "x-wallet-address": address },
        }),
        fetch(`/api/manufacturer/reputation?address=${address}`, {
          headers: { "x-wallet-address": address },
        }),
        fetch("/api/cold-chain/logs", {
          headers: { "x-wallet-address": address },
        }),
      ]);
      if (bRes.ok)
        setBatches(((await bRes.json()) as { items: Batch[] }).items);
      if (rRes.ok)
        setReputation(
          ((await rRes.json()) as { reputation: ManufacturerReputation })
            .reputation,
        );
      if (cRes.ok)
        setColdLogs(
          ((await cRes.json()) as { logs: ColdChainLog[] }).logs.slice(0, 10),
        );
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [address]); // eslint-disable-line

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSaveError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/manufacturer/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({
          ...form,
          totalQuantity: Number(form.totalQuantity),
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }
      const data = (await res.json()) as { batch: Batch; unitCount: number };
      setSuccessMsg(
        `Batch created with ${data.unitCount} serialized units. Blockchain anchoring running in background.`,
      );
      setForm({
        medicineName: "",
        manufactureDate: "",
        expiryDate: "",
        totalQuantity: 100,
        batchNumber: "",
      });
      await loadAll();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to create batch",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function recallBatch(batchId: string) {
    if (
      !address ||
      !window.confirm(
        "Recall this batch? All units will be marked unsafe across the supply chain.",
      )
    )
      return;
    try {
      const res = await fetch("/api/manufacturer/batches", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({ batchId, status: "RECALLED" }),
      });
      if (!res.ok) throw new Error();
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Manufacturer dashboard
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Register batches on-chain, serialize units with anti-clone secrets,
          export QR codes, monitor cold-chain integrity, and track your
          reputation score.
        </p>
        {role !== "MANUFACTURER" && (
          <p className="text-[11px] text-amber-400">
            Connected role: <strong>{role}</strong>. MANUFACTURER role required
            for batch operations.
          </p>
        )}
      </header>

      <div className="page-grid">
        {/* ── Create batch form ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Register batch
            </h2>
            <p className="text-xs text-zinc-400">
              Creates a batch on-chain and serializes every unit with a unique
              anti-clone QR secret.
            </p>
          </div>

          <form onSubmit={createBatch} className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">Medicine name</label>
              <input
                value={form.medicineName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, medicineName: e.target.value }))
                }
                placeholder="e.g. Amoxicillin 500mg"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">
                Internal batch number
              </label>
              <input
                value={form.batchNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batchNumber: e.target.value }))
                }
                placeholder="e.g. B-2026-001"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">
                Manufacture date
              </label>
              <input
                type="date"
                value={form.manufactureDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, manufactureDate: e.target.value }))
                }
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">Expiry date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expiryDate: e.target.value }))
                }
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-zinc-500">
                Total units to serialize
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={form.totalQuantity}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    totalQuantity: Number(e.target.value),
                  }))
                }
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <p className="text-[10px] text-zinc-600">
                Max 10,000 per batch. Each unit gets a unique QR secret.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="md:col-span-2 rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60 transition-colors"
            >
              {isSaving
                ? "Creating + anchoring on-chain…"
                : "Create serialized batch"}
            </button>
          </form>

          {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
          {successMsg && (
            <p className="text-xs text-emerald-400">{successMsg}</p>
          )}
        </section>

        {/* ── Reputation ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-zinc-100">
                Reputation score
              </h2>
              <p className="text-xs text-zinc-400">
                Computed from anomalies, recalls, and delivery reliability.
              </p>
            </div>
            {reputation && (
              <span
                className={`text-2xl font-bold ${
                  reputation.score >= 80
                    ? "text-emerald-400"
                    : reputation.score >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {reputation.score.toFixed(0)}
                <span className="text-sm font-normal text-zinc-500">/100</span>
              </span>
            )}
          </div>

          {reputation ? (
            <ul className="space-y-2 text-xs">
              {reputation.breakdown.map((item) => (
                <li
                  key={item.label}
                  className="rounded-md bg-zinc-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-200">
                      {item.label}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.score >= 80
                          ? "text-emerald-400"
                          : item.score >= 50
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {item.score.toFixed(0)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {item.explanation}
                  </p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-800">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        item.score >= 80
                          ? "bg-emerald-500"
                          : item.score >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              Reputation will compute once batch activity, anomaly events, and
              shipment data are recorded.
            </p>
          )}
        </section>
      </div>

      {/* ── Incoming shipment requests from distributors ── */}
      <IncomingShipments
        apiPath="/api/manufacturer/shipments"
        patchPath="/api/distributor/shipments"
        title="Incoming requests from distributors"
      />

      {/* ── Batches table ── */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Registered batches
            </h2>
            <p className="text-xs text-zinc-400">
              All batches with unit counts, on-chain anchor status, and actions.
            </p>
          </div>
          <span className="text-[11px] text-zinc-600">
            {batches.length} batch{batches.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Batch ID</th>
                <th className="px-3 py-2 text-left font-medium">Medicine</th>
                <th className="px-3 py-2 text-left font-medium">Units</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Expiry</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {batches.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-xs text-zinc-500"
                  >
                    No batches registered yet. Use the form above to create your
                    first serialized batch.
                  </td>
                </tr>
              )}
              {batches.map((b) => (
                <tr key={b.batchId} className="text-xs text-zinc-200">
                  <td
                    className="px-3 py-2 font-mono text-[11px] text-zinc-400"
                    title={b.batchId}
                  >
                    {b.batchId.slice(0, 10)}…
                    {b.blockchainAnchor && (
                      <span
                        className="ml-1 text-[10px] text-emerald-600"
                        title={`On-chain: ${b.blockchainAnchor}`}
                      >
                        ⛓
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-200">{b.medicineName}</td>
                  <td className="px-3 py-2 text-zinc-300">{b.totalQuantity}</td>
                  <td className="px-3 py-2">
                    <span className={STATUS_COLORS[b.status] ?? "pill"}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{b.expiryDate}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setQrBatch({
                            batchId: b.batchId,
                            medicineName: b.medicineName,
                          })
                        }
                        className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        QR codes
                      </button>
                      {b.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => recallBatch(b.batchId)}
                          className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:border-rose-700 hover:bg-rose-950 hover:text-rose-400 transition-colors"
                        >
                          Recall
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cold-chain telemetry ── */}
      {coldLogs.length > 0 && (
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Recent cold-chain telemetry
            </h2>
            <p className="text-xs text-zinc-400">
              Last 10 temperature readings across all shipments. Safe range:
              2°C–8°C.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Shipment</th>
                  <th className="px-3 py-2 text-left font-medium">Temp</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Location</th>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {coldLogs.map((log) => (
                  <tr key={log.id} className="text-xs text-zinc-200">
                    <td
                      className="px-3 py-2 font-mono text-[11px] text-zinc-400"
                      title={log.shipmentId}
                    >
                      {log.shipmentId.slice(0, 10)}…
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        log.safe ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {log.temperature.toFixed(1)}°C
                    </td>
                    <td className="px-3 py-2">
                      {log.safe ? (
                        <span className="pill-green">Safe</span>
                      ) : (
                        <span className="pill-red">Breach</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {log.location ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── QR Export Modal ── */}
      {qrBatch && address && (
        <QRExportModal
          batchId={qrBatch.batchId}
          medicineName={qrBatch.medicineName}
          walletAddress={address}
          onClose={() => setQrBatch(null)}
        />
      )}
    </div>
  );
}
