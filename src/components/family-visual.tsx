import Image from "next/image";
import { mediaUrl } from "@/lib/env";
import { FamilyDrawing } from "./drawings/family-drawing";

/** Uploaded render if there is one, otherwise the line drawing for its kind. */
export function FamilyVisual({
  coverPath,
  drawing,
  name,
  sizes,
  priority = false,
  paid = false,
}: {
  coverPath: string | null;
  drawing: string | null;
  name: string;
  sizes: string;
  priority?: boolean;
  paid?: boolean;
}) {
  const src = mediaUrl(coverPath);
  return (
    <div className={`relative aspect-[16/11] w-full overflow-hidden ${src ? "bg-paper" : "blueprint-grid"}`}>
      {src ? (
        <Image src={src} alt={name} fill sizes={sizes} priority={priority} className="object-contain p-4" />
      ) : (
        <FamilyDrawing kind={drawing} className="absolute inset-0 h-full w-full p-[6%] text-line" />
      )}
      {paid && <div className="hatch absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />}
    </div>
  );
}
