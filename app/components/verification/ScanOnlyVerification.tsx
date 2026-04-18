"use client";

import { useState } from "react";
import { VerificationResult } from "../../lib/domain";
import { useWallet } from "../wallet/WalletProvider";
import { QRScanner } from "./QRScanner";

interface Props {
  onLoading?: () => void;
  onVerified?: (result: VerificationResult | null, notFound?: boolean) => void;
}

export function ScanOnlyVerification({ onLoading, onVerified }: Props) {
  const { address, role } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showStripCodeInput, setShowStripCodeInput] = useState(false);
  const [stripCode, setStripCode] = useState("");
  const [pendingUnitId, setPendingUnitId] = useState<string | null>(null);
  const [stripCodeResult, setStripCodeResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

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

  function parseQrString(raw: string): {
    unitId: string;
    secretReference: string;
    checksum: string;
    isLoose?: boolean;
  } | null {
    const trimmed = normalizePastedText(raw);
    if (!trimmed) return null;

    const candidate = extractObjectCandidate(trimmed);
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const payload =
        typeof parsed === "string"
          ? (JSON.parse(parsed) as Record<string, unknown>)
          : parsed;

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
      const isLoose = payload.loose === true || payload.isLoose === true;

      return {
        unitId: unit.trim(),
        secretReference: secret.trim(),
        checksum: cs.trim(),
        isLoose,
      };
    } catch {
      // Fallback to regex extraction
      const unitId = trimmed.match(UNIT_ID_RE)?.[0] ?? "";
      const checksum = trimmed.match(CHECKSUM_RE)?.[0] ?? "";
      const secretCandidates = trimmed.match(/0x[a-fA-F0-9]{8,128}/g) ?? [];
      const secretReference =
        secretCandidates.find((v) => v !== unitId && v !== checksum) ??
        trimmed.match(SECRET_RE)?.[0] ??
        "";

      if (!unitId) return null;
      return { unitId, secretReference, checksum };
    }
  }

  async function handleScan(raw: string) {
    setShowScanner(false);
    setError(null);
    setStripCodeResult(null);

    const fields = parseQrString(raw);
    if (!fields?.unitId) {
      setError("Could not read unit ID from QR code. Please try again.");
      return;
    }

    // Check if this is a loose medicine sale
    if (fields.isLoose) {
      setPendingUnitId(fields.unitId);
      setShowStripCodeInput(true);
      return;
    }

    // Standard verification
    await submitVerification(
      fields.unitId,
      fields.secretReference,
      fields.checksum
    );
  }

  async function verifyStripCode() {
    if (!pendingUnitId || !stripCode) return;

    setIsSubmitting(true);
    setStripCodeResult(null);

    try {
      const res = await fetch("/api/strip-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: pendingUnitId,
          code: stripCode,
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setStripCodeResult({
          valid: true,
          message: `Strip ${data.stripNumber} verified successfully!`,
        });
        // Now proceed with full verification
        await submitVerification(pendingUnitId, "", "");
      } else {
        setStripCodeResult({
          valid: false,
          message: data.message || "Invalid strip code",
        });
      }
    } catch (err) {
      setStripCodeResult({
        valid: false,
        message: "Failed to verify strip code",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
        err instanceof Error ? err.message : "Unable to verify. Try again."
      );
      onVerified?.(null, false);
    } finally {
      setIsSubmitting(false);
      setShowStripCodeInput(false);
      setPendingUnitId(null);
      setStripCode("");
    }
  }

  function resetScanner() {
    setShowStripCodeInput(false);
    setPendingUnitId(null);
    setStripCode("");
    setStripCodeResult(null);
    setError(null);
    setShowScanner(true);
  }

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-100">
          Scan to Verify
        </h2>
        <p className="text-xs text-zinc-400">
          Point your camera at the QR code on the medicine package to instantly
          verify its authenticity.
        </p>
      </div>

      {/* Strip Code Input for Loose Medicine */}
      {showStripCodeInput && pendingUnitId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-100">
                Loose Medicine Verification
              </h3>
              <p className="text-xs text-amber-300/80 mt-1">
                This medicine was sold as individual strips. Enter the 4-digit
                code printed on your strip to verify authenticity.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Strip Code
              </label>
              <input
                type="text"
                maxLength={4}
                value={stripCode}
                onChange={(e) =>
                  setStripCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="Enter 4-digit code"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
            </div>

            {stripCodeResult && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  stripCodeResult.valid
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {stripCodeResult.message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={verifyStripCode}
                disabled={stripCode.length !== 4 || isSubmitting}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isSubmitting ? "Verifying..." : "Verify Strip Code"}
              </button>
              <button
                onClick={resetScanner}
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : showScanner ? (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={isSubmitting}
          className="group flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 py-12 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 transition group-hover:bg-zinc-700">
            <svg
              className="h-8 w-8 text-zinc-400 transition group-hover:text-zinc-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">
              Tap to scan QR code
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Use your camera to scan the medicine QR
            </p>
          </div>
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <svg
            className="mt-0.5 h-4 w-4 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-rose-400">
              Verification Failed
            </p>
            <p className="text-xs text-rose-300/80">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSubmitting && !showStripCodeInput && (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
          <span className="text-sm text-zinc-400">
            Verifying authenticity...
          </span>
        </div>
      )}

      <p className="text-[11px] text-zinc-600 text-center">
        Each scan is logged for supply chain integrity. Anomaly detection
        protects against counterfeits.
      </p>
    </section>
  );
}
