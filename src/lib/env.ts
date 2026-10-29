const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")
).replace(/\/$/, "");

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Without Supabase keys the site runs read-only on the bundled sample catalog. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
export const paymentsConfigured = Boolean(razorpayKeyId);

export const MEDIA_BUCKET = "family-media";
export const FILES_BUCKET = "family-files";

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (!supabaseConfigured) return null;
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}
