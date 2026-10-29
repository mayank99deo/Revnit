import Link from "next/link";
import { FamilyGrid } from "@/components/family-card";
import { SearchBox } from "@/components/search-box";
import { SystemDiagram } from "@/components/system-diagram";
import { getCategories, getRequests, searchFamilies } from "@/lib/data/catalog";
import { getOwnedFamilyIds, getViewer } from "@/lib/data/member";
import { AccessTag } from "@/components/price-tag";
import { RequestStatusBadge } from "@/components/request-status";
import { formatCount } from "@/lib/format";
import { site } from "@/lib/site";

export default async function HomePage() {
  const [categories, newest, popular, requests, viewer, owned] = await Promise.all([
    getCategories(),
    searchFamilies({ sort: "new" }),
    searchFamilies({ sort: "popular" }),
    getRequests(["open", "planned", "in_progress"]),
    getViewer(),
    getOwnedFamilyIds(),
  ]);
  const familyCount = categories.reduce((sum, c) => sum + c.family_count, 0);

  return (
    <>
      <section className="shell pt-12 pb-0 sm:pt-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <h1 className="wide text-[2.6rem] leading-[1] font-extrabold tracking-[-0.035em] sm:text-6xl lg:text-display">
            {site.tagline}
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-graphite lg:pb-2">
            {familyCount > 0 ? `${formatCount(familyCount)} families` : "Families"} for lighting, power distribution,
            containment and fire alarm. Parametric types, working electrical connectors and a file for each Revit release
            they support.
          </p>
        </div>
        <div className="mt-10 max-w-3xl">
          <SearchBox variant="hero" />
        </div>
        <div className="mt-14">
          <SystemDiagram categories={categories} />
        </div>
      </section>

      {newest.items.length > 0 && (
        <section className="shell mt-20" aria-labelledby="new-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="new-heading" className="wide text-[28px] leading-tight font-bold tracking-[-0.02em]">
              Recently published
            </h2>
            <Link href="/families?sort=new" className="link shrink-0 text-[15px] font-medium">
              All new families
            </Link>
          </div>
          <FamilyGrid families={newest.items.slice(0, 4)} owned={owned} />
        </section>
      )}

      <section className={`shell mt-20 grid gap-14 lg:gap-16 ${popular.items.length > 0 ? "lg:grid-cols-2" : ""}`}>
        {popular.items.length > 0 && (
          <div>
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-edge pb-3">
              <h2 className="wide text-[28px] leading-tight font-bold tracking-[-0.02em]">Most downloaded</h2>
              <Link href="/families?sort=popular" className="link shrink-0 text-[15px] font-medium">
                See ranking
              </Link>
            </div>
            <ol>
              {popular.items.slice(0, 6).map((family, i) => (
                <li key={family.id} className="border-b border-rule">
                  <Link href={`/families/${family.slug}`} className="group flex items-baseline gap-5 py-3.5">
                    <span className="w-6 shrink-0 text-right text-[15px] text-graphite">{i + 1}</span>
                    <span className="flex-1 font-medium group-hover:text-blue">{family.name}</span>
                    <span className="shrink-0 text-[13px] text-graphite">{formatCount(family.downloads_count)}</span>
                    <span className="flex w-24 shrink-0 justify-end">
                      <AccessTag paid={family.price_paise > 0} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-edge pb-3">
            <h2 className="wide text-[28px] leading-tight font-bold tracking-[-0.02em]">Requested next</h2>
            <Link href="/requests" className="link shrink-0 text-[15px] font-medium">
              Request board
            </Link>
          </div>
          {requests.length === 0 && (
            <p className="rounded-xl bg-wash p-5 text-[15px] text-graphite">
              No requests yet. Be the first to ask for the family you can’t find anywhere else.
            </p>
          )}
          <ul>
            {requests.slice(0, 5).map((request) => (
              <li key={request.id} className="flex items-center gap-4 border-b border-rule py-3">
                <span className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-wash text-[15px] leading-none font-bold">
                  {request.votes_count}
                </span>
                <span className="flex-1 font-medium">{request.title}</span>
                <RequestStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px] leading-relaxed text-graphite">
            Missing a family? Tell Nitish what you need. Requests with the most votes get modelled first, and everyone who
            voted is notified when it’s published.
          </p>
          <Link href="/requests#new" className="btn btn-primary mt-5">
            Request a family
          </Link>
        </div>
      </section>

      <section className="shell mt-24" aria-labelledby="how-heading">
        <h2 id="how-heading" className="sr-only">
          How downloads work
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="panel p-7">
            <AccessTag paid={false} />
            <h3 className="semiwide mt-5 text-xl font-bold">Sign in and download</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-graphite">
              Most families are free. A free account keeps your downloads in one library and tells you when they’re
              updated.
            </p>
          </div>
          <div className="panel relative overflow-hidden p-7">
            <div className="hatch absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
            <AccessTag paid />
            <h3 className="semiwide mt-5 text-xl font-bold">Buy once, keep every update</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-graphite">
              Detailed families like PCC panels and busbar runs are exclusive. Add them to your cart, pay by UPI or card,
              then download every Revit version and future revision.
            </p>
          </div>
          <div className="panel p-7">
            <span className="tag bg-blue-soft text-blue-deep">Requested</span>
            <h3 className="semiwide mt-5 text-xl font-bold">Ask for what’s missing</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-graphite">
              Searches that find nothing and requests on the board decide what gets modelled next.
            </p>
          </div>
        </div>
      </section>

      <section className="shell mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <h2 className="wide text-[28px] leading-tight font-bold tracking-[-0.02em]">Modelled by {site.creator.name}</h2>
          <p className="mt-2 text-graphite">{site.creator.role}</p>
        </div>
        <div>
          <p className="text-lg leading-relaxed">{site.creator.bio}</p>
          <ul className="mt-8 grid gap-x-10 gap-y-3 text-[15px] sm:grid-cols-2">
            {[
              "Types driven by a type catalog you can edit",
              "Electrical connectors that circuit into panel schedules",
              "Clearance zones you can switch off for drawings",
              "Shared parameters only where Revit has none",
              "Saved separately for each supported Revit release",
              "Named consistently, so families are easy to find in your project",
            ].map((item) => (
              <li key={item} className="flex gap-3 border-t border-rule pt-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {!viewer && (
        <section className="shell mt-24">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-blue p-8 text-paper md:flex-row md:items-center md:p-10">
            <div className="phase-stripe absolute inset-x-0 top-0 h-1" aria-hidden="true" />
            <div>
              <h2 className="wide text-[28px] leading-tight font-bold tracking-[-0.02em]">Start with a free account</h2>
              <p className="mt-2 max-w-xl text-blue-soft">
                Download free families, save the ones you’ll need, follow categories and vote on what gets modelled next.
              </p>
            </div>
            <Link href="/sign-in" className="btn border-paper bg-paper text-blue-deep hover:bg-blue-soft">
              Create free account
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
