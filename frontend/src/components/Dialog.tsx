"use client";

import { useState } from "react";

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">{children}</div>
    </div>
  );
}

export function PromptDialog({
  title,
  initialValue = "",
  confirmLabel = "Save",
  onConfirm,
  onCancel,
}: {
  title: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <Overlay>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onConfirm(value.trim());
        }}
      >
        <h2 className="mb-3 text-base font-semibold text-zinc-900">{title}</h2>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay>
      <h2 className="mb-1 text-base font-semibold text-zinc-900">{title}</h2>
      {description && <p className="mb-4 text-sm text-zinc-500">{description}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-700"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}
