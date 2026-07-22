import test from "node:test";
import assert from "node:assert/strict";
import { isModelOnlyHandoff, quotaLaneKey, sharedObservationModels } from "../work/lib/reset-evidence.mjs";
import { sanitizePublicData } from "../work/lib/public-data.mjs";
import { zonedDate, zonedHour, zonedIso } from "../work/lib/time.mjs";

const NZ = "Pacific/Auckland";

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
  });
  assert.equal(sanitized.conversationEvidenceSummary.total, 1);
  assert.equal("conversationClues" in sanitized, false);
  assert.equal("nearbyConversations" in sanitized.events[0], false);
  assert.equal(JSON.stringify(sanitized).includes("private"), false);
  assert.deepEqual(Object.keys(sanitized.events[0].nearbyConversationSignals[0]).sort(), ["evidenceWeight", "imported", "retrospective", "stance", "timestamp"]);
});
