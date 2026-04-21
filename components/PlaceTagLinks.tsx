"use client";

import Link from "next/link";

type Props = {
  tags: string[] | null | undefined;
  /** Es. "/" o "/luoghi" */
  basePath: string;
  className?: string;
};

/**
 * Chip cliccabili per filtrare per hashtag (`?tag=`).
 */
export function PlaceTagLinks({ tags, basePath, className }: Props) {
  const list = (tags ?? []).filter((t) => typeof t === "string" && t.trim());
  if (list.length === 0) return null;
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {list.map((tag) => (
        <Link
          key={tag}
          href={`${base}?tag=${encodeURIComponent(tag)}`}
          className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-100 dark:hover:bg-teal-900"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
