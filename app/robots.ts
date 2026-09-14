import type { MetadataRoute } from "next";

/**
 * Everything is open to crawlers except the pages that name members of
 * the committee. Those are shared by link, not found by search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/minutes", "/mom", "/og-preview"] },
  };
}
