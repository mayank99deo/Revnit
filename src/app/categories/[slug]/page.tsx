import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, parseCatalogQuery } from "@/components/catalog/catalog-view";
import { getCategories } from "@/lib/data/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function findCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  if (!category) return {};
  return {
    title: `${category.name} Revit families`,
    description: `${category.description} Download free and exclusive ${category.name.toLowerCase()} families for Revit.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!(await findCategory(slug))) notFound();
  return <CatalogView query={parseCatalogQuery(await searchParams, slug)} />;
}
