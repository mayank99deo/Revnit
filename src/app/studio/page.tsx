import Link from "next/link";
import { ActivityChart } from "@/components/studio/activity-chart";
import { getOverview } from "@/lib/data/studio";
import { formatCount, formatPrice, timeAgo } from "@/lib/format";

function change(now: number, before: number): string {
  if (before === 0) return now === 0 ? "No change vs previous 30 days" : "New this period";
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return "No change vs previous 30 days";
  return `${pct > 0 ? "▲ Up" : "▼ Down"} ${Math.abs(pct)}% vs previous 30 days`;
}

export default async function StudioOverviewPage() {
  const { overview: o, daily, top, demand } = await getOverview(30);

  const tiles = [
    { label: "Downloads", value: formatCount(o.downloads), note: change(o.downloads, o.downloads_prev) },
    { label: "Revenue", value: formatPrice(o.revenue_paise), note: `${o.orders} orders. ${change(o.revenue_paise, o.revenue_prev_paise)}` },
    { label: "New members", value: formatCount(o.members_new), note: `${formatCount(o.members)} members in total` },
    {
      label: "Searches with no result",
      value: formatCount(o.searches_unmatched),
      note: `of ${formatCount(o.searches)} searches. Each one is a family to consider.`,
    },
  ];

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Last 30 days</h1>
          <p className="mt-1 text-graphite">
            {o.published} published, {o.drafts} in draft, {o.requests_open} open requests
          </p>
        </div>
        <Link href="/studio/families/new" className="btn btn-primary">
          New family
        </Link>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-5">
            <dt className="text-[15px] text-graphite">{t.label}</dt>
            <dd className="mt-1 text-4xl font-semibold tracking-[-0.02em]">{t.value}</dd>
            <dd className="mt-2 text-[13px] text-graphite">{t.note}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="semiwide mb-4 text-lg font-bold">
          Downloads per day
        </h2>
        <ActivityChart days={daily} />
      </section>

      <div className="grid gap-14 lg:grid-cols-2">
        <section aria-labelledby="demand-heading">
          <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-edge pb-2">
            <h2 id="demand-heading" className="semiwide text-lg font-bold">
              Searched for, not found
            </h2>
            <Link href="/studio/searches" className="link text-[15px]">
              All searches
            </Link>
          </div>
          {demand.length === 0 ? (
            <p className="py-4 text-graphite">Every search found something. Nothing to add here yet.</p>
          ) : (
            <table className="w-full text-[15px]">
              <thead className="sr-only">
                <tr>
                  <th>Query</th>
                  <th>Searches</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {demand.map((d) => (
                  <tr key={d.query} className="border-b border-rule">
                    <td className="py-2.5 font-medium">{d.query}</td>
                    <td className="py-2.5 text-right whitespace-nowrap text-graphite">
                      {d.unmatched}× {d.members > 1 && `by ${d.members} members`}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <Link href={`/studio/families/new?name=${encodeURIComponent(d.query)}`} className="link text-[14px] whitespace-nowrap">
                        Start family
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="top-heading">
          <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-edge pb-2">
            <h2 id="top-heading" className="semiwide text-lg font-bold">
              Most downloaded
            </h2>
            <Link href="/studio/families" className="link text-[15px]">
              All families
            </Link>
          </div>
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[13px] text-graphite">
                <th className="py-1 font-normal">Family</th>
                <th className="py-1 text-right font-normal">Downloads</th>
                <th className="py-1 text-right font-normal">Buyers</th>
              </tr>
            </thead>
            <tbody>
              {top.map((f) => (
                <tr key={f.id} className="border-t border-rule">
                  <td className="py-2.5">
                    <Link href={`/studio/families/${f.id}`} className="hover:underline">
                      {f.name}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right">{formatCount(f.downloads)}</td>
                  <td className="py-2.5 text-right">{f.price_paise > 0 ? formatCount(f.buyers) : "Free"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {demand[0] && <p className="mt-4 text-[13px] text-graphite">Last unmatched search {timeAgo(demand[0].last_searched)}.</p>}
        </section>
      </div>
    </div>
  );
}
