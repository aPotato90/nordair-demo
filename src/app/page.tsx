import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { MapArt } from "@/components/destinations/MapArt";
import { CountUp } from "@/components/home/CountUp";
import { Hero } from "@/components/home/Hero";
import { PinnedPanels } from "@/components/home/PinnedPanels";
import { Container, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/metadata";

const copy = site.home;

export const metadata: Metadata = pageMetadata("/", copy.meta);

export default function HomePage() {
  return (
    <>
      <Hero />
      <PinnedPanels />

      <section aria-labelledby="stats-title" className="border-y border-line bg-surface-2">
        <Container className="py-16">
          <h2 id="stats-title" className="text-center font-display text-xl font-semibold text-ink-muted">
            {copy.stats.title}
          </h2>
          <dl className="mt-8 grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {copy.stats.items.map((item, i) => (
              <Reveal key={item.label} delay={i * 90}>
                <dt className="sr-only">{item.label}</dt>
                <dd className="font-display text-6xl font-bold tracking-tight text-accent-ink">
                  <CountUp value={item.value} />
                  {item.suffix}
                </dd>
                <dd aria-hidden="true" className="mt-1 text-ink-muted">
                  {item.label}
                </dd>
              </Reveal>
            ))}
          </dl>
        </Container>
      </section>

      <section aria-labelledby="routes-title">
        <Container className="grid items-center gap-10 py-20 md:grid-cols-2 lg:py-28">
          <Reveal>
            <Eyebrow>{copy.routesTeaser.eyebrow}</Eyebrow>
            <h2 id="routes-title" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {copy.routesTeaser.title}
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-muted">{copy.routesTeaser.body}</p>
            <Link
              href="/destinations"
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-ink px-6 py-3 font-semibold transition-colors hover:bg-ink hover:text-bg"
            >
              {copy.routesTeaser.cta}
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal className="overflow-hidden rounded-3xl border border-line shadow-sm">
            <MapArt labels className="block h-auto w-full" />
          </Reveal>
        </Container>
      </section>

      <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6">
        <Reveal className="on-dark relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#0b1b3a_0%,#26295c_45%,#7b4170_75%,#f07a4a_100%)] px-6 py-16 text-white sm:px-14">
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-24 h-72 w-72 rounded-full bg-[#ffb35c]/40 blur-3xl"
          />
          <h2
            id="cta-title"
            className="relative max-w-xl font-display text-3xl font-bold tracking-tight sm:text-5xl"
          >
            {copy.cta.title}
          </h2>
          <p className="relative mt-4 max-w-xl text-lg text-white">{copy.cta.body}</p>
          <Link
            href="/book"
            className="relative mt-8 inline-block rounded-full bg-accent px-6 py-3.5 font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
          >
            {copy.cta.button}
          </Link>
        </Reveal>
      </section>
    </>
  );
}
