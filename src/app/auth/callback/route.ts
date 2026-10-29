import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Lands here from the magic link email or Google. Sends the member back where they were. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  // Google sends ?error=access_denied when the visitor cancels on its consent screen.
  if (searchParams.get("error")) {
    return NextResponse.redirect(new URL(`/sign-in?error=provider&next=${encodeURIComponent(next)}`, request.url));
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing_code") };

  if (error) return NextResponse.redirect(new URL(`/sign-in?error=link&next=${encodeURIComponent(next)}`, request.url));
  return NextResponse.redirect(new URL(next, request.url));
}

/** Only allow same-site paths, so the link can't bounce visitors elsewhere. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}
