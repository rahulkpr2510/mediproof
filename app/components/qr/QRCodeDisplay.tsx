"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  sublabel?: string;
}

export function QRCodeDisplay({
  value,
  size = 160,
  label,
  sublabel,
}: QRCodeDisplayProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(false);
    setLoaded(false);

    import("qrcode")
      .then((QRCode) =>
        QRCode.toCanvas(canvasRef.current!, value, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "M",
          color: {
            // Use standard QR polarity for maximum scanner compatibility.
            dark: "#000000",
            light: "#ffffff",
          },
        }),
      )
      .then(() => setLoaded(true))
      .catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-zinc-500">QR error</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-lg border border-zinc-300 bg-white p-2"
        style={{ width: size + 16, height: size + 16 }}
      >
        {/* Spinner while loading */}
        {!loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ width: size + 16, height: size + 16 }}
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
        />
      </div>
      {label && <p className="text-[11px] font-mono text-zinc-400">{label}</p>}
      {sublabel && <p className="text-[10px] text-zinc-600">{sublabel}</p>}
    </div>
  );
}
