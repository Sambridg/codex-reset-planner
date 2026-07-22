export function quotaLaneKey(claim) {
  return [claim.logicalLane, claim.limitId, claim.planType].join("|");
}

export function sharedObservationModels(previous, current) {
  const currentModels = new Set(current.sourceModels || []);
  return (previous.sourceModels || []).filter((model) => model !== "unknown" && currentModels.has(model));
}

export function isModelOnlyHandoff(previous, current) {
  return sharedObservationModels(previous, current).length === 0;
}
