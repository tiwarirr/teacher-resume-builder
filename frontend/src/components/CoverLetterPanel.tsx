"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { coverLetterApi, ApiError, type CoverLetterDetail } from "@/lib/api";

const inputClass = "rounded-md border border-zinc-300 px-3 py-2 text-sm";

export function CoverLetterPanel({ resumeId }: { resumeId: string }) {
  const [kind, setKind] = useState<"cover_letter" | "teaching_philosophy">("cover_letter");
  const [tone, setTone] = useState("formal");
  const [jobText, setJobText] = useState("");
  const [current, setCurrent] = useState<CoverLetterDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<CoverLetterDetail[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadHistory() {
    try {
      setHistory(await coverLetterApi.list(resumeId));
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [resumeId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const letter = await coverLetterApi.generate(resumeId, {
        kind,
        job_description_text: kind === "cover_letter" ? jobText : "",
        tone,
      });
      setCurrent(letter);
      setDraft(letter.content);
      await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate this.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveEdits() {
    if (!current) return;
    setSaving(true);
    try {
      const updated = await coverLetterApi.update(current.id, draft);
      setCurrent(updated);
      await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your edits.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this?")) return;
    await coverLetterApi.remove(id);
    if (current?.id === id) {
      setCurrent(null);
      setDraft("");
    }
    await loadHistory();
  }

  function loadFromHistory(letter: CoverLetterDetail) {
    setCurrent(letter);
    setDraft(letter.content);
    setKind(letter.kind);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <Link href={`/resumes/${resumeId}/edit`} className="text-sm text-zinc-500 underline">
          &larr; Back to editor
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Cover letter &amp; teaching philosophy</h1>
      </div>

      <p className="text-sm text-zinc-500">
        Generated using only facts from this resume — it will never state a school, year, subject, or
        achievement that isn&apos;t already in your resume.
      </p>

      <div className="flex flex-wrap gap-3">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={inputClass}>
          <option value="cover_letter">Cover letter</option>
          <option value="teaching_philosophy">Teaching philosophy statement</option>
        </select>
        <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
          <option value="formal">Formal</option>
          <option value="warm">Warm</option>
          <option value="confident">Confident</option>
        </select>
      </div>

      {kind === "cover_letter" && (
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          rows={5}
          placeholder="Optional: paste the job advertisement to tailor the letter to it"
          className={inputClass}
        />
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {generating ? "Generating..." : `Generate ${kind === "cover_letter" ? "cover letter" : "philosophy statement"}`}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {current && (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={14}
            className={`${inputClass} font-serif leading-relaxed`}
          />
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdits}
              disabled={saving || draft === current.content}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save edits"}
            </button>
            <button onClick={handleCopy} className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100">
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        </div>
      )}

      {history && history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Previously generated</h2>
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3 text-sm">
                <button onClick={() => loadFromHistory(h)} className="flex-1 text-left">
                  <span className="font-medium text-zinc-900">
                    {h.kind === "cover_letter" ? "Cover letter" : "Teaching philosophy"}
                  </span>{" "}
                  <span className="text-xs text-zinc-400">{new Date(h.updated_at).toLocaleString()}</span>
                </button>
                <button onClick={() => handleDelete(h.id)} className="text-xs text-red-600 underline">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
