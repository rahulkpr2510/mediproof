import Link from "next/link";

const FEATURES = [
  {
    icon: "⛓",
    title: "Blockchain-anchored batches",
    desc: "Every batch registered on-chain via keccak256 hash. Immutable, tamper-proof, publicly verifiable.",
  },
  {
    icon: "🔢",
    title: "Unit-level serialization",
    desc: "Each strip/bottle gets a unique unitId with an anti-clone secret. Not just batch-level QRs.",
  },
  {
    icon: "📦",
    title: "Shipment state machine",
    desc: "Request → Approve → Dispatch → Confirm. No transfer without dual custody proof.",
  },
  {
    icon: "🧊",
    title: "Cold-chain monitoring",
    desc: "Temperature telemetry logged per shipment hop. Breach auto-flags batch as suspicious.",
  },
  {
    icon: "🧠",
    title: "Anomaly detection engine",
    desc: "Geo impossibility, duplicate scans, device floods, pre-sale scans — all detected automatically.",
  },
  {
    icon: "✍️",
    title: "Dual-signature sale",
    desc: "Both pharmacy and buyer sign via MetaMask before medicine is dispensed. On-chain finality.",
  },
  {
    icon: "⭐",
    title: "Manufacturer reputation",
    desc: "Transparent score from counterfeit incidents, recalls, expiry failures, and delivery reliability.",
  },
  {
    icon: "🔍",
    title: "Public verification portal",
    desc: "Anyone can verify a medicine unit. Full timeline, cold-chain status, and trust verdict.",
  },
];

const FLOW = [
  {
    step: "01",
    actor: "Manufacturer",
    action: "Registers batch on-chain + serializes every unit with QR secret",
  },
  {
    step: "02",
    actor: "Distributor",
    action: "Requests shipment → Manufacturer approves + dispatches",
  },
  {
    step: "03",
    actor: "Distributor",
    action: "Logs cold-chain temperature at each hub",
  },
  {
    step: "04",
    actor: "Pharmacy",
    action: "Confirms receipt → runs random unit spot-check",
  },
  {
    step: "05",
    actor: "Pharmacy + Buyer",
    action: "Dual-signature sale finalizes dispensing on-chain",
  },
  {
    step: "06",
    actor: "Anyone",
    action: "Scans QR → gets GREEN / AMBER / RED verdict with full reasoning",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center gap-6 overflow-hidden border-b border-zinc-900 px-4 py-24 text-center md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
        <div className="relative flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Anti-counterfeit medicine trust infrastructure
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 md:text-5xl lg:text-6xl">
            Every drug verified.
            <br />
            <span className="text-zinc-500">Every fake detected.</span>
          </h1>
          <p className="max-w-xl text-base text-zinc-400">
            MediGuard combines blockchain immutability, unit-level QR
            serialization, and AI-driven anomaly detection to eliminate
            counterfeit medicines from the supply chain.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white"
            >
              Verify a medicine
              <span className="text-zinc-500">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-zinc-900 bg-zinc-950/80">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-zinc-900 px-4 md:grid-cols-4">
          {[
            { label: "Unit-level tracking", value: "Per strip" },
            { label: "Anomaly rules", value: "6 engines" },
            { label: "Blockchain layer", value: "Solidity" },
            { label: "Verification verdict", value: "3-tier" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-0.5 px-4 py-5"
            >
              <span className="text-xl font-bold text-zinc-100">
                {stat.value}
              </span>
              <span className="text-[11px] text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="border-b border-zinc-900 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-zinc-100">
              How trust is built
            </h2>
            <p className="text-sm text-zinc-400">
              Eight interlocking mechanisms that make counterfeiting
              economically and technically infeasible.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card flex flex-col gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {f.title}
                  </h3>
                  <p className="text-[12px] leading-relaxed text-zinc-400">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supply chain flow */}
      <section className="border-b border-zinc-900 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-zinc-100">
              Supply chain flow
            </h2>
            <p className="text-sm text-zinc-400">
              Every actor plays a verified role. No step can be skipped.
            </p>
          </div>
          <div className="flex flex-col gap-0">
            {FLOW.map((item, i) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[11px] font-bold text-zinc-300">
                    {item.step}
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="w-px flex-1 bg-zinc-800" />
                  )}
                </div>
                <div className="pb-6 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {item.actor}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-200">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verdict types */}
      <section className="border-b border-zinc-900 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-zinc-100">
              Verification verdicts
            </h2>
            <p className="text-sm text-zinc-400">
              Every scan returns a transparent verdict with full reasoning
              trail.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                verdict: "GREEN",
                label: "Authentic",
                pill: "pill-green",
                border: "border-emerald-500/20",
                points: [
                  "Unit exists in registry",
                  "QR checksum valid",
                  "Supply chain intact",
                  "No anomalies detected",
                  "Cold-chain within range",
                ],
              },
              {
                verdict: "AMBER",
                label: "Attention required",
                pill: "pill-amber",
                border: "border-amber-500/20",
                points: [
                  "Batch flagged suspicious",
                  "Duplicate scan pattern",
                  "Cold-chain breach",
                  "Already sold warning",
                  "Device anomaly detected",
                ],
              },
              {
                verdict: "RED",
                label: "Unsafe — do not consume",
                pill: "pill-red",
                border: "border-rose-500/20",
                points: [
                  "Unit not in registry",
                  "QR checksum mismatch",
                  "Batch recalled",
                  "Medicine expired",
                  "Impossible geo movement",
                ],
              },
            ].map((v) => (
              <div
                key={v.verdict}
                className={`card border ${v.border} flex flex-col gap-3`}
              >
                <span className={v.pill}>{v.label}</span>
                <ul className="mt-1 space-y-1.5">
                  {v.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-[12px] text-zinc-400"
                    >
                      <span className="h-1 w-1 rounded-full bg-zinc-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-xl flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-zinc-100">Ready to verify?</h2>
          <p className="text-sm text-zinc-400">
            Scan any MediGuard QR code or enter a unit ID to get an instant
            trust verdict.
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white"
          >
            Verify a medicine now →
          </Link>
        </div>
      </section>
    </div>
  );
}
