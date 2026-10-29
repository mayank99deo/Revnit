import Link from "next/link";
import { getSearchDemand } from "@/lib/data/studio";
import { timeAgo } from "@/lib/format";

type Props = { searchParams: Promise<{ days?: string; all?: string }> };

const RANGES = [7, 30, 90];

export default async function SearchDemandPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = RANGES.includes(Number(params.days)) ? Number(params.days) : 30;
  const unmatchedOnly = params.all !== "1";
  const rows = await getSearchDemand(days, unmatchedOnly);
  const link = (changes: { days?: number; all?: boolean }) => {
    const d = changes.days ?? days;
    const all = changes.all ?? !unmatchedOnly;
    const qs = new URLSearchParams({ ...(d !== 30 && { days: String(d) }), ...(all && { all: "1" }) }).toString();
    return qs ? `/studio/searches?${qs}` : "/studio/searches";
  };

  return (
    <>
      <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Search demand</h1>
      <p className="mt-1 mb-6 max-w-2xl text-graphite">
        What people typed into search. Queries with no result are families nobody has published yet: the clearest signal of
        what to model next.
      </p>
      <div className="mb-5 flex flex-wrap gap-6">
        <div className="flex gap-1" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <Link key={r} href={link({ days: r })} aria-current={r === days ? "true" : undefined} className={`h-9 rounded-lg px-3 text-[15px] leading-9 font-medium ${r === days ? "bg-blue-soft text-blue-deep" : "text-graphite hover:bg-wash hover:text-ink"}`}>
              {r} days
            </Link>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Which searches">
          <Link href={link({ all: false })} aria-current={unmatchedOnly ? "true" : undefined} className={`h-9 rounded-lg px-3 text-[15px] leading-9 font-medium ${unmatchedOnly ? "bg-blue-soft text-blue-deep" : "text-graphite hover:bg-wash hover:text-ink"}`}>
            Found nothing
          </Link>
          <Link href={link({ all: true })} aria-current={!unmatchedOnly ? "true" : undefined} className={`h-9 rounded-lg px-3 text-[15px] leading-9 font-medium ${!unmatchedOnly ? "bg-blue-soft text-blue-deep" : "text-graphite hover:bg-wash hover:text-ink"}`}>
            All searches
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl rounded-xl border border-edge p-6 text-graphite">No searches in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className="py-2 pr-4 font-semibold">Query</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Searches</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Found nothing</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Members</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Last</th>
                <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.query} className="border-b border-rule">
                  <td className="py-2.5 pr-4 font-medium">
                    <Link href={`/families?q=${encodeURIComponent(r.query)}`} className="hover:underline">
                      {r.query}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-right">{r.searches}</td>
                  <td className="py-2.5 pr-4 text-right">{r.unmatched}</td>
                  <td className="py-2.5 pr-4 text-right">{r.members}</td>
                  <td className="py-2.5 pr-4 text-right whitespace-nowrap text-graphite">{timeAgo(r.last_searched)}</td>
                  <td className="py-2.5 text-right">
                    <Link href={`/studio/families/new?name=${encodeURIComponent(r.query)}`} className="link text-[14px] whitespace-nowrap">
                      Start family
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
