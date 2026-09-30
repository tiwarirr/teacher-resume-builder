"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type TemplateCard = {
  id: string;
  name: string;
  blurb: string;
  idealFor: string;
};

export function TemplateGallery({ templates }: { templates: TemplateCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = templates.find((t) => t.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpenId(t.id)}
            aria-label={`View ${t.name} template full size`}
            className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left transition hover:border-zinc-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <div className="relative h-64 w-full overflow-hidden bg-zinc-100">
              <Image
                src={`/templates/${t.id}.png`}
                alt={`${t.name} template preview`}
                fill
                className="object-cover object-top"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
              <span className="absolute bottom-2 right-2 rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                Click to enlarge
              </span>
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
              <p className="text-xs text-zinc-500">{t.blurb}</p>
              <p className="mt-2 inline-block rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                Ideal for: {t.idealFor}
              </p>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${open.name} template preview`}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6"
          onClick={() => setOpenId(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{open.name}</p>
                <p className="text-xs text-zinc-500">Ideal for: {open.idealFor}</p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setOpenId(null)}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <Image
              src={`/templates/${open.id}.png`}
              alt={`${open.name} template, full size`}
              width={1488}
              height={2105}
              className="h-auto w-full rounded-lg border border-zinc-200"
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        </div>
      )}
    </>
  );
}
