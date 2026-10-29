"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRequest, updateRequest } from "@/app/studio/actions";
import type { StudioRequest } from "@/lib/data/studio";
import { timeAgo } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

const STATUSES: { value: RequestStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "Modelling" },
  { value: "shipped", label: "Published" },
  { value: "declined", label: "Declined" },
];

export function RequestRow({ request, families }: { request: StudioRequest; families: { id: string; name: string; status: string }[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [familyId, setFamilyId] = useState(request.family_id ?? "");
  const [note, setNote] = useState(request.status_note ?? "");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();
  const changed = status !== request.status || familyId !== (request.family_id ?? "") || note !== (request.status_note ?? "");

  return (
    <li className="grid gap-4 border-b border-rule py-5 lg:grid-cols-[1fr_520px]">
      <div>
        <p className="semiwide font-semibold">{request.title}</p>
        {request.details && <p className="mt-1 text-[15px] text-graphite">{request.details}</p>}
        <p className="mt-2 text-[13px] text-graphite">
          {request.votes_count} {request.votes_count === 1 ? "vote" : "votes"}
          {request.category_name && ` in ${request.category_name}`}, asked {timeAgo(request.created_at)}
          {request.requester && ` by ${request.requester.email}`}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} className="field h-10 cursor-pointer py-0">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select aria-label="Published family" value={familyId} onChange={(e) => setFamilyId(e.target.value)} className="field h-10 cursor-pointer py-0">
          <option value="">Link the family that fulfils it</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.status !== "published" ? ` (${f.status})` : ""}
            </option>
          ))}
        </select>
        {status === "declined" && (
          <input aria-label="Reason shown to voters" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason shown to voters" className="field h-10 sm:col-span-2" />
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="button"
            disabled={!changed || busy}
            onClick={() =>
              startTransition(async () => {
                const result = await updateRequest(request.id, { status, family_id: familyId || null, status_note: note });
                setMessage(result.ok ? (status !== request.status ? "Saved. Voters have been notified." : "Saved.") : result.message);
                if (result.ok) router.refresh();
              })
            }
            className="btn btn-primary btn-sm"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!confirm("Delete this request? Votes are removed too.")) return;
              startTransition(async () => {
                const result = await deleteRequest(request.id);
                if (result.ok) router.refresh();
                else setMessage(result.message);
              });
            }}
            className="btn btn-quiet btn-sm"
          >
            Delete
          </button>
          {message && <span role="status" className="text-[13px] font-medium">{message}</span>}
        </div>
      </div>
    </li>
  );
}
