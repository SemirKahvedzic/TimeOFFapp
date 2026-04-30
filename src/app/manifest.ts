import type { MetadataRoute } from "next";
import { getCompany } from "@/lib/company";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const company = await getCompany().catch(() => null);
  const name = company?.name ?? "TimeOff";
  const brand = company?.brandColor ?? "#7c5cff";

  return {
    name: `${name} — Time off, simplified`,
    short_name: name,
    description:
      company?.tagline ??
      "Team attendance and time-off management — request, approve, and track vacation in one shared calendar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: brand,
    categories: ["business", "productivity"],
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
