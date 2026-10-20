"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { site } from "@/content/site";
import { errorClass, fieldClass, labelClass, primaryButton } from "@/components/ui/form";

const copy = site.contact;

export const contactSchema = z.object({
  name: z.string().trim().min(1, copy.errors.name),
  email: z.email(copy.errors.email),
  topic: z.enum(copy.form.topics),
  message: z.string().trim().min(10, copy.errors.message),
});

type ContactValues = z.infer<typeof contactSchema>;

/**
 * Demo contact form: validates in the browser, then clears itself.
 * There is no network request, storage or analytics — the values are simply discarded.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", topic: copy.form.topics[0], message: "" },
  });

  const onSubmit = () => {
    reset();
    setSent(true);
  };

  const err = (name: keyof ContactValues) =>
    errors[name]?.message ? (
      <p id={`${name}-error`} className={errorClass}>
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => sent && setSent(false)}
      aria-label={copy.title}
      autoComplete="off"
      className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            {copy.form.name}
          </label>
          <input
            id="name"
            {...register("name")}
            placeholder={copy.form.namePlaceholder}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={fieldClass}
          />
          {err("name")}
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            {copy.form.email}
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            placeholder={copy.form.emailPlaceholder}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={fieldClass}
          />
          {err("email")}
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="topic" className={labelClass}>
          {copy.form.topic}
        </label>
        <select id="topic" {...register("topic")} className={fieldClass}>
          {copy.form.topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="mt-5">
        <label htmlFor="message" className={labelClass}>
          {copy.form.message}
        </label>
        <textarea
          id="message"
          rows={5}
          {...register("message")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={fieldClass}
        />
        {err("message")}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className={primaryButton}>
          {copy.form.submit}
        </button>
      </div>
      <div role="status" className="mt-4">
        <AnimatePresence>
          {sent && (
            <m.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 font-medium"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-accent-ink">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path
                  d="M7 12.5l3 3 7-7"
                  stroke="var(--surface)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {copy.form.success}
            </m.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
