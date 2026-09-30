"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resumeApi, ApiError } from "@/lib/api";
import type { ResumeSummary } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { PromptDialog, ConfirmDialog } from "@/components/Dialog";
import { useAuth } from "@/lib/auth-context";

type DialogState =
  | { kind: "create" }
  | { kind: "rename"; id: string; currentName: string }
  | { kind: "delete"; id: string; name: string }
  | null;

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelected(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : s));
  }

  async function load() {
    try {
      setResumes(await resumeApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your resumes.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(name: string) {
    setDialog(null);
    const created = await resumeApi.create({ name });
    router.push(`/resumes/${created.id}/edit`);
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    try {
      await resumeApi.duplicate(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(id: string, name: string) {
    setDialog(null);
    setBusyId(id);
    try {
      await resumeApi.update(id, { name });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setDialog(null);
    setBusyId(id);
    try {
      await resumeApi.remove(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Your resumes</h1>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
        <div className="flex gap-3">
          {selected.length === 2 && (
            <Link
              href={`/compare?a=${selected[0]}&b=${selected[1]}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Compare selected
            </Link>
          )}
          <button
            onClick={() => setDialog({ kind: "create" })}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            + New resume
          </button>
          <button onClick={logout} className="text-sm text-zinc-500 underline">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {resumes && resumes.length >= 2 && (
        <p className="mb-3 text-xs text-zinc-400">Tick two resumes below to compare them side by side.</p>
      )}

      {resumes === null && <p className="text-sm text-zinc-500">Loading...</p>}

      {resumes?.length === 0 && (
        <p className="text-sm text-zinc-500">No resumes yet — create one to get started.</p>
      )}

      <ul className="flex flex-col gap-3">
        {resumes?.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              disabled={!selected.includes(r.id) && selected.length >= 2}
              onChange={() => toggleSelected(r.id)}
              className="mr-3 disabled:opacity-30"
              aria-label={`Select ${r.name} for comparison`}
            />
            <Link href={`/resumes/${r.id}/edit`} className="flex-1">
              <p className="font-medium text-zinc-900">{r.name}</p>
              <p className="text-xs text-zinc-500">
                {r.template} · {r.language} · {r.mode} · updated {new Date(r.updated_at).toLocaleString()}
              </p>
            </Link>
            <div className="flex gap-3 text-xs">
              <button
                disabled={busyId === r.id}
                onClick={() => setDialog({ kind: "rename", id: r.id, currentName: r.name })}
                className="text-zinc-600 underline disabled:opacity-50"
              >
                Rename
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => handleDuplicate(r.id)}
                className="text-zinc-600 underline disabled:opacity-50"
              >
                Duplicate
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => setDialog({ kind: "delete", id: r.id, name: r.name })}
                className="text-red-600 underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {dialog?.kind === "create" && (
        <PromptDialog
          title="Name this resume"
          initialValue="Untitled resume"
          confirmLabel="Create"
          onConfirm={handleCreate}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "rename" && (
        <PromptDialog
          title="Rename resume"
          initialValue={dialog.currentName}
          confirmLabel="Rename"
          onConfirm={(name) => handleRename(dialog.id, name)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title={`Delete "${dialog.name}"?`}
          description="This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(dialog.id)}
          onCancel={() => setDialog(null)}
        />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
