import type { Metadata } from "next";
import { site } from "@/content/site";
import { LogoMark } from "@/components/brand/Logo";
import { Container, PageHeader } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/metadata";

const copy = site.about;

export const metadata: Metadata = pageMetadata("/about", copy.meta);

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} />
      <Container className="grid gap-12 pb-20 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5 text-lg leading-relaxed text-ink-muted">
          {copy.story.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <aside
          aria-labelledby="demo-note"
          className="on-dark relative overflow-hidden rounded-3xl bg-navy p-8 text-white"
        >
          <div aria-hidden="true" className="absolute -right-6 -bottom-6 opacity-15">
            <LogoMark className="bob h-40 w-40 text-white" />
          </div>
          <h2 id="demo-note" className="relative font-display text-2xl font-bold text-[#ffc59b]">
            {copy.demoNoteTitle}
          </h2>
          <p className="relative mt-4 leading-relaxed text-white/90">{copy.demoNote}</p>
        </aside>
      </Container>

      <section aria-labelledby="principles" className="border-t border-line bg-surface-2">
        <Container className="py-16">
          <h2 id="principles" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.principlesTitle}
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {copy.principles.map((p, i) => (
              <Reveal
                as="li"
                key={p.title}
                delay={i * 80}
                className="rounded-3xl border border-line bg-surface p-6"
              >
                <span aria-hidden="true" className="font-display text-4xl font-bold text-accent-ink">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
