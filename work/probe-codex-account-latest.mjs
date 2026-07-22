import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const npxCommand = `${process.env.APPDATA}\\npm\\npx.cmd`;
const child = spawn(npxCommand, ["--yes", "@openai/codex@0.145.0", "app-server", "--stdio"], {
  cwd: process.cwd(),
  windowsHide: true,
  shell: true,
  stdio: ["pipe", "pipe", "pipe"]
});

const lines = createInterface({ input: child.stdout });
const results = {};
let stderr = "";
let initialized = false;
let finished = false;

child.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function sanitizeWindow(window) {
  if (!window) return null;
  return {
    usedPercent: window.usedPercent ?? null,
    windowDurationMins: window.windowDurationMins ?? null,
    resetsAt: window.resetsAt ?? null
  };
}

function sanitizeSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    limitId: snapshot.limitId ?? null,
    limitName: snapshot.limitName ?? null,
    planType: snapshot.planType ?? null,
    primary: sanitizeWindow(snapshot.primary),
    secondary: sanitizeWindow(snapshot.secondary),
    rateLimitReachedType: snapshot.rateLimitReachedType ?? null
  };
}

function sanitizeRateLimits(result) {
  const byId = {};
  for (const [key, value] of Object.entries(result?.rateLimitsByLimitId || {})) {
    byId[key] = sanitizeSnapshot(value);
  }
  const resetCredits = result?.rateLimitResetCredits;
  return {
    rateLimits: sanitizeSnapshot(result?.rateLimits),
    rateLimitsByLimitId: byId,
    rateLimitResetCredits: resetCredits ? {
      availableCount: resetCredits.availableCount ?? null,
      credits: Array.isArray(resetCredits.credits) ? resetCredits.credits.map((credit) => ({
        resetType: credit.resetType ?? null,
        status: credit.status ?? null,
        grantedAt: credit.grantedAt ?? null,
        expiresAt: credit.expiresAt ?? null,
        title: credit.title ?? null,
        description: credit.description ?? null
      })) : null
    } : null
  };
}

function sanitizeError(error) {
  return { code: error?.code ?? null, message: error?.message ?? "Unknown error" };
}

function complete() {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  child.stdin.end();
  child.kill();
  process.stdout.write(`${JSON.stringify({
    codexVersion: "0.145.0",
    account: results.account ?? null,
    rateLimits: results.rateLimits ?? null,
    usage: results.usage ?? null,
    protocolErrors: results.errors ?? {},
    processError: stderr.trim() || null
  }, null, 2)}\n`);
}

lines.on("line", (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }

  if (message.id === 0 && message.result && !initialized) {
    initialized = true;
    send({ method: "initialized", params: {} });
    send({ method: "account/read", id: 1, params: { refreshToken: false } });
    send({ method: "account/rateLimits/read", id: 2 });
    send({ method: "account/usage/read", id: 3 });
    return;
  }

  if (message.id === 1) {
    if (message.result) {
      results.account = {
        accountType: message.result.account?.type ?? null,
        planType: message.result.account?.planType ?? null,
        requiresOpenaiAuth: message.result.requiresOpenaiAuth ?? null
      };
    }
    if (message.error) (results.errors ??= {}).account = sanitizeError(message.error);
  }
  if (message.id === 2) {
    if (message.result) results.rateLimits = sanitizeRateLimits(message.result);
    if (message.error) (results.errors ??= {}).rateLimits = sanitizeError(message.error);
  }
  if (message.id === 3) {
    if (message.result) results.usage = message.result;
    if (message.error) (results.errors ??= {}).usage = sanitizeError(message.error);
  }

  const accountDone = results.account || results.errors?.account;
  const rateDone = results.rateLimits || results.errors?.rateLimits;
  const usageDone = results.usage || results.errors?.usage;
  if (accountDone && rateDone && usageDone) complete();
});

child.on("error", (error) => {
  stderr += `\n${error.message}`;
  complete();
});

send({
  method: "initialize",
  id: 0,
  params: {
    clientInfo: {
      name: "reset_economics_probe",
      title: "Reset Economics Probe",
      version: "0.2.0"
    },
    capabilities: { experimentalApi: true }
  }
});

const timeout = setTimeout(complete, 20000);
