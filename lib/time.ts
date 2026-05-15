export function formatFinnishTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function isLocked(startsAtUtc: string) {
  return new Date(startsAtUtc).getTime() <= Date.now();
}
