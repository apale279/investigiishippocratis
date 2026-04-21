"use client";

import { useEffect, useId, useRef, useState } from "react";

const MAX = 3;

type Props = {
  existingUrls: string[];
  onRemoveExisting: (index: number) => void;
  pendingFiles: File[];
  onAddPending: (files: FileList | null) => void;
  onRemovePending: (index: number) => void;
  disabled?: boolean;
  label: string;
  hint: string;
  pickLabel: string;
  maxReached: string;
};

export function PlacePhotoPicker({
  existingUrls,
  onRemoveExisting,
  pendingFiles,
  onAddPending,
  onRemovePending,
  disabled,
  label,
  hint,
  pickLabel,
  maxReached,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  const total = existingUrls.length + pendingFiles.length;
  const canAdd = total < MAX && !disabled;

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{hint}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {existingUrls.map((url, i) => (
          <div
            key={`ex-${url}-${i}`}
            className="relative h-20 w-20 overflow-hidden rounded-md border border-stone-200 bg-stone-100 dark:border-stone-600 dark:bg-stone-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemoveExisting(i)}
              className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white hover:bg-black/80 disabled:opacity-50"
              aria-label="Rimuovi"
            >
              ×
            </button>
          </div>
        ))}
        {pendingFiles.map((file, i) => (
          <div
            key={`${file.name}-${file.size}-${i}`}
            className="relative h-20 w-20 overflow-hidden rounded-md border border-dashed border-teal-600 bg-teal-50/50 dark:border-teal-700 dark:bg-teal-950/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingPreviews[i] ?? ""} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemovePending(i)}
              className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white hover:bg-black/80 disabled:opacity-50"
              aria-label="Rimuovi"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          disabled={!canAdd}
          className="sr-only"
          onChange={(e) => {
            onAddPending(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
        >
          {pickLabel}
        </button>
        {!canAdd && total >= MAX && (
          <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">{maxReached}</span>
        )}
      </div>
    </div>
  );
}
