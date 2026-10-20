"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { airportCodes, airports, type AirportCode } from "@/content/airports";
import { site } from "@/content/site";
import { cabinValues, createSearchSchema, localTodayISO, type SearchQuery } from "@/lib/search";
import { errorClass, fieldClass, labelClass, primaryButton } from "@/components/ui/form";
import { Segmented } from "@/components/ui/Segmented";

const copy = site.book.form;

// The schema depends on "today", so build it at validation time (never during render).
const resolver: Resolver<SearchQuery> = (values, context, options) =>
  zodResolver(createSearchSchema(localTodayISO()))(values, context, options);

const isAirport = (value: string | null): value is AirportCode =>
  !!value && (airportCodes as readonly string[]).includes(value);

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <m.p
          id={id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={errorClass}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0">
            <circle cx="10" cy="10" r="9" fill="currentColor" />
            <path d="M10 5.5v5.5M10 13.6v.9" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {message}
        </m.p>
      )}
    </AnimatePresence>
  );
}

export function SearchForm({
  defaultValues,
  onSearch,
}: {
  defaultValues?: SearchQuery;
  onSearch: (query: SearchQuery) => Promise<void> | void;
}) {
  const [swapTurns, setSwapTurns] = useState(0);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SearchQuery>({
    resolver,
    defaultValues: defaultValues ?? {
      tripType: "return",
      from: "LOS",
      to: "LHR",
      departDate: "",
      returnDate: "",
      passengers: 1,
      cabin: "economy",
    },
  });

  // Deep link from destination cards: /book?to=DXB
  useEffect(() => {
    if (defaultValues) return;
    const to = new URLSearchParams(window.location.search).get("to");
    if (isAirport(to)) {
      setValue("to", to);
      if (getValues("from") === to) setValue("from", to === "LOS" ? "PHC" : "LOS");
    }
  }, [defaultValues, getValues, setValue]);

  const tripType = useWatch({ control, name: "tripType" });

  const swap = () => {
    const { from, to } = getValues();
    setValue("from", to);
    setValue("to", from);
    setSwapTurns((n) => n + 1);
  };

  const describedBy = (name: keyof SearchQuery) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSearch)}
      aria-label={copy.legend}
      className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8"
    >
      <Controller
        control={control}
        name="tripType"
        render={({ field }) => (
          <Segmented
            legend={copy.tripType}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: "return", label: copy.roundTrip },
              { value: "oneway", label: copy.oneWay },
            ]}
          />
        )}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <div>
          <label htmlFor="from" className={labelClass}>
            {copy.from}
          </label>
          <select
            id="from"
            {...register("from")}
            aria-invalid={!!errors.from}
            aria-describedby={describedBy("from")}
            className={fieldClass}
          >
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
          <FieldError id="from-error" message={errors.from?.message} />
        </div>

        <button
          type="button"
          onClick={swap}
          className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2 text-ink transition-colors hover:border-ink md:mt-7"
        >
          <span className="sr-only">{copy.swap}</span>
          <m.svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 rotate-90 md:rotate-0"
            animate={{ rotate: swapTurns * 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <path
              d="M7 7h12l-3-3M17 17H5l3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </m.svg>
        </button>

        <div>
          <label htmlFor="to" className={labelClass}>
            {copy.to}
          </label>
          <select
            id="to"
            {...register("to")}
            aria-invalid={!!errors.to}
            aria-describedby={describedBy("to")}
            className={fieldClass}
          >
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
          <FieldError id="to-error" message={errors.to?.message} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="departDate" className={labelClass}>
            {copy.depart}
          </label>
          <input
            id="departDate"
            type="date"
            {...register("departDate")}
            aria-invalid={!!errors.departDate}
            aria-describedby={describedBy("departDate")}
            className={fieldClass}
          />
          <FieldError id="departDate-error" message={errors.departDate?.message} />
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {tripType === "return" && (
            <m.div
              key="return"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <label htmlFor="returnDate" className={labelClass}>
                {copy.return}
              </label>
              <input
                id="returnDate"
                type="date"
                {...register("returnDate")}
                aria-invalid={!!errors.returnDate}
                aria-describedby={describedBy("returnDate")}
                className={fieldClass}
              />
              <FieldError id="returnDate-error" message={errors.returnDate?.message} />
            </m.div>
          )}
        </AnimatePresence>

        <m.div layout="position">
          <label htmlFor="passengers" className={labelClass}>
            {copy.passengers}
          </label>
          <select
            id="passengers"
            {...register("passengers", { valueAsNumber: true })}
            aria-invalid={!!errors.passengers}
            aria-describedby={describedBy("passengers")}
            className={fieldClass}
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <FieldError id="passengers-error" message={errors.passengers?.message} />
        </m.div>

        <m.div layout="position">
          <label htmlFor="cabin" className={labelClass}>
            {copy.cabin}
          </label>
          <select id="cabin" {...register("cabin")} className={fieldClass}>
            {cabinValues.map((cabin) => (
              <option key={cabin} value={cabin}>
                {site.book.cabins[cabin]}
              </option>
            ))}
          </select>
        </m.div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={isSubmitting} className={primaryButton}>
          {isSubmitting ? (
            <>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 animate-spin">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="3"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              {copy.searching}
            </>
          ) : (
            copy.submit
          )}
        </button>
        <p className="text-sm text-ink-muted">{site.book.notice}</p>
      </div>
    </form>
  );
}
