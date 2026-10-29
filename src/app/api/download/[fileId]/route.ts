import { NextResponse, type NextRequest } from "next/server";
import { FILES_BUCKET, supabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Downloads go through the database: authorize_download() checks the member
 * may have the file and records the download. Only then is a short-lived
 * signed link issued for the private bucket.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!supabaseConfigured) return back("/sign-in");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("authorize_download", { p_file_id: fileId }).single<{
    storage_path: string;
    file_name: string;
  }>();

  if (error) {
    const referer = request.headers.get("referer");
    const familyPath = referer ? new URL(referer).pathname : "/families";
    if (error.message.includes("sign_in_required")) {
      return back(`/sign-in?next=${encodeURIComponent(`${familyPath}?download=${fileId}`)}`);
    }
    if (error.message.includes("purchase_required")) return back(familyPath);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await createAdminClient()
    .storage.from(FILES_BUCKET)
    .createSignedUrl(data.storage_path, 60, { download: data.file_name });
  if (signError || !signed) return NextResponse.json({ error: "Could not prepare the download" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
