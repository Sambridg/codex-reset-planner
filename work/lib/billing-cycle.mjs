export function billingCycleBounds(timestampMs, cycleStarts) {
  const sorted = [...cycleStarts].sort((a, b) => a - b);
  let startAtMs = null;
  let endAtMs = null;
  for (const candidate of sorted) {
    if (candidate <= timestampMs) startAtMs = candidate;
    if (candidate > timestampMs) {
      endAtMs = candidate;
      break;
    }
  }
  return { startAtMs, endAtMs };
}

export function claimStartsInCurrentBillingCycle(claimStartMs, nowMs, cycleStarts) {
  const current = billingCycleBounds(nowMs, cycleStarts);
  return current.startAtMs != null && claimStartMs >= current.startAtMs && (current.endAtMs == null || claimStartMs < current.endAtMs);
}

export function projectWeeklyPhaseWithinBillingCycle(confirmedTickMs, nowMs, weekMs, cycleStarts) {
  const originCycle = billingCycleBounds(confirmedTickMs, cycleStarts);
  if (originCycle.startAtMs == null || originCycle.endAtMs == null) return null;
  let tick = confirmedTickMs + weekMs;
  while (tick <= nowMs) tick += weekMs;
  return tick < originCycle.endAtMs ? tick : null;
}
