const formatterCache = new Map();

function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }));
  }
  return formatterCache.get(timeZone);
}

function zonedParts(timestampMs, timeZone) {
  return Object.fromEntries(formatter(timeZone).formatToParts(new Date(timestampMs))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function zonedIso(timestampMs, timeZone) {
  const parts = zonedParts(timestampMs, timeZone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMinutes = Math.round((representedAsUtc - timestampMs) / 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${offset}`;
}

export function zonedDate(timestampMs, timeZone) {
  return zonedIso(timestampMs, timeZone).slice(0, 10);
}

export function zonedHour(timestampMs, timeZone) {
  const iso = zonedIso(timestampMs, timeZone);
  return `${iso.slice(0, 13)}:00:00${iso.slice(-6)}`;
}
