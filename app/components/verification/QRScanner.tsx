"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Props {
  onScan: (raw: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const calledBack = useRef(false);

  const stop = useCallback(() => {
    readerRef.current?.reset();
    readerRef.current = null;
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    calledBack.current = false;

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScanning(true);

      const onDecode = (
        result: { getText: () => string } | undefined,
        err: unknown,
      ) => {
        if (result && !calledBack.current) {
          calledBack.current = true;
          stop();
          onScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          console.warn("[QRScanner]", (err as Error).message);
        }
      };

      try {
        // Primary path: request rear camera on mobile when available.
        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          onDecode,
        );
      } catch {
        // Fallback path: let browser pick default camera/device.
        await reader.decodeFromVideoDevice(null, videoRef.current, onDecode);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("Permission") ||
          msg.includes("NotAllowed") ||
          msg.includes("Denied")
          ? "Camera access denied. Tap the camera icon in your browser address bar to allow access."
          : msg.includes("NotFound") || msg.includes("DevicesNotFound")
          ? "No camera found on this device."
          : "Could not start camera: " + msg,
      );
      setScanning(false);
    }
  }, [onScan, stop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void start();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 aspect-video max-h-72">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-48 w-48">
              <span className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-emerald-400 rounded-tl-sm" />
              <span className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-emerald-400 rounded-tr-sm" />
              <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-sm" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-sm" />
              <div className="absolute left-2 right-2 top-0 h-0.5 bg-emerald-400/80 animate-[scanline_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {!scanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/80">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
            <p className="text-xs text-zinc-400">Starting camera…</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-rose-400">⚠</span>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
          <button
            onClick={() => void start()}
            className="self-start rounded border border-rose-500/30 px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {scanning
            ? "Hold QR code steady inside the frame…"
            : error
            ? "Camera unavailable"
            : "Initialising…"}
        </p>
        <button
          onClick={() => {
            stop();
            onClose();
          }}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
