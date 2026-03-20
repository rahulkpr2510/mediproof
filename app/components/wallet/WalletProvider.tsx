"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type Role } from "../../lib/domain";

// ── EIP-1193 provider type ──────────────────────────────────────────────────
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
}

function getEthereum(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

// ── Context shape ───────────────────────────────────────────────────────────
interface WalletContextValue {
  address: string | null;
  role: Role;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  role: "UNKNOWN",
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

// ── Role fetcher ────────────────────────────────────────────────────────────
async function fetchRole(wallet: string): Promise<Role> {
  try {
    const res = await fetch("/api/roles/me", {
      cache: "no-store",
      headers: { "x-wallet-address": wallet },
    });
    if (!res.ok) return wallet ? "NONE" : "UNKNOWN";
    const data = (await res.json()) as { role?: Role };
    return data.role ?? "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

// ── Provider ────────────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("UNKNOWN");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore wallet connection on mount
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    ethereum
      .request({ method: "eth_accounts" })
      .then(async (accounts) => {
        const list = accounts as string[];
        if (list.length > 0 && list[0]) {
          const addr = list[0].toLowerCase();
          setAddress(addr);
          setRole(await fetchRole(addr));
        }
      })
      .catch(() => {});
  }, []);

  // Listen for account / chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: unknown) => {
      const list = accounts as string[];
      if (!list || list.length === 0) {
        setAddress(null);
        setRole("UNKNOWN");
        setError(null);
        return;
      }

      const addr = list[0].toLowerCase();
      setAddress(addr);
      setRole(await fetchRole(addr));
      setError(null);
    };

    const handleChainChanged = () => {
      // Reload so RPC calls target the new chain
      window.location.reload();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const ethereum = getEthereum();

    if (!ethereum) {
      setError(
        "MetaMask not detected. Install MetaMask from metamask.io and refresh.",
      );
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setError("No accounts returned. Unlock MetaMask and try again.");
        return;
      }

      const addr = accounts[0].toLowerCase();
      setAddress(addr);
      setRole(await fetchRole(addr));
    } catch (err) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001) {
        // User rejected the request — not an error, just a dismissal
        setError(null);
      } else if (e.code === -32002) {
        setError(
          "MetaMask request already pending. Open MetaMask and approve the connection.",
        );
      } else {
        setError(e.message ?? "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setRole("UNKNOWN");
    setError(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, role, isConnecting, error, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
