import type { Metadata } from "next";
import { site } from "@/content/site";
import { BookingFlow } from "@/components/book/BookingFlow";
import { Container, Eyebrow } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/metadata";

const copy = site.book;

export const metadata: Metadata = pageMetadata("/book", copy.meta);

export default function BookPage() {
  return (
    <Container className="pt-12 pb-20 sm:pt-16">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="word-mask">
          <span className="word-rise">{copy.meta.title}</span>
        </span>
      </h1>
      <div
        role="note"
        className="mt-5 mb-10 flex max-w-3xl items-start gap-3 rounded-2xl border border-accent-ink/40 bg-accent/10 p-4 text-sm leading-relaxed"
      >
        <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-on-accent">
          {site.demoLabel}
        </span>
        <p>{copy.notice}</p>
      </div>
      <BookingFlow />
    </Container>
  );
}
