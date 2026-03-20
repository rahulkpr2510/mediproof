"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";
import { IncomingShipments } from "./IncomingShipments";

interface StockUnit {
  unitId: string;
  status: string;
  serialNumber: number;
  batch: {
    medicineName: string;
    expiryDate: string;
    batchNumber: string;
  };
}

interface PharmacyShipment {
  shipmentId: string;
  batchId: string;
  senderWallet: string;
  receiverWallet: string;
  unitStart: number;
  unitEnd: number;
  quantity: number;
  status: string;
  requestedAt: string;
}

const STATUS_PILL: Record<string, string> = {
  REQUESTED: "pill bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700",
  APPROVED: "pill bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30",
  DISPATCHED: "pill bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
  DELIVERED: "pill-green",
};

export function PharmacyOverview() {
  const { address, role } = useWallet();

  // ── Stock ─────────────────────────────────────────────────────────────────
  const [stock, setStock] = useState<StockUnit[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [sellUnitId, setSellUnitId] = useState("");
  const [patientRef, setPatientRef] = useState("");
  const [sellMsg, setSellMsg] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [stockSearch, setStockSearch] = useState("");

  // ── My outbound shipments (to patients / sub-distributors) ────────────────
  const [shipments, setShipments] = useState<PharmacyShipment[]>([]);

  // ── Request shipment from distributor ─────────────────────────────────────
  const [reqForm, setReqForm] = useState({
    batchId: "",
    senderWallet: "",
    unitStart: 1,
    unitEnd: 10,
  });
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const loadStock = useCallback(async () => {
    if (!address) return;
    setStockLoading(true);
    try {
      const res = await fetch("/api/pharmacy/stock", {
        headers: { "x-wallet-address": address },
      });
      if (res.ok) {
        setStock(((await res.json()) as { items: StockUnit[] }).items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStockLoading(false);
    }
  }, [address]);

  const loadShipments = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch("/api/distributor/shipments", {
        headers: { "x-wallet-address": address },
      });
      if (res.ok) {
        const norm = address.toLowerCase();
        setShipments(
          ((await res.json()) as { items: PharmacyShipment[] }).items.filter(
            (s) => s.receiverWallet.toLowerCase() === norm, // ← only orders pharmacy placed
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [address]);

  useEffect(() => {
    void loadStock();
    void loadShipments();
  }, [loadStock, loadShipments]);

  async function requestShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setReqError(null);
    setReqSuccess(null);
    setIsRequesting(true);
    try {
      const res = await fetch("/api/distributor/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({
          batchId: reqForm.batchId.trim(),
          senderWallet: reqForm.senderWallet.trim(),
          unitStart: Number(reqForm.unitStart),
          unitEnd: Number(reqForm.unitEnd),
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }
      setReqSuccess(
        "Shipment requested. The distributor will approve and dispatch.",
      );
      setReqForm({ batchId: "", senderWallet: "", unitStart: 1, unitEnd: 10 });
      await loadShipments();
    } catch (err) {
      setReqError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsRequesting(false);
    }
  }

  async function confirmReceipt(shipmentId: string) {
    if (!address) return;
    try {
      const res = await fetch("/api/distributor/shipments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({ shipmentId, action: "confirm" }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        console.error("confirm failed:", err.error);
      }
      await loadShipments();
    } catch (err) {
      console.error(err);
    }
  }

  async function dispenseUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSellMsg(null);
    setSellError(null);
    setIsSelling(true);
    try {
      const res = await fetch("/api/pharmacy/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
        },
        body: JSON.stringify({
          unitId: sellUnitId.trim(),
          patientRef: patientRef.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to dispense");
      }
      setSellMsg(`✓ Unit ${sellUnitId.slice(0, 12)}… dispensed successfully.`);
      setSellUnitId("");
      setPatientRef("");
      await loadStock();
    } catch (err) {
      setSellError(err instanceof Error ? err.message : "Failed to dispense");
    } finally {
      setIsSelling(false);
    }
  }

  const filteredStock = stock.filter(
    (u) =>
      stockSearch === "" ||
      u.batch.medicineName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      u.unitId.toLowerCase().includes(stockSearch.toLowerCase()) ||
      u.batch.batchNumber.toLowerCase().includes(stockSearch.toLowerCase()),
  );

  const dispatchedShipments = shipments.filter(
    (s) =>
      s.status === "DISPATCHED" &&
      s.receiverWallet.toLowerCase() === address?.toLowerCase(),
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Pharmacy dashboard
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Request stock from distributors, confirm receipts on-chain, manage
          inventory, and dispense units to patients with full audit trail.
        </p>
        {role !== "PHARMACY" && (
          <p className="text-[11px] text-amber-400">
            Connected role: <strong>{role}</strong>. PHARMACY role required.
          </p>
        )}
      </header>

      {/* ── Pending deliveries to confirm ── */}
      {dispatchedShipments.length > 0 && (
        <section className="card flex flex-col gap-3 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">📦</span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Shipments awaiting your confirmation
              </h2>
              <p className="text-xs text-zinc-400">
                Confirm receipt to transfer custody on-chain and add units to
                your stock.
              </p>
            </div>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
              {dispatchedShipments.length}
            </span>
          </div>
          <div className="space-y-2">
            {dispatchedShipments.map((s) => (
              <div
                key={s.shipmentId}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-mono text-[11px] text-zinc-400">
                    {s.shipmentId.slice(0, 18)}…
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Units {s.unitStart}–{s.unitEnd} · {s.quantity} units · from{" "}
                    <span className="font-mono">
                      {s.senderWallet.slice(0, 10)}…
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => confirmReceipt(s.shipmentId)}
                  className="rounded border border-emerald-700/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  Confirm receipt →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Incoming requests (if pharmacy also acts as sender) ── */}
      <IncomingShipments
        apiPath="/api/pharmacy/shipments"
        title="Outgoing shipment requests you need to fulfil"
      />

      <div className="page-grid">
        {/* ── Request stock from distributor ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Request stock from distributor
            </h2>
            <p className="text-xs text-zinc-400">
              The distributor will approve and dispatch. Units are added to your
              inventory once you confirm receipt.
            </p>
          </div>

          <form
            onSubmit={requestShipment}
            className="grid gap-2 md:grid-cols-2"
          >
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-zinc-500">Batch ID</label>
              <input
                value={reqForm.batchId}
                onChange={(e) =>
                  setReqForm((p) => ({ ...p, batchId: e.target.value }))
                }
                placeholder="0x… batch identifier"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[11px] text-zinc-500">
                Distributor wallet address
              </label>
              <input
                value={reqForm.senderWallet}
                onChange={(e) =>
                  setReqForm((p) => ({ ...p, senderWallet: e.target.value }))
                }
                placeholder="0x… distributor wallet"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">Unit start</label>
              <input
                type="number"
                min={1}
                value={reqForm.unitStart}
                onChange={(e) =>
                  setReqForm((p) => ({
                    ...p,
                    unitStart: Number(e.target.value),
                  }))
                }
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">Unit end</label>
              <input
                type="number"
                min={reqForm.unitStart}
                value={reqForm.unitEnd}
                onChange={(e) =>
                  setReqForm((p) => ({
                    ...p,
                    unitEnd: Number(e.target.value),
                  }))
                }
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isRequesting}
              className="md:col-span-2 rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60 transition-colors"
            >
              {isRequesting ? "Requesting…" : "Request stock"}
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

        {/* ── Dispense unit to patient ── */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Dispense to patient
            </h2>
            <p className="text-xs text-zinc-400">
              Marks the unit as SOLD, writes a{" "}
              <code className="rounded bg-zinc-800 px-1 text-[10px]">
                SOLD_TO_PATIENT
              </code>{" "}
              supply event, and removes it from active inventory.
            </p>
          </div>

          <form onSubmit={dispenseUnit} className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">Unit ID</label>
              <input
                value={sellUnitId}
                onChange={(e) => setSellUnitId(e.target.value)}
                placeholder="0x… unit ID (from QR scan)"
                required
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500">
                Patient reference{" "}
                <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                placeholder="e.g. PAT-00123 or prescription ID"
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSelling}
              className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-60 transition-colors"
            >
              {isSelling ? "Dispensing…" : "Dispense unit"}
            </button>
          </form>

          {sellError && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <span className="text-rose-400">⚠</span>
              <p className="text-xs text-rose-300">{sellError}</p>
            </div>
          )}
          {sellMsg && <p className="text-xs text-emerald-400">{sellMsg}</p>}
        </section>
      </div>

      {/* ── Shipments table ── */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Shipment history
            </h2>
            <p className="text-xs text-zinc-400">
              All inbound shipments from distributors.
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
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {shipments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-xs text-zinc-500"
                  >
                    No shipments yet. Request stock from a distributor above.
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
                    {s.status === "DISPATCHED" &&
                      s.receiverWallet.toLowerCase() ===
                        address?.toLowerCase() && (
                        <button
                          onClick={() => confirmReceipt(s.shipmentId)}
                          className="rounded border border-emerald-700/50 px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-950 transition-colors"
                        >
                          Confirm receipt
                        </button>
                      )}
                    {s.status === "DELIVERED" && (
                      <span className="text-[10px] text-emerald-500">
                        ✓ In stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Live inventory ── */}
      <section className="card flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Current inventory
            </h2>
            <p className="text-xs text-zinc-400">
              Active units confirmed received at your pharmacy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">
              {stock.length} unit{stock.length !== 1 ? "s" : ""} in stock
            </span>
            <button
              onClick={() => void loadStock()}
              className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <input
          value={stockSearch}
          onChange={(e) => setStockSearch(e.target.value)}
          placeholder="Search by medicine name, unit ID, or batch number…"
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />

        {stockLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Unit ID</th>
                  <th className="px-3 py-2 text-left font-medium">Medicine</th>
                  <th className="px-3 py-2 text-left font-medium">Batch #</th>
                  <th className="px-3 py-2 text-left font-medium">Expiry</th>
                  <th className="px-3 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {filteredStock.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-xs text-zinc-500"
                    >
                      {stock.length === 0
                        ? "No stock yet. Confirm a received shipment to populate inventory."
                        : "No units match your search."}
                    </td>
                  </tr>
                )}
                {filteredStock.map((u) => {
                  const isExpired = new Date(u.batch.expiryDate) < new Date();
                  return (
                    <tr key={u.unitId} className="text-xs text-zinc-200">
                      <td
                        className="px-3 py-2 font-mono text-[11px] text-zinc-400"
                        title={u.unitId}
                      >
                        {u.unitId.slice(0, 14)}…
                      </td>
                      <td className="px-3 py-2 text-zinc-200">
                        {u.batch.medicineName}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                        {u.batch.batchNumber}
                      </td>
                      <td
                        className={`px-3 py-2 ${
                          isExpired ? "text-rose-400" : "text-zinc-400"
                        }`}
                      >
                        {u.batch.expiryDate}
                        {isExpired && (
                          <span className="ml-1 text-[10px]">⚠ Expired</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setSellUnitId(u.unitId);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          disabled={isExpired}
                          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        >
                          Dispense
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
