"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useWallet } from "@/app/components/wallet/WalletProvider";

type RoleType = "MANUFACTURER" | "DISTRIBUTOR" | "PHARMACY";
type Step = "connect-wallet" | "select-role" | "submit-documents" | "pending";

const ROLE_INFO: Record<
  RoleType,
  { title: string; description: string; fields: string[] }
> = {
  MANUFACTURER: {
    title: "Manufacturer",
    description: "Produce and register medicine batches on the blockchain",
    fields: ["companyName", "licenseNumber", "gstNumber", "address"],
  },
  DISTRIBUTOR: {
    title: "Distributor",
    description: "Transport medicines from manufacturers to pharmacies",
    fields: ["companyName", "licenseNumber", "warehouseAddress"],
  },
  PHARMACY: {
    title: "Pharmacy",
    description: "Sell verified medicines to consumers",
    fields: ["pharmacyName", "licenseNumber", "address"],
  },
};

const FIELD_LABELS: Record<string, string> = {
  companyName: "Company Name",
  pharmacyName: "Pharmacy Name",
  licenseNumber: "License Number",
  gstNumber: "GST Number",
  address: "Address",
  warehouseAddress: "Warehouse Address",
};

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function OnboardingPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { address, connect, isConnecting } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>("connect-wallet");
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  // Check if user already has a pending/approved application
  useEffect(() => {
    if (!clerkLoaded || !user) return;

    async function checkStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "APPROVED") {
            router.push("/dashboard");
            return;
          }
          if (data.status === "PENDING") {
            setExistingStatus("PENDING");
            setStep("pending");
          }
        }
      } catch {
        // New user, continue with onboarding
      }
    }
    checkStatus();
  }, [clerkLoaded, user, router]);

  // Update step based on wallet connection
  useEffect(() => {
    if (existingStatus === "PENDING") return;
    if (address && step === "connect-wallet") {
      setStep("select-role");
    }
  }, [address, step, existingStatus]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFileError(null);
      const selectedFiles = Array.from(e.target.files || []);

      for (const file of selectedFiles) {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          setFileError(
            `Invalid file type: ${file.name}. Only PDF, JPEG, PNG, and WebP are allowed.`
          );
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setFileError(
            `File too large: ${file.name}. Maximum size is 10MB.`
          );
          return;
        }
      }

      setFiles(selectedFiles);
    },
    []
  );

  const handleSubmit = async () => {
    if (!selectedRole || !address || files.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("role", selectedRole);
      formDataToSend.append("wallet", address);
      formDataToSend.append("profileData", JSON.stringify(formData));

      for (const file of files) {
        formDataToSend.append("documents", file);
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        body: formDataToSend,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit application");
      }

      setStep("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!clerkLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {["Connect Wallet", "Select Role", "Submit Documents"].map(
            (label, i) => {
              const stepIndex =
                step === "connect-wallet"
                  ? 0
                  : step === "select-role"
                    ? 1
                    : step === "submit-documents"
                      ? 2
                      : 3;
              const isActive = i <= stepIndex;
              const isCurrent = i === stepIndex;

              return (
                <div key={label} className="flex flex-1 items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800 text-zinc-500"
                    } ${isCurrent ? "ring-2 ring-zinc-400 ring-offset-2 ring-offset-zinc-950" : ""}`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        i < stepIndex ? "bg-zinc-100" : "bg-zinc-800"
                      }`}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>Connect Wallet</span>
          <span>Select Role</span>
          <span>Submit Documents</span>
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        {step === "connect-wallet" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-100">
              Connect Your Wallet
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Connect your MetaMask wallet to link your blockchain identity with
              your MediProof account.
            </p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                  Connecting...
                </>
              ) : (
                "Connect MetaMask"
              )}
            </button>
          </div>
        )}

        {step === "select-role" && (
          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-100">
              Select Your Role
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Choose the role that best describes your business in the
              pharmaceutical supply chain.
            </p>

            <div className="space-y-3">
              {(Object.keys(ROLE_INFO) as RoleType[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedRole === role
                      ? "border-zinc-100 bg-zinc-800"
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-zinc-100">
                        {ROLE_INFO[role].title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {ROLE_INFO[role].description}
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        selectedRole === role
                          ? "border-zinc-100 bg-zinc-100"
                          : "border-zinc-600"
                      }`}
                    >
                      {selectedRole === role && (
                        <svg
                          className="h-full w-full text-zinc-900"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => selectedRole && setStep("submit-documents")}
              disabled={!selectedRole}
              className="mt-6 w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === "submit-documents" && selectedRole && (
          <div>
            <button
              onClick={() => setStep("select-role")}
              className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            <h2 className="mb-2 text-xl font-semibold text-zinc-100">
              Submit Your Documents
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Provide your business details and upload verification documents.
            </p>

            <div className="space-y-4">
              {ROLE_INFO[selectedRole].fields.map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    {FIELD_LABELS[field]}
                  </label>
                  <input
                    type="text"
                    value={formData[field] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}`}
                  />
                </div>
              ))}

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Verification Documents
                </label>
                <p className="mb-2 text-xs text-zinc-500">
                  Upload license, registration certificates, or other
                  verification documents. PDF, JPEG, PNG, WebP. Max 10MB each.
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-sm file:text-zinc-100"
                />
                {fileError && (
                  <p className="mt-1 text-xs text-red-400">{fileError}</p>
                )}
                {files.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {files.length} file(s) selected
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                files.length === 0 ||
                !ROLE_INFO[selectedRole].fields.every((f) => formData[f])
              }
              className="mt-6 w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        )}

        {step === "pending" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <svg
                className="h-8 w-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-100">
              Application Pending
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Your application has been submitted and is being reviewed by our
              admin team. You&apos;ll receive an email once approved.
            </p>
            <p className="text-xs text-zinc-500">
              Connected wallet:{" "}
              <span className="font-mono text-zinc-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
