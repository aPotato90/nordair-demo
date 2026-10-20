import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return site.nav.map((item) => ({
    url: new URL(item.href, site.url).toString(),
    changeFrequency: "monthly",
    priority: item.href === "/" ? 1 : 0.7,
  }));
}
