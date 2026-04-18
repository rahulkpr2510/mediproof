'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

type ReportEntity = 'MANUFACTURER' | 'DISTRIBUTOR' | 'PHARMACY' | '';

export default function ReportPage() {
  const { user } = useUser();
  const [form, setForm] = useState({
    entityType: '' as ReportEntity,
    entitySearchQuery: '',
    description: '',
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleEntitySearch() {
    if (!form.entityType || !form.entitySearchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entities/search?type=${form.entityType}&query=${encodeURIComponent(form.entitySearchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntity) {
      alert('Please select an entity to report');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reports/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: form.entityType,
          entityId: selectedEntity.id,
          entityName: selectedEntity.name,
          description: form.description,
          reporterName: form.reporterName || user?.firstName || '',
          reporterEmail: form.reporterEmail || user?.primaryEmailAddress?.emailAddress || '',
          reporterPhone: form.reporterPhone,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setForm({
          entityType: '',
          entitySearchQuery: '',
          description: '',
          reporterName: '',
          reporterEmail: '',
          reporterPhone: '',
        });
        setSelectedEntity(null);
      }
    } catch (error) {
      console.error('Report submission error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Report an issue
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Report suspicious activity, counterfeit medicines, or other compliance issues. Your report helps us maintain supply chain integrity.
        </p>
      </section>

      <div className="card max-w-2xl">
        {submitted ? (
          <div className="flex flex-col gap-4 py-8">
            <div className="rounded-lg bg-emerald-900/20 border border-emerald-700 p-4">
              <p className="text-sm font-medium text-emerald-400">
                Thank you for your report. Our team will review it shortly.
              </p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
            >
              Submit another report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Entity Selection */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Report Type
                </label>
                <div className="mt-2 flex gap-3">
                  {(['MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, entityType: type });
                        setSelectedEntity(null);
                        setSearchResults([]);
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        form.entityType === type
                          ? 'bg-zinc-50 text-zinc-900'
                          : 'border border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {form.entityType && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Search {form.entityType.toLowerCase()}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.entitySearchQuery}
                      onChange={(e) => setForm({ ...form, entitySearchQuery: e.target.value })}
                      placeholder={`Search by name, license number, etc.`}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleEntitySearch}
                      disabled={loading || !form.entitySearchQuery.trim()}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Search
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      <p className="text-xs text-zinc-500">{searchResults.length} result(s) found</p>
                      {searchResults.map((entity) => (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => setSelectedEntity(entity)}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                            selectedEntity?.id === entity.id
                              ? 'border-zinc-400 bg-zinc-900/50'
                              : 'border-zinc-700 bg-transparent hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-zinc-100">{entity.name}</p>
                            <p className="text-xs text-zinc-500">{entity.licenseNumber}</p>
                          </div>
                          {selectedEntity?.id === entity.id && (
                            <span className="text-xs font-semibold text-emerald-400">Selected</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedEntity && (
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-700 p-3">
                <p className="text-xs text-zinc-400">
                  Reporting: <span className="font-semibold text-zinc-100">{selectedEntity.name}</span>
                </p>
              </div>
            )}

            {/* Report Details */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Description of issue
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Provide details about the issue (counterfeit concerns, packaging defects, cold-chain breach, etc.)"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>

            {/* Reporter Info */}
            <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">Reporter information (optional if logged in)</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.reporterName}
                    onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                    placeholder="Your name"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.reporterEmail}
                    onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={form.reporterPhone}
                  onChange={(e) => setForm({ ...form, reporterPhone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedEntity || !form.description.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
