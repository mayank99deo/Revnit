import Link from "next/link";
import { formatCount, formatRevit } from "@/lib/format";
import type { FamilyCard as FamilyCardData } from "@/lib/types";
import { FamilyVisual } from "./family-visual";
import { AccessTag } from "./price-tag";

export function FamilyCard({ family, owned = false }: { family: FamilyCardData; owned?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-edge bg-paper transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-[0_14px_30px_-18px_rgb(31_95_214/0.45)]">
      <FamilyVisual
        coverPath={family.cover_path}
        drawing={family.drawing}
        name={family.name}
        paid={family.price_paise > 0}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col gap-2 border-t border-edge px-4 pt-3 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-graphite">{family.category_name}</span>
          <AccessTag paid={family.price_paise > 0} owned={owned} />
        </div>
        <h3 className="semiwide text-[17px] leading-snug font-semibold">
          <Link href={`/families/${family.slug}`} className="after:absolute after:inset-0 group-hover:text-blue">
            {family.name}
          </Link>
        </h3>
        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px] text-graphite">
          <div>
            <dt className="sr-only">Revit</dt>
            <dd>{formatRevit(family.revit_min_version)}</dd>
          </div>
          {family.lod && (
            <div>
              <dt className="sr-only">Level of detail</dt>
              <dd>LOD {family.lod}</dd>
            </div>
          )}
          <div>
            <dt className="sr-only">Downloads</dt>
            <dd>{formatCount(family.downloads_count)} downloads</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function FamilyGrid({
  families,
  owned,
  columns = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  families: FamilyCardData[];
  owned?: Set<string>;
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-5 ${columns}`}>
      {families.map((family) => (
        <FamilyCard key={family.id} family={family} owned={owned?.has(family.id)} />
      ))}
    </div>
  );
}
