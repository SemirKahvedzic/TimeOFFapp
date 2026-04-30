import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://timeoff.fun";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
