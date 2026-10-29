import Link from "next/link";
import { FamilyGrid } from "@/components/family-card";
import { getOwnedFamilyIds, getSaved, requireViewer } from "@/lib/data/member";

export default async function SavedPage() {
  const viewer = await requireViewer("/account/saved");
  const [saved, owned] = await Promise.all([getSaved(viewer.id), getOwnedFamilyIds()]);

  return (
    <>
      <h1 className="wide mb-6 text-3xl font-extrabold tracking-[-0.03em]">Saved</h1>
      {saved.length === 0 ? (
        <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
          <h2 className="wide text-2xl font-bold tracking-[-0.02em]">No saved families</h2>
          <p className="mt-2 max-w-xl text-graphite">Use Save on any family to shortlist it for a project.</p>
          <Link href="/families" className="btn btn-primary mt-6">
            Browse families
          </Link>
        </div>
      ) : (
        <FamilyGrid families={saved} owned={owned} />
      )}
    </>
  );
}
