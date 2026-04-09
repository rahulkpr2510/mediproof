"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/* ── Desktop accordion row ─────────────────────────────────── */
function AccordionRow({
  faq,
  isOpen,
  onToggle,
  isLast,
}: {
  faq: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: isLast ? "none" : "1px solid #27272a",
        backgroundColor: isOpen ? "rgba(39,39,42,0.5)" : "transparent",
        transition: `background-color 200ms ${EASE}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1.125rem 1.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "0.875rem",
          fontWeight: 500,
          lineHeight: 1.5,
          color: isOpen ? "#ffffff" : "#d4d4d8",
          minHeight: "52px",
          boxSizing: "border-box",
          transition: `color 200ms ${EASE}`,
        }}
      >
        <span style={{ flex: 1 }}>{faq.q}</span>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            color: isOpen ? "#a1a1aa" : "#52525b",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform 280ms ${EASE}, color 200ms linear`,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M3.5 5.5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* maxHeight animation — universal including iOS Safari */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? "400px" : "0px",
          transition: `max-height 320ms ${EASE}`,
        }}
      >
        <p
          style={{
            margin: 0,
            padding: "0 1.5rem 1.25rem",
            fontSize: "0.8125rem",
            lineHeight: 1.75,
            color: "#a1a1aa",
          }}
        >
          {faq.a}
        </p>
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────── */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <>
      {/* ── MOBILE: formatted Q&A cards ── */}
      <div className="md:hidden flex flex-col gap-3">
        {items.map((faq, i) => (
          <div
            key={faq.q}
            className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-5 py-4"
          >
            {/* Index badge + question */}
            <div className="flex items-start gap-3 mb-3">
              <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-semibold text-zinc-400">
                {i + 1}
              </span>
              <p className="text-sm font-semibold leading-snug text-zinc-100">
                {faq.q}
              </p>
            </div>
            {/* Divider */}
            <div className="mb-3 ml-8 h-px bg-zinc-800/60" />
            {/* Answer */}
            <p className="ml-8 text-[13px] leading-relaxed text-zinc-400">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: interactive accordion ── */}
      <div
        className="hidden md:block"
        style={{
          borderRadius: "1rem",
          border: "1px solid #27272a",
          overflow: "hidden",
          background: "#18181b",
        }}
      >
        {items.map((faq, i) => (
          <AccordionRow
            key={faq.q}
            faq={faq}
            isOpen={openIndex === i}
            isLast={i === items.length - 1}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
          />
        ))}
      </div>
    </>
  );
}
