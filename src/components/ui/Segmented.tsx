"use client";

import { m } from "motion/react";
import { useId } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Accessible segmented control: native radios with a Motion "pill" that glides between options. */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  visuallyHiddenLegend = false,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  visuallyHiddenLegend?: boolean;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className={visuallyHiddenLegend ? "sr-only" : "mb-1.5 text-sm font-semibold"}>{legend}</legend>
      <div className="inline-flex rounded-full border border-line bg-surface-2 p-1">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {checked && (
                <m.span
                  layoutId={`${id}-pill`}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-surface shadow-sm ring-1 ring-line"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className={`relative ${checked ? "text-ink" : "text-ink-muted"}`}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
