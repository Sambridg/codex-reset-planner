const MANUAL_EVENT = "manual-reset-action";

function finiteTimestamp(value, label) {
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) throw new Error(`${label} must be a valid timestamp`);
  return timestampMs;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function durationLabel(deltaSeconds) {
  if (deltaSeconds === 0) return "same instant";
  const direction = deltaSeconds > 0 ? "later" : "earlier";
  let remaining = Math.abs(deltaSeconds);
  const days = Math.floor(remaining / 86_400);
  remaining -= days * 86_400;
  const hours = Math.floor(remaining / 3_600);
  remaining -= hours * 3_600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining - minutes * 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);
  return `${parts.join(" ")} ${direction}`;
}

function normalizeObservation(item) {
  if (!item || typeof item !== "object") throw new Error("Each reset observation must be an object");
  if (!item.id || !item.eventType || !item.occurredAt || !item.certainty) {
    throw new Error("Each reset observation requires id, eventType, occurredAt, and certainty");
  }
  const occurredAtMs = finiteTimestamp(item.occurredAt, `${item.id}.occurredAt`);
  const advertisedNextResetAtMs = item.advertisedNextResetAt
    ? finiteTimestamp(item.advertisedNextResetAt, `${item.id}.advertisedNextResetAt`)
    : null;
  return {
    ...item,
    lane: item.lane || "main",
    confidence: clamp(Number(item.confidence ?? 0.5), 0, 1),
    occurredAtMs,
    advertisedNextResetAtMs,
  };
}

function normalizeCreditSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !snapshot.id || !snapshot.observedAt) {
    throw new Error("Each credit snapshot requires id and observedAt");
  }
  return {
    ...snapshot,
    observedAtMs: finiteTimestamp(snapshot.observedAt, `${snapshot.id}.observedAt`),
    availableCount: snapshot.availableCount == null ? null : (Number.isFinite(Number(snapshot.availableCount)) ? Number(snapshot.availableCount) : null),
    credits: Array.isArray(snapshot.credits) ? snapshot.credits.map((credit) => ({ ...credit })) : [],
  };
}

export function normalizeObservationLedger(input) {
  if (!input || input.schemaVersion !== 1) throw new Error("Unsupported reset observation ledger schema");
  const observations = (input.observations || []).map(normalizeObservation).sort((a, b) => a.occurredAtMs - b.occurredAtMs);
  const ids = new Set();
  for (const observation of observations) {
    if (ids.has(observation.id)) throw new Error(`Duplicate reset observation id: ${observation.id}`);
    ids.add(observation.id);
  }
  return {
    schemaVersion: 1,
    timezone: input.timezone || "Pacific/Auckland",
    observations,
    timingComparisons: (input.timingComparisons || []).map((item) => ({ ...item })),
    creditInventorySnapshots: (input.creditInventorySnapshots || []).map(normalizeCreditSnapshot).sort((a, b) => a.observedAtMs - b.observedAtMs),
  };
}

export function buildTimingComparison(item) {
  const advertisedAtMs = finiteTimestamp(item.advertisedAt, `${item.id}.advertisedAt`);
  const observedAtMs = finiteTimestamp(item.observedAt, `${item.id}.observedAt`);
  const deltaSeconds = Math.round((observedAtMs - advertisedAtMs) / 1_000);
  return {
    ...item,
    advertisedAtMs,
    observedAtMs,
    advertisedAtUtc: new Date(advertisedAtMs).toISOString(),
    observedAtUtc: new Date(observedAtMs).toISOString(),
    deltaSeconds,
    deltaLabel: durationLabel(deltaSeconds),
  };
}

export function buildManualPhaseCandidates(observations, nowMs, horizonMs = 16 * 24 * 60 * 60 * 1_000) {
  return observations
    .filter((observation) => observation.eventType === MANUAL_EVENT && observation.advertisedNextResetAtMs != null)
    .filter((observation) => observation.advertisedNextResetAtMs > nowMs && observation.advertisedNextResetAtMs <= nowMs + horizonMs)
    .map((observation) => ({
      observationId: observation.id,
      originAtMs: observation.occurredAtMs,
      timestampMs: observation.advertisedNextResetAtMs,
      score: Math.round(clamp(observation.confidence * 0.5, 0, 0.5) * 1_000) / 1_000,
      label: "Manual-phase persistence test",
      basis: `${observation.sourceLabel} The original deadline is well evidenced; survival after another reset is unproven.`,
    }));
}

export function buildCreditEvidence(snapshots) {
  const ordered = snapshots.map(normalizeCreditSnapshot).sort((a, b) => a.observedAtMs - b.observedAtMs);
  const latestSnapshot = ordered.at(-1) || null;
  const knownSnapshots = ordered.filter((snapshot) => snapshot.availableCount != null);
  const lastKnownSnapshot = knownSnapshots.at(-1) || null;
  const grants = new Map();
  for (const snapshot of knownSnapshots) {
    for (const credit of snapshot.credits) {
      const key = `${credit.grantedAt || "unknown"}|${credit.expiresAt || "unknown"}|${credit.resetType || "unknown"}`;
      if (!grants.has(key)) grants.set(key, { ...credit, firstObservedAt: snapshot.observedAt });
    }
  }
  return {
    latestSnapshot,
    lastKnownSnapshot,
    currentAvailableCount: latestSnapshot?.availableCount ?? null,
    lastKnownAvailableCount: lastKnownSnapshot?.availableCount ?? null,
    latestStatus: latestSnapshot?.availableCount == null ? "not-returned" : "returned",
    structuredSnapshotCount: knownSnapshots.length,
    preJulyStructuredSnapshotCount: knownSnapshots.filter((snapshot) => snapshot.observedAtMs < Date.parse("2026-07-01T00:00:00Z")).length,
    grants: [...grants.values()].sort((a, b) => Date.parse(a.grantedAt) - Date.parse(b.grantedAt)),
    inventorySnapshots: ordered,
  };
}
