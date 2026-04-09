import Link from "next/link";
import { FaqAccordion } from "./components/FaqAccordion";

/* ─────────────────────────── DATA ─────────────────────────── */

const STATS = [
  { value: "Unit-level", label: "Tracking granularity" },
  { value: "6 engines", label: "Anomaly detection" },
  { value: "3-tier", label: "Trust verdicts" },
  { value: "Strip codes", label: "Loose medicine proof" },
];

const FEATURES = [
  {
    number: "01",
    title: "Blockchain-anchored batches",
    desc: "Every medicine batch is registered on-chain with a tamper-proof hash. No one can alter the record after the fact.",
  },
  {
    number: "02",
    title: "Unit-level QR serialization",
    desc: "Each individual strip or bottle gets a unique cryptographic identity — not just the batch. Clones are caught immediately.",
  },
  {
    number: "03",
    title: "Loose-medicine strip codes",
    desc: "Every strip in a pack gets N unique 4-digit codes. When medicines are sold loose, customers enter their code to verify each strip independently.",
  },
  {
    number: "04",
    title: "Role-gated custody workflow",
    desc: "From manufacturer to distributor to pharmacy, every handoff is verified and logged. No step can be skipped or faked.",
  },
  {
    number: "05",
    title: "Cold-chain monitoring",
    desc: "Temperature is logged at every shipment hop. A single breach automatically flags the entire batch as suspicious.",
  },
  {
    number: "06",
    title: "Transparent trust verdict",
    desc: "Every verification scan returns a clear GREEN / AMBER / RED verdict with plain-language reasoning anyone can understand.",
  },
];

const FLOW = [
  {
    step: "01",
    actor: "Manufacturer",
    action: "Registers the batch on-chain and serializes every unit. Each strip gets both a QR code and unique strip-level codes for loose sales.",
    note: "Tamper-proof from day one",
  },
  {
    step: "02",
    actor: "Distributor",
    action: "Requests shipment. Manufacturer approves and dispatches with a verified signature.",
    note: "Dual custody proof",
  },
  {
    step: "03",
    actor: "Distributor",
    action: "Logs cold-chain temperature readings at every warehouse or transit hub.",
    note: "2 °C – 8 °C safe range",
  },
  {
    step: "04",
    actor: "Pharmacy",
    action: "Confirms receipt and runs random unit spot-checks before accepting stock.",
    note: "Spot-check on delivery",
  },
  {
    step: "05",
    actor: "Pharmacy",
    action: "Sells full packs or loose strips. Loose sales generate a labeled QR with the assigned strip codes for the customer.",
    note: "Full pack or loose sale",
  },
  {
    step: "06",
    actor: "Anyone",
    action: "Scan the QR or enter the strip code. Instantly receive a clear trust verdict with full reasoning.",
    note: "Public · No account needed",
  },
];

/* Actor color accent map */
const ACTOR_COLOR: Record<string, string> = {
  Manufacturer: "text-sky-400",
  Distributor: "text-violet-400",
  Pharmacy: "text-amber-400",
  Anyone: "text-emerald-400",
};

const VERDICTS = [
  {
    label: "GREEN — Authentic",
    bg: "bg-zinc-900/80",
    border: "border-zinc-700",
    badge: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30",
    dot: "bg-emerald-500",
    short: "Safe to use",
    points: [
      "Unit exists in registry",
      "QR checksum valid",
      "Supply chain intact",
      "No anomalies detected",
      "Cold-chain within range",
    ],
  },
  {
    label: "AMBER — Caution",
    bg: "bg-zinc-900/80",
    border: "border-zinc-700",
    badge: "text-amber-400 bg-amber-500/10 ring-amber-500/30",
    dot: "bg-amber-400",
    short: "Attention required",
    points: [
      "Batch flagged suspicious",
      "Duplicate scan pattern",
      "Cold-chain breach detected",
      "Already sold warning",
      "Device anomaly detected",
    ],
  },
  {
    label: "RED — Unsafe",
    bg: "bg-zinc-900/80",
    border: "border-zinc-700",
    badge: "text-rose-400 bg-rose-500/10 ring-rose-500/30",
    dot: "bg-rose-500",
    short: "Do not consume",
    points: [
      "Unit not in registry",
      "QR checksum mismatch",
      "Batch recalled",
      "Medicine expired",
      "Impossible geo movement",
    ],
  },
];

const FAQS = [
  {
    q: "Do I need an account to verify a medicine?",
    a: "No. The verification portal is fully public. Just scan the QR code on your medicine or enter the unit ID — no sign-up required.",
  },
  {
    q: "What if I buy loose tablets or strips?",
    a: "Every strip has unique verification codes printed on it. Visit the verify page, select ‘Loose Medicine’, scan the label QR, and enter your strip code — you’ll see an instant authenticity result.",
  },
  {
    q: "What does the QR code contain?",
    a: "Each QR encodes a unique unit ID, batch reference, and a cryptographic checksum. Tampering with any part breaks the checksum and triggers a RED verdict.",
  },
  {
    q: "What if my medicine shows AMBER?",
    a: "AMBER means something needs attention — a cold-chain breach or a suspicious pattern — but the medicine is not necessarily counterfeit. Contact the pharmacy or distributor for clarification.",
  },
  {
    q: "Is the data stored on a public blockchain?",
    a: "The critical anchors (batch hashes, sale finalization) are written to a Solidity smart contract. Operational details live in a secure off-chain database tightly coupled to the chain records.",
  },
  {
    q: "What if the QR code on my medicine is damaged or missing?",
    a: "If the QR code is unreadable, check the packaging for a printed unit ID or strip codes and enter them manually on the verify page. A missing or deliberately obscured QR code is itself a red flag — do not consume the medicine and report it to the pharmacy immediately.",
  },
];

/* ─────────────────────────── PAGE ─────────────────────────── */

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden border-b border-zinc-900 px-5 py-24 text-center md:py-36">
        {/* subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />

        <div className="relative flex flex-col items-center gap-5 max-w-3xl mx-auto">
          {/* eyebrow */}
          <span className="opacity-0-init animate-fade-up inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-medium tracking-widest uppercase text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Anti-counterfeit medicine trust
          </span>

          {/* headline */}
          <h1
            className="font-display opacity-0-init animate-fade-up delay-1 text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-50 sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Know your medicine
            <br />
            <span className="text-zinc-500 italic font-light">is the real thing.</span>
          </h1>

          {/* sub */}
          <p className="opacity-0-init animate-fade-up delay-2 max-w-lg text-base leading-relaxed text-zinc-400">
            MediProof uses blockchain, unit-level QR codes, and strip-level
            verification codes so anyone — patient, pharmacist, or regulator —
            can instantly verify any medicine, whole pack or loose strip.
          </p>

          {/* CTAs */}
          <div className="opacity-0-init animate-fade-up delay-3 mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/verify"
              id="hero-verify-cta"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-50 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-white hover:shadow-md sm:w-auto"
            >
              Verify a medicine
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/dashboard"
              id="hero-dashboard-cta"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-50 sm:w-auto"
            >
              Go to dashboard
            </Link>
          </div>

          {/* trust note */}
          <p className="opacity-0-init animate-fade-up delay-4 text-[11px] text-zinc-600">
            Free · No account required · Works on any smartphone
          </p>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="border-b border-zinc-900 bg-zinc-950">
        <div className="mx-auto grid max-w-5xl grid-cols-2 md:grid-cols-4 divide-x divide-zinc-900">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 px-4 py-6 text-center"
            >
              <span className="font-display text-xl font-semibold text-zinc-100">
                {s.value}
              </span>
              <span className="text-[11px] leading-tight text-zinc-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="border-b border-zinc-900 px-5 py-20">
        <div className="mx-auto max-w-5xl">
          {/* header */}
          <div className="mb-12 max-w-lg">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              The process
            </p>
            <h2 className="font-display text-3xl font-semibold leading-snug text-zinc-100 sm:text-4xl">
              From factory to patient,{" "}
              <span className="italic font-light text-zinc-400">every step verified.</span>
            </h2>
          </div>

          {/* steps — vertical timeline (mobile) / alternating two-column (md+) */}
          <div className="relative">
            {/* Centre spine on md+ */}
            <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-zinc-800/60 md:block" />

            <div className="flex flex-col gap-0">
              {FLOW.map((item, i) => {
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={item.step}
                    className="group relative grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto_1fr]"
                  >
                    {/* ── LEFT CONTENT (even steps) / spacer (odd) ── */}
                    <div
                      className={`hidden md:flex md:flex-col md:pb-12 ${
                        isEven ? "items-end pr-10 text-right" : "items-start"
                      }`}
                    >
                      {isEven && (
                        <div className="max-w-sm">
                          <p
                            className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${
                              ACTOR_COLOR[item.actor] ?? "text-zinc-500"
                            }`}
                          >
                            {item.actor}
                          </p>
                          <p className="text-sm leading-relaxed text-zinc-200">
                            {item.action}
                          </p>
                          <span className="mt-2 inline-block rounded border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-500">
                            {item.note}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── CENTRE CIRCLE ── */}
                    <div className="hidden md:flex md:flex-col md:items-center">
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[11px] font-semibold text-zinc-300 ring-4 ring-zinc-950 transition-colors group-hover:border-zinc-500 group-hover:text-zinc-100">
                        {item.step}
                      </div>
                    </div>

                    {/* ── RIGHT CONTENT (odd steps) / spacer (even) ── */}
                    <div
                      className={`hidden md:flex md:flex-col md:pb-12 ${
                        !isEven ? "items-start pl-10" : "items-end"
                      }`}
                    >
                      {!isEven && (
                        <div className="max-w-sm">
                          <p
                            className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${
                              ACTOR_COLOR[item.actor] ?? "text-zinc-500"
                            }`}
                          >
                            {item.actor}
                          </p>
                          <p className="text-sm leading-relaxed text-zinc-200">
                            {item.action}
                          </p>
                          <span className="mt-2 inline-block rounded border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-500">
                            {item.note}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── MOBILE: single-column timeline ── */}
                    <div className="flex gap-5 md:hidden">
                      <div className="relative flex flex-col items-center">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[11px] font-semibold text-zinc-300">
                          {item.step}
                        </div>
                        {i < FLOW.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-zinc-800/70" />
                        )}
                      </div>
                      <div className="pb-8 pt-1">
                        <p
                          className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${
                            ACTOR_COLOR[item.actor] ?? "text-zinc-500"
                          }`}
                        >
                          {item.actor}
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-200">
                          {item.action}
                        </p>
                        <span className="mt-2 inline-block rounded border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-500">
                          {item.note}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="border-b border-zinc-900 px-5 py-20">
        <div className="mx-auto max-w-5xl">
          {/* header */}
          <div className="mb-12 max-w-lg">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              How trust is built
            </p>
            <h2 className="font-display text-3xl font-semibold leading-snug text-zinc-100 sm:text-4xl">
              Six interlocking layers{" "}
              <span className="italic font-light text-zinc-400">of protection.</span>
            </h2>
          </div>

          {/* grid */}
          <div className="grid gap-px bg-zinc-800/50 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden border border-zinc-800/50">
            {FEATURES.map((f) => (
              <div
                key={f.number}
                className="group flex flex-col gap-3 bg-zinc-950 p-6 transition-colors hover:bg-zinc-900/60"
              >
                <span className="font-display text-3xl font-light text-zinc-700 transition-colors group-hover:text-zinc-500">
                  {f.number}
                </span>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-zinc-100">
                    {f.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-zinc-400">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERIFICATION VERDICTS ─────────────────────────────── */}
      <section id="verdicts" className="border-b border-zinc-900 px-5 py-20">
        <div className="mx-auto max-w-5xl">
          {/* header */}
          <div className="mb-12 max-w-lg">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              What you&apos;ll see
            </p>
            <h2 className="font-display text-3xl font-semibold leading-snug text-zinc-100 sm:text-4xl">
              Three verdicts.{" "}
              <span className="italic font-light text-zinc-400">Zero ambiguity.</span>
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Every QR scan returns a clear result with full reasoning so you
              know exactly why you received it.
            </p>
          </div>

          {/* cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {VERDICTS.map((v) => (
              <div
                key={v.label}
                className={`rounded-2xl border ${v.border} ${v.bg} p-6 flex flex-col gap-4`}
              >
                {/* badge */}
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} />
                  <span
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ${v.badge}`}
                  >
                    {v.short}
                  </span>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {v.label}
                  </p>
                  <ul className="space-y-2">
                    {v.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-center gap-2.5 text-[12px] text-zinc-400"
                      >
                        <span className="h-px w-3 bg-zinc-600 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* inline CTA */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/verify"
              id="verdicts-verify-cta"
              className="group inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-400 hover:text-zinc-100"
            >
              Try verifying a medicine
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-zinc-900 px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 max-w-lg">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              Common questions
            </p>
            <h2 className="font-display text-3xl font-semibold leading-snug text-zinc-100 sm:text-4xl">
              Simple answers{" "}
              <span className="italic font-light text-zinc-400">for everyone.</span>
            </h2>
          </div>

          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Get started
          </p>
          <h2 className="font-display text-3xl font-semibold leading-snug text-zinc-100 sm:text-4xl md:text-5xl">
            Your medicine.{" "}
            <span className="italic font-light text-zinc-400">Verified in seconds.</span>
          </h2>
          <p className="max-w-sm text-sm text-zinc-400">
            Scan the QR code on any MediProof-registered medicine or enter the
            unit ID to get an instant trust verdict — no account, no app needed.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/verify"
              id="footer-verify-cta"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-50 px-7 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-white hover:shadow-md sm:w-auto"
            >
              Verify a medicine
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* decorative rule */}
          <div className="mt-8 flex w-full max-w-sm items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">
              MediProof
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <p className="text-[11px] text-zinc-600">
            Blockchain · Anomaly Intelligence · Supply-chain trust infrastructure
          </p>
        </div>
      </section>
    </div>
  );
}
