"use client";

import { ExternalLink, FileUp, ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  deleteFamily,
  deleteFile,
  recordFile,
  saveFamily,
  setFamilyStatus,
  setMedia,
  shipUpdate,
  type ActionResult,
  type FamilyDraft,
} from "@/app/studio/actions";
import { DRAWING_KINDS, FamilyDrawing } from "@/components/drawings/family-drawing";
import { FILES_BUCKET, MEDIA_BUCKET, mediaUrl } from "@/lib/env";
import type { EditableFamily } from "@/lib/data/studio";
import { formatBytes, formatDate, formatPrice } from "@/lib/format";
import { detectRevitVersion, parseTypeCatalog, readTypeCatalogFile } from "@/lib/revit-files";
import { createClient } from "@/lib/supabase/browser";
import { HOST_OPTIONS, LOD_OPTIONS, REVIT_VERSIONS } from "@/lib/taxonomy";
import type { Category, Parameter, TypeCatalog } from "@/lib/types";

type Pending = { key: string; file: File; kind: string; version: number | null; detecting: boolean };

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_");
const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

function nextVersion(label: string) {
  const [major, minor = "0"] = label.split(".");
  return `${major}.${Number(minor) + 1}`;
}

export function FamilyEditor({ family, categories }: { family: EditableFamily; categories: Category[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<FamilyDraft>({
    name: family.name,
    slug: family.slug,
    summary: family.summary,
    description: family.description,
    category_id: family.category_id,
    price_rupees: family.price_paise / 100,
    lod: family.lod,
    host: family.host,
    is_parametric: family.is_parametric,
    tags: family.tags,
    drawing: family.drawing,
    parameters: family.parameters,
    types: family.types,
  });
  const [tagsText, setTagsText] = useState(family.tags.join(", "));
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  function update<K extends keyof FamilyDraft>(key: K, value: FamilyDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  function report(result: ActionResult) {
    setNotice(result.ok ? (result.message ? { ok: true, text: result.message } : null) : { ok: false, text: result.message });
    if (result.ok) router.refresh();
  }

  function save() {
    startTransition(async () => {
      const result = await saveFamily(family.id, { ...draft, tags: tagsText.split(",") });
      if (result.ok) setDirty(false);
      report(result);
    });
  }

  function toggleStatus() {
    startTransition(async () => {
      if (dirty) {
        const saved = await saveFamily(family.id, { ...draft, tags: tagsText.split(",") });
        if (!saved.ok) return report(saved);
        setDirty(false);
      }
      report(await setFamilyStatus(family.id, family.status === "published" ? "draft" : "published"));
    });
  }

  return (
    <div className="pb-24">
      <div className="sticky top-[67px] z-20 -mx-4 mb-8 border-b border-edge bg-paper px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/studio/families" className="text-[15px] text-graphite hover:text-ink hover:underline">
            Families
          </Link>
          <span className="text-graphite" aria-hidden="true">/</span>
          <h1 className="semiwide mr-auto truncate text-lg font-bold">{draft.name || "Untitled family"}</h1>
          <span className={`tag h-7 ${family.status === "published" ? "bg-green-soft text-green" : family.status === "archived" ? "bg-wash text-graphite" : "bg-yellow-soft text-yellow-ink"}`}>
            {family.status === "published" ? "Published" : family.status === "archived" ? "Archived" : "Draft"}
          </span>
          <Link href={`/families/${family.slug}`} target="_blank" className="btn btn-quiet btn-sm">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {family.status === "published" ? "View page" : "Preview"}
          </Link>
          <button type="button" onClick={save} disabled={busy || !dirty} className="btn btn-secondary btn-sm">
            {dirty ? "Save changes" : "Saved"}
          </button>
          <button type="button" onClick={toggleStatus} disabled={busy} className="btn btn-primary btn-sm">
            {family.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
        {notice && (
          <p role={notice.ok ? "status" : "alert"} className="mt-2 flex items-center justify-between gap-3 text-[14px] font-medium">
            {notice.text}
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </p>
        )}
      </div>

      <div className="grid gap-12 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-12">
          <Section title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" className="sm:col-span-2">
                <input id="name" value={draft.name} onChange={(e) => update("name", e.target.value)} className="field" />
              </Field>
              <Field label="Page address" htmlFor="slug" hint="Lowercase words joined by hyphens.">
                <div className="flex items-center border border-edge">
                  <span className="pl-3 text-[15px] text-graphite">/families/</span>
                  <input id="slug" value={draft.slug} onChange={(e) => update("slug", e.target.value)} className="h-[42px] min-w-0 flex-1 bg-transparent pr-3 outline-none" />
                </div>
              </Field>
              <Field label="Category" htmlFor="category">
                <select id="category" value={draft.category_id} onChange={(e) => update("category_id", Number(e.target.value))} className="field cursor-pointer">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Summary" htmlFor="summary" hint={`${draft.summary.length}/240. Shown on cards and in search results.`} className="sm:col-span-2">
                <textarea id="summary" rows={2} maxLength={240} value={draft.summary} onChange={(e) => update("summary", e.target.value)} className="field resize-y" />
              </Field>
              <Field label="Description" htmlFor="description" hint="Leave a blank line between paragraphs." className="sm:col-span-2">
                <textarea id="description" rows={8} value={draft.description} onChange={(e) => update("description", e.target.value)} className="field resize-y" />
              </Field>
              <Field label="Search tags" htmlFor="tags" hint="Comma separated. Add the words people actually type: db, mcb, panelboard." className="sm:col-span-2">
                <input
                  id="tags"
                  value={tagsText}
                  onChange={(e) => {
                    setTagsText(e.target.value);
                    setDirty(true);
                  }}
                  className="field"
                />
              </Field>
            </div>
          </Section>

          <Section title="Price and specification">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Price (₹)" htmlFor="price" hint={draft.price_rupees > 0 ? `Sold as exclusive for ${formatPrice(Math.round(draft.price_rupees * 100))}.` : "0 makes it a free download."}>
                <input
                  id="price"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={draft.price_rupees}
                  onChange={(e) => update("price_rupees", Number(e.target.value))}
                  className="field"
                />
              </Field>
              <Field label="Level of detail" htmlFor="lod">
                <select id="lod" value={draft.lod ?? ""} onChange={(e) => update("lod", e.target.value || null)} className="field cursor-pointer">
                  <option value="">Not applicable</option>
                  {LOD_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      LOD {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hosting" htmlFor="host">
                <select id="host" value={draft.host ?? ""} onChange={(e) => update("host", e.target.value || null)} className="field cursor-pointer">
                  <option value="">Annotation or none</option>
                  {HOST_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex cursor-pointer items-center gap-3 self-end border border-edge px-3 py-2.5">
                <input type="checkbox" checked={draft.is_parametric} onChange={(e) => update("is_parametric", e.target.checked)} className="h-4 w-4 accent-black" />
                Parametric
              </label>
            </div>
            <fieldset className="mt-6">
              <legend className="label">Line drawing shown until a render is uploaded</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {DRAWING_KINDS.map((kind) => (
                  <label key={kind} className={`cursor-pointer rounded-lg border p-1 ${draft.drawing === kind ? "border-blue bg-blue-soft ring-1 ring-blue" : "border-edge hover:border-blue"}`}>
                    <input type="radio" name="drawing" value={kind} checked={draft.drawing === kind} onChange={() => update("drawing", kind)} className="sr-only" />
                    <FamilyDrawing kind={kind} className="aspect-[16/11] w-full text-line" />
                    <span className="block text-center text-[12px] text-graphite">{kind}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section title="Parameters" aside={`${draft.parameters.length} rows`}>
            <ParameterTable rows={draft.parameters} onChange={(rows) => update("parameters", rows)} />
          </Section>

          <Section title="Types" aside={draft.types.rows.length ? `${draft.types.rows.length} types` : undefined}>
            <TypeCatalogInput value={draft.types} onChange={(types) => update("types", types)} />
          </Section>
        </div>

        <div className="space-y-12">
          <FilesPanel family={family} onReport={report} onTypeCatalog={(types) => update("types", types)} />
          <MediaPanel family={family} onReport={report} />
          <ReleasePanel family={family} onReport={report} />
          <Section title="Remove">
            <p className="mb-4 text-[15px] text-graphite">
              Families that have been downloaded or bought are archived instead, so they stay in members’ libraries.
            </p>
            <form
              action={deleteFamily.bind(null, family.id)}
              onSubmit={(e) => {
                if (!confirm(`Remove “${family.name}”? This can't be undone.`)) e.preventDefault();
              }}
            >
              <button type="submit" className="btn btn-secondary btn-sm">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove family
              </button>
            </form>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-edge pb-2">
        <h2 className="semiwide text-lg font-bold">{title}</h2>
        {aside && <span className="text-[13px] text-graphite">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, className = "", children }: { label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-graphite">{hint}</p>}
    </div>
  );
}

function ParameterTable({ rows, onChange }: { rows: Parameter[]; onChange: (rows: Parameter[]) => void }) {
  const set = (i: number, patch: Partial<Parameter>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const cell = "h-9 w-full min-w-0 border-0 bg-transparent px-2 outline-none focus:bg-wash";

  return (
    <div>
      <div className="overflow-x-auto border border-edge">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead>
            <tr className="border-b border-edge text-left">
              <th scope="col" className="px-2 py-1.5 font-semibold">Group</th>
              <th scope="col" className="px-2 py-1.5 font-semibold">Parameter</th>
              <th scope="col" className="px-2 py-1.5 font-semibold">Value</th>
              <th scope="col" className="w-20 px-2 py-1.5 font-semibold">Unit</th>
              <th scope="col" className="w-28 px-2 py-1.5 font-semibold">Kind</th>
              <th scope="col" className="w-10"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-rule last:border-b-0">
                <td className="border-r border-rule"><input aria-label="Group" value={row.group} onChange={(e) => set(i, { group: e.target.value })} className={cell} /></td>
                <td className="border-r border-rule"><input aria-label="Parameter" value={row.name} onChange={(e) => set(i, { name: e.target.value })} className={cell} /></td>
                <td className="border-r border-rule"><input aria-label="Value" value={row.value} onChange={(e) => set(i, { value: e.target.value })} className={cell} /></td>
                <td className="border-r border-rule"><input aria-label="Unit" value={row.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value || undefined })} className={cell} /></td>
                <td className="border-r border-rule">
                  <select aria-label="Kind" value={row.kind} onChange={(e) => set(i, { kind: e.target.value as Parameter["kind"] })} className={`${cell} cursor-pointer`}>
                    <option value="type">Type</option>
                    <option value="instance">Instance</option>
                  </select>
                </td>
                <td className="text-center">
                  <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove ${row.name || "row"}`} className="p-2 text-graphite hover:text-ink">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { group: rows.at(-1)?.group ?? "Dimensions", name: "", value: "", kind: "type" }])}
        className="btn btn-quiet btn-sm mt-2 px-0"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add parameter
      </button>
      <p className="mt-1 text-[13px] text-graphite">Parameters whose name matches a type catalog column show that type’s value on the family page.</p>
    </div>
  );
}

function TypeCatalogInput({ value, onChange }: { value: TypeCatalog; onChange: (types: TypeCatalog) => void }) {
  const [error, setError] = useState("");
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");

  async function load(file: File) {
    try {
      onChange(parseTypeCatalog(await readTypeCatalogFile(file)));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-secondary btn-sm cursor-pointer">
          <FileUp className="h-4 w-4" aria-hidden="true" />
          Load type catalog (.txt)
          <input type="file" accept=".txt,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        <button type="button" onClick={() => setPasting((p) => !p)} className="btn btn-quiet btn-sm">
          {pasting ? "Close" : "Paste instead"}
        </button>
        {value.rows.length > 0 && (
          <button type="button" onClick={() => onChange({ columns: [], rows: [] })} className="btn btn-quiet btn-sm ml-auto">
            Clear types
          </button>
        )}
      </div>
      {pasting && (
        <div className="mt-3">
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={",Width##LENGTH##MILLIMETERS,Wattage##ELECTRICAL_POWER##WATTS\nType A,600,36"}
            className="field [font-family:ui-monospace,monospace] text-[13px]"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => {
              try {
                onChange(parseTypeCatalog(text));
                setError("");
                setPasting(false);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Use these types
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-medium">
          {error}
        </p>
      )}
      {value.rows.length > 0 ? (
        <div className="mt-4 max-h-80 overflow-auto border border-edge">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-paper">
              <tr className="border-b border-edge">
                <th className="px-2 py-1.5 font-semibold">Type</th>
                {value.columns.map((c) => (
                  <th key={c.name} className="px-2 py-1.5 font-semibold whitespace-nowrap">
                    {c.name}
                    {c.unit && <span className="font-normal text-graphite"> ({c.unit})</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.rows.map((r) => (
                <tr key={r.name} className="border-b border-rule last:border-b-0">
                  <td className="px-2 py-1.5 font-medium whitespace-nowrap">{r.name}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-2 py-1.5 whitespace-nowrap">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-graphite">No types yet. Members will see the parameters only.</p>
      )}
    </div>
  );
}

function FilesPanel({
  family,
  onReport,
  onTypeCatalog,
}: {
  family: EditableFamily;
  onReport: (r: ActionResult) => void;
  onTypeCatalog: (types: TypeCatalog) => void;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

  async function add(files: FileList | File[]) {
    const added: Pending[] = [...files].map((file) => {
      const ext = extension(file.name);
      const kind = ["rfa", "rvt", "txt", "zip", "pdf"].includes(ext) ? ext : "zip";
      return { key: `${counter.current++}`, file, kind, version: null, detecting: kind === "rfa" || kind === "rvt" };
    });
    setPending((p) => [...p, ...added]);

    for (const item of added) {
      if (item.kind === "txt") {
        try {
          onTypeCatalog(parseTypeCatalog(await readTypeCatalogFile(item.file)));
        } catch {
          // Not a type catalog; it is still uploaded as a plain file.
        }
      }
      if (item.detecting) {
        const version = await detectRevitVersion(item.file);
        setPending((p) => p.map((x) => (x.key === item.key ? { ...x, version, detecting: false } : x)));
      }
    }
  }

  async function uploadAll() {
    setUploading(true);
    const supabase = createClient();
    for (const item of pending) {
      if ((item.kind === "rfa" || item.kind === "rvt") && !item.version) {
        onReport({ ok: false, message: `Choose the Revit version for ${item.file.name}.` });
        setUploading(false);
        return;
      }
      const path = `${family.id}/${Date.now()}-${safeName(item.file.name)}`;
      const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, item.file, {
        contentType: item.file.type || "application/octet-stream",
      });
      if (error) {
        onReport({ ok: false, message: `${item.file.name} didn't upload: ${error.message}` });
        setUploading(false);
        return;
      }
      const result = await recordFile(family.id, {
        storage_path: path,
        file_name: item.file.name,
        size_bytes: item.file.size,
        kind: item.kind,
        revit_version: item.version,
      });
      if (!result.ok) {
        onReport(result);
        setUploading(false);
        return;
      }
      setPending((p) => p.filter((x) => x.key !== item.key));
    }
    setUploading(false);
    onReport({ ok: true, message: "Files uploaded." });
  }

  return (
    <Section title="Files" aside={`${family.files.length} uploaded`}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-6 text-center ${dragging ? "border-edge bg-wash" : "border-graphite"}`}
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        <span className="font-medium">Drop .rfa files and the type catalog here</span>
        <span className="text-[13px] text-graphite">The Revit version is read from each file. One file per Revit release.</span>
        <input type="file" multiple accept=".rfa,.rvt,.txt,.zip,.pdf" className="sr-only" onChange={(e) => e.target.files && add(e.target.files)} />
      </label>

      {pending.length > 0 && (
        <div className="mt-4 border border-edge">
          <ul>
            {pending.map((item) => (
              <li key={item.key} className="flex items-center gap-3 border-b border-rule px-3 py-2 text-[14px] last:border-b-0">
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                {item.kind === "rfa" || item.kind === "rvt" ? (
                  item.detecting ? (
                    <span className="text-graphite">Reading version</span>
                  ) : (
                    <select
                      aria-label={`Revit version of ${item.file.name}`}
                      value={item.version ?? ""}
                      onChange={(e) => setPending((p) => p.map((x) => (x.key === item.key ? { ...x, version: Number(e.target.value) || null } : x)))}
                      className={`h-8 border px-1 ${item.version ? "border-rule" : "border-edge font-semibold"}`}
                    >
                      <option value="">Choose version</option>
                      {REVIT_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          Revit {v}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <span className="text-graphite">{item.kind === "txt" ? "Type catalog" : item.kind.toUpperCase()}</span>
                )}
                <button type="button" onClick={() => setPending((p) => p.filter((x) => x.key !== item.key))} aria-label={`Remove ${item.file.name}`}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-edge p-3">
            <button type="button" onClick={uploadAll} disabled={uploading || pending.some((p) => p.detecting)} className="btn btn-primary btn-sm w-full">
              {uploading ? "Uploading" : `Upload ${pending.length} ${pending.length === 1 ? "file" : "files"}`}
            </button>
          </div>
        </div>
      )}

      {family.files.length > 0 && (
        <ul className="mt-4 border-t border-edge">
          {family.files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-b border-rule py-2 text-[14px]">
              <span className="w-12 shrink-0 font-semibold">{f.revit_version ?? f.kind.toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate" title={f.file_name}>{f.file_name}</span>
              <span className="text-graphite">{formatBytes(f.size_bytes)}</span>
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Delete ${f.file_name}?`)) onReport(await deleteFile(f.id));
                }}
                aria-label={`Delete ${f.file_name}`}
                className="text-graphite hover:text-ink"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MediaPanel({ family, onReport }: { family: EditableFamily; onReport: (r: ActionResult) => void }) {
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList, as: "cover" | "gallery") {
    setUploading(true);
    const supabase = createClient();
    const paths: string[] = [];
    for (const file of [...files]) {
      const path = `${family.id}/${Date.now()}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type });
      if (error) {
        onReport({ ok: false, message: `${file.name} didn't upload: ${error.message}` });
        setUploading(false);
        return;
      }
      paths.push(path);
    }
    const result =
      as === "cover"
        ? await setMedia(family.id, paths[0], family.gallery_paths)
        : await setMedia(family.id, family.cover_path, [...family.gallery_paths, ...paths]);
    setUploading(false);
    onReport(result);
  }

  return (
    <Section title="Images">
      <div className="border border-edge">
        {family.cover_path ? (
          <img src={mediaUrl(family.cover_path) ?? ""} alt="Cover render" className="aspect-[16/11] w-full object-contain p-3" />
        ) : (
          <div className="relative">
            <FamilyDrawing kind={family.drawing} className="aspect-[16/11] w-full p-[6%] text-trace" />
            <p className="absolute inset-x-0 bottom-2 text-center text-[13px] text-graphite">Showing the line drawing</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="btn btn-secondary btn-sm cursor-pointer">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {family.cover_path ? "Replace render" : "Upload render"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.length && upload(e.target.files, "cover")} />
        </label>
        {family.cover_path && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={async () => onReport(await setMedia(family.id, null, family.gallery_paths))}>
            Use line drawing
          </button>
        )}
      </div>
      <p className="mt-2 text-[13px] text-graphite">A white-background render at 1600 × 1100 px reads best next to the line drawings.</p>

      <h3 className="mt-6 mb-2 text-[15px] font-semibold">Gallery</h3>
      <ul className="grid grid-cols-3 gap-2">
        {family.gallery_paths.map((path) => (
          <li key={path} className="group relative border border-rule">
            <img src={mediaUrl(path) ?? ""} alt="" className="aspect-square w-full object-contain p-1" />
            <button
              type="button"
              onClick={async () => onReport(await setMedia(family.id, family.cover_path, family.gallery_paths.filter((p) => p !== path)))}
              aria-label="Remove image"
              className="absolute top-1 right-1 bg-paper p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          <label className="flex aspect-square cursor-pointer items-center justify-center border border-dashed border-graphite hover:border-blue">
            <Plus className="h-5 w-5" aria-label="Add gallery images" />
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.length && upload(e.target.files, "gallery")} />
          </label>
        </li>
      </ul>
    </Section>
  );
}

function ReleasePanel({ family, onReport }: { family: EditableFamily; onReport: (r: ActionResult) => void }) {
  const [version, setVersion] = useState(nextVersion(family.version_label));
  const [notes, setNotes] = useState("");
  const [busy, startTransition] = useTransition();

  return (
    <Section title="Ship an update" aside={`Now v${family.version_label}`}>
      <p className="mb-4 text-[15px] text-graphite">
        Upload the new files first, then describe what changed. Everyone who downloaded or bought this family is notified.
      </p>
      <div className="grid grid-cols-[100px_1fr] gap-3">
        <div>
          <label htmlFor="version" className="label">
            Version
          </label>
          <input id="version" value={version} onChange={(e) => setVersion(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="notes" className="label">
            What changed
          </label>
          <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Added Revit 2026 file" className="field" />
        </div>
      </div>
      <button
        type="button"
        disabled={busy || family.status !== "published"}
        onClick={() =>
          startTransition(async () => {
            const result = await shipUpdate(family.id, version, notes);
            if (result.ok) {
              setNotes("");
              setVersion(nextVersion(version));
            }
            onReport(result);
          })
        }
        className="btn btn-secondary btn-sm mt-3"
      >
        Ship update and notify
      </button>
      {family.status !== "published" && <p className="mt-2 text-[13px] text-graphite">Publish the family before shipping updates.</p>}
      {family.changelog.length > 0 && (
        <ol className="mt-5 space-y-2 border-t border-rule pt-3 text-[14px]">
          {family.changelog.map((c) => (
            <li key={c.id}>
              <span className="font-semibold">v{c.version_label}</span> <span className="text-graphite">{formatDate(c.created_at)}</span>
              <p className="text-graphite">{c.notes}</p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
