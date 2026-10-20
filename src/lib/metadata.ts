import type { Metadata } from "next";
import { site } from "@/content/site";

const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${site.name} — a fictional airline motion demo`,
};

/**
 * Per-page metadata. Next.js replaces (rather than merges) nested `openGraph`/`twitter`
 * objects, so every page carries the shared fields and the generated OG image explicitly.
 */
export function pageMetadata(path: string, meta: { title: string; description: string }): Metadata {
  const isHome = path === "/";
  const title = isHome ? meta.title : `${meta.title} · ${site.name}`;
  return {
    title: isHome ? { absolute: meta.title } : meta.title,
    description: meta.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: `${site.name} (fictional demo)`,
      locale: "en_GB",
      title,
      description: meta.description,
      url: path,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: meta.description,
      images: [ogImage.url],
    },
  };
}
