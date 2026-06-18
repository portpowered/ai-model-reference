"use client";

import { useEffect, useState } from "react";

function parseReleaseDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, monthIndex, day, 12));
}

function formatMonthYear(value: string, timeZone: string): string {
  const date = parseReleaseDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    timeZone,
    year: "numeric",
  }).format(date);
}

export function useCurrentTimeZone(): string {
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolvedTimeZone) {
      setTimeZone(resolvedTimeZone);
    }
  }, []);

  return timeZone;
}

export function LocalizedMonthYear({ value }: { value: string }) {
  const timeZone = useCurrentTimeZone();
  return <>{formatMonthYear(value, timeZone)}</>;
}
