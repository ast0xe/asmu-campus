import { format } from "date-fns";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function fmtTime(t: string): string {
  return t ? t.slice(0, 5) : "";
}