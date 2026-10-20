"use client";

import { useInView } from "motion/react";
import { useRef, type CSSProperties, type ReactNode } from "react";

type Tag = "div" | "li" | "section" | "article";

/**
 * Marks its element `data-inview="true"` once scrolled into view. The hidden starting
 * state lives in CSS and only applies when scripts run and motion is welcome, so the
 * content is always present and readable without the animation.
 */
export function Reveal({
  as: Component = "div",
  delay = 0,
  className,
  style,
  children,
}: {
  as?: Tag;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  return (
    <Component
      ref={ref as never}
      data-reveal=""
      data-inview={inView ? "true" : "false"}
      className={className}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
