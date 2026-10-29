import { createFamily } from "@/app/studio/actions";
import { getCategories } from "@/lib/data/catalog";

type Props = { searchParams: Promise<{ name?: string; error?: string }> };

export default async function NewFamilyPage({ searchParams }: Props) {
  const [{ name, error }, categories] = await Promise.all([searchParams, getCategories()]);

  return (
    <div className="max-w-lg">
      <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">New family</h1>
      <p className="mt-2 text-graphite">It starts as a draft. Only you can see it until you publish.</p>
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-edge p-3 font-medium">
          {error === "missing" ? "Add a name of at least 3 characters and pick a category." : "The family wasn't created. Try again."}
        </p>
      )}
      <form action={createFamily} className="mt-8 space-y-5">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input id="name" name="name" required minLength={3} defaultValue={name ?? ""} placeholder="Recessed LED downlight" className="field" />
          <p className="mt-1.5 text-[13px] text-graphite">Name it the way people search: what it is, then the defining detail.</p>
        </div>
        <div>
          <label htmlFor="category_id" className="label">
            Category
          </label>
          <select id="category_id" name="category_id" required defaultValue="" className="field cursor-pointer">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Create draft
        </button>
      </form>
    </div>
  );
}
