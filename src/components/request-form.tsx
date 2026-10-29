"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { createRequest, type FormState } from "@/app/actions";
import type { Category } from "@/lib/types";

export function RequestForm({
  categories,
  defaultTitle,
  signedIn,
}: {
  categories: Category[];
  defaultTitle: string;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-5">
      <div>
        <label htmlFor="title" className="label">
          Family you need
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={4}
          maxLength={140}
          defaultValue={defaultTitle}
          placeholder="e.g. IP65 weatherproof junction box"
          className="field"
        />
      </div>
      <div>
        <label htmlFor="category_id" className="label">
          Category
        </label>
        <select id="category_id" name="category_id" className="field cursor-pointer" defaultValue="">
          <option value="">Not sure</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="details" className="label">
          Details <span className="font-normal text-graphite">(optional)</span>
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          maxLength={2000}
          placeholder="Sizes, ratings, standards, Revit version, how you'd use it."
          className="field resize-y"
        />
      </div>

      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-[15px] font-medium ${state.status === "error" ? "bg-red-soft text-red" : "bg-green-soft text-green"}`}>
          {state.message}
        </p>
      )}

      {signedIn ? (
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Sending request" : "Send request"}
        </button>
      ) : (
        <Link href="/sign-in?next=/requests%23new" className="btn btn-primary w-full">
          Sign in to send request
        </Link>
      )}
    </form>
  );
}
