"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resumeApi, ApiError } from "@/lib/api";
import type { ResumeDetail } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";

function FieldRow({ label, a, b }: { label: string; a: string; b: string }) {
  const differs = a !== b;
  return (
    <tr className={differs ? "bg-amber-50" : undefined}>
      <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">{label}</td>
      <td className="px-3 py-2 text-sm text-zinc-900">{a || <span className="text-zinc-300">—</span>}</td>
      <td className="px-3 py-2 text-sm text-zinc-900">{b || <span className="text-zinc-300">—</span>}</td>
    </tr>
  );
}

function ListColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold text-zinc-500">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-300">None</p>
      ) : (
        <ul className="list-disc pl-5 text-sm text-zinc-800">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function experienceLines(resume: ResumeDetail): string[] {
  return resume.content.experience.map(
    (exp) => `${exp.school} — ${exp.post} (${exp.board}), ${exp.dates} [${exp.bullets.length} bullet(s)]`,
  );
}

function CompareContent() {
  const params = useSearchParams();
  const aId = params.get("a");
  const bId = params.get("b");
  const [a, setA] = useState<ResumeDetail | null>(null);
  const [b, setB] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aId || !bId) return;
    Promise.all([resumeApi.get(aId), resumeApi.get(bId)])
      .then(([ra, rb]) => {
        setA(ra);
        setB(rb);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load these resumes."));
  }, [aId, bId]);

  if (!aId || !bId) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-6 py-12">
        <p className="text-sm text-zinc-500">
          Pick two resumes to compare from the{" "}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>
          .
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-6 py-12">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!a || !b) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-6 py-12">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/dashboard" className="text-sm text-zinc-500 underline">
        &larr; Dashboard
      </Link>

      <div className="grid grid-cols-2 gap-4">
        {[a, b].map((r) => (
          <div key={r.id} className="rounded-md border border-zinc-200 bg-white p-3">
            <p className="font-semibold text-zinc-900">{r.name}</p>
            <p className="text-xs text-zinc-500">
              {r.template} · {r.language} · {r.mode}
            </p>
            <Link href={`/resumes/${r.id}/edit`} className="text-xs text-zinc-500 underline">
              Edit this version
            </Link>
          </div>
        ))}
      </div>

      <table className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs text-zinc-500">
            <th className="px-3 py-2">Field</th>
            <th className="px-3 py-2">{a.name}</th>
            <th className="px-3 py-2">{b.name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          <FieldRow label="Template" a={a.template} b={b.template} />
          <FieldRow label="Language" a={a.language} b={b.language} />
          <FieldRow label="Mode" a={a.mode} b={b.mode} />
          <FieldRow label="Full name" a={a.content.profile.full_name} b={b.content.profile.full_name} />
          <FieldRow label="Email" a={a.content.profile.email} b={b.content.profile.email} />
          <FieldRow label="Phone" a={a.content.profile.phone} b={b.content.profile.phone} />
          <FieldRow label="Summary" a={a.content.summary} b={b.content.summary} />
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-6 rounded-md border border-zinc-200 bg-white p-4">
        <ListColumn title="Education" items={a.content.education.map((e) => `${e.degree}, ${e.institution} (${e.year})`)} />
        <ListColumn title="Education" items={b.content.education.map((e) => `${e.degree}, ${e.institution} (${e.year})`)} />

        <ListColumn title="Qualifications" items={a.content.qualifications.map((q) => `${q.type} — ${q.issuing_body}, ${q.year}`)} />
        <ListColumn title="Qualifications" items={b.content.qualifications.map((q) => `${q.type} — ${q.issuing_body}, ${q.year}`)} />

        <ListColumn title="Experience" items={experienceLines(a)} />
        <ListColumn title="Experience" items={experienceLines(b)} />

        <ListColumn title="EdTech skills" items={a.content.edtech_skills.map((s) => s.name)} />
        <ListColumn title="EdTech skills" items={b.content.edtech_skills.map((s) => s.name)} />
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="flex-1 px-6 py-12 text-sm text-zinc-500">Loading...</div>}>
        <CompareContent />
      </Suspense>
    </RequireAuth>
  );
}
