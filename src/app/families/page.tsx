import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogView, catalogHref, parseCatalogQuery } from "@/components/catalog/catalog-view";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseCatalogQuery(await searchParams);
  return {
    title: q ? `“${q}” Revit families` : "All electrical Revit families",
    robots: q ? { index: false } : undefined,
  };
}

export default async function FamiliesPage({ searchParams }: Props) {
  const query = parseCatalogQuery(await searchParams);
  // Old-style ?category= links go to the category page.
  if (query.category) redirect(catalogHref(query));
  return <CatalogView query={query} />;
}
