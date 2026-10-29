import { notFound } from "next/navigation";
import { FamilyEditor } from "@/components/studio/family-editor";
import { getCategories } from "@/lib/data/catalog";
import { getEditableFamily } from "@/lib/data/studio";

export default async function EditFamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [family, categories] = await Promise.all([getEditableFamily(id), getCategories()]);
  if (!family) notFound();
  return <FamilyEditor family={family} categories={categories} />;
}
