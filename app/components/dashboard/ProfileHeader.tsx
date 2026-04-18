"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface ProfileData {
  name: string;
  email: string;
  wallet: string | null;
  role: string;
  verifiedBadge: boolean;
  licenseNumber?: string;
}

interface ProfileHeaderProps {
  role: "MANUFACTURER" | "DISTRIBUTOR" | "PHARMACY";
}

export function ProfileHeader({ role }: ProfileHeaderProps) {
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile({
              name:
                data.profile.companyName ||
                data.profile.pharmacyName ||
                user?.firstName ||
                "Unknown",
              email: user?.primaryEmailAddress?.emailAddress || "",
              wallet: data.wallet,
              role: data.role,
              verifiedBadge: data.profile.verifiedBadge || false,
              licenseNumber: data.profile.licenseNumber,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="h-3 w-48 rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const roleColors: Record<string, { bg: string; text: string }> = {
    MANUFACTURER: { bg: "bg-blue-500/10", text: "text-blue-400" },
    DISTRIBUTOR: { bg: "bg-violet-500/10", text: "text-violet-400" },
    PHARMACY: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  };

  const colors = roleColors[role] || { bg: "bg-zinc-500/10", text: "text-zinc-400" };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}
          >
            <span className={`text-lg font-semibold ${colors.text}`}>
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                {profile.name}
              </h2>
              {profile.verifiedBadge && (
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20"
                  title="Verified"
                >
                  <svg
                    className="h-3 w-3 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-zinc-500">Role</span>
            <span className={`font-medium ${colors.text}`}>{profile.role}</span>
          </div>
          {profile.wallet && (
            <div className="flex flex-col">
              <span className="text-zinc-500">Wallet</span>
              <span className="font-mono text-zinc-300">
                {profile.wallet.slice(0, 6)}...{profile.wallet.slice(-4)}
              </span>
            </div>
          )}
          {profile.licenseNumber && (
            <div className="flex flex-col">
              <span className="text-zinc-500">License</span>
              <span className="text-zinc-300">{profile.licenseNumber}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
