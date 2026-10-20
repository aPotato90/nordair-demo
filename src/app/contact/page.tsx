import type { Metadata } from "next";
import { site } from "@/content/site";
import { ContactForm } from "@/components/contact/ContactForm";
import { Container, PageHeader } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/metadata";

const copy = site.contact;

export const metadata: Metadata = pageMetadata("/contact", copy.meta);

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
      <Container className="grid gap-10 pb-20 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <ContactForm />
        <aside aria-labelledby="contact-aside" className="rounded-3xl border border-line bg-surface-2 p-6">
          <h2 id="contact-aside" className="font-display text-xl font-semibold">
            {copy.asideTitle}
          </h2>
          <dl className="mt-4 space-y-4">
            {copy.aside.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-ink-muted">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </Container>
    </>
  );
}
