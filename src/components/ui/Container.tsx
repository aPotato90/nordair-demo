import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm font-semibold tracking-[0.18em] text-accent-ink uppercase ${className}`}>
      {children}
    </p>
  );
}

export function DemoBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <Container className="pt-14 pb-10 sm:pt-20">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
        <span className="word-mask">
          <span className="word-rise">{title}</span>
        </span>
      </h1>
      {intro && (
        <p
          className="fade-rise mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted"
          style={{ ["--d" as string]: "0.2s" }}
        >
          {intro}
        </p>
      )}
      {children}
    </Container>
  );
}
