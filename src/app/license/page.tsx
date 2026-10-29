import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "License", description: "What you can and can’t do with Revnit families." };

// Plain-language terms. Have them reviewed before charging for families.
const CAN = [
  "Use any family you download or buy in as many of your own projects as you like, including commercial work for clients.",
  "Edit, rename and adapt families inside your projects and your company’s template.",
  "Share project models that contain the families with clients, consultants and contractors working on that project.",
  "Keep using the families after your account is closed.",
];

const CANNOT = [
  "Resell, upload or share the .rfa files themselves, edited or not, on other sites, marketplaces or shared drives outside a project.",
  "Bundle the families into a content library, plugin or template that you sell or give away.",
  "Share one purchase across a company: each person downloading needs their own account. Licences for whole teams are available on request.",
];

export default function LicensePage() {
  return (
    <div className="shell max-w-3xl pt-12">
      <h1 className="wide text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">License</h1>
      <p className="mt-4 text-lg leading-relaxed text-graphite">
        The same terms apply to free and exclusive families. In short: use them on real work as much as you like, but
        don’t redistribute the files.
      </p>

      <section className="mt-12">
        <h2 className="semiwide border-b border-edge pb-2 text-xl font-bold">You can</h2>
        <ul className="mt-2">
          {CAN.map((item) => (
            <li key={item} className="border-b border-rule py-3 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="semiwide border-b border-edge pb-2 text-xl font-bold">You can’t</h2>
        <ul className="mt-2">
          {CANNOT.map((item) => (
            <li key={item} className="border-b border-rule py-3 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 space-y-4 leading-relaxed">
        <h2 className="semiwide border-b border-edge pb-2 text-xl font-bold">Payments and refunds</h2>
        <p>
          Exclusive families are a one-time purchase that includes every Revit version offered and later updates to that
          family. If a file doesn’t open or doesn’t match its description, email{" "}
          <a href={`mailto:${site.contactEmail}`} className="link">
            {site.contactEmail}
          </a>{" "}
          within 14 days and it will be fixed or refunded.
        </p>
        <p className="text-graphite">
          Families are provided as modelling content. Check sizes, ratings and clearances against the manufacturer’s data
          and your local codes before construction.
        </p>
      </section>
    </div>
  );
}
