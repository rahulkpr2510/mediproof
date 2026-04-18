"use client";

import { useState } from "react";
import { ScanOnlyVerification } from "../../components/verification/ScanOnlyVerification";
import { VerificationSummary } from "../../components/verification/VerificationSummary";
import { VerificationResult } from "../../lib/domain";

type VerifyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: VerificationResult; notFound: false }
  | { status: "not_found" }
  | { status: "error" };

export default function VerifyPage() {
  const [state, setState] = useState<VerifyState>({ status: "idle" });

  function handleVerified(
    result: VerificationResult | null,
    notFound?: boolean,
  ) {
    if (notFound) {
      setState({ status: "not_found" });
      return;
    }
    if (!result) {
      setState({ status: "error" });
      return;
    }
    setState({ status: "done", result, notFound: false });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Verify medicine authenticity
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Scan the QR code on the medicine pack using your camera. The system checks blockchain state, supply chain history, cold-chain integrity, and anomaly detection to compute a trust verdict. For loose medicines, enter the 4-digit strip code for verification.
        </p>
      </section>

      <div className="page-grid">
        <ScanOnlyVerification
          onLoading={() => setState({ status: "loading" })}
          onVerified={handleVerified}
        />

        <VerificationSummary
          result={state.status === "done" ? state.result : null}
          loading={state.status === "loading"}
          notFound={state.status === "not_found"}
          hasError={state.status === "error"}
        />
      </div>
    </div>
  );
}
