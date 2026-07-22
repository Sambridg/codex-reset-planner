import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { quotaLaneKey, sharedObservationModels } from "./lib/reset-evidence.mjs";
import { zonedDate, zonedHour, zonedIso } from "./lib/time.mjs";

const HOME = process.env.USERPROFILE || os.homedir();
const WORKSPACE = process.env.RESET_PLANNER_WORKSPACE || process.cwd();
const OUTPUTS = path.join(WORKSPACE, "outputs");
const RANGE_START_MS = Date.parse("2026-05-21T12:00:00Z");
const RANGE_END_MS = Date.parse("2026-07-22T12:00:00Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NZ_TIMEZONE = "Pacific/Auckland";
const CURRENT_THREAD_ID = process.env.CURRENT_THREAD_ID || "";

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const ACCOUNT = {
  capturedAt: process.env.CURRENT_CAPTURED_AT || "2026-07-22T10:34:00+12:00",
  accountType: "chatgpt",
  planType: "pro",
  lifetimeTokens: 19_811_078_874,
  peakDailyTokens: 562_180_597,
  currentStreakDays: 180,
  main: {
    limitId: "codex",
    usedPercent: envNumber("CURRENT_MAIN_USED_PERCENT", 3),
    windowMinutes: 10_080,
    resetsAt: envNumber("CURRENT_MAIN_RESETS_AT", 1_785_273_563),
  },
  spark: {
    limitId: "codex_bengalfox",
    usedPercent: envNumber("CURRENT_SPARK_USED_PERCENT", 1),
    windowMinutes: 10_080,
    resetsAt: envNumber("CURRENT_SPARK_RESETS_AT", 1_785_274_135),
  },
  resetCredits: [
    { grantedAt: 1_782_932_589, expiresAt: 1_785_524_589, status: "available" },
    { grantedAt: 1_783_964_040, expiresAt: 1_786_556_040, status: "available" },
  ],
};

const OFFICIAL_DAILY = [
  ["2026-05-22",112523608],["2026-05-23",85700192],["2026-05-24",182978270],
  ["2026-05-25",67725778],["2026-05-26",32652896],["2026-05-27",54443111],
  ["2026-05-28",66984310],["2026-05-29",109837963],["2026-05-30",7751867],
  ["2026-05-31",155632051],["2026-06-01",456293769],["2026-06-02",153122159],
  ["2026-06-03",97655640],["2026-06-04",25943059],["2026-06-05",28346737],
  ["2026-06-06",224365700],["2026-06-07",330361198],["2026-06-08",239201182],
  ["2026-06-09",67308637],["2026-06-10",73209727],["2026-06-11",41697150],
  ["2026-06-12",42977538],["2026-06-13",71708847],["2026-06-14",148340407],
  ["2026-06-15",355156462],["2026-06-16",184895196],["2026-06-17",31175585],
  ["2026-06-18",271384900],["2026-06-19",225853010],["2026-06-20",310149499],
  ["2026-06-21",48640503],["2026-06-22",4197646],["2026-06-23",3263414],
  ["2026-06-24",178909],["2026-06-25",30469795],["2026-06-26",33477897],
  ["2026-06-27",60181367],["2026-06-28",286545028],["2026-06-29",274645008],
  ["2026-06-30",57032536],["2026-07-01",116798887],["2026-07-02",87392099],
  ["2026-07-03",37981199],["2026-07-04",100495895],["2026-07-05",48951990],
  ["2026-07-06",35843759],["2026-07-07",46880350],["2026-07-08",15820606],
  ["2026-07-09",123016884],["2026-07-10",155735823],["2026-07-11",172111579],
  ["2026-07-12",330772819],["2026-07-13",290306273],["2026-07-14",119939968],
  ["2026-07-15",37311275],["2026-07-16",562180597],["2026-07-17",331402671],
  ["2026-07-18",346308858],["2026-07-19",484961707],["2026-07-20",12956733],
  ["2026-07-21",87878],
].map(([date, tokens]) => ({ date, tokens }));

const SESSION_ROOTS = [
  path.join(HOME, ".codex", "sessions", "2026", "05"),
  path.join(HOME, ".codex", "sessions", "2026", "06"),
  path.join(HOME, ".codex", "sessions", "2026", "07"),
  path.join(HOME, ".codex", "archived_sessions"),
];

function nzIso(ms) {
  return zonedIso(ms, NZ_TIMEZONE);
}

function nzDate(ms) {
  return zonedDate(ms, NZ_TIMEZONE);
}

function nzHour(ms) {
  return zonedHour(ms, NZ_TIMEZONE);
}

function utcDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatNz(ms, includeSeconds = false) {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    dateStyle: "medium",
    timeStyle: includeSeconds ? "medium" : "short",
    hourCycle: "h23",
  }).format(new Date(ms));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function collectFiles() {
  const files = [];
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const match = entry.name.match(/^rollout-(\d{4}-\d{2}-\d{2})T/);
      if (!match || match[1] < "2026-05-15" || match[1] > "2026-07-22") continue;
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < RANGE_START_MS) continue;
      files.push({ path: fullPath, bytes: stat.size, session: entry.name.slice(-42, -6) });
    }
  }
  for (const root of SESSION_ROOTS) walk(root);
  return files;
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (typeof item === "string") return item;
    return item?.text || item?.input_text || item?.output_text || "";
  }).join("\n");
}

function extractUserText(row) {
  const payload = row?.payload || {};
  if (row?.type === "event_msg" && payload.type === "user_message") {
    return payload.message || payload.text || textFromContent(payload.content);
  }
  if (row?.type === "response_item" && payload.type === "message" && payload.role === "user") {
    return textFromContent(payload.content);
  }
  return "";
}

function classifyConversation(text, timestampMs, sessionPath) {
  const lower = text.toLowerCase();
  const resetIndex = lower.search(/\b(?:resets?|resetting|weekly usage|usage limit|rate limit|reset credits?|manual reset|0%|zero percent)\b/);
  if (resetIndex < 0) return null;
  const localContext = lower.slice(Math.max(0, resetIndex - 480), resetIndex + 560);
  const quotaContext = /\b(?:codex|openai|chatgpt|weekly|usage|rate limit|quota|tokens?|reset credits?|manual reset|reset button|allowance|capacity|spark|prolite)\b|\b\d{1,3}%\b/.test(localContext);
  if (!quotaContext) return null;

  const imported = /referenced chatgpt conversation|untrusted background context|conversationid/i.test(text);
  const retrospective = Boolean(CURRENT_THREAD_ID) && sessionPath.includes(CURRENT_THREAD_ID);
  const explicitAction = /\b(?:i|we)\s+(?:have\s+|had\s+|just\s+)?(?:hit|pressed|pushed|used|redeemed|triggered)\b.{0,70}\b(?:reset|reset button|reset credit)\b/i.test(text)
    || /\b(?:i(?:'ve| have)?|we(?:'ve| have)?)\s+(?:just\s+)?reset\b/i.test(text);
  const intention = /\b(?:going to|gonna|will|about to|planning to|intend to|decided to)\b.{0,90}\breset\b/i.test(text)
    || /\buse\s+(?:my|a|the)\s+(?:manual\s+)?reset\b/i.test(text);
  const negativeIntent = /\b(?:not going to|don't want to|do not want to|won't|wouldn't|decided not to)\b.{0,100}\breset\b/i.test(text);
  const observedReset = /\b(?:it|codex|usage|system)\s+(?:has\s+|just\s+)?reset\b/i.test(text)
    || /\breset\s+(?:came|happened|occurred|arrived)\b/i.test(text);

  let stance = "discussion";
  let evidenceWeight = 0.12;
  if (negativeIntent) {
    stance = "negative-intent";
    evidenceWeight = 0.16;
  }
  if (intention) {
    stance = "intention";
    evidenceWeight = 0.3;
  }
  if (observedReset) {
    stance = "observed-reset";
    evidenceWeight = 0.6;
  }
  if (explicitAction) {
    stance = "claimed-manual-action";
    evidenceWeight = 0.72;
  }
  if (imported) evidenceWeight *= 0.45;
  if (retrospective) evidenceWeight *= 0.25;

  const start = Math.max(0, resetIndex - 180);
  const excerpt = text.slice(start, start + 620).replace(/\s+/g, " ").trim();
  return {
    timestamp: nzIso(timestampMs),
    timestampMs,
    stance,
    evidenceWeight: round(evidenceWeight, 3),
    imported,
    retrospective,
    excerpt,
    session: path.basename(sessionPath),
  };
}

function isSpark(limitId) {
  return limitId === "codex_bengalfox";
}

function collectRateBuckets(value, context, bucketPath = "") {
  if (!value || typeof value !== "object") return;
  const limitId = typeof value.limit_id === "string" ? value.limit_id : context.limitId;
  const windowMinutes = Number(value.window_minutes);
  const resetsAtSeconds = Number(value.resets_at);
  if (Number.isFinite(windowMinutes) && Number.isFinite(resetsAtSeconds) && windowMinutes > 0) {
    const resetAtMs = resetsAtSeconds * 1000;
    const startAtMs = resetAtMs - windowMinutes * 60_000;
    const ageMs = context.observedAtMs - startAtMs;
    const remainingMs = resetAtMs - context.observedAtMs;
    if (ageMs >= -10 * 60_000 && remainingMs >= -10 * 60_000 && remainingMs <= windowMinutes * 60_000 + 10 * 60_000) {
      context.snapshots.push({
        observedAtMs: context.observedAtMs,
        resetAtMs,
        startAtMs,
        ageMs,
        usedPercent: value.used_percent == null ? null : Number(value.used_percent),
        windowMinutes,
        limitId: limitId || "unknown",
        planType: context.planType || "unknown",
        model: context.model || "unknown",
        bucketPath: bucketPath || "root",
        session: context.session,
      });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "credits" || !child || typeof child !== "object") continue;
    collectRateBuckets(child, { ...context, limitId }, bucketPath ? `${bucketPath}.${key}` : key);
  }
}

async function extractLedger(files) {
  const hourly = new Map();
  const utcDaily = new Map();
  const localDaily = new Map();
  const snapshots = [];
  const conversations = [];
  const conversationKeys = new Set();
  let malformed = 0;
  let tokenEvents = 0;
  let turnContexts = 0;

  for (const file of files) {
    let model = "unknown";
    const stream = readline.createInterface({ input: fs.createReadStream(file.path), crlfDelay: Infinity });
    for await (const line of stream) {
      const relevant = line.includes('"type":"turn_context"')
        || line.includes('"type":"token_count"')
        || line.includes('"type":"user_message"')
        || line.includes('"role":"user"');
      if (!relevant) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        malformed += 1;
        continue;
      }

      const timestampMs = Date.parse(row.timestamp);
      if (!Number.isFinite(timestampMs) || timestampMs < RANGE_START_MS || timestampMs >= RANGE_END_MS) continue;

      if (row.type === "turn_context") {
        if (typeof row.payload?.model === "string") model = row.payload.model;
        turnContexts += 1;
        continue;
      }

      const userText = extractUserText(row);
      if (userText) {
        const clue = classifyConversation(userText, timestampMs, file.path);
        if (clue) {
          const clueKey = `${file.session}|${timestampMs}|${clue.excerpt}`;
          if (!conversationKeys.has(clueKey)) {
            conversationKeys.add(clueKey);
            conversations.push(clue);
          }
        }
      }

      if (row.type !== "event_msg" || row.payload?.type !== "token_count") continue;
      const usage = row.payload?.info?.last_token_usage;
      const tokens = Number(usage?.total_tokens || 0);
      if (Number.isFinite(tokens) && tokens > 0) {
        tokenEvents += 1;
        const hourKey = nzHour(timestampMs);
        if (!hourly.has(hourKey)) {
          hourly.set(hourKey, { hour: hourKey, tokens: 0, inputTokens: 0, outputTokens: 0, events: 0, sessions: new Set(), models: new Map() });
        }
        const hour = hourly.get(hourKey);
        hour.tokens += tokens;
        hour.inputTokens += Number(usage?.input_tokens || 0);
        hour.outputTokens += Number(usage?.output_tokens || 0);
        hour.events += 1;
        hour.sessions.add(file.session);
        hour.models.set(model, (hour.models.get(model) || 0) + tokens);
        utcDaily.set(utcDate(timestampMs), (utcDaily.get(utcDate(timestampMs)) || 0) + tokens);
        localDaily.set(nzDate(timestampMs), (localDaily.get(nzDate(timestampMs)) || 0) + tokens);
      }

      if (row.payload.rate_limits) {
        collectRateBuckets(row.payload.rate_limits, {
          observedAtMs: timestampMs,
          model,
          planType: row.payload.rate_limits.plan_type,
          limitId: row.payload.rate_limits.limit_id,
          session: file.session,
          snapshots,
        });
      }
    }
  }

  const hourlyRows = [...hourly.values()].sort((a, b) => a.hour.localeCompare(b.hour)).map((row) => ({
    hour: row.hour,
    tokens: row.tokens,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    events: row.events,
    sessions: row.sessions.size,
    models: Object.fromEntries([...row.models.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)),
  }));

  const officialDaily = OFFICIAL_DAILY.map((row) => {
    const localObservedTokens = utcDaily.get(row.date) || 0;
    return {
      ...row,
      localObservedTokens,
      rawToOfficialRatio: row.tokens ? round(localObservedTokens / row.tokens, 3) : null,
    };
  });

  const officialByUtcDate = new Map(officialDaily.map((row) => [row.date, row.tokens]));
  const estimatedHourlyRows = hourlyRows.map((row) => {
    const utcDate = new Date(Date.parse(row.hour)).toISOString().slice(0, 10);
    const rawDailyTokens = utcDaily.get(utcDate) || 0;
    const officialDailyTokens = officialByUtcDate.get(utcDate) || 0;
    const scale = rawDailyTokens > 0 && officialDailyTokens > 0 ? officialDailyTokens / rawDailyTokens : null;
    return {
      ...row,
      utcDate,
      estimatedDashboardTokens: scale === null ? null : Math.round(row.tokens * scale),
      dailyNormalizationFactor: scale === null ? null : round(scale, 6),
    };
  });

  return {
    hourlyRows: estimatedHourlyRows,
    officialDaily,
    localDaily: [...localDaily.entries()].sort().map(([date, tokens]) => ({ date, tokens })),
    snapshots,
    conversations: conversations.sort((a, b) => a.timestampMs - b.timestampMs),
    diagnostics: { malformed, tokenEvents, turnContexts },
  };
}

function buildScheduleClaims(snapshots) {
  const grouped = new Map();
  const windowCounts = new Map();
  for (const snapshot of snapshots) {
    windowCounts.set(snapshot.windowMinutes, (windowCounts.get(snapshot.windowMinutes) || 0) + 1);
    if (snapshot.windowMinutes !== 10_080) continue;
    const key = [snapshot.limitId, snapshot.planType, snapshot.model, snapshot.bucketPath].join("|");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(snapshot);
  }

  const rawClaims = [];
  for (const [key, values] of grouped) {
    values.sort((a, b) => a.resetAtMs - b.resetAtMs || a.observedAtMs - b.observedAtMs);
    let cluster = [];
    const flush = () => {
      if (!cluster.length) return;
      const resetAtMs = median(cluster.map((item) => item.resetAtMs));
      const startAtMs = resetAtMs - WEEK_MS;
      let firstObservedAtMs = Infinity;
      let lastObservedAtMs = -Infinity;
      let maxAgeMs = -Infinity;
      let maxUsedPercent = -1;
      const sessions = new Set();
      for (const item of cluster) {
        firstObservedAtMs = Math.min(firstObservedAtMs, item.observedAtMs);
        lastObservedAtMs = Math.max(lastObservedAtMs, item.observedAtMs);
        maxAgeMs = Math.max(maxAgeMs, item.observedAtMs - startAtMs);
        maxUsedPercent = Math.max(maxUsedPercent, item.usedPercent == null ? -1 : item.usedPercent);
        sessions.add(item.session);
      }
      const observedSpanMs = lastObservedAtMs - firstObservedAtMs;
      let confidence = "sliding";
      let confidenceScore = 0.12;
      if (maxUsedPercent >= 1 && cluster.length >= 2 && maxAgeMs >= 2 * 60_000) {
        confidence = observedSpanMs >= 10 * 60_000 && maxAgeMs >= 5 * 60_000 ? "confirmed" : "strong";
        confidenceScore = confidence === "confirmed" ? 0.9 : 0.72;
      } else if (observedSpanMs >= 30 * 60_000 && maxAgeMs >= 15 * 60_000) {
        confidence = "uncertain";
        confidenceScore = 0.35;
      }
      const [limitId, planType, model, bucketPath] = key.split("|");
      rawClaims.push({
        limitId,
        planType,
        model,
        bucketPath,
        logicalLane: isSpark(limitId) ? "spark" : "main",
        startAtMs,
        resetAtMs,
        firstObservedAtMs,
        lastObservedAtMs,
        maxUsedPercent,
        samples: cluster.length,
        sessions: sessions.size,
        confidence,
        confidenceScore,
      });
      cluster = [];
    };
    for (const value of values) {
      if (cluster.length && value.resetAtMs - cluster[cluster.length - 1].resetAtMs > 10 * 60_000) flush();
      cluster.push(value);
    }
    flush();
  }

  const locked = rawClaims.filter((claim) => claim.confidenceScore >= 0.7);
  const byLane = new Map();
  for (const claim of locked) {
    const laneKey = [claim.limitId, claim.planType, claim.model].join("|");
    if (!byLane.has(laneKey)) byLane.set(laneKey, []);
    byLane.get(laneKey).push(claim);
  }

  const mergedClaims = [];
  for (const [laneKey, claims] of byLane) {
    claims.sort((a, b) => a.startAtMs - b.startAtMs);
    for (const claim of claims) {
      const previous = mergedClaims[mergedClaims.length - 1];
      if (previous?.laneKey === laneKey && Math.abs(previous.startAtMs - claim.startAtMs) <= 20 * 60_000) {
        previous.startValues.push(claim.startAtMs);
        previous.resetValues.push(claim.resetAtMs);
        previous.startAtMs = median(previous.startValues);
        previous.resetAtMs = median(previous.resetValues);
        previous.firstObservedAtMs = Math.min(previous.firstObservedAtMs, claim.firstObservedAtMs);
        previous.lastObservedAtMs = Math.max(previous.lastObservedAtMs, claim.lastObservedAtMs);
        previous.maxUsedPercent = Math.max(previous.maxUsedPercent, claim.maxUsedPercent);
        previous.samples += claim.samples;
        previous.sessions += claim.sessions;
        previous.bucketPaths.add(claim.bucketPath);
        continue;
      }
      mergedClaims.push({
        ...claim,
        laneKey,
        startValues: [claim.startAtMs],
        resetValues: [claim.resetAtMs],
        bucketPaths: new Set([claim.bucketPath]),
      });
    }
  }

  const claims = mergedClaims.sort((a, b) => a.startAtMs - b.startAtMs).map((claim, index) => ({
    id: `claim-${String(index + 1).padStart(3, "0")}`,
    laneKey: claim.laneKey,
    logicalLane: claim.logicalLane,
    limitId: claim.limitId,
    planType: claim.planType,
    model: claim.model,
    bucketPaths: [...claim.bucketPaths],
    startAt: nzIso(claim.startAtMs),
    startAtMs: claim.startAtMs,
    resetAt: nzIso(claim.resetAtMs),
    resetAtMs: claim.resetAtMs,
    firstObservedAt: nzIso(claim.firstObservedAtMs),
    firstObservedAtMs: claim.firstObservedAtMs,
    lastObservedAt: nzIso(claim.lastObservedAtMs),
    lastObservedAtMs: claim.lastObservedAtMs,
    maxUsedPercent: claim.maxUsedPercent,
    samples: claim.samples,
    sessions: claim.sessions,
    confidence: claim.confidence,
    confidenceScore: claim.confidenceScore,
  }));

  return { claims, windowCounts: Object.fromEntries([...windowCounts.entries()].sort((a, b) => a[0] - b[0])) };
}

function buildQuotaClaims(claims) {
  const lanes = new Map();
  for (const claim of claims) {
    const laneKey = quotaLaneKey(claim);
    if (!lanes.has(laneKey)) lanes.set(laneKey, []);
    lanes.get(laneKey).push(claim);
  }

  const quotaClaims = [];
  for (const [laneKey, laneClaims] of lanes) {
    laneClaims.sort((a, b) => a.startAtMs - b.startAtMs);
    const clusters = [];
    for (const claim of laneClaims) {
      let cluster = clusters.find((candidate) => Math.abs(median(candidate.map((item) => item.startAtMs)) - claim.startAtMs) <= 20 * 60_000);
      if (!cluster) {
        cluster = [];
        clusters.push(cluster);
      }
      cluster.push(claim);
    }

    for (const cluster of clusters) {
      const confidenceScore = Math.max(...cluster.map((claim) => claim.confidenceScore));
      quotaClaims.push({
        laneKey,
        logicalLane: cluster[0].logicalLane,
        limitId: cluster[0].limitId,
        planType: cluster[0].planType,
        sourceModels: [...new Set(cluster.map((claim) => claim.model))].sort(),
        supportingClaimIds: cluster.map((claim) => claim.id),
        startAtMs: median(cluster.map((claim) => claim.startAtMs)),
        resetAtMs: median(cluster.map((claim) => claim.resetAtMs)),
        firstObservedAtMs: Math.min(...cluster.map((claim) => claim.firstObservedAtMs)),
        lastObservedAtMs: Math.max(...cluster.map((claim) => claim.lastObservedAtMs)),
        maxUsedPercent: Math.max(...cluster.map((claim) => claim.maxUsedPercent)),
        samples: cluster.reduce((sum, claim) => sum + claim.samples, 0),
        sessions: cluster.reduce((sum, claim) => sum + claim.sessions, 0),
        confidence: confidenceScore >= 0.9 ? "confirmed" : "strong",
        confidenceScore,
      });
    }
  }

  return quotaClaims.sort((a, b) => a.startAtMs - b.startAtMs).map((claim, index) => ({
    ...claim,
    id: `quota-claim-${String(index + 1).padStart(3, "0")}`,
    startAt: nzIso(claim.startAtMs),
    resetAt: nzIso(claim.resetAtMs),
    firstObservedAt: nzIso(claim.firstObservedAtMs),
    lastObservedAt: nzIso(claim.lastObservedAtMs),
  }));
}

function buildBillingAnchors() {
  const monthlyStarts = [
    Date.parse("2026-05-13T17:34:00Z"),
    Date.parse("2026-06-13T17:34:00Z"),
    Date.parse("2026-07-13T17:34:00Z"),
    Date.parse("2026-08-13T17:34:00Z"),
  ];
  const anchors = [];
  for (let monthIndex = 0; monthIndex < monthlyStarts.length - 1; monthIndex += 1) {
    const monthStart = monthlyStarts[monthIndex];
    const nextMonth = monthlyStarts[monthIndex + 1];
    for (let tick = monthStart; tick < nextMonth; tick += WEEK_MS) {
      anchors.push({
        timestampMs: tick,
        timestamp: nzIso(tick),
        type: tick === monthStart ? "billing-month" : "billing-week",
        monthStart: nzIso(monthStart),
      });
    }
  }
  return anchors;
}

function nearestBillingAnchor(timestampMs, anchors) {
  let nearest = null;
  for (const anchor of anchors) {
    const distanceHours = Math.abs(timestampMs - anchor.timestampMs) / HOUR_MS;
    if (!nearest || distanceHours < nearest.distanceHours) nearest = { ...anchor, distanceHours };
  }
  return nearest;
}

function buildInferredEvents(claims, conversations, billingAnchors) {
  const lanes = new Map();
  for (const claim of claims) {
    if (!lanes.has(claim.laneKey)) lanes.set(claim.laneKey, []);
    lanes.get(claim.laneKey).push(claim);
  }

  const events = [];
  const ignoredModelOnlyHandoffs = [];
  for (const [laneKey, laneClaims] of lanes) {
    laneClaims.sort((a, b) => a.startAtMs - b.startAtMs);
    for (let index = 1; index < laneClaims.length; index += 1) {
      const previous = laneClaims[index - 1];
      const current = laneClaims[index];
      const sharedModels = sharedObservationModels(previous, current);
      if (!sharedModels.length) {
        ignoredModelOnlyHandoffs.push({
          laneKey,
          previousQuotaClaimId: previous.id,
          currentQuotaClaimId: current.id,
          at: current.startAt,
          previousModels: previous.sourceModels,
          currentModels: current.sourceModels,
          reason: "model-only-handoff",
        });
        continue;
      }
      const scheduleDeltaHours = (current.startAtMs - previous.resetAtMs) / HOUR_MS;
      const handoffGapHours = (current.firstObservedAtMs - previous.lastObservedAtMs) / HOUR_MS;
      const overlapHours = Math.max(0, -handoffGapHours);
      const competing = overlapHours > 6;
      const timingClass = Math.abs(scheduleDeltaHours) <= 6
        ? "on-schedule"
        : scheduleDeltaHours < -6 ? "early-phase-shift" : "late-or-idle";
      const nearbyConversations = conversations.filter((clue) => {
        if (clue.retrospective) return false;
        return Math.abs(clue.timestampMs - current.startAtMs) <= 36 * HOUR_MS;
      }).sort((a, b) => Math.abs(a.timestampMs - current.startAtMs) - Math.abs(b.timestampMs - current.startAtMs)).slice(0, 5);
      const manualEvidence = nearbyConversations.reduce((maximum, clue) => Math.max(maximum, clue.evidenceWeight), 0);
      const billing = nearestBillingAnchor(current.startAtMs, billingAnchors);
      let eventConfidence = 0.48;
      if (!competing && Math.abs(handoffGapHours) <= 36) eventConfidence = 0.82;
      else if (!competing) eventConfidence = 0.67;
      if (current.confidence === "confirmed") eventConfidence += 0.06;
      eventConfidence = clamp(eventConfidence, 0, 0.96);

      let cause = "unknown-system-or-hidden-lane";
      if (timingClass === "on-schedule") cause = "scheduled-window-reset";
      else if (manualEvidence >= 0.58) cause = "manual-reset-candidate";
      else if (billing.distanceHours <= 36) cause = "billing-phase-candidate";
      if (competing) cause = "competing-schedule-not-a-proven-reset";

      events.push({
        id: `event-${String(events.length + 1).padStart(3, "0")}`,
        laneKey,
        logicalLane: current.logicalLane,
        sourceModels: [...new Set([...previous.sourceModels, ...current.sourceModels])].sort(),
        planType: current.planType,
        inferredAt: current.startAt,
        inferredAtMs: current.startAtMs,
        previousAdvertisedReset: previous.resetAt,
        newAdvertisedReset: current.resetAt,
        scheduleDeltaHours: round(scheduleDeltaHours),
        handoffGapHours: round(handoffGapHours),
        overlapHours: round(overlapHours),
        timingClass,
        competing,
        cause,
        eventConfidence: round(eventConfidence, 2),
        manualEvidence: round(manualEvidence, 2),
        billingAnchor: billing.timestamp,
        billingDistanceHours: round(billing.distanceHours),
        nearbyConversationSignals: nearbyConversations.map(({ timestamp, stance, evidenceWeight, imported, retrospective }) => ({ timestamp, stance, evidenceWeight, imported, retrospective })),
        quotaClaimId: current.id,
      });
    }
  }

  const currentMainStartMs = ACCOUNT.main.resetsAt * 1000 - WEEK_MS;
  const existingCurrent = events.find((event) => Math.abs(event.inferredAtMs - currentMainStartMs) < HOUR_MS && event.logicalLane === "main");
  if (existingCurrent) {
    existingCurrent.cause = "automatic-reset-observed-credit-unchanged";
    existingCurrent.eventConfidence = 0.99;
  } else {
    const previousCandidates = claims.filter((claim) => claim.logicalLane === "main" && claim.startAtMs < currentMainStartMs).sort((a, b) => b.startAtMs - a.startAtMs);
    const previous = previousCandidates[0];
    const billing = nearestBillingAnchor(currentMainStartMs, billingAnchors);
    events.push({
      id: `event-${String(events.length + 1).padStart(3, "0")}`,
      laneKey: "live-account-main",
      logicalLane: "main",
      sourceModels: [],
      planType: "pro",
      inferredAt: nzIso(currentMainStartMs),
      inferredAtMs: currentMainStartMs,
      previousAdvertisedReset: previous?.resetAt || null,
      newAdvertisedReset: nzIso(ACCOUNT.main.resetsAt * 1000),
      scheduleDeltaHours: previous ? round((currentMainStartMs - previous.resetAtMs) / HOUR_MS) : null,
      handoffGapHours: null,
      overlapHours: null,
      timingClass: "observed-automatic-reset",
      competing: false,
      cause: "automatic-reset-observed-credit-unchanged",
      eventConfidence: 0.99,
      manualEvidence: 0,
      billingAnchor: billing.timestamp,
      billingDistanceHours: round(billing.distanceHours),
      nearbyConversationSignals: [],
      quotaClaimId: null,
    });
  }

  return {
    events: events.sort((a, b) => a.inferredAtMs - b.inferredAtMs),
    ignoredModelOnlyHandoffs,
  };
}

function buildPhaseFamilies(events) {
  const scheduled = events.filter((event) => event.timingClass === "on-schedule" && !event.competing);
  return scheduled.map((event, index) => ({
    id: `phase-${String(index + 1).padStart(2, "0")}`,
    anchorAt: nzIso(event.inferredAtMs - WEEK_MS),
    confirmedTickAt: event.inferredAt,
    driftHours: Math.abs(event.scheduleDeltaHours),
    confidence: event.eventConfidence,
  }));
}

function buildPredictions(claims, billingAnchors, phaseFamilies, nowMs) {
  const candidates = [];
  const add = (candidate) => {
    if (candidate.timestampMs <= nowMs || candidate.timestampMs > nowMs + 16 * 24 * HOUR_MS) return;
    candidates.push(candidate);
  };

  add({
    timestampMs: ACCOUNT.main.resetsAt * 1000,
    type: "live-current-window",
    score: 0.92,
    label: "Current backend deadline",
    basis: "account/rateLimits/read",
  });

  for (const claim of claims) {
    if (claim.logicalLane !== "main" || claim.resetAtMs <= nowMs) continue;
    const ageDays = Math.max(0, (nowMs - claim.lastObservedAtMs) / (24 * HOUR_MS));
    const recency = Math.exp(-ageDays / 5.5);
    let score = claim.confidenceScore * recency * 0.72;
    if (claim.resetAtMs === ACCOUNT.main.resetsAt * 1000) score = Math.max(score, 0.92);
    else score *= 0.62;
    add({
      timestampMs: claim.resetAtMs,
      type: "retained-schedule-candidate",
      score: round(score, 3),
      label: `${claim.logicalLane === "spark" ? "Spark" : "Main-lane"} retained deadline`,
      basis: `${claim.samples} snapshots across ${claim.sourceModels.length} model source(s), last observed ${formatNz(claim.lastObservedAtMs)}`,
      claimId: claim.id,
    });
  }

  for (const anchor of billingAnchors) {
    if (anchor.timestampMs <= nowMs) continue;
    add({
      timestampMs: anchor.timestampMs,
      type: anchor.type,
      score: anchor.type === "billing-month" ? 0.48 : 0.34,
      label: anchor.type === "billing-month" ? "Billing-month anchor" : "Billing-week anchor",
      basis: "14th-of-month hypothesis",
    });
  }

  for (const phase of phaseFamilies) {
    let tick = Date.parse(phase.confirmedTickAt) + WEEK_MS;
    while (tick <= nowMs) tick += WEEK_MS;
    add({
      timestampMs: tick,
      type: "confirmed-phase-projection",
      score: round(phase.confidence * 0.32, 3),
      label: "Historical phase continuation",
      basis: `confirmed tick ${phase.confirmedTickAt}`,
    });
  }

  candidates.sort((a, b) => a.timestampMs - b.timestampMs || b.score - a.score);
  const merged = [];
  for (const candidate of candidates) {
    const existing = merged.find((item) => Math.abs(item.timestampMs - candidate.timestampMs) <= 30 * 60_000);
    if (existing) {
      existing.score = Math.max(existing.score, candidate.score);
      existing.evidence.push({ type: candidate.type, label: candidate.label, basis: candidate.basis, score: candidate.score });
      continue;
    }
    merged.push({
      timestamp: nzIso(candidate.timestampMs),
      timestampMs: candidate.timestampMs,
      score: candidate.score,
      confidence: candidate.score >= 0.75 ? "high" : candidate.score >= 0.45 ? "medium" : "watch",
      label: candidate.label,
      evidence: [{ type: candidate.type, label: candidate.label, basis: candidate.basis, score: candidate.score }],
    });
  }

  const byScore = [...merged].sort((a, b) => b.score - a.score);
  return {
    candidates: merged,
    mostLikely: byScore[0] || null,
    earliestCredible: merged.find((item) => item.score >= 0.22) || byScore[0] || null,
  };
}

function buildGuidance(predictions, hourlyRows, nowMs) {
  const mainStartMs = ACCOUNT.main.resetsAt * 1000 - WEEK_MS;
  const remainingPercent = 100 - ACCOUNT.main.usedPercent;
  const elapsedHours = Math.max(0.25, (nowMs - mainStartMs) / HOUR_MS);
  const averageBurnPercentPerHour = ACCOUNT.main.usedPercent / elapsedHours;
  const runwayHoursAtCurrentPace = averageBurnPercentPerHour > 0 ? remainingPercent / averageBurnPercentPerHour : null;
  const localTokensSinceReset = hourlyRows.filter((row) => Date.parse(row.hour) >= mainStartMs).reduce((sum, row) => sum + row.tokens, 0);
  const earliest = predictions.earliestCredible;
  const hoursToEarliest = earliest ? (earliest.timestampMs - nowMs) / HOUR_MS : null;
  const hoursToOfficial = (ACCOUNT.main.resetsAt * 1000 - nowMs) / HOUR_MS;

  let action = "STEADY";
  let headline = "Use normally while preserving optional capacity.";
  let targetRemainingPercent = 45;
  if (remainingPercent >= 70 && hoursToEarliest != null && hoursToEarliest <= 96) {
    action = "GO HARD";
    headline = "A credible earlier reset may overwrite unused capacity. Front-load valuable work.";
    targetRemainingPercent = 30;
  } else if (remainingPercent <= 15 && hoursToOfficial > 24) {
    action = "PAUSE / PLAN";
    headline = "Preserve the final allowance for decisions and unblockers.";
    targetRemainingPercent = 8;
  } else if (remainingPercent <= 35) {
    action = "EASE OFF";
    headline = "Reserve capacity for high-value actions until the next credible reset.";
    targetRemainingPercent = 18;
  }

  return {
    action,
    headline,
    currentUsedPercent: ACCOUNT.main.usedPercent,
    remainingPercent,
    targetRemainingPercent,
    elapsedWindowHours: round(elapsedHours, 1),
    averageBurnPercentPerHour: round(averageBurnPercentPerHour, 2),
    runwayHoursAtCurrentPace: runwayHoursAtCurrentPace == null ? null : round(runwayHoursAtCurrentPace, 1),
    localTokensSinceReset,
    hoursToEarliestCredibleReset: hoursToEarliest == null ? null : round(hoursToEarliest, 1),
    hoursToCurrentBackendReset: round(hoursToOfficial, 1),
    rationale: [
      `${remainingPercent}% of the main weekly allowance remains.`,
      earliest ? `Earliest credible surprise reset is ${formatNz(earliest.timestampMs)} at ${Math.round(earliest.score * 100)}% model confidence.` : "No earlier credible surprise reset is currently represented.",
      `The current backend deadline is ${formatNz(ACCOUNT.main.resetsAt * 1000)}.`,
      "Conversation intent is used only as weak corroboration; it never confirms a button press by itself.",
    ],
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function buildReport(data) {
  const cleanEvents = data.events.filter((event) => !event.competing && event.logicalLane === "main");
  const earlyEvents = cleanEvents.filter((event) => event.timingClass === "early-phase-shift");
  const scheduledEvents = cleanEvents.filter((event) => event.timingClass === "on-schedule");
  const currentStartMs = ACCOUNT.main.resetsAt * 1000 - WEEK_MS;
  const jul22Legacy = data.claims.filter((claim) => claim.logicalLane === "main" && Math.abs(claim.resetAtMs - Date.parse("2026-07-21T20:35:33Z")) < HOUR_MS).sort((a, b) => b.samples - a.samples)[0];
  const jul25Claim = data.claims.filter((claim) => claim.logicalLane === "main" && nzDate(claim.resetAtMs) === "2026-07-25").sort((a, b) => b.samples - a.samples)[0];
  const comparisonRows = data.officialDaily.filter((row) => row.date >= "2026-07-16").map((row) => [
    row.date,
    row.tokens.toLocaleString("en-NZ"),
    row.localObservedTokens.toLocaleString("en-NZ"),
    row.rawToOfficialRatio == null ? "n/a" : `${row.rawToOfficialRatio}x`,
  ]);
  const eventRows = cleanEvents.map((event) => [
    formatNz(event.inferredAtMs),
    event.timingClass,
    event.previousAdvertisedReset ? formatNz(Date.parse(event.previousAdvertisedReset)) : "unknown",
    formatNz(Date.parse(event.newAdvertisedReset)),
    `${event.scheduleDeltaHours ?? "?"} h`,
    `${Math.round(event.eventConfidence * 100)}%`,
    event.cause,
  ]);
  const predictionRows = data.predictions.candidates.map((candidate) => [
    formatNz(candidate.timestampMs),
    `${Math.round(candidate.score * 100)}%`,
    candidate.confidence,
    candidate.evidence.map((item) => item.label).join("; "),
  ]);

  return `# Codex Reset and Usage Forensics\n\n` +
`Generated: ${formatNz(Date.now(), true)}\n\n` +
`## Operational answer\n\n` +
`**${data.guidance.action}: ${data.guidance.headline}**\n\n` +
`The main allowance is ${ACCOUNT.main.usedPercent}% used and ${data.guidance.remainingPercent}% remains. The current backend deadline is **${formatNz(ACCOUNT.main.resetsAt * 1000)}**. The model's earliest credible surprise-reset candidate is **${formatNz(data.predictions.earliestCredible.timestampMs)}**, while the highest-confidence date remains **${formatNz(data.predictions.mostLikely.timestampMs)}**.\n\n` +
`Recommended operating target: use valuable capacity aggressively but retain roughly **${data.guidance.targetRemainingPercent}%** until the earliest credible surprise window is resolved.\n\n` +
`## Executive findings\n\n` +
`- Historical schedule claims are recoverable at quota-lane granularity. ${data.quotaClaims.length} quota-window claims were reconstructed from ${data.claims.length} model observations and ${data.source.rateSnapshots.toLocaleString("en-NZ")} rate snapshots.\n` +
`- ${data.ignoredModelOnlyHandoffs.length} model-only handoffs were deliberately excluded from reset inference. A model change is not a reset event.\n` +
`- ${scheduledEvents.length} clean main-lane transitions followed a prior deadline within six hours. This confirms that an offset reset can establish a real seven-day phase for at least one following cycle.\n` +
`- ${earlyEvents.length} clean main-lane transitions occurred materially before the previously advertised deadline. Their existence is confirmed; manual versus automatic cause is usually not recorded.\n` +
`- Conversation statements are corroborating evidence only. Plans, refusals, and retrospective discussion are never treated as proof that a reset occurred.\n` +
`- Spark is separate only because the backend exposes the distinct \`codex_bengalfox\` limit ID. Model names alone never split a reset lane.\n` +
`- The account history is daily, while local rollout events provide hourly activity shape. Raw local telemetry totals ${data.tokenComparison.rawToOfficialRatio}x the dashboard ledger across the overlap because they are different accounting surfaces. Hourly dashboard-token values are estimates produced by normalizing each UTC day's local shape to its official daily total.\n\n` +
`## Current reset conflict\n\n` +
`The current main window is anchored at **${formatNz(currentStartMs, true)}** and advertises **${formatNz(ACCOUNT.main.resetsAt * 1000, true)}**.\n\n` +
(jul22Legacy ? `A historical main-lane claim advertised **${formatNz(jul22Legacy.resetAtMs, true)}**. Today's observed reset followed that older timer by approximately ${round((currentStartMs - jul22Legacy.resetAtMs) / HOUR_MS, 2)} hours.\n\n` : "") +
(jul25Claim ? `A competing later claim advertised **${formatNz(jul25Claim.resetAtMs, true)}**. Today's reset occurred ${round((jul25Claim.resetAtMs - currentStartMs) / HOUR_MS, 2)} hours before it. This is strong evidence that the single date shown in the product is not sufficient for forecasting, but it does not prove that every historical timer remains live.\n\n` : "") +
`## Reset-event ledger\n\n` +
markdownTable(["Inferred event", "Timing", "Prior deadline", "New deadline", "Delta", "Confidence", "Cause"], eventRows) + "\n\n" +
`## Billing-cycle hypothesis\n\n` +
`Billing-week anchors were generated from the surviving reset credit granted on 14 July at 05:34 NZ and projected at seven-day intervals inside each billing month. Events within 36 hours are marked as billing candidates, not confirmations.\n\n` +
`June 14 does not show a clean universal main reset: the dominant main claim continued to advertise June 18. July 14 contains several competing quota-schedule observations. The July 22 event is consistent with a July 21 billing-week anchor after an idle/first-use delay, but retained session schedules remain a competing explanation.\n\n` +
`## Current prediction candidates\n\n` +
markdownTable(["Candidate", "Score", "Band", "Evidence"], predictionRows) + "\n\n" +
`## Token-accounting comparison\n\n` +
markdownTable(["UTC day", "Official tokens", "Local raw tokens", "Raw / official"], comparisonRows) + "\n\n" +
`## Manual-reset attribution\n\n` +
`No historical reset-credit redemption transaction is exposed in the available app-server history or rollout events. Generic \`credits\` fields in old token events are not the reset bank. A historical event is therefore labelled manual only as a candidate when a nearby conversation claims an action; even then, the statement is not treated as ground truth.\n\n` +
`Prospectively, manual attribution can be made deterministic by recording the reset-credit inventory before and after every schedule transition. A count drop confirms a manual redemption; an unchanged inventory supports an automatic event.\n\n` +
`## Evidence and limitations\n\n` +
`- Source period: ${formatNz(RANGE_START_MS)} through ${formatNz(RANGE_END_MS)}.\n` +
`- Rollout files: ${data.source.files}; bytes scanned: ${data.source.bytes.toLocaleString("en-NZ")}.\n` +
`- Token events: ${data.source.tokenEvents.toLocaleString("en-NZ")}; hourly buckets: ${data.hourlyUsage.length}.\n` +
`- Conversation signals: ${data.conversationEvidenceSummary.total}; imported and retrospective clues receive sharply reduced weight. Raw excerpts and session identifiers are not published.\n` +
`- Multiple historical sessions can report conflicting deadlines for the same quota lane. Model identity is ignored for reset inference, and model-only handoffs are excluded.\n` +
`- Raw tokens are not identical to weighted quota consumption. Guidance uses the live percentage as authoritative and raw tokens as activity-shape evidence.\n`;
}

async function main() {
  fs.mkdirSync(OUTPUTS, { recursive: true });
  const files = collectFiles();
  const ledger = await extractLedger(files);
  const schedule = buildScheduleClaims(ledger.snapshots);
  const quotaClaims = buildQuotaClaims(schedule.claims);
  const billingAnchors = buildBillingAnchors();
  const eventBuild = buildInferredEvents(quotaClaims, ledger.conversations, billingAnchors);
  const events = eventBuild.events;
  const phaseFamilies = buildPhaseFamilies(events);
  const nowMs = Date.now();
  const predictions = buildPredictions(quotaClaims, billingAnchors, phaseFamilies, nowMs);
  const guidance = buildGuidance(predictions, ledger.hourlyRows, nowMs);
  const officialTotal = ledger.officialDaily.reduce((sum, row) => sum + row.tokens, 0);
  const localTotal = ledger.officialDaily.reduce((sum, row) => sum + row.localObservedTokens, 0);

  const data = {
    schemaVersion: 2,
    generatedAt: nzIso(nowMs),
    timezone: "Pacific/Auckland",
    account: {
      ...ACCOUNT,
      main: { ...ACCOUNT.main, windowStart: nzIso(ACCOUNT.main.resetsAt * 1000 - WEEK_MS), resetsAtIso: nzIso(ACCOUNT.main.resetsAt * 1000) },
      spark: { ...ACCOUNT.spark, windowStart: nzIso(ACCOUNT.spark.resetsAt * 1000 - WEEK_MS), resetsAtIso: nzIso(ACCOUNT.spark.resetsAt * 1000) },
      resetCredits: ACCOUNT.resetCredits.map((credit) => ({ ...credit, grantedAtIso: nzIso(credit.grantedAt * 1000), expiresAtIso: nzIso(credit.expiresAt * 1000) })),
    },
    source: {
      files: files.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      tokenEvents: ledger.diagnostics.tokenEvents,
      turnContexts: ledger.diagnostics.turnContexts,
      malformedLines: ledger.diagnostics.malformed,
      rateSnapshots: ledger.snapshots.length,
      rangeStart: nzIso(RANGE_START_MS),
      rangeEnd: nzIso(RANGE_END_MS),
    },
    tokenComparison: {
      officialTokens: officialTotal,
      localRawTokens: localTotal,
      rawToOfficialRatio: round(localTotal / officialTotal, 3),
    },
    officialDaily: ledger.officialDaily,
    localDaily: ledger.localDaily,
    hourlyUsage: ledger.hourlyRows,
    conversationEvidenceSummary: {
      total: ledger.conversations.length,
      imported: ledger.conversations.filter((clue) => clue.imported).length,
      retrospective: ledger.conversations.filter((clue) => clue.retrospective).length,
      byStance: Object.fromEntries([...ledger.conversations.reduce((counts, clue) => counts.set(clue.stance, (counts.get(clue.stance) || 0) + 1), new Map()).entries()].sort()),
    },
    scheduleWindowCounts: schedule.windowCounts,
    claims: schedule.claims,
    quotaClaims,
    events,
    ignoredModelOnlyHandoffs: eventBuild.ignoredModelOnlyHandoffs,
    phaseFamilies,
    billingAnchors,
    predictions,
    guidance,
  };

  const report = buildReport(data);
  const dataPath = path.join(OUTPUTS, "openai-reset-forensics-data.json");
  const reportPath = path.join(OUTPUTS, "openai-reset-forensics-report.md");
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.writeFileSync(reportPath, report, "utf8");

  process.stdout.write(JSON.stringify({
    dataPath,
    reportPath,
    source: data.source,
    tokenComparison: data.tokenComparison,
    claimCount: data.claims.length,
    eventCount: data.events.length,
    conversationSignals: data.conversationEvidenceSummary.total,
    ignoredModelOnlyHandoffs: data.ignoredModelOnlyHandoffs.length,
    prediction: data.predictions.mostLikely,
    earliestCredible: data.predictions.earliestCredible,
    guidance: data.guidance,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
