"use client";

import Link from "next/link";

/** Shown when a page fails to load, usually because the database didn't answer. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="shell max-w-2xl pt-20">
      <span className="tag bg-red-soft text-red">Page didn’t load</span>
      <h1 className="wide mt-5 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Something went wrong on our side</h1>
      <p className="mt-4 text-lg leading-relaxed text-graphite">
        Try again in a moment. If it keeps happening, email us and include the reference below.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          Try again
        </button>
        <Link href="/families" className="btn btn-secondary">
          Browse families
        </Link>
      </div>
      {digest && <p className="mt-8 text-[13px] text-graphite">Reference: {digest}</p>}
    </div>
  );
}
