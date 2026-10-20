"use client";

import { useEffect, useRef } from "react";

/**
 * Counts up to `value` once visible. The final number is server-rendered, so it is
 * correct without JavaScript, for screen readers and with reduced motion.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(eased * value));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        el.textContent = "0";
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = String(value);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
