"use client";

import { VerificationResult, VerificationVerdict } from "../../lib/domain";

interface Props {
  result: VerificationResult | null;
  loading: boolean;
  notFound?: boolean;
  hasError?: boolean;
}

function verdictLabel(v: VerificationVerdict) {
  return v === "GREEN"
    ? "Authentic"
    : v === "AMBER"
    ? "Attention required"
    : "Unsafe — do not consume";
}
function verdictClass(v: VerificationVerdict) {
  return v === "GREEN"
    ? "pill-green"
    : v === "AMBER"
    ? "pill-amber"
    : "pill-red";
}
function verdictBorder(v: VerificationVerdict) {
  return v === "GREEN"
    ? "border-emerald-500/30"
    : v === "AMBER"
    ? "border-amber-500/30"
    : "border-rose-500/30";
}

export function VerificationSummary({
  result,
  loading,
  notFound,
  hasError,
}: Props) {
  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <aside className="card-muted flex flex-col items-center justify-center gap-3 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        <p className="text-xs text-zinc-500">
          Checking blockchain, supply chain, and anomaly rules…
        </p>
      </aside>
    );
  }

  // ── Unit not found in registry — explicit RED ──────────────────────────────
  if (notFound) {
    return (
      <aside className="card flex flex-col gap-4 border border-rose-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-100">
              Unit not found in registry
            </h2>
            <p className="text-[11px] text-zinc-400">
              This unit ID has no record in the MediGuard serialization database
              or blockchain.
            </p>
          </div>
          <span className="pill-red">Unsafe — do not consume</span>
        </div>

        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <ul className="space-y-2">
            {[
              "Unit ID does not exist in the serialization registry",
              "QR code may be counterfeit, cloned, or tampered",
              "Do not consume this medicine",
              "Report to your pharmacist or local health authority",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-[11px] text-rose-300"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-zinc-600">
          Scan ID logged for anomaly tracking.
        </p>
      </aside>
    );
  }

  // ── Server / network error ─────────────────────────────────────────────────
  if (hasError) {
    return (
      <aside className="card-muted flex flex-col gap-3 border border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">⚠</span>
          <h2 className="text-sm font-semibold text-zinc-100">
            Verification unavailable
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          The verification service encountered an error. The unit status is
          unknown — do not rely on this medicine until it can be verified.
        </p>
        <p className="text-[11px] text-zinc-600">
          Check your network connection and try again.
        </p>
      </aside>
    );
  }

  // ── Idle — nothing submitted yet ───────────────────────────────────────────
  if (!result) {
    return (
      <aside className="card-muted flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          Verification verdict
        </h2>
        <p className="text-xs text-zinc-400">
          Results will appear after verification. You will see the full supply
          chain timeline, cold-chain status, anomaly flags, and a transparent
          trust verdict.
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            "Medicine authenticity",
            "Supply chain timeline",
            "Cold-chain integrity",
            "Anomaly analysis",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-[11px] text-zinc-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              {item}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // ── Full result card ───────────────────────────────────────────────────────
  return (
    <aside
      className={`card flex flex-col gap-4 border ${verdictBorder(
        result.verdict,
      )}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-zinc-100">
            {result.medicineName}
          </h2>
          <p className="font-mono text-[11px] text-zinc-500">
            Unit {result.unitId.slice(0, 16)}…
          </p>
          {result.manufactureDate && result.expiryDate && (
            <p className="text-[11px] text-zinc-400">
              {result.manufactureDate} → {result.expiryDate}
            </p>
          )}
        </div>
        <span className={verdictClass(result.verdict)}>
          {verdictLabel(result.verdict)}
        </span>
      </div>

      {/* Reasoning */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Verdict reasoning
        </span>
        <ul className="space-y-1 rounded-md bg-zinc-950/60 px-3 py-2">
          {result.verdictReasoning.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[11px] text-zinc-300"
            >
              <span
                className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  result.verdict === "RED"
                    ? "bg-rose-500"
                    : result.verdict === "AMBER"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Medicine info */}
      {result.medicineInfo && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              What it is commonly used for
            </span>
            {result.medicineInfo.uses.length === 0 ? (
              <p className="text-[11px] text-zinc-600">No data available.</p>
            ) : (
              <ul className="space-y-1 rounded-md bg-zinc-950/60 px-3 py-2">
                {result.medicineInfo.uses.map((item, i) => (
                  <li key={i} className="text-[11px] text-zinc-300">
                    • {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Common side effects
            </span>
            {result.medicineInfo.sideEffects.length === 0 ? (
              <p className="text-[11px] text-zinc-600">No data available.</p>
            ) : (
              <ul className="space-y-1 rounded-md bg-zinc-950/60 px-3 py-2">
                {result.medicineInfo.sideEffects.map((item, i) => (
                  <li key={i} className="text-[11px] text-zinc-300">
                    • {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="md:col-span-2 text-[10px] text-zinc-500">
            {result.medicineInfo.disclaimer} Source:{" "}
            {result.medicineInfo.source}
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {/* Timeline */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Supply chain timeline
          </span>
          {result.timeline.length === 0 ? (
            <p className="text-[11px] text-zinc-600">
              No supply events recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {result.timeline.map((step, i) => (
                <div key={i} className="relative flex gap-2 pl-3">
                  <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-zinc-200">
                      {step.label.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {step.actor.slice(0, 8)}…
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(step.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cold-chain */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Cold-chain status
          </span>
          <div
            className={`rounded-md px-3 py-2 ${
              result.coldChainStatus.ok
                ? "bg-emerald-500/5 ring-1 ring-emerald-500/20"
                : "bg-rose-500/5 ring-1 ring-rose-500/20"
            }`}
          >
            <p
              className={`text-[11px] font-medium ${
                result.coldChainStatus.ok ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {result.coldChainStatus.ok
                ? "Within 2°C–8°C window"
                : "Cold-chain compromised"}
            </p>
            {result.coldChainStatus.lastTemperatureC != null && (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Last reading:{" "}
                {result.coldChainStatus.lastTemperatureC.toFixed(1)}°C
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {result.coldChainStatus.logCount ?? 0} log entries
            </p>
          </div>
          <ul className="mt-1 space-y-0.5 pl-1">
            {result.coldChainStatus.notes.map((note, i) => (
              <li key={i} className="text-[11px] text-zinc-500">
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Shipment history */}
      {result.shipmentHistory.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Shipment history
          </span>
          <div className="space-y-1.5">
            {result.shipmentHistory.map((s) => (
              <div
                key={s.shipmentId}
                className="flex items-center justify-between rounded-md bg-zinc-950/40 px-3 py-1.5"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-[11px] text-zinc-400">
                    {s.shipmentId.slice(0, 12)}…
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {s.sender.slice(0, 6)}… → {s.receiver.slice(0, 6)}…
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    s.status === "DELIVERED"
                      ? "text-emerald-400"
                      : s.status === "DISPATCHED"
                      ? "text-amber-400"
                      : "text-zinc-400"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
