"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tailorApi, ApiError, type TailorResult, type TailoringSessionSummary } from "@/lib/api";

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function ResultCard({ result }: { result: TailorResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-4 rounded-lg border p-4 ${scoreColor(result.match_score)}`}>
        <span className="text-4xl font-bold">{result.match_score}</span>
        <span className="text-sm">/ 100 match with this job advertisement</span>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Gaps to address</h3>
        {result.gaps.length === 0 ? (
          <p className="text-sm text-zinc-500">No gaps found — this resume covers what the ad asks for well.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-zinc-700">
            {result.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Suggested emphasis</h3>
        {result.reorder_suggestions.length === 0 ? (
          <p className="text-sm text-zinc-500">No reordering needed.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-zinc-700">
            {result.reorder_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function TailorPanel({ resumeId }: { resumeId: string }) {
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [history, setHistory] = useState<TailoringSessionSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setHistory(await tailorApi.history(resumeId));
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [resumeId]);

  async function handleAnalyze() {
    if (!jobText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await tailorApi.analyze(resumeId, jobText);
      setResult(r);
      await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not analyze this job description.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <Link href={`/resumes/${resumeId}/edit`} className="text-sm text-zinc-500 underline">
          &larr; Back to editor
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Tailor to a job</h1>
      </div>

      <p className="text-sm text-zinc-500">
        Paste a job advertisement below. The AI compares it against your resume&apos;s actual content only — it
        will point out gaps and suggest which of your existing sections to emphasise, never suggest adding
        experience you don&apos;t have.
      </p>

      <textarea
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
        rows={10}
        placeholder="Paste the school's job advertisement here..."
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />

      <button
        onClick={handleAnalyze}
        disabled={loading || !jobText.trim()}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze match"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && <ResultCard result={result} />}

      {history && history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Past analyses for this resume</h2>
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-zinc-200 bg-white p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${scoreColor(h.match_score)}`}>
                    {h.match_score}/100
                  </span>
                  <span className="text-xs text-zinc-400">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <p className="line-clamp-2 text-xs text-zinc-500">{h.job_description_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
