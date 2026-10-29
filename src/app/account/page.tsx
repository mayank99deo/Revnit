import Link from "next/link";
import { FamilyVisual } from "@/components/family-visual";
import { getLibrary, requireViewer } from "@/lib/data/member";
import { formatDate } from "@/lib/format";

type Props = { searchParams: Promise<{ purchased?: string }> };

export default async function LibraryPage({ searchParams }: Props) {
  const viewer = await requireViewer("/account");
  const [{ purchased }, library] = await Promise.all([searchParams, getLibrary(viewer.id)]);
  const updates = library.filter((item) => item.has_update).length;

  return (
    <>
      {purchased && (
        <p role="status" className="mb-8 rounded-xl bg-green-soft p-4 font-medium text-green">
          Payment confirmed. Your families are unlocked below.
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Library</h1>
          <p className="mt-1 text-graphite">
            {updates > 0
              ? `${updates} ${updates === 1 ? "family has" : "families have"} a newer version than the one you downloaded.`
              : "Everything you’ve downloaded or bought, in one place."}
          </p>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
          <h2 className="wide text-2xl font-bold tracking-[-0.02em]">Nothing here yet</h2>
          <p className="mt-2 max-w-xl text-graphite">
            Families you download or buy are kept here, and you’ll see when a newer version is published.
          </p>
          <Link href="/families" className="btn btn-primary mt-6">
            Browse families
          </Link>
        </div>
      ) : (
        <ul className="border-t border-edge">
          {library.map((item) => (
            <li key={item.id} className="flex items-center gap-5 border-b border-rule py-3">
              <div className="hidden w-28 shrink-0 overflow-hidden rounded-lg border border-edge sm:block">
                <FamilyVisual coverPath={item.cover_path} drawing={item.drawing} name={item.name} sizes="112px" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/families/${item.slug}`} className="semiwide font-semibold hover:underline">
                  {item.name}
                </Link>
                <p className="mt-0.5 text-[13px] text-graphite">
                  {item.category_name}
                  <span className="mx-2" aria-hidden="true">/</span>
                  {item.owned ? "Purchased" : "Free"}
                  {item.last_downloaded_at && (
                    <>
                      <span className="mx-2" aria-hidden="true">/</span>
                      Downloaded {formatDate(item.last_downloaded_at)}
                    </>
                  )}
                </p>
              </div>
              {item.has_update && (
                <span className="tag hidden shrink-0 bg-yellow text-ink sm:inline-flex">
                  v{item.version_label} available
                </span>
              )}
              <Link href={`/families/${item.slug}`} className="btn btn-secondary btn-sm shrink-0">
                {item.has_update ? "Get update" : "Download"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
