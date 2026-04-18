"use client";

import { useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";

type Tab = "approvals" | "members" | "reports" | "roles";

interface Application {
  id: string;
  email: string;
  wallet: string;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    name: string;
    licenseNumber: string;
    documents: string[];
    verifiedBadge: boolean;
  } | null;
}

interface Member {
  id: string;
  email: string;
  wallet: string;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    licenseNumber: string;
    verifiedBadge: boolean;
  } | null;
  stockCount: number;
  stockItems: number;
}

interface Report {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  status: string;
  adminNotes: string;
  createdAt: string;
  resolvedAt: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  MANUFACTURER: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
  DISTRIBUTOR: "bg-violet-500/10 text-violet-400 ring-violet-500/30",
  PHARMACY: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  ADMIN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  REVIEWING: "bg-blue-500/10 text-blue-400",
  RESOLVED: "bg-emerald-500/10 text-emerald-400",
  DISMISSED: "bg-zinc-500/10 text-zinc-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-rose-500/10 text-rose-400",
  REVOKED: "bg-rose-500/10 text-rose-400",
};

export function AdminOverview() {
  const { role } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("approvals");
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("ALL");

  // Approval action state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [grantVerifiedBadge, setGrantVerifiedBadge] = useState(false);

  // Report action state
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [reportStatus, setReportStatus] = useState("");

  async function loadApprovals() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      setError("Unable to load pending applications.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMembers() {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/members", window.location.origin);
      if (roleFilter !== "ALL") url.searchParams.set("role", roleFilter);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setError("Unable to load members.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadReports() {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/reports", window.location.origin);
      if (reportStatusFilter !== "ALL")
        url.searchParams.set("status", reportStatusFilter);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setError("Unable to load reports.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "approvals") loadApprovals();
    else if (activeTab === "members") loadMembers();
    else if (activeTab === "reports") loadReports();
  }, [activeTab, roleFilter, reportStatusFilter]);

  async function handleApprove(userId: string) {
    setProcessingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "approve",
          verifiedBadge: grantVerifiedBadge,
        }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setGrantVerifiedBadge(false);
      await loadApprovals();
    } catch {
      setError("Failed to approve application.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(userId: string) {
    setProcessingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "reject",
          reason: rejectReason,
        }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setShowRejectModal(null);
      setRejectReason("");
      await loadApprovals();
    } catch {
      setError("Failed to reject application.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRevoke(userId: string) {
    if (!window.confirm("Are you sure you want to revoke this member's access?"))
      return;
    setProcessingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      await loadMembers();
    } catch {
      setError("Failed to revoke member.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUpdateReport(reportId: string) {
    setProcessingId(reportId);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status: reportStatus,
          adminNotes: reportNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingReport(null);
      setReportNotes("");
      setReportStatus("");
      await loadReports();
    } catch {
      setError("Failed to update report.");
    } finally {
      setProcessingId(null);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "approvals", label: "Pending Approvals", count: applications.length },
    { id: "members", label: "All Members" },
    { id: "reports", label: "Reports", count: reports.filter((r) => r.status === "PENDING").length },
    { id: "roles", label: "Legacy Roles" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Admin Dashboard
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Manage user applications, view members, and handle reports.
        </p>
        {role !== "ADMIN" && (
          <p className="text-[11px] text-amber-400">
            Connected wallet role: <strong>{role}</strong>. Only ADMIN can access
            this page.
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-medium text-amber-400">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-sm text-zinc-400">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`pill ring-1 ${ROLE_COLORS[app.role] || "bg-zinc-500/10 text-zinc-400"}`}
                        >
                          {app.role}
                        </span>
                        <span className="text-sm font-medium text-zinc-100">
                          {app.profile?.name || "Unknown"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-zinc-400">
                        <p>
                          <span className="text-zinc-500">Email:</span> {app.email}
                        </p>
                        <p>
                          <span className="text-zinc-500">Wallet:</span>{" "}
                          <span className="font-mono">
                            {app.wallet?.slice(0, 8)}...{app.wallet?.slice(-4)}
                          </span>
                        </p>
                        <p>
                          <span className="text-zinc-500">License:</span>{" "}
                          {app.profile?.licenseNumber || "N/A"}
                        </p>
                        <p>
                          <span className="text-zinc-500">Applied:</span>{" "}
                          {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {app.profile?.documents && app.profile.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {app.profile.documents.map((doc, i) => (
                            <a
                              key={i}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700"
                            >
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Doc {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={grantVerifiedBadge}
                          onChange={(e) => setGrantVerifiedBadge(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                        Grant verified badge
                      </label>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={processingId === app.id}
                        className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {processingId === app.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(app.id)}
                        disabled={processingId === app.id}
                        className="rounded border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Reject Modal */}
                  {showRejectModal === app.id && (
                    <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                      <p className="mb-2 text-sm font-medium text-zinc-100">
                        Rejection Reason (optional)
                      </p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide a reason for rejection..."
                        className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={processingId === app.id}
                          className="rounded bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectModal(null);
                            setRejectReason("");
                          }}
                          className="rounded border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
            >
              <option value="ALL">All Roles</option>
              <option value="MANUFACTURER">Manufacturers</option>
              <option value="DISTRIBUTOR">Distributors</option>
              <option value="PHARMACY">Pharmacies</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="text-xs">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-zinc-100">
                              {member.profile?.name || "Unknown"}
                              {member.profile?.verifiedBadge && (
                                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                                  <svg
                                    className="h-2.5 w-2.5"
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
                            </p>
                            <p className="text-zinc-500">{member.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`pill ring-1 ${ROLE_COLORS[member.role] || "bg-zinc-500/10 text-zinc-400"}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`pill ${STATUS_COLORS[member.status] || "bg-zinc-500/10 text-zinc-400"}`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {member.stockCount} units ({member.stockItems} batches)
                        </td>
                        <td className="px-4 py-3 text-right">
                          {member.status === "APPROVED" && member.role !== "ADMIN" && (
                            <button
                              onClick={() => handleRevoke(member.id)}
                              disabled={processingId === member.id}
                              className="rounded border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-50"
                            >
                              {processingId === member.id ? "..." : "Revoke"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEWING">Reviewing</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-sm text-zinc-400">No reports found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`pill ${STATUS_COLORS[report.status] || "bg-zinc-500/10 text-zinc-400"}`}
                        >
                          {report.status}
                        </span>
                        <span className="text-sm font-medium text-zinc-100">
                          Report against {report.entityName}
                        </span>
                        <span
                          className={`pill ring-1 text-[10px] ${ROLE_COLORS[report.entityType] || "bg-zinc-500/10 text-zinc-400"}`}
                        >
                          {report.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{report.description}</p>
                      <div className="space-y-1 text-xs text-zinc-500">
                        <p>
                          Reported by: {report.reporterName || "Anonymous"}{" "}
                          {report.reporterEmail && `(${report.reporterEmail})`}
                        </p>
                        <p>
                          Submitted: {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                        {report.adminNotes && (
                          <p className="mt-2 rounded bg-zinc-800 p-2 text-zinc-400">
                            <strong>Admin Notes:</strong> {report.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      {editingReport === report.id ? (
                        <div className="space-y-2">
                          <select
                            value={reportStatus}
                            onChange={(e) => setReportStatus(e.target.value)}
                            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="REVIEWING">Reviewing</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="DISMISSED">Dismissed</option>
                          </select>
                          <textarea
                            value={reportNotes}
                            onChange={(e) => setReportNotes(e.target.value)}
                            placeholder="Admin notes..."
                            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateReport(report.id)}
                              disabled={processingId === report.id}
                              className="rounded bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-900 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingReport(null);
                                setReportNotes("");
                                setReportStatus("");
                              }}
                              className="rounded border border-zinc-700 px-3 py-1 text-[11px] text-zinc-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingReport(report.id);
                            setReportStatus(report.status);
                            setReportNotes(report.adminNotes || "");
                          }}
                          className="rounded border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                        >
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legacy Roles Tab - Keep existing functionality */}
      {activeTab === "roles" && <LegacyRolesSection />}
    </div>
  );
}

// Extract the original roles management to a separate component
function LegacyRolesSection() {
  const { address, role } = useWallet();
  const [items, setItems] = useState<
    { id: string; wallet: string; role: string; createdAt: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState("MANUFACTURER");
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { "x-wallet-address": address },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("Unable to load roles.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [address]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newAddress.trim()) {
      setError("Address required");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address ?? "",
        },
        body: JSON.stringify({ address: newAddress.trim(), role: newRole }),
      });
      if (!res.ok) throw new Error();
      setNewAddress("");
      await load();
    } catch {
      setError("Failed to assign role.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(wallet: string) {
    if (!window.confirm(`Revoke role from ${wallet}?`)) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address ?? "",
        },
        body: JSON.stringify({ address: wallet }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Failed to revoke role.");
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    MANUFACTURER: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
    DISTRIBUTOR: "bg-violet-500/10 text-violet-400 ring-violet-500/30",
    PHARMACY: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
    ADMIN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  };

  const filtered = filter === "ALL" ? items : items.filter((i) => i.role === filter);

  return (
    <div className="page-grid">
      <section className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-100">
            Legacy: Assign role by wallet
          </h2>
          <p className="text-xs text-zinc-400">
            Direct wallet-to-role assignment (bypasses onboarding).
          </p>
        </div>
        <form onSubmit={handleAssign} className="flex flex-col gap-3">
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="0x… wallet address"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
          >
            <option value="MANUFACTURER">MANUFACTURER</option>
            <option value="DISTRIBUTOR">DISTRIBUTOR</option>
            <option value="PHARMACY">PHARMACY</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : `Assign ${newRole}`}
          </button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            RoleAssignment table
          </h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300"
          >
            <option value="ALL">All</option>
            <option value="MANUFACTURER">Manufacturers</option>
            <option value="DISTRIBUTOR">Distributors</option>
            <option value="PHARMACY">Pharmacies</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950/80 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Wallet</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Since</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-zinc-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-zinc-500">
                    No roles assigned.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="text-xs text-zinc-200">
                  <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                    {item.wallet.slice(0, 8)}...{item.wallet.slice(-4)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`pill ring-1 ${ROLE_COLORS[item.role] || ""}`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleRevoke(item.wallet)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-rose-400"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
