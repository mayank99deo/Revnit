import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/studio", "/cart", "/sign-in", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
