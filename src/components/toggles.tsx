"use client";

import { Bookmark, BookmarkCheck, Check, ChevronUp, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setSaved, setVote, setWatching, type ToggleResult } from "@/app/actions";

/** Optimistic on/off control. Signed-out visitors are sent to sign in and brought back. */
function useToggle(initial: boolean, action: (next: boolean) => Promise<ToggleResult>) {
  const [on, setOn] = useState(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        setOn(!next);
        if (result.reason === "sign_in") router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      }
    });
  }

  return { on, toggle };
}

export function SaveButton({ familyId, initial }: { familyId: string; initial: boolean }) {
  const { on, toggle } = useToggle(initial, (next) => setSaved(familyId, next));
  const Icon = on ? BookmarkCheck : Bookmark;
  return (
    <button type="button" onClick={toggle} aria-pressed={on} className="btn btn-secondary">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {on ? "Saved" : "Save"}
    </button>
  );
}

export function WatchButton({
  categoryId,
  initial,
  label,
  compact = false,
}: {
  categoryId: number;
  initial: boolean;
  label: string;
  /** Plain "Follow" where the category name is already beside the button. */
  compact?: boolean;
}) {
  const { on, toggle } = useToggle(initial, (next) => setWatching(categoryId, next));
  const Icon = on ? Check : Plus;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`btn btn-sm ${on ? "btn-primary" : "btn-secondary"}`}
      title={on ? `You’ll be notified about new ${label.toLowerCase()} families` : undefined}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {on ? "Following" : compact ? "Follow" : `Follow ${label.toLowerCase()}`}
    </button>
  );
}

export function VoteButton({ requestId, initial, count }: { requestId: string; initial: boolean; count: number }) {
  const { on, toggle } = useToggle(initial, (next) => setVote(requestId, next));
  const shown = count + (on === initial ? 0 : on ? 1 : -1);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? `You need this. ${shown} votes. Select to remove your vote.` : `Vote for this request. ${shown} votes.`}
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition-colors ${
        on ? "border-blue bg-blue text-paper" : "border-edge bg-paper hover:border-blue hover:text-blue"
      }`}
    >
      <ChevronUp className="h-4 w-4" aria-hidden="true" />
      <span className="text-lg leading-none font-bold">{shown}</span>
    </button>
  );
}
