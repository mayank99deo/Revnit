"use client";

import { Download, FileText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart";
import { formatBytes } from "@/lib/format";
import type { FamilyFile } from "@/lib/types";

type Props = {
  family: { id: string; slug: string; name: string; price_paise: number; category_name: string; drawing: string | null };
  files: FamilyFile[];
  signedIn: boolean;
  owned: boolean;
};

export function DownloadPanel({ family, files, signedIn, owned }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const models = files.filter((f) => f.kind === "rfa" || f.kind === "rvt").sort((a, b) => (b.revit_version ?? 0) - (a.revit_version ?? 0));
  const extras = files.filter((f) => f.kind !== "rfa" && f.kind !== "rvt");
  const [fileId, setFileId] = useState(models[0]?.id ?? "");
  const [autoStarted, setAutoStarted] = useState(false);
  const started = useRef(false);

  const free = family.price_paise === 0;
  const canDownload = free || owned;
  const selected = models.find((f) => f.id === fileId);
  const pagePath = `/families/${family.slug}`;

  // Coming back from sign-in with ?download=<file> starts that download straight away.
  useEffect(() => {
    const requested = params.get("download");
    if (!requested || !signedIn || !canDownload || started.current) return;
    if (!files.some((f) => f.id === requested)) return;
    started.current = true;
    setAutoStarted(true);
    window.location.assign(`/api/download/${requested}`);
    router.replace(pagePath, { scroll: false });
  }, [params, signedIn, canDownload, files, router, pagePath]);

  function downloadHref(id: string) {
    return signedIn ? `/api/download/${id}` : `/sign-in?next=${encodeURIComponent(`${pagePath}?download=${id}`)}`;
  }

  if (models.length === 0) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">Files are being prepared</p>
        <p className="mt-1 text-[15px] text-graphite">Save this family and you’ll find it in your library when the files are up.</p>
      </div>
    );
  }

  const inCart = cart.has(family.id);

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-paper shadow-[0_18px_40px_-28px_rgb(14_17_22/0.35)]">
      <div className="p-5">
        <label htmlFor="revit-version" className="label">
          Your Revit version
        </label>
        <select
          id="revit-version"
          value={fileId}
          onChange={(event) => setFileId(event.target.value)}
          className="field h-11 cursor-pointer font-medium"
        >
          {models.map((f) => (
            <option key={f.id} value={f.id}>
              {f.revit_version ? `Revit ${f.revit_version}${f === models[0] ? " (newest)" : ""}` : f.file_name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[13px] text-graphite">
          Newer Revit releases upgrade older files on load, so pick the closest one at or below yours.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {canDownload ? (
            <a href={downloadHref(fileId)} className="btn btn-primary w-full">
              <Download className="h-4 w-4" aria-hidden="true" />
              {signedIn ? `Download for Revit ${selected?.revit_version ?? ""}`.trim() : "Sign in to download free"}
            </a>
          ) : (
            <>
              {/* The price is shown in the cart, once the buyer has chosen the family. */}
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={!cart.ready}
                onClick={() => {
                  cart.add(family);
                  router.push("/cart");
                }}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {inCart ? "View in cart" : "Add to cart"}
              </button>
              {inCart && <p className="text-center text-[13px] text-graphite">Already in your cart.</p>}
            </>
          )}
        </div>

        {autoStarted && (
          <p role="status" className="mt-3 text-[13px]">
            Your download has started. If nothing happens, use the button above.
          </p>
        )}
      </div>

      {canDownload && extras.length > 0 && (
        <ul className="border-t border-rule">
          {extras.map((f) => (
            <li key={f.id}>
              <a href={downloadHref(f.id)} className="flex items-start gap-3 px-5 py-3 hover:bg-wash">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">{f.kind === "txt" ? "Type catalog" : f.file_name}</span>
                  {f.kind === "txt" && (
                    <span className="block text-[13px] text-graphite">
                      Keep it next to the .rfa with the same name so Revit lists the types on load.
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-graphite">{formatBytes(f.size_bytes)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {!canDownload && (
        <p className="border-t border-rule bg-wash px-5 py-3 text-[13px] text-graphite">
          One payment covers every Revit version listed and all future updates. UPI, cards and netbanking via Razorpay.
        </p>
      )}
    </div>
  );
}
