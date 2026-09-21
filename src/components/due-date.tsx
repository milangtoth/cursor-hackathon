const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDueAt(iso: string) {
  const date = new Date(iso);
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function isOverdue(iso: string, now = Date.now()) {
  return new Date(iso).getTime() < now;
}

export function compareDueAt(a: string, b: string, now = Date.now()) {
  const aOverdue = isOverdue(a, now);
  const bOverdue = isOverdue(b, now);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
  return a.localeCompare(b);
}
