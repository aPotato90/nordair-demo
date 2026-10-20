import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";

const copy = site.notFound;

export const metadata: Metadata = { title: copy.title };

export default function NotFound() {
  return (
    <Container className="grid min-h-[70svh] place-items-center py-16 text-center">
      <div>
        <div aria-hidden="true" className="relative mx-auto h-40 w-72">
          <svg viewBox="0 0 288 160" className="absolute inset-0 h-full w-full">
            <path
              d="M20 120 C80 40 200 160 268 60"
              fill="none"
              stroke="var(--line)"
              strokeWidth="3"
              strokeDasharray="6 10"
              strokeLinecap="round"
            />
            <g className="drift" fill="var(--surface-2)">
              <ellipse cx="60" cy="44" rx="34" ry="14" />
              <ellipse cx="230" cy="118" rx="40" ry="15" />
            </g>
          </svg>
          <svg
            viewBox="0 0 24 24"
            className="bob absolute top-8 left-1/2 h-16 w-16 -translate-x-1/2 text-accent-ink"
          >
            <path
              d="M2 13l8-1 4-8h2l-2 8 6-1 2-3h2l-1 5 1 5h-2l-2-3-6-1 2 8h-2l-4-8-8-1Z"
              fill="currentColor"
            />
          </svg>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-display text-xs font-bold tracking-[0.3em] text-ink-muted">
            ? ? ?
          </span>
        </div>
        <p className="mt-8 font-display text-7xl font-bold tracking-tight text-accent-ink">{copy.eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">{copy.headline}</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-ink-muted">{copy.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-accent px-6 py-3 font-semibold text-on-accent">
            {copy.home}
          </Link>
          <Link href="/destinations" className="rounded-full border-2 border-line px-6 py-3 font-semibold">
            {copy.destinations}
          </Link>
        </div>
      </div>
    </Container>
  );
}
