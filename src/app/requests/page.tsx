import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { RequestStatusBadge } from "@/components/request-status";
import { VoteButton } from "@/components/toggles";
import { getCategories, getRequests } from "@/lib/data/catalog";
import { getViewer, getVotedRequestIds } from "@/lib/data/member";
import { timeAgo } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Request a Revit family",
  description: "Ask for the electrical Revit family you need and vote on others. The most requested get modelled next.",
};

const VIEWS = {
  active: { label: "Active", statuses: ["open", "planned", "in_progress"] as RequestStatus[] },
  published: { label: "Published", statuses: ["shipped"] as RequestStatus[] },
  all: { label: "All", statuses: undefined },
};

type Props = { searchParams: Promise<{ view?: string; title?: string }> };

export default async function RequestsPage({ searchParams }: Props) {
  const { view: rawView, title } = await searchParams;
  const view = rawView && rawView in VIEWS ? (rawView as keyof typeof VIEWS) : "active";
  const [requests, categories, viewer, voted] = await Promise.all([
    getRequests(VIEWS[view].statuses),
    getCategories(),
    getViewer(),
    getVotedRequestIds(),
  ]);

  return (
    <div className="shell pt-10">
      <header className="grid gap-6 border-b border-edge pb-8 lg:grid-cols-[1fr_400px] lg:gap-16">
        <div>
          <h1 className="wide text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-5xl">Request board</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-graphite">
            Tell Nitish which family you need, or vote for one already asked for. The most wanted get modelled first, and
            everyone who voted is notified as it moves along.
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 self-end text-[14px]" aria-label="How a request progresses">
          {(["open", "planned", "in_progress", "shipped"] as RequestStatus[]).map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-edge" aria-hidden="true" />}
              <RequestStatusBadge status={s} />
            </li>
          ))}
        </ol>
      </header>

      <div className="grid gap-14 pt-8 lg:grid-cols-[1fr_400px] lg:gap-16">
        <section aria-labelledby="board-heading">
          <h2 id="board-heading" className="sr-only">
            Requests
          </h2>
          <nav aria-label="Filter requests" className="mb-4 flex gap-1">
            {Object.entries(VIEWS).map(([key, v]) => (
              <Link
                key={key}
                href={key === "active" ? "/requests" : `/requests?view=${key}`}
                aria-current={view === key ? "page" : undefined}
                className={`h-9 rounded-lg px-3.5 text-[15px] leading-9 font-medium ${view === key ? "bg-blue-soft text-blue-deep" : "text-graphite hover:bg-wash hover:text-ink"}`}
              >
                {v.label}
              </Link>
            ))}
          </nav>

          {requests.length === 0 ? (
            <p className="rounded-xl rounded-xl border border-edge p-8 text-graphite">No requests here yet. Be the first to ask.</p>
          ) : (
            <ul className="border-t border-edge">
              {requests.map((r) => (
                <li key={r.id} className="flex gap-5 border-b border-rule py-5">
                  <VoteButton requestId={r.id} initial={voted.has(r.id)} count={r.votes_count} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h3 className="semiwide text-lg leading-snug font-semibold">{r.title}</h3>
                      <RequestStatusBadge status={r.status} />
                    </div>
                    {r.details && <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-graphite">{r.details}</p>}
                    {r.status === "declined" && r.status_note && <p className="mt-1.5 text-[15px]">{r.status_note}</p>}
                    <p className="mt-2 text-[13px] text-graphite">
                      {r.category_name && <span className="mr-3">{r.category_name}</span>}
                      Asked {timeAgo(r.created_at)}
                    </p>
                    {r.family_slug && (
                      <Link href={`/families/${r.family_slug}`} className="btn btn-secondary btn-sm mt-3">
                        Open the published family
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="new" aria-labelledby="new-heading" className="self-start lg:sticky lg:top-24">
          <div className="rounded-xl rounded-xl border border-edge p-6">
            <h2 id="new-heading" className="semiwide text-xl font-bold">
              Request a family
            </h2>
            <p className="mt-1.5 mb-6 text-[15px] text-graphite">Check the board first. Voting on an existing request moves it up faster.</p>
            <RequestForm categories={categories} defaultTitle={title?.slice(0, 140) ?? ""} signedIn={Boolean(viewer)} />
          </div>
        </section>
      </div>
    </div>
  );
}
