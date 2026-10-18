import type { MetadataRoute } from "next";

/**
 * Everything is open to crawlers except the pages that name members of
 * the committee, which are shared by link, not found by search, and the
 * office, which is for the committee alone.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/minutes", "/mom", "/og-preview", "/preview", "/erp"] },
  };
}
