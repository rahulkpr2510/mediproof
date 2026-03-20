"use client";

import { useEffect, useState, type ReactElement } from "react";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface QRUnit {
  unitId: string;
  serialNumber: number;
  qrString: string;
}

interface QRBatchResponse {
  units?: QRUnit[];
}

interface Props {
  batchId: string;
  medicineName: string;
  walletAddress: string;
  onClose: () => void;
}

const PER_PAGE = 6;

export function QRExportModal({
  batchId,
  medicineName,
  walletAddress,
  onClose,
}: Props): ReactElement {
  const [units, setUnits] = useState<QRUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch(`/api/manufacturer/qr-batch?batchId=${batchId}`, {
      headers: { "x-wallet-address": walletAddress },
    })
      .then<QRBatchResponse>((r) => r.json())
      .then((response) => {
        setUnits(response.units ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [batchId, walletAddress]);

  const totalPages = Math.ceil(units.length / PER_PAGE);
  const pageUnits = units.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  function downloadCanvas(serialNumber: number): void {
    const canvases = document.querySelectorAll<HTMLCanvasElement>("canvas");
    const localIdx = pageUnits.findIndex(
      (u) => u.serialNumber === serialNumber,
    );
    const canvas = canvases[localIdx];
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `mediguard-unit-${serialNumber}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-zinc-100">
              QR codes — {medicineName}
            </h2>
            <p className="text-xs text-zinc-400">
              {units.length} serialized units · Batch{" "}
              <span className="font-mono">{batchId.slice(0, 14)}…</span>
            </p>
            <p className="text-[11px] text-zinc-600">
              Each QR encodes unitId + secret + checksum. Scan on /verify to
              test authenticity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Close ✕
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
              <p className="text-xs text-zinc-500">Loading QR codes…</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && units.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-zinc-500">
              No units found for this batch.
            </p>
          </div>
        )}

        {/* QR grid */}
        {!isLoading && units.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {pageUnits.map((unit) => (
                <div
                  key={unit.unitId}
                  className="card flex flex-col items-center gap-3 p-4"
                >
                  <QRCodeDisplay
                    value={unit.qrString}
                    size={148}
                    label={`Unit #${unit.serialNumber}`}
                    sublabel={unit.unitId.slice(0, 14) + "…"}
                  />

                  {/* Copy payload */}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(unit.qrString)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-center text-[10px] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
                    title={unit.qrString}
                  >
                    Copy QR payload
                  </button>

                  {/* Download PNG */}
                  <button
                    type="button"
                    onClick={() => downloadCanvas(unit.serialNumber)}
                    className="w-full rounded-md border border-zinc-700 px-3 py-1.5 text-center text-[10px] font-medium text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Download PNG
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                <p className="text-[11px] text-zinc-500">
                  Showing {page * PER_PAGE + 1}–
                  {Math.min((page + 1) * PER_PAGE, units.length)} of{" "}
                  {units.length} units
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-zinc-500">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
