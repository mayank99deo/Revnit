import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FamilyGrid } from "@/components/family-card";
import { DownloadPanel } from "@/components/family/download-panel";
import { TypeExplorer } from "@/components/family/type-explorer";
import { FamilyVisual } from "@/components/family-visual";
import { AccessTag } from "@/components/price-tag";
import { SaveButton } from "@/components/toggles";
import { getFamily, getRelated } from "@/lib/data/catalog";
import { getFamilyAccess, getViewer } from "@/lib/data/member";
import { mediaUrl, siteUrl } from "@/lib/env";
import { formatBytes, formatCount, formatDate, formatRevit } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const family = await getFamily((await params).slug);
  if (!family) return {};
  const image = mediaUrl(family.cover_path);
  return {
    title: `${family.name} Revit family`,
    description: family.summary,
    alternates: { canonical: `/families/${family.slug}` },
    openGraph: { title: family.name, description: family.summary, images: image ? [image] : undefined },
  };
}

export default async function FamilyPage({ params }: Props) {
  const family = await getFamily((await params).slug);
  // Row level security already limits drafts to the admin and archived families to their owners.
  if (!family) notFound();

  const [viewer, access, related] = await Promise.all([getViewer(), getFamilyAccess(family.id), getRelated(family)]);
  const modelFiles = family.files.filter((f) => f.kind === "rfa" || f.kind === "rvt");

  const facts: [string, string][] = [
    ["Opens in", formatRevit(family.revit_min_version)],
    ["Saved for", family.revit_versions.length ? family.revit_versions.join(", ") : "Pending"],
    ["Level of detail", family.lod ? `LOD ${family.lod}` : "Not applicable"],
    ["Hosting", family.host ?? "Annotation"],
    ["Parametric", family.is_parametric ? "Yes" : "No"],
    ["Types", family.types.rows.length ? String(family.types.rows.length) : "Single type"],
    ["Version", family.version_label],
    ["Updated", formatDate(family.updated_at)],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: family.name,
    description: family.summary,
    category: family.category_name,
    image: mediaUrl(family.cover_path) ?? undefined,
    url: `${siteUrl}/families/${family.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {family.status !== "published" && (
        <p role="status" className={`py-2.5 text-center text-[15px] font-medium ${family.status === "draft" ? "bg-yellow-soft text-yellow-ink" : "bg-wash text-graphite"}`}>
          {family.status === "draft"
            ? "Draft preview. Only you can see this page until it’s published."
            : "This family is no longer listed. It stays in your library and can still be downloaded."}
        </p>
      )}

      <div className="shell pt-8">
        <nav aria-label="Breadcrumb" className="text-[13px] text-graphite">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/families" className="hover:text-ink hover:underline">
                Families
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/categories/${family.category_slug}`} className="hover:text-ink hover:underline">
                {family.category_name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {family.name}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-edge">
              <FamilyVisual
                coverPath={family.cover_path}
                drawing={family.drawing}
                name={family.name}
                paid={family.price_paise > 0}
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
            </div>
            {family.gallery_paths.length > 0 && (
              <ul className="mt-3 grid grid-cols-4 gap-3">
                {family.gallery_paths.map((path) => (
                  <li key={path} className="overflow-hidden rounded-lg border border-edge">
                    <FamilyVisual coverPath={path} drawing={null} name={family.name} sizes="15vw" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[15px] text-graphite">{family.category_name}</p>
            <h1 className="wide mt-2 text-[2rem] leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[2.4rem]">
              {family.name}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-graphite">{family.summary}</p>
            <div className="mt-5 flex items-center gap-4">
              <AccessTag paid={family.price_paise > 0} owned={access.owned} />
              <span className="text-[15px] text-graphite">{formatCount(family.downloads_count)} downloads</span>
            </div>

            <div className="mt-6">
              <Suspense>
                <DownloadPanel
                  family={{
                    id: family.id,
                    slug: family.slug,
                    name: family.name,
                    price_paise: family.price_paise,
                    category_name: family.category_name,
                    drawing: family.drawing,
                  }}
                  files={family.files}
                  signedIn={Boolean(viewer)}
                  owned={access.owned}
                />
              </Suspense>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <SaveButton familyId={family.id} initial={access.saved} />
              {access.downloaded && <span className="text-[13px] text-graphite">In your library</span>}
            </div>
          </div>
        </div>

        <section className="mt-16" aria-labelledby="spec-heading">
          <h2 id="spec-heading" className="sr-only">
            Specification
          </h2>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="bg-paper px-4 py-3">
                <dt className="text-[13px] text-graphite">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {family.parameters.length > 0 && (
          <section className="mt-16" aria-labelledby="types-heading">
            <h2 id="types-heading" className="wide mb-6 text-[28px] font-bold tracking-[-0.02em]">
              Types and parameters
            </h2>
            <TypeExplorer familyName={family.name} parameters={family.parameters} types={family.types} />
          </section>
        )}

        <section className="mt-16 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div>
            <h2 className="wide mb-4 text-[28px] font-bold tracking-[-0.02em]">About this family</h2>
            <div className="max-w-[68ch] space-y-4 text-[17px] leading-relaxed">
              {family.description.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {family.tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
                {family.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/families?q=${encodeURIComponent(tag)}`} className="inline-flex h-7 items-center rounded-full bg-wash px-3 text-[13px] text-graphite hover:bg-blue-soft hover:text-blue-deep">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-10">
            {family.changelog.length > 0 && (
              <div>
                <h2 className="mb-3 font-semibold">What’s changed</h2>
                <ol className="border-l-2 border-blue-soft">
                  {family.changelog.map((entry) => (
                    <li key={entry.id} className="relative pb-5 pl-5 last:pb-0">
                      <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-blue" aria-hidden="true" />
                      <p className="text-[15px] font-semibold">
                        Version {entry.version_label}
                        <span className="ml-2 font-normal text-graphite">{formatDate(entry.created_at)}</span>
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-graphite">{entry.notes}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {modelFiles.length > 0 && (
              <div>
                <h2 className="mb-3 font-semibold">Files</h2>
                <table className="w-full text-[14px]">
                  <thead className="sr-only">
                    <tr>
                      <th>Revit</th>
                      <th>File</th>
                      <th>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.files.map((f) => (
                      <tr key={f.id} className="border-t border-rule">
                        <td className="py-2 pr-3 font-semibold whitespace-nowrap">{f.revit_version ?? f.kind.toUpperCase()}</td>
                        <td className="py-2 pr-3 break-all text-graphite">{f.file_name}</td>
                        <td className="py-2 text-right whitespace-nowrap text-graphite">{formatBytes(f.size_bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[13px] leading-relaxed text-graphite">
              Use in any number of your own projects, including commercial ones. Redistribution is not allowed. Read the{" "}
              <Link href="/license" className="link">
                license
              </Link>
              .
            </p>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-20" aria-labelledby="related-heading">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="wide text-[28px] font-bold tracking-[-0.02em]">
                More families
              </h2>
              <Link href={`/categories/${family.category_slug}`} className="link text-[15px] font-medium">
                More {family.category_name.toLowerCase()}
              </Link>
            </div>
            <FamilyGrid families={related} />
          </section>
        )}
      </div>
    </>
  );
}
