"use client";

import { useEffect, useState } from "react";

type StockUnit = {
  unitId: string;
  status: string;
  createdAt: string;
  batch: {
    medicineName: string;
    expiryDate: string;
    batchNumber: string;
  };
};

type Props = {
  apiPath: string;
  refreshKey?: number; // ← increment this from parent to force refetch
};

export function StockPanel({ apiPath, refreshKey = 0 }: Props) {
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(apiPath)
        .then((r) => r.json())
        .then((d) => setUnits(d.items ?? []))
        .catch(() => setError("Failed to load stock"))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiPath, refreshKey]); // ← refreshKey in deps triggers refetch

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 text-sm text-zinc-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        Loading stock…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-10 text-center text-sm text-zinc-500">
        No units currently in stock.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-500 uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Unit ID</th>
            <th className="px-4 py-3 text-left">Medicine</th>
            <th className="px-4 py-3 text-left">Batch</th>
            <th className="px-4 py-3 text-left">Expiry</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {units.map((u) => {
            const expiry = new Date(u.batch.expiryDate);
            const isExpiringSoon =
              expiry.getTime() - nowMs < 30 * 24 * 60 * 60 * 1000;
            return (
              <tr
                key={u.unitId}
                className="hover:bg-zinc-800/40 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {u.unitId.slice(0, 16)}…
                </td>
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {u.batch.medicineName}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {u.batch.batchNumber}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      isExpiringSoon ? "text-amber-400" : "text-zinc-400"
                    }
                  >
                    {expiry.toLocaleDateString()}
                    {isExpiringSoon && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                        Soon
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {u.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
