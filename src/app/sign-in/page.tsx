import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getViewer } from "@/lib/data/member";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  if (await getViewer()) redirect(next);

  const downloading = next.includes("download=");

  return (
    <div className="shell grid gap-14 pt-14 lg:grid-cols-[440px_1fr] lg:gap-24 lg:pt-20">
      <div>
        <h1 className="wide text-4xl leading-[1.05] font-extrabold tracking-[-0.03em]">
          {downloading ? "Sign in to download" : "Sign in or create an account"}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-graphite">
          {downloading
            ? "Free families need a free account. Your download starts as soon as you’re back."
            : "One account for free downloads, purchases and requests."}
        </p>
        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-soft p-4 text-[15px] text-red">
            {error === "provider"
              ? "Google sign-in didn’t finish. Try again, or use your email instead."
              : "That sign-in link has expired or was already used. Request a new one below."}
          </p>
        )}
        <div className="mt-8">
          {supabaseConfigured ? (
            <SignInForm next={next} />
          ) : (
            <div className="rounded-xl rounded-xl border border-edge p-6">
              <h2 className="font-semibold">Accounts aren’t connected yet</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-graphite">
                This preview is running on the sample catalog. Add the Supabase keys from <code>.env.example</code> to enable
                sign-in, downloads and payments.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:border-l lg:border-edge lg:pl-16">
        <h2 className="semiwide text-xl font-bold">With a free account you can</h2>
        <ul className="mt-6 border-t border-edge">
          {[
            ["Download free families", "Every Revit version and the type catalog, kept in your library."],
            ["Get told about updates", "When a family you downloaded gets a new version, you hear first."],
            ["Follow categories", "New lighting or switchgear families arrive in your notifications."],
            ["Request what’s missing", "Ask for a family and vote on others. The most wanted get modelled next."],
          ].map(([title, body]) => (
            <li key={title} className="border-b border-rule py-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-[15px] text-graphite">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
