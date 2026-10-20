import { useId } from "react";
import { site } from "@/content/site";

interface MarkProps {
  className?: string;
  /** Decorative by default; pass a title to expose it to assistive tech. */
  title?: string;
}

/** The Nordair "N" wing-mark: two stems joined by a swept, sunrise-coloured wing. */
export function LogoMark({ className, title }: MarkProps) {
  const id = useId();
  const gradient = `${id}-wing`;
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc27a" />
          <stop offset="0.55" stopColor="#ff7a3d" />
          <stop offset="1" stopColor="#e8552b" />
        </linearGradient>
      </defs>
      <rect x="6" y="9" width="6" height="25" rx="1.6" fill="currentColor" />
      <rect x="28" y="6" width="6" height="28" rx="1.6" fill="currentColor" />
      <path
        d="M1.5 3.5c4.6.3 8.6 1.9 11.7 4.9L34 32.4V34h-6.1L7.8 12.1C6 10 4.1 7.2 1.5 3.5Z"
        fill={`url(#${gradient})`}
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-xl font-bold tracking-tight">{site.name}</span>
    </span>
  );
}
