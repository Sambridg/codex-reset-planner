import fs from "node:fs";
import path from "node:path";

const ledgerPath = path.join(process.cwd(), "data", "reset-observations.json");
const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (!key.startsWith("--")) continue;
  const value = args[index + 1] && !args[index + 1].startsWith("--") ? args[++index] : true;
  options[key.slice(2)] = value;
}

function timestamp(value, fallback = null) {
  const candidate = value === "now" ? Date.now() : Date.parse(value || "");
  if (Number.isFinite(candidate)) return new Date(candidate).toISOString();
  if (fallback != null) return fallback;
  throw new Error(`Invalid timestamp: ${value}`);
}

function optionalNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected a number, received: ${value}`);
  return number;
}

if (!options.type) {
  throw new Error("Usage: node work/record-reset-observation.mjs --type manual-reset-action --at now --next-reset 2026-07-30T09:00:00+12:00 [--used-before 73] [--credits-before 2] [--notes-public text]");
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const occurredAt = timestamp(options.at || "now");
const compact = occurredAt.replace(/\D/g, "").slice(0, 14);
const observation = {
  id: options.id || `${options.type}-${compact}`,
  eventType: options.type,
  lane: options.lane || "main",
  occurredAt,
  recordedAt: new Date().toISOString(),
  advertisedNextResetAt: options["next-reset"] ? timestamp(options["next-reset"]) : null,
  certainty: options.certainty || (options.type === "manual-reset-action" ? "confirmed-user-action" : "user-recorded-observation"),
  confidence: optionalNumber(options.confidence) ?? (options.type === "manual-reset-action" ? 1 : 0.9),
  sourceType: options.source || "user-live-declaration",
  sourceLabel: options["source-label"] || "Recorded prospectively at the time of the event.",
  phasePersistenceStatus: options["phase-status"] || "untested",
  usedPercentBefore: optionalNumber(options["used-before"]),
  usedPercentAfter: optionalNumber(options["used-after"]),
  creditCountBefore: optionalNumber(options["credits-before"]),
  creditCountAfter: optionalNumber(options["credits-after"]),
  notesPublic: options["notes-public"] || "",
};

if (ledger.observations.some((item) => item.id === observation.id)) {
  throw new Error(`Observation id already exists: ${observation.id}`);
}
ledger.observations.push(observation);
ledger.observations.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
