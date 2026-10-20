import type { Metadata } from "next";
import { site } from "@/content/site";
import { CabinSequence } from "@/components/fleet/CabinSequence";
import { Container, PageHeader } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/metadata";

const copy = site.fleet;

export const metadata: Metadata = pageMetadata("/fleet", copy.meta);

export default function FleetPage() {
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
      <CabinSequence />
      <section aria-labelledby="aircraft-title">
        <Container className="py-20">
          <h2 id="aircraft-title" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.aircraftTitle}
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {copy.aircraft.map((plane, i) => (
              <Reveal
                as="li"
                key={plane.name}
                delay={i * 90}
                className="rounded-3xl border border-line bg-surface p-6"
              >
                <svg viewBox="0 0 200 60" aria-hidden="true" className="h-14 w-auto text-ink">
                  <path
                    d={`M10 30 C10 24 16 22 26 22 L${120 + i * 25} 22 C${132 + i * 25} 22 ${142 + i * 25} 26 ${146 + i * 25} 30 C${142 + i * 25} 34 ${132 + i * 25} 38 ${120 + i * 25} 38 L26 38 C16 38 10 36 10 30 Z`}
                    fill="currentColor"
                  />
                  <path d="M14 24 L6 4 L18 4 L36 24 Z" fill="var(--accent)" />
                  <path
                    d={`M${60 + i * 10} 34 L${82 + i * 12} 58 L${94 + i * 12} 58 L${80 + i * 10} 34 Z`}
                    fill="currentColor"
                    opacity="0.7"
                  />
                </svg>
                <h3 className="mt-4 font-display text-2xl font-bold">{plane.name}</h3>
                <p className="font-semibold text-accent-ink">{plane.role}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-ink-muted">{copy.seatsLabel}</dt>
                    <dd className="font-semibold">{plane.seats}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{copy.rangeLabel}</dt>
                    <dd className="font-semibold">{plane.range}</dd>
                  </div>
                </dl>
              </Reveal>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">{copy.aircraftNote}</p>
        </Container>
      </section>
    </>
  );
}
