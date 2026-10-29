import type { MetadataRoute } from "next";
import { getCategories, PAGE_SIZE, searchFamilies } from "@/lib/data/catalog";
import { siteUrl } from "@/lib/env";
import type { FamilyCard } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getCategories();
  const families: FamilyCard[] = [];
  for (let page = 1; ; page++) {
    const { items, total } = await searchFamilies({ sort: "new", page });
    families.push(...items);
    if (page * PAGE_SIZE >= total || items.length === 0) break;
  }

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/families`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/requests`, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/license`, changeFrequency: "yearly", priority: 0.2 },
    ...categories.map((c) => ({ url: `${siteUrl}/categories/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...families.map((f) => ({ url: `${siteUrl}/families/${f.slug}`, lastModified: f.published_at ?? undefined, priority: 0.7 })),
  ];
}
