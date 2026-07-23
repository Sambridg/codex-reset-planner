export function sanitizePublicData(input) {
  const data = JSON.parse(JSON.stringify(input));
  if (Array.isArray(data.conversationClues)) {
    const byStance = {};
    let imported = 0;
    let retrospective = 0;
    for (const clue of data.conversationClues) {
      byStance[clue.stance || "unknown"] = (byStance[clue.stance || "unknown"] || 0) + 1;
      if (clue.imported) imported += 1;
      if (clue.retrospective) retrospective += 1;
    }
    data.conversationEvidenceSummary = {
      total: data.conversationClues.length,
      imported,
      retrospective,
      byStance,
    };
    delete data.conversationClues;
  }

  data.events = (data.events || []).map((event) => {
    const copy = { ...event };
    delete copy.nearbyConversations;
    if (Array.isArray(copy.nearbyConversationSignals)) {
      copy.nearbyConversationSignals = copy.nearbyConversationSignals.map(({ timestamp, stance, evidenceWeight, imported, retrospective }) => ({
        timestamp,
        stance,
        evidenceWeight,
        imported,
        retrospective,
      }));
    }
    return copy;
  });

  data.resetObservations = (data.resetObservations || []).map((observation) => {
    const copy = { ...observation };
    delete copy.notesPrivate;
    delete copy.sourceSession;
    delete copy.sourcePath;
    return copy;
  });

  if (data.creditEvidence?.inventorySnapshots) {
    data.creditEvidence.inventorySnapshots = data.creditEvidence.inventorySnapshots.map((snapshot) => {
      const copy = { ...snapshot };
      delete copy.raw;
      delete copy.sourceSession;
      delete copy.sourcePath;
      return copy;
    });
  }
  return data;
}
