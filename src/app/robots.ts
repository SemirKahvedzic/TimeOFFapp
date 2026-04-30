import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://timeoff.fun";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/calendar",
          "/preferences",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
