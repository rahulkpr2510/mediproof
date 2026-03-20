"use client";

import { useState } from "react";
import { VerificationResult } from "../../lib/domain";
import { useWallet } from "../wallet/WalletProvider";
import { QRScanner } from "./QRScanner";

interface Props {
  onLoading?: () => void;
  onVerified?: (result: VerificationResult | null, notFound?: boolean) => void;
}

export function VerificationForm({ onLoading, onVerified }: Props) {
  const { address, role } = useWallet();
  const [unitId, setUnitId] = useState("");
  const [secretReference, setSecretReference] = useState("");
  const [checksum, setChecksum] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const UNIT_ID_RE = /0x[a-fA-F0-9]{64}/;
  const SECRET_RE = /0x[a-fA-F0-9]{8,128}/;
  const CHECKSUM_RE = /0x[a-fA-F0-9]{16}/;

  function normalizePastedText(raw: string) {
    return raw
      .trim()
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u00a0/g, " ");
  }

  function extractObjectCandidate(input: string) {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start >= 0 && end > start) return input.slice(start, end + 1);
    return input;
  }

  function parseFromJsonLike(input: string) {
    const candidate = extractObjectCandidate(input);
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const payload =
        typeof parsed === "string"
          ? (JSON.parse(parsed) as Record<string, unknown>)
          : (parsed as Record<string, unknown>);

      const unit =
        (typeof payload.unitId === "string" && payload.unitId) ||
        (typeof payload.unitID === "string" && payload.unitID) ||
        "";
      const secret =
        (typeof payload.s === "string" && payload.s) ||
        (typeof payload.secretReference === "string" &&
          payload.secretReference) ||
        "";
      const cs =
        (typeof payload.c === "string" && payload.c) ||
        (typeof payload.checksum === "string" && payload.checksum) ||
        "";

      return {
        unitId: unit.trim(),
        secretReference: secret.trim(),
        checksum: cs.trim(),
      };
    } catch {
      return null;
    }
  }

  function parseFromQueryLike(input: string) {
    const qp = new URLSearchParams(input.replace(/^\?/, ""));
    const unit = (qp.get("unitId") || qp.get("unitID") || "").trim();
    const secret = (qp.get("s") || qp.get("secretReference") || "").trim();
    const cs = (qp.get("c") || qp.get("checksum") || "").trim();
    if (!unit && !secret && !cs) return null;
    return { unitId: unit, secretReference: secret, checksum: cs };
  }

  function parseFromLooseText(input: string) {
    const unitId = input.match(UNIT_ID_RE)?.[0] ?? "";
    const checksum = input.match(CHECKSUM_RE)?.[0] ?? "";
    const secretCandidates = input.match(/0x[a-fA-F0-9]{8,128}/g) ?? [];
    const secretReference =
      secretCandidates.find((v) => v !== unitId && v !== checksum) ??
      input.match(SECRET_RE)?.[0] ??
      "";
    if (!unitId && !secretReference && !checksum) return null;
    return { unitId, secretReference, checksum };
  }

  // returns parsed fields so caller can use them immediately
  function parseQrString(raw: string): {
    unitId: string;
    secretReference: string;
    checksum: string;
  } | null {
    const trimmed = normalizePastedText(raw);
    if (!trimmed) return null;

    const parsed =
      parseFromJsonLike(trimmed) ??
      parseFromQueryLike(trimmed) ??
      parseFromLooseText(trimmed);

    const result = {
      unitId:
        parsed?.unitId?.trim() ||
        (UNIT_ID_RE.test(trimmed) ? trimmed.match(UNIT_ID_RE)?.[0] ?? "" : ""),
      secretReference: parsed?.secretReference?.trim() ?? "",
      checksum: parsed?.checksum?.trim() ?? "",
    };

    if (!result.unitId) {
      return null;
    }

    setUnitId(result.unitId);
    setSecretReference(result.secretReference);
    setChecksum(result.checksum);
    setError(null);
    return result;
  }

  // called by QR scanner — parse then submit immediately with fresh values
  async function handleScan(raw: string) {
    setShowScanner(false);
    setQrRaw(raw);
    const fields = parseQrString(raw);
    if (!fields?.unitId) {
      setError("Could not read unit ID from QR code.");
      return;
    }
    // submit directly with fresh values — don't rely on state
    await submitVerification(
      fields.unitId,
      fields.secretReference,
      fields.checksum,
    );
  }

  // called by Parse button — parse then submit
  async function handleParse() {
    const fields = parseQrString(qrRaw);
    if (!fields?.unitId) {
      setError("No unit ID found in payload.");
      return;
    }
    await submitVerification(
      fields.unitId,
      fields.secretReference,
      fields.checksum,
    );
  }

  // core submit — accepts values directly to avoid stale state
  async function submitVerification(id: string, secret: string, cs: string) {
    setError(null);
    const trimmedId = id.trim();
    if (!trimmedId) {
      setError("Unit ID is required.");
      return;
    }
    onLoading?.();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: trimmedId,
          secretReference: secret.trim() || undefined,
          checksum: cs.trim() || undefined,
          scanNonce: crypto.randomUUID(),
          actorWallet: address || undefined,
          actorType: role === "UNKNOWN" || role === "NONE" ? "PUBLIC" : role,
          deviceFingerprint: navigator.userAgent.slice(0, 64),
        }),
      });
      if (res.status === 404) {
        onVerified?.(null, true);
        return;
      }
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Verification request failed.");
      }
      const data = (await res.json()) as { result: VerificationResult };
      onVerified?.(data.result, false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to verify. Try again.",
      );
      onVerified?.(null, false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // form onSubmit now calls submitVerification with current state values
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitVerification(unitId, secretReference, checksum);
  }

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-100">
          Verification input
        </h2>
        <p className="text-xs text-zinc-400">
          Scan the QR code on the medicine pack, paste the payload, or enter the
          unit ID manually.
        </p>
      </div>

      {/* ── QR Scanner ──────────────────────────────────────────────────────── */}
      {showScanner ? (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 py-5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <span className="text-lg">📷</span>
          Scan QR code with camera
        </button>
      )}

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-600">
          or
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* ── Paste QR payload ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-300">
          Paste QR payload
        </label>
        <div className="flex gap-2">
          <input
            value={qrRaw}
            onChange={(e) => setQrRaw(e.target.value)}
            placeholder='{"unitId":"0x…","s":"0x…","c":"0x…"}'
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="button"
            onClick={() => void handleParse()} // ← was: parseQrString(qrRaw)
            className="shrink-0 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            Parse & Verify
          </button>
        </div>
      </div>

      {/* ── Manual form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unitId" className="text-xs font-medium text-zinc-300">
            Unit ID
          </label>
          <input
            id="unitId"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="0xabc… unit identifier"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Secret reference
            </label>
            <input
              value={secretReference}
              onChange={(e) => setSecretReference(e.target.value)}
              placeholder="0x… (from QR)"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Checksum
            </label>
            <input
              value={checksum}
              onChange={(e) => setChecksum(e.target.value)}
              placeholder="0x… (from QR)"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          id="verify-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {isSubmitting && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
          )}
          {isSubmitting ? "Verifying…" : "Verify unit"}
        </button>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
            <span className="text-rose-400">⚠</span>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        )}

        <p className="text-[11px] text-zinc-600">
          Each scan is logged. Anomaly detection runs on geo, device, duplicate,
          and supply chain rules.
        </p>
      </form>
    </section>
  );
}
