import Link from "next/link";
import { getStudioFamilies } from "@/lib/data/studio";
import { formatCount, formatDate, formatPrice } from "@/lib/format";

const STATUS = { draft: "Draft", published: "Published", archived: "Archived" } as const;

export default async function StudioFamiliesPage() {
  const families = await getStudioFamilies();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Families</h1>
        <Link href="/studio/families/new" className="btn btn-primary">
          New family
        </Link>
      </div>
      {families.length === 0 ? (
        <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
          <h2 className="wide text-2xl font-bold tracking-[-0.02em]">Add the first family</h2>
          <p className="mt-2 max-w-xl text-graphite">Name it and pick a category. You’ll upload files, types and renders on the next screen.</p>
          <Link href="/studio/families/new" className="btn btn-primary mt-6">
            New family
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className="py-2 pr-4 font-semibold">Family</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Revit</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Price</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Downloads</th>
                <th scope="col" className="py-2 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.id} className="border-b border-rule">
                  <td className="py-3 pr-4">
                    <Link href={`/studio/families/${f.id}`} className="font-medium hover:text-blue">
                      {f.name}
                    </Link>
                    <span className="block text-[13px] text-graphite">{f.category.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`tag ${f.status === "published" ? "bg-green-soft text-green" : f.status === "archived" ? "bg-wash text-graphite" : "bg-yellow-soft text-yellow-ink"}`}>
                      {STATUS[f.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-graphite">{f.revit_versions.length ? f.revit_versions.join(", ") : "No files"}</td>
                  <td className="py-3 pr-4 text-right">{formatPrice(f.price_paise)}</td>
                  <td className="py-3 pr-4 text-right">{formatCount(f.downloads_count)}</td>
                  <td className="py-3 text-right whitespace-nowrap text-graphite">{formatDate(f.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
