import { SettingsForm } from "@/components/settings-form";
import { WatchButton } from "@/components/toggles";
import { getCategories } from "@/lib/data/catalog";
import { getWatchedCategoryIds, requireViewer } from "@/lib/data/member";

export default async function SettingsPage() {
  const viewer = await requireViewer("/account/settings");
  const [categories, watched] = await Promise.all([getCategories(), getWatchedCategoryIds()]);

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
      <section>
        <h1 className="wide mb-6 text-3xl font-extrabold tracking-[-0.03em]">Settings</h1>
        <SettingsForm
          email={viewer.email}
          name={viewer.name}
          company={viewer.company}
          jobTitle={viewer.jobTitle}
          notifyEmail={viewer.notifyEmail}
        />
      </section>
      <section aria-labelledby="follow-heading">
        <h2 id="follow-heading" className="wide text-2xl font-bold tracking-[-0.02em]">
          Categories you follow
        </h2>
        <p className="mt-1 mb-5 text-graphite">You’ll be notified when a new family is published in these.</p>
        <ul className="border-t border-edge">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 border-b border-rule py-3">
              <span className="font-medium">{c.name}</span>
              <WatchButton categoryId={c.id} initial={watched.has(c.id)} label={c.name} compact />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
