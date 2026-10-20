import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { airports, type AirportCode } from "@/content/airports";
import { site } from "@/content/site";
import { RouteMap } from "@/components/destinations/RouteMap";
import { Container, PageHeader } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/metadata";
import { formatMoney } from "@/lib/pricing";
import { fromFare } from "@/lib/search";

const copy = site.destinations;

export const metadata: Metadata = pageMetadata("/destinations", copy.meta);

export default function DestinationsPage() {
  const fares = Object.fromEntries(airports.map((a) => [a.code, fromFare(a.code)])) as Record<
    AirportCode,
    number
  >;

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
      <Container className="pb-16">
        <RouteMap fares={fares} />
      </Container>

      <section aria-labelledby="all-destinations" className="border-t border-line bg-surface-2">
        <Container className="py-16">
          <h2 id="all-destinations" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.listTitle}
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {airports.map((airport, i) => (
              <Reveal
                as="li"
                key={airport.code}
                delay={(i % 3) * 80}
                className="group overflow-hidden rounded-3xl border border-line bg-surface"
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                  <Image
                    src={airport.image.src}
                    alt={airport.image.alt}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {airport.city}{" "}
                    <span className="text-base font-semibold text-ink-muted">{airport.country}</span>
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">{airport.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {airport.highlights.map((h) => (
                      <li key={h} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                        {h}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 flex items-center justify-between gap-4">
                    <span className="text-sm text-ink-muted">
                      {copy.fromLabel}{" "}
                      <strong className="font-display text-lg text-ink">
                        {formatMoney(fares[airport.code])}
                      </strong>
                    </span>
                    <Link
                      href={`/book?to=${airport.code}`}
                      className="font-semibold text-accent-ink underline-offset-4 hover:underline"
                    >
                      {copy.cardCta(airport.city)}
                    </Link>
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
