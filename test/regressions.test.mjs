import test from "node:test";
import assert from "node:assert/strict";
import { billingCycleBounds, claimStartsInCurrentBillingCycle, projectWeeklyPhaseWithinBillingCycle } from "../work/lib/billing-cycle.mjs";
import { isModelOnlyHandoff, quotaLaneKey, sharedObservationModels } from "../work/lib/reset-evidence.mjs";
import { buildCreditEvidence, buildManualPhaseCandidates, buildTimingComparison, normalizeObservationLedger } from "../work/lib/reset-observations.mjs";
import { sanitizePublicData } from "../work/lib/public-data.mjs";
import { zonedDate, zonedHour, zonedIso } from "../work/lib/time.mjs";

const NZ = "Pacific/Auckland";
const WEEK = 7 * 24 * 60 * 60 * 1000;
const CYCLES = [
  Date.parse("2026-06-14T05:34:00+12:00"),
  Date.parse("2026-07-14T05:34:00+12:00"),
  Date.parse("2026-08-14T05:34:00+12:00"),
];

test("Pacific/Auckland serialization follows winter and daylight-saving offsets", () => {
  assert.equal(zonedIso(Date.parse("2026-07-21T21:19:23Z"), NZ), "2026-07-22T09:19:23+12:00");
  assert.equal(zonedIso(Date.parse("2026-09-26T13:59:00Z"), NZ), "2026-09-27T01:59:00+12:00");
  assert.equal(zonedIso(Date.parse("2026-09-26T14:00:00Z"), NZ), "2026-09-27T03:00:00+13:00");
  assert.equal(zonedDate(Date.parse("2026-12-21T11:00:00Z"), NZ), "2026-12-22");
  assert.equal(zonedHour(Date.parse("2026-12-21T11:42:00Z"), NZ), "2026-12-22T00:00:00+13:00");
});

test("quota lane identity ignores model names", () => {
  const base = { logicalLane: "main", limitId: "codex", planType: "pro" };
  assert.equal(quotaLaneKey({ ...base, model: "gpt-a" }), quotaLaneKey({ ...base, model: "gpt-b" }));
});

test("model-only handoffs are excluded while shared-model evidence survives", () => {
  const previous = { sourceModels: ["gpt-a", "gpt-b"] };
  assert.deepEqual(sharedObservationModels(previous, { sourceModels: ["gpt-b", "gpt-c"] }), ["gpt-b"]);
  assert.equal(isModelOnlyHandoff(previous, { sourceModels: ["gpt-c"] }), true);
  assert.equal(isModelOnlyHandoff(previous, { sourceModels: ["gpt-b"] }), false);
});

test("public data strips raw conversation and event excerpts", () => {
  const sanitized = sanitizePublicData({
    conversationClues: [{ stance: "observed-reset", imported: false, retrospective: true, excerpt: "private", session: "private-session" }],
    events: [{ nearbyConversations: [{ excerpt: "private" }], nearbyConversationSignals: [{ timestamp: "now", stance: "observed-reset", evidenceWeight: 0.6, imported: false, retrospective: true, excerpt: "private" }] }],
    resetObservations: [{ id: "one", notesPublic: "safe", notesPrivate: "private", sourceSession: "private-session" }],
    creditEvidence: { inventorySnapshots: [{ id: "snapshot", raw: "private", sourcePath: "private-path" }] },
  });
  assert.equal(sanitized.conversationEvidenceSummary.total, 1);
  assert.equal("conversationClues" in sanitized, false);
  assert.equal("nearbyConversations" in sanitized.events[0], false);
  assert.equal(JSON.stringify(sanitized).includes("private"), false);
  assert.deepEqual(Object.keys(sanitized.events[0].nearbyConversationSignals[0]).sort(), ["evidenceWeight", "imported", "retrospective", "stance", "timestamp"]);
  assert.equal(JSON.stringify(sanitized).includes("private-session"), false);
  assert.equal(JSON.stringify(sanitized).includes("private-path"), false);
});

test("weekly phase projections cannot cross a billing-cycle boundary", () => {
  const juneTick = Date.parse("2026-06-25T13:01:03+12:00");
  const julyNow = Date.parse("2026-07-23T12:00:00+12:00");
  assert.equal(projectWeeklyPhaseWithinBillingCycle(juneTick, julyNow, WEEK, CYCLES), null);

  const julyTick = Date.parse("2026-07-15T08:35:00+12:00");
  assert.equal(projectWeeklyPhaseWithinBillingCycle(julyTick, julyNow, WEEK, CYCLES), Date.parse("2026-07-29T08:35:00+12:00"));
});

test("retained claims must originate inside the current billing cycle", () => {
  const now = Date.parse("2026-07-23T12:00:00+12:00");
  assert.deepEqual(billingCycleBounds(now, CYCLES), { startAtMs: CYCLES[1], endAtMs: CYCLES[2] });
  assert.equal(claimStartsInCurrentBillingCycle(Date.parse("2026-07-13T23:00:00+12:00"), now, CYCLES), false);
  assert.equal(claimStartsInCurrentBillingCycle(Date.parse("2026-07-15T08:35:00+12:00"), now, CYCLES), true);
});

test("probable manual resets remain parallel phase tests rather than superseding each other", () => {
  const ledger = normalizeObservationLedger({
    schemaVersion: 1,
    observations: [
      { id: "first", eventType: "manual-reset-action", occurredAt: "2026-07-16T16:54:31+12:00", advertisedNextResetAt: "2026-07-23T16:54:31+12:00", certainty: "probable-retrospective", confidence: 0.8, sourceLabel: "first" },
      { id: "second", eventType: "manual-reset-action", occurredAt: "2026-07-18T15:26:23+12:00", advertisedNextResetAt: "2026-07-25T15:26:23+12:00", certainty: "probable-retrospective", confidence: 0.8, sourceLabel: "second" },
    ],
  });
  const candidates = buildManualPhaseCandidates(ledger.observations, Date.parse("2026-07-23T12:00:00+12:00"));
  assert.deepEqual(candidates.map((candidate) => candidate.observationId), ["first", "second"]);
  assert.deepEqual(candidates.map((candidate) => candidate.score), [0.4, 0.4]);
});

test("timing comparison separates timezone identity from real delay", () => {
  const same = buildTimingComparison({ id: "same", advertisedAt: "2026-07-21T21:19:23Z", observedAt: "2026-07-22T09:19:23+12:00" });
  const delayed = buildTimingComparison({ id: "delay", advertisedAt: "2026-07-22T08:35:33+12:00", observedAt: "2026-07-22T09:19:23+12:00" });
  assert.equal(same.deltaSeconds, 0);
  assert.equal(same.deltaLabel, "same instant");
  assert.equal(delayed.deltaSeconds, 2_630);
  assert.equal(delayed.deltaLabel, "43m 50s later");
});

test("an omitted latest credit field is unknown rather than zero", () => {
  const evidence = buildCreditEvidence([
    { id: "known", observedAt: "2026-07-22T10:40:38+12:00", availableCount: 2, credits: [] },
    { id: "omitted", observedAt: "2026-07-23T16:32:35+12:00", availableCount: null, credits: [] },
  ]);
  assert.equal(evidence.currentAvailableCount, null);
  assert.equal(evidence.lastKnownAvailableCount, 2);
  assert.equal(evidence.latestStatus, "not-returned");
});
