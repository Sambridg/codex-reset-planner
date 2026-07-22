import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "outputs", "openai-reset-forensics-data.json");
const outputPath = path.join(root, "outputs", "openai-reset-planner.html");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
if (Array.isArray(data.conversationClues)) {
  data.conversationEvidenceSummary = { total: data.conversationClues.length, imported: 0, retrospective: 0, byStance: {} };
  delete data.conversationClues;
}
data.events = (data.events || []).map((event) => {
  const copy = { ...event };
  delete copy.nearbyConversations;
  if (Array.isArray(copy.nearbyConversationSignals)) {
    copy.nearbyConversationSignals = copy.nearbyConversationSignals.map(({ timestamp, stance, evidenceWeight, imported, retrospective }) => ({ timestamp, stance, evidenceWeight, imported, retrospective }));
  }
  return copy;
});
const liveUsed = Number(process.env.CURRENT_USED_PERCENT);
if (Number.isFinite(liveUsed)) data.account.main.usedPercent = liveUsed;
data.account.refreshedAt = new Date().toISOString();
const safeJson = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const template = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Codex Reset Forensics Lab</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    :root {
      --paper: #f2efe7;
      --paper-2: #e8e2d5;
      --ink: #14212d;
      --muted: #60707b;
      --line: #c9c2b4;
      --navy: #123047;
      --blue: #236d91;
      --green: #17845b;
      --orange: #dc6d31;
      --gold: #c49520;
      --red: #b6463f;
      --slate: #7d8790;
      --white: #fffdf8;
      --shadow: 0 18px 48px rgba(20,33,45,.09);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 8% 8%, rgba(35,109,145,.13), transparent 25rem),
        radial-gradient(circle at 92% 12%, rgba(196,149,32,.14), transparent 24rem),
        linear-gradient(135deg, rgba(255,255,255,.48), transparent 45%),
        var(--paper);
      font-family: "Space Grotesk", sans-serif;
      min-height: 100vh;
    }
    body:before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .16;
      background-image: linear-gradient(rgba(18,48,71,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(18,48,71,.12) 1px, transparent 1px);
      background-size: 36px 36px;
      mask-image: linear-gradient(to bottom, black, transparent 65%);
    }
    button, input, select { font: inherit; }
    button { cursor: pointer; }
    a { color: var(--blue); }
    .shell { width: min(1560px, calc(100% - 32px)); margin: 22px auto 64px; position: relative; }
    .masthead {
      background: var(--navy);
      color: var(--white);
      border-radius: 24px 24px 0 0;
      padding: 24px 28px 0;
      box-shadow: var(--shadow);
      overflow: hidden;
      position: relative;
    }
    .masthead:after {
      content: "";
      position: absolute;
      width: 420px;
      height: 420px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 50%;
      right: -150px;
      top: -250px;
      box-shadow: 0 0 0 46px rgba(255,255,255,.035), 0 0 0 92px rgba(255,255,255,.025);
    }
    .mast-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; position: relative; z-index: 1; }
    .eyebrow { font: 600 11px/1.3 "IBM Plex Mono", monospace; letter-spacing: .18em; text-transform: uppercase; color: #9fd4e8; }
    h1 { font-size: clamp(28px, 4vw, 52px); line-height: .98; max-width: 780px; margin: 8px 0 12px; letter-spacing: -.045em; }
    .lede { margin: 0; color: #c6d4dc; max-width: 770px; font-size: 15px; line-height: 1.55; }
    .snapshot { min-width: 250px; text-align: right; font: 12px/1.55 "IBM Plex Mono", monospace; color: #c6d4dc; }
    .snapshot strong { display: block; color: var(--white); font-size: 13px; }
    .tabs { display: flex; gap: 4px; margin-top: 24px; overflow-x: auto; position: relative; z-index: 1; }
    .tab {
      border: 0;
      background: transparent;
      color: #b4c8d3;
      padding: 14px 17px;
      white-space: nowrap;
      border-radius: 10px 10px 0 0;
      font-weight: 600;
      font-size: 13px;
    }
    .tab.active { color: var(--navy); background: var(--paper); }
    .panel { display: none; animation: reveal .38s ease both; }
    .panel.active { display: block; }
    @keyframes reveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .workspace { background: rgba(242,239,231,.92); border-radius: 0 0 24px 24px; padding: 24px; box-shadow: var(--shadow); min-height: 650px; }
    .decision {
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 18px;
      margin-bottom: 18px;
    }
    .decision-main {
      min-height: 270px;
      border-radius: var(--radius);
      padding: 26px;
      color: var(--white);
      background:
        linear-gradient(125deg, rgba(255,255,255,.08), transparent 55%),
        var(--navy);
      position: relative;
      overflow: hidden;
    }
    .decision-main:after { content: ""; position: absolute; right: -80px; bottom: -120px; width: 300px; height: 300px; border-radius: 50%; background: rgba(35,109,145,.35); filter: blur(1px); }
    .action-pill { display: inline-flex; align-items: center; gap: 9px; border: 1px solid rgba(255,255,255,.25); padding: 8px 11px; border-radius: 999px; font: 600 11px "IBM Plex Mono", monospace; letter-spacing: .12em; }
    .action-pill:before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #63d49f; box-shadow: 0 0 0 5px rgba(99,212,159,.12); }
    .decision-main h2 { position: relative; z-index: 1; font-size: clamp(27px, 3vw, 43px); line-height: 1.03; letter-spacing: -.04em; margin: 36px 0 12px; max-width: 720px; }
    .decision-main p { position: relative; z-index: 1; color: #c8d7df; line-height: 1.55; max-width: 720px; margin: 0; }
    .decision-side { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .metric { background: var(--white); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; min-height: 128px; }
    .metric .label { color: var(--muted); font: 600 10px "IBM Plex Mono", monospace; letter-spacing: .12em; text-transform: uppercase; }
    .metric .value { display: block; margin-top: 15px; font-size: clamp(23px, 2.3vw, 34px); line-height: 1; letter-spacing: -.04em; }
    .metric .sub { display: block; margin-top: 9px; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .metric.alert { border-color: rgba(220,109,49,.5); background: #fff8ef; }
    .metric.good { border-color: rgba(23,132,91,.45); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .card { background: rgba(255,253,248,.9); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; }
    .card h2, .card h3 { margin: 0; letter-spacing: -.025em; }
    .card h2 { font-size: 23px; }
    .card h3 { font-size: 16px; }
    .card-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 16px; }
    .card-head p { margin: 5px 0 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
    .mono { font-family: "IBM Plex Mono", monospace; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 9px; font: 600 10px "IBM Plex Mono", monospace; letter-spacing: .05em; white-space: nowrap; }
    .badge.high { background: rgba(23,132,91,.12); color: #116342; }
    .badge.watch { background: rgba(220,109,49,.13); color: #98471f; }
    .badge.low { background: rgba(125,135,144,.16); color: #54616a; }
    .badge.info { background: rgba(35,109,145,.12); color: #1b5a79; }
    .candidate-list { display: grid; gap: 10px; }
    .candidate { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; align-items: center; border-top: 1px solid var(--line); padding-top: 10px; }
    .candidate:first-child { border-top: 0; padding-top: 0; }
    .candidate-time { font: 600 12px/1.35 "IBM Plex Mono", monospace; }
    .candidate strong { display: block; font-size: 13px; }
    .candidate small { color: var(--muted); }
    .finding { padding: 16px; border-left: 4px solid var(--blue); background: var(--white); border-radius: 4px 14px 14px 4px; }
    .finding strong { display: block; margin-bottom: 6px; }
    .finding span { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .finding.warn { border-left-color: var(--orange); }
    .finding.good { border-left-color: var(--green); }
    .stop-rule { margin-top: 18px; display: flex; justify-content: space-between; gap: 18px; align-items: center; background: #f9e8e3; border: 1px solid #dfaaa1; border-radius: 14px; padding: 14px 16px; }
    .stop-rule strong { color: #87332e; }
    .stop-rule span { color: #76504d; font-size: 13px; }
    .chart-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--white); }
    .chart-wrap svg { width: 100%; min-width: 960px; display: block; }
    .axis-label { fill: var(--muted); font: 11px "IBM Plex Mono", monospace; }
    .axis-title { fill: var(--ink); font: 600 11px "IBM Plex Mono", monospace; letter-spacing: .08em; text-transform: uppercase; }
    .grid-line { stroke: #d9d3c7; stroke-width: 1; }
    .month-band { fill: #f5f1e8; }
    .month-band.alt { fill: #ece6da; }
    .hist-bar { fill: var(--blue); opacity: .72; transition: opacity .15s; }
    .hist-bar:hover { opacity: 1; }
    .hour-line { fill: none; stroke: var(--gold); stroke-width: 2; opacity: .8; }
    .reset-line { stroke-width: 2; }
    .reset-line.competing { stroke-dasharray: 5 5; opacity: .6; }
    .current-line { stroke: var(--red); stroke-width: 3; }
    .section-note { color: var(--muted); font-size: 12px; line-height: 1.5; margin: 12px 0 0; }
    .history-controls { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
    label.field { display: grid; gap: 6px; min-width: 145px; color: var(--muted); font: 600 10px "IBM Plex Mono", monospace; letter-spacing: .07em; text-transform: uppercase; }
    input, select { color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 9px; padding: 10px 11px; min-height: 40px; }
    input:focus, select:focus, button:focus-visible { outline: 3px solid rgba(35,109,145,.24); outline-offset: 1px; }
    .hour-summary { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .hour-summary span { background: var(--paper); border-radius: 999px; padding: 7px 10px; font: 11px "IBM Plex Mono", monospace; }
    .heatmap-shell { overflow-x: auto; }
    .heatmap { min-width: 850px; display: grid; grid-template-columns: 58px repeat(24, 1fr); gap: 3px; align-items: center; }
    .heat-cell { height: 24px; border-radius: 3px; background: rgba(35,109,145,var(--heat)); }
    .heat-label { font: 10px "IBM Plex Mono", monospace; color: var(--muted); text-align: right; padding-right: 7px; }
    .heat-hour { font: 9px "IBM Plex Mono", monospace; color: var(--muted); text-align: center; }
    .lab-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 18px; }
    .control-stack { display: grid; gap: 12px; align-content: start; }
    .control-card { background: var(--white); border: 1px solid var(--line); border-radius: 14px; padding: 15px; }
    .control-card h3 { margin: 0 0 12px; font-size: 14px; }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .check { display: flex; gap: 9px; align-items: flex-start; color: var(--ink); font-size: 12px; line-height: 1.35; margin: 9px 0; }
    .check input { min-height: 0; margin-top: 2px; }
    .btn { border: 0; border-radius: 9px; padding: 10px 12px; color: var(--white); background: var(--navy); font-weight: 600; font-size: 12px; }
    .btn.secondary { color: var(--navy); background: var(--paper-2); }
    .btn.orange { background: var(--orange); }
    .btn.danger { color: var(--red); background: rgba(182,70,63,.1); }
    .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .lab-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 0 0 12px; }
    .lab-stat { background: var(--white); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    .lab-stat small { display: block; color: var(--muted); font: 9px "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .08em; }
    .lab-stat strong { display: block; margin-top: 8px; font-size: 18px; }
    .forecast-area { fill: rgba(35,109,145,.12); }
    .forecast-line { fill: none; stroke: var(--blue); stroke-width: 3; }
    .threshold-line { stroke: var(--red); stroke-dasharray: 7 5; stroke-width: 1.5; }
    .candidate-line { stroke: var(--orange); stroke-dasharray: 4 5; stroke-width: 1.5; opacity: .75; }
    .billing-line { stroke: var(--gold); stroke-dasharray: 2 5; stroke-width: 2; opacity: .8; }
    .official-line { stroke: var(--green); stroke-width: 2.5; }
    .manual-line { stroke: var(--red); stroke-width: 2.5; }
    .manual-marker { fill: var(--red); stroke: var(--white); stroke-width: 3; cursor: ew-resize; }
    .usage-block { opacity: .11; }
    .usage-block.heavy { fill: var(--orange); }
    .usage-block.light { fill: var(--green); }
    .usage-block.pause { fill: var(--slate); }
    .scenario-list { display: grid; gap: 8px; margin-top: 12px; }
    .scenario-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 8px; align-items: center; border-top: 1px solid var(--line); padding-top: 8px; }
    .scenario-row:first-child { border-top: 0; }
    .scenario-kind { font: 600 10px "IBM Plex Mono", monospace; text-transform: uppercase; color: var(--muted); }
    .scenario-row input { width: 100%; min-width: 0; }
    .scenario-row button { border: 0; background: transparent; color: var(--red); font-weight: 700; }
    .form-grid { display: grid; grid-template-columns: 1.2fr 1.2fr .7fr auto; gap: 8px; align-items: end; }
    .form-grid .field { min-width: 0; }
    .evidence-table-wrap { overflow: auto; max-height: 620px; border: 1px solid var(--line); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; background: var(--white); font-size: 12px; }
    th { position: sticky; top: 0; z-index: 1; background: var(--navy); color: var(--white); text-align: left; padding: 11px; font: 600 10px "IBM Plex Mono", monospace; letter-spacing: .06em; text-transform: uppercase; }
    td { padding: 11px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:hover td { background: #faf6ed; }
    .cause { font-weight: 600; }
    .source-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .source-item { border: 1px solid var(--line); border-radius: 12px; padding: 14px; background: var(--white); }
    .source-item strong { display: block; font-size: 22px; }
    .source-item span { color: var(--muted); font-size: 11px; }
    .tooltip { position: fixed; z-index: 20; max-width: 330px; padding: 10px 12px; border-radius: 9px; background: var(--ink); color: var(--white); font: 11px/1.45 "IBM Plex Mono", monospace; pointer-events: none; opacity: 0; transform: translate(10px, 10px); transition: opacity .1s; box-shadow: var(--shadow); }
    .tooltip.show { opacity: 1; }
    .toast { position: fixed; right: 22px; bottom: 22px; z-index: 30; background: var(--navy); color: var(--white); padding: 12px 15px; border-radius: 10px; box-shadow: var(--shadow); font-size: 12px; opacity: 0; transform: translateY(12px); transition: .2s ease; pointer-events: none; }
    .toast.show { opacity: 1; transform: none; }
    .spacer { height: 18px; }
    @media (max-width: 1080px) {
      .decision, .grid-2, .lab-layout { grid-template-columns: 1fr; }
      .lab-metrics { grid-template-columns: repeat(3, 1fr); }
      .source-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
      .shell { width: min(100% - 16px, 1560px); margin-top: 8px; }
      .masthead { padding: 20px 16px 0; border-radius: 18px 18px 0 0; }
      .mast-top { display: block; }
      .snapshot { text-align: left; margin-top: 18px; min-width: 0; }
      .workspace { padding: 12px; border-radius: 0 0 18px 18px; }
      .decision-side, .grid-3, .control-grid, .source-grid { grid-template-columns: 1fr; }
      .lab-metrics { grid-template-columns: 1fr 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .candidate { grid-template-columns: 88px 1fr; }
      .candidate .badge { grid-column: 2; justify-self: start; }
      .stop-rule { display: block; }
      .stop-rule span { display: block; margin-top: 5px; }
      .card { padding: 15px; }
      .decision-main { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <div class="mast-top">
        <div>
          <div class="eyebrow">Reset Lab / Codex Capacity Forensics</div>
          <h1>Know the window before you spend it.</h1>
          <p class="lede">Observed history, competing reset clocks, and a scenario model for deciding when to burn hard, ease off, or preserve capacity.</p>
        </div>
        <div class="snapshot" id="snapshotStamp"></div>
      </div>
      <nav class="tabs" aria-label="Planner sections">
        <button class="tab active" data-tab="overview">Decision</button>
        <button class="tab" data-tab="history">Observed history</button>
        <button class="tab" data-tab="lab">Forecast lab</button>
        <button class="tab" data-tab="evidence">Evidence</button>
      </nav>
    </header>

    <main class="workspace">
      <section class="panel active" id="panel-overview">
        <div class="decision">
          <div class="decision-main">
            <span class="action-pill" id="actionPill">GO HARD</span>
            <h2 id="decisionHeadline"></h2>
            <p id="decisionRationale"></p>
          </div>
          <div class="decision-side">
            <div class="metric good"><span class="label">Main remaining</span><strong class="value" id="remainingValue"></strong><span class="sub" id="remainingSub"></span></div>
            <div class="metric"><span class="label">Most likely reset</span><strong class="value" id="likelyReset"></strong><span class="sub" id="likelyConfidence"></span></div>
            <div class="metric alert"><span class="label">Earliest watch</span><strong class="value" id="watchReset"></strong><span class="sub" id="watchConfidence"></span></div>
            <div class="metric"><span class="label">Reset credits</span><strong class="value" id="creditCount"></strong><span class="sub" id="creditExpiry"></span></div>
          </div>
        </div>

        <div class="grid-2">
          <article class="card">
            <div class="card-head"><div><h2>Competing clocks</h2><p>The backend deadline is strongest. Earlier retained phases remain watch points, not promises.</p></div><span class="badge high">confidence ranked</span></div>
            <div class="candidate-list" id="candidateList"></div>
          </article>
          <article class="card">
            <div class="card-head"><div><h2>What the evidence supports</h2><p>Hard observations are separated from attribution and billing hypotheses.</p></div></div>
            <div class="grid-2" style="gap:10px">
              <div class="finding good"><strong>Phase shifts are real</strong><span>Locked seven-day deadlines changed before earlier advertised deadlines and sometimes propagated for another week.</span></div>
              <div class="finding warn"><strong>Manual cause is not logged</strong><span>Conversation wording is only corroboration. Credit inventory changes are needed for deterministic attribution.</span></div>
              <div class="finding"><strong>Spark is separate</strong><span>GPT-5.3-Codex-Spark reports through its own current limit ID and must not be merged with main.</span></div>
              <div class="finding warn"><strong>Billing sync is unproven</strong><span>The 14th-cycle theory remains a candidate. June 14 did not produce one clean universal reset across observed lanes.</span></div>
            </div>
          </article>
        </div>
        <div class="stop-rule"><strong id="stopRuleStatus">Goal stop rule: 30% remaining</strong><span>Background forensic work stops when the main weekly meter reaches 70% used. This is separate from usage advice.</span></div>
      </section>

      <section class="panel" id="panel-history">
        <article class="card">
          <div class="card-head">
            <div><h2>Observed history, read only</h2><p>Official daily usage bars, normalized hourly activity shape, and inferred schedule transitions. Nothing on this graph can change the evidence.</p></div>
            <span class="badge info">22 May - 22 July</span>
          </div>
          <div class="chart-wrap" id="historyChart"></div>
          <p class="section-note">Daily account totals are keyed to UTC dates. Hourly points are local rollout activity shown in Pacific/Auckland time and normalized within each UTC day. Reset lines are inferred schedule transitions, not guaranteed button presses.</p>
        </article>

        <div class="spacer"></div>
        <div class="grid-2">
          <article class="card">
            <div class="card-head">
              <div><h2>Hourly microscope</h2><p>Choose an official usage day to see its inferred hourly distribution.</p></div>
              <div class="history-controls"><label class="field">UTC usage day<input id="historyDay" type="date"></label></div>
            </div>
            <div class="chart-wrap" id="hourChart"></div>
            <div class="hour-summary" id="hourSummary"></div>
          </article>
          <article class="card">
            <div class="card-head"><div><h2>Historical work rhythm</h2><p>Average relative activity by local weekday and hour. This can drive the forecast model.</p></div><span class="badge info">NZ local time</span></div>
            <div class="heatmap-shell"><div class="heatmap" id="heatmap"></div></div>
            <p class="section-note" id="primeWindow"></p>
          </article>
        </div>
      </section>

      <section class="panel" id="panel-lab">
        <div class="lab-layout">
          <div>
            <div class="lab-metrics" id="labMetrics"></div>
            <article class="card">
              <div class="card-head"><div><h2>Historical-to-future capacity</h2><p>Click the graph to add a hypothetical manual reset. Drag a red marker to move it. Watch lines remain non-binding unless enabled.</p></div><span class="badge info" id="labModeBadge">click adds reset</span></div>
              <div class="chart-wrap" id="forecastChart"></div>
              <p class="section-note">Vertical position is remaining weekly capacity. Token totals use the editable previous-window calibration because raw tokens and weighted quota consumption are not identical.</p>
            </article>

            <div class="spacer"></div>
            <article class="card">
              <div class="card-head"><div><h2>Planned usage windows</h2><p>Blocks override the historical rhythm. Heavy is 2.3x, light is 0.35x, and pause is zero.</p></div></div>
              <form class="form-grid" id="blockForm">
                <label class="field">Start<input id="blockStart" type="datetime-local" required></label>
                <label class="field">End<input id="blockEnd" type="datetime-local" required></label>
                <label class="field">Mode<select id="blockMode"><option value="heavy">Heavy</option><option value="light">Light</option><option value="pause">Pause</option><option value="steady">Steady</option></select></label>
                <button class="btn orange" type="submit">Add window</button>
              </form>
              <div class="scenario-list" id="usageList"></div>
            </article>
          </div>

          <aside class="control-stack">
            <div class="control-card">
              <h3>Current state</h3>
              <div class="control-grid">
                <label class="field">Used percent<input id="usedInput" type="number" min="0" max="100" step="1"></label>
                <label class="field">Forecast days<input id="daysInput" type="number" min="7" max="70" step="1"></label>
                <label class="field">Base burn / day<input id="burnInput" type="number" min="0" max="100" step="0.5"></label>
                <label class="field">Tokens / allowance<input id="tokenInput" type="number" min="1" step="1000000"></label>
              </div>
            </div>
            <div class="control-card">
              <h3>Reset assumptions</h3>
              <label class="check"><input id="rhythmToggle" type="checkbox">Use historical weekday/hour rhythm</label>
              <label class="check"><input id="billingToggle" type="checkbox">Treat billing-week anchors as real resets</label>
              <label class="check"><input id="watchToggle" type="checkbox">Treat every watch candidate as a real reset</label>
              <p class="section-note">The last option is deliberately aggressive. It shows upside, not the most likely outcome.</p>
            </div>
            <div class="control-card">
              <h3>Manual reset markers</h3>
              <div class="btn-row"><button class="btn orange" id="addResetNow" type="button">Add +24 hours</button><button class="btn secondary" id="clearResets" type="button">Clear</button></div>
              <div class="scenario-list" id="resetList"></div>
            </div>
            <div class="control-card">
              <h3>Scenario file</h3>
              <div class="btn-row"><button class="btn" id="exportScenario" type="button">Export</button><label class="btn secondary" for="importScenario">Import</label><input id="importScenario" type="file" accept="application/json" hidden><button class="btn danger" id="resetScenario" type="button">Reset defaults</button></div>
            </div>
          </aside>
        </div>
      </section>

      <section class="panel" id="panel-evidence">
        <div class="source-grid" id="sourceGrid"></div>
        <div class="spacer"></div>
        <article class="card">
          <div class="card-head"><div><h2>Reset-event ledger</h2><p>Every row is an inferred change in an advertised weekly schedule. Competing overlaps are retained rather than promoted to confirmed resets.</p></div><a href="openai-reset-forensics-report.md">Open full report</a></div>
          <div class="evidence-table-wrap"><table><thead><tr><th>Inferred at</th><th>Quota lane</th><th>Prior deadline</th><th>New deadline</th><th>Timing</th><th>Cause label</th><th>Confidence</th></tr></thead><tbody id="eventRows"></tbody></table></div>
          <p class="section-note">Model identity is deliberately excluded from reset inference. A model-only handoff is not a reset. A manual-reset candidate still means correlation, not proof that a reset credit was redeemed.</p>
        </article>
        <div class="spacer"></div>
        <div class="grid-2">
          <article class="card"><h3>What is directly observed</h3><p class="section-note">Official daily token totals; exact local model-call timestamps; quota limit identity; advertised reset timestamps captured in rate-limit snapshots; current main and Spark meters; current reset-credit inventory.</p></article>
          <article class="card"><h3>What remains inferred</h3><p class="section-note">The cause of historical phase shifts; whether a retained stale timer can still fire; whether the billing cycle forces a universal re-sync; historical reset-credit redemption without before/after inventory snapshots.</p></article>
        </div>
      </section>
    </main>
  </div>
  <div class="tooltip" id="tooltip"></div>
  <div class="toast" id="toast"></div>

  <script>
  const DATA = __DATA__;
  (function () {
    'use strict';
    const HOUR = 3600000;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const NZ = 'Pacific/Auckland';
    const STATE_KEY = 'codex-reset-forensics-scenario-v2';
    const $ = function (id) { return document.getElementById(id); };
    const tooltip = $('tooltip');
    const toast = $('toast');
    const baseNow = Date.parse(DATA.account.refreshedAt || DATA.generatedAt);
    const weekStart = Date.parse(DATA.account.main.windowStart);
    const backendReset = DATA.account.main.resetsAt * 1000;
    const modeMultiplier = { heavy: 2.3, light: 0.35, pause: 0, steady: 1 };
    let suppressGraphClick = false;
    let draggingReset = null;

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function round(value, places) { const power = Math.pow(10, places || 0); return Math.round(value * power) / power; }
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]; }); }
    function formatTokens(value) {
      const n = Number(value) || 0;
      if (n >= 1000000000) return (n / 1000000000).toFixed(n >= 10000000000 ? 1 : 2) + 'B';
      if (n >= 1000000) return (n / 1000000).toFixed(n >= 100000000 ? 0 : 1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
      return n.toLocaleString('en-NZ');
    }
    function nzDate(ms, withTime) {
      const options = withTime
        ? { timeZone: NZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
        : { timeZone: NZ, day: '2-digit', month: 'short' };
      return new Intl.DateTimeFormat('en-NZ', options).format(new Date(ms));
    }
    function nzFull(ms) { return new Intl.DateTimeFormat('en-NZ', { timeZone: NZ, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)); }
    function localInput(ms) {
      const d = new Date(ms);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }
    function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
    function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.setTimeout(function () { toast.classList.remove('show'); }, 1800); }
    function showTip(event, html) { tooltip.innerHTML = html; tooltip.style.left = event.clientX + 'px'; tooltip.style.top = event.clientY + 'px'; tooltip.classList.add('show'); }
    function hideTip() { tooltip.classList.remove('show'); }

    function previousWindowCalibration() {
      const endDate = new Date(weekStart).toISOString().slice(0, 10);
      const endMs = Date.parse(endDate + 'T00:00:00Z') + DAY;
      return DATA.officialDaily.filter(function (row) {
        const ms = Date.parse(row.date + 'T00:00:00Z');
        return ms >= endMs - 7 * DAY && ms < endMs;
      }).reduce(function (sum, row) { return sum + row.tokens; }, 0) || DATA.account.peakDailyTokens * 3;
    }

    const defaults = {
      version: 2,
      currentUsed: DATA.account.main.usedPercent,
      forecastDays: 35,
      baseBurnPerDay: 14,
      tokenCalibration: previousWindowCalibration(),
      useHistoricalRhythm: true,
      applyBillingResets: false,
      applyWatchResets: false,
      manualResets: [],
      usageBlocks: []
    };
    let state = loadState();

    function loadState() {
      try {
        const stored = JSON.parse(localStorage.getItem(STATE_KEY));
        if (stored && stored.version === 2) return Object.assign({}, defaults, stored);
      } catch (error) {}
      return JSON.parse(JSON.stringify(defaults));
    }
    function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    function commit() { saveState(); renderOverview(); renderLab(); renderScenarioLists(); syncControls(); }

    function buildRhythm() {
      const sums = Array(168).fill(0);
      const counts = Array(168).fill(0);
      DATA.hourlyUsage.forEach(function (row) {
        if (!Number.isFinite(row.estimatedDashboardTokens)) return;
        const date = new Date(Date.parse(row.hour));
        const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ, weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(date);
        const weekday = parts.find(function (part) { return part.type === 'weekday'; }).value;
        const hour = Number(parts.find(function (part) { return part.type === 'hour'; }).value) % 24;
        const dayIndex = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(weekday);
        if (dayIndex < 0) return;
        const index = dayIndex * 24 + hour;
        sums[index] += row.estimatedDashboardTokens;
        counts[index] += 1;
      });
      const averages = sums.map(function (value, index) { return counts[index] ? value / counts[index] : 0; });
      const active = averages.filter(function (value) { return value > 0; });
      const mean = active.reduce(function (sum, value) { return sum + value; }, 0) / Math.max(1, active.length);
      return averages.map(function (value) { return value ? clamp(value / mean, 0.05, 3.5) : 0.05; });
    }
    const rhythm = buildRhythm();

    function rhythmAt(ms) {
      if (!state.useHistoricalRhythm) return 1;
      const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ, weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(new Date(ms));
      const day = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(parts.find(function (part) { return part.type === 'weekday'; }).value);
      const hour = Number(parts.find(function (part) { return part.type === 'hour'; }).value) % 24;
      return rhythm[Math.max(0, day) * 24 + hour] || 0.05;
    }

    function blockAt(ms) {
      const matches = state.usageBlocks.filter(function (block) { return ms >= block.start && ms < block.end; });
      return matches.length ? modeMultiplier[matches[matches.length - 1].mode] : null;
    }

    function simulate() {
      const start = baseNow;
      const end = start + state.forecastDays * DAY;
      let capacity = clamp(100 - Number(state.currentUsed), 0, 100);
      let nextScheduled = backendReset;
      while (nextScheduled < start) nextScheduled += WEEK;
      let utilized = 0;
      let stranded = 0;
      let unmet = 0;
      let availableHours = 0;
      let resetCount = 0;
      const resetEvents = [];
      const manual = state.manualResets.slice().filter(function (item) { return item.at >= start && item.at <= end; }).sort(function (a, b) { return a.at - b.at; });
      const billing = state.applyBillingResets ? DATA.billingAnchors.map(function (item) { return { at: Number(item.timestampMs) || Date.parse(item.timestamp), kind: 'billing' }; }).filter(function (item) { return Number.isFinite(item.at) && item.at >= start && item.at <= end; }) : [];
      const watches = state.applyWatchResets ? DATA.predictions.candidates.filter(function (item) { return item.timestampMs >= start && item.timestampMs <= end && item.timestampMs !== backendReset; }).map(function (item) { return { at: item.timestampMs, kind: 'watch' }; }) : [];
      const discretionary = manual.map(function (item) { return { at: item.at, kind: 'manual', id: item.id }; }).concat(billing, watches).sort(function (a, b) { return a.at - b.at; });
      let discretionaryIndex = 0;
      const points = [{ at: start, capacity: capacity, burn: 0 }];

      function applyReset(at, kind) {
        stranded += capacity;
        capacity = 100;
        resetCount += 1;
        resetEvents.push({ at: at, kind: kind });
        if (kind !== 'scheduled') nextScheduled = at + WEEK;
      }

      for (let at = start + HOUR; at <= end; at += HOUR) {
        while (discretionaryIndex < discretionary.length && discretionary[discretionaryIndex].at <= at) {
          const event = discretionary[discretionaryIndex++];
          applyReset(event.at, event.kind);
        }
        while (nextScheduled <= at) {
          applyReset(nextScheduled, 'scheduled');
          nextScheduled += WEEK;
        }
        const override = blockAt(at);
        const multiplier = override == null ? rhythmAt(at) : override;
        const demand = Math.max(0, Number(state.baseBurnPerDay)) / 24 * multiplier;
        const actual = Math.min(capacity, demand);
        capacity -= actual;
        utilized += actual;
        unmet += demand - actual;
        if (capacity > 0) availableHours += 1;
        points.push({ at: at, capacity: capacity, burn: actual });
      }
      const efficiencyDenominator = utilized + stranded;
      return {
        start: start,
        end: end,
        points: points,
        resetEvents: resetEvents,
        utilized: utilized,
        stranded: stranded,
        unmet: unmet,
        resetCount: resetCount,
        endCapacity: capacity,
        efficiency: efficiencyDenominator ? utilized / efficiencyDenominator * 100 : 100,
        availability: availableHours / Math.max(1, points.length - 1) * 100,
        estimatedTokens: utilized / 100 * Number(state.tokenCalibration)
      };
    }

    function decision() {
      const remaining = clamp(100 - Number(state.currentUsed), 0, 100);
      const earliest = DATA.predictions.earliestCredible;
      const hoursToWatch = earliest ? (earliest.timestampMs - baseNow) / HOUR : Infinity;
      if (remaining <= 0) return { action: 'PAUSE', headline: 'The main lane is depleted.', rationale: 'Preserve planning and research for surfaces that do not consume this allowance until the next credible reset.' };
      if (remaining <= 30) return { action: 'EASE OFF', headline: 'The stop threshold has been reached.', rationale: 'Keep the remaining capacity for high-value execution. The background forensic goal should stop at this point.' };
      if (hoursToWatch > 0 && hoursToWatch < 48 && remaining >= 55) return { action: 'GO HARD', headline: 'Front-load valuable work before the watch window.', rationale: 'There is ' + round(remaining, 0) + '% remaining and an earlier phase candidate in ' + round(hoursToWatch, 1) + ' hours. Its confidence is only ' + Math.round(earliest.score * 100) + '%, so treat this as risk-weighted advice, not certainty.' };
      if (remaining < 45) return { action: 'EASE OFF', headline: 'Protect the final working reserve.', rationale: 'Capacity is below the preferred working buffer and the strongest reset remains the backend deadline.' };
      return { action: 'STEADY', headline: 'Use the lane normally and preserve optionality.', rationale: 'There is no high-confidence reason to force an immediate burn. Keep manual credits unspent unless a planned work block justifies shifting the phase.' };
    }

    function renderOverview() {
      const advice = decision();
      const remaining = clamp(100 - Number(state.currentUsed), 0, 100);
      $('actionPill').textContent = advice.action;
      $('decisionHeadline').textContent = advice.headline;
      $('decisionRationale').textContent = advice.rationale;
      $('remainingValue').textContent = round(remaining, 0) + '%';
      $('remainingSub').textContent = round(state.currentUsed, 0) + '% used on the latest captured main meter';
      $('likelyReset').textContent = nzDate(DATA.predictions.mostLikely.timestampMs, true);
      $('likelyConfidence').textContent = Math.round(DATA.predictions.mostLikely.score * 100) + '% model confidence / current backend deadline';
      $('watchReset').textContent = nzDate(DATA.predictions.earliestCredible.timestampMs, true);
      $('watchConfidence').textContent = Math.round(DATA.predictions.earliestCredible.score * 100) + '% watch confidence / historical phase projection';
      $('creditCount').textContent = DATA.account.resetCredits.length;
      const firstExpiry = DATA.account.resetCredits.slice().sort(function (a, b) { return Date.parse(a.expiresAtIso) - Date.parse(b.expiresAtIso); })[0];
      $('creditExpiry').textContent = firstExpiry ? 'first expires ' + nzDate(Date.parse(firstExpiry.expiresAtIso), false) : 'none available';
      $('stopRuleStatus').textContent = remaining <= 30 ? 'STOP NOW: ' + round(remaining, 0) + '% remaining' : 'Goal stop rule armed: stop at 30% remaining';

      const candidates = DATA.predictions.candidates.slice().sort(function (a, b) { return a.timestampMs - b.timestampMs; }).filter(function (item) { return item.timestampMs >= baseNow; }).slice(0, 8);
      $('candidateList').innerHTML = candidates.map(function (item) {
        const cls = item.score >= .7 ? 'high' : item.score >= .22 ? 'watch' : 'low';
        return '<div class="candidate"><div class="candidate-time">' + escapeHtml(nzDate(item.timestampMs, true)) + '</div><div><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.evidence.map(function (e) { return e.basis; }).join(' / ')) + '</small></div><span class="badge ' + cls + '">' + Math.round(item.score * 100) + '%</span></div>';
      }).join('');
    }

    function renderHistory() {
      const rows = DATA.officialDaily;
      const width = 1400;
      const height = 520;
      const left = 82;
      const right = 28;
      const top = 46;
      const bottom = 72;
      const plotW = width - left - right;
      const plotH = height - top - bottom;
      const start = Date.parse(rows[0].date + 'T00:00:00Z');
      const end = Date.parse(rows[rows.length - 1].date + 'T00:00:00Z') + DAY;
      const max = Math.max.apply(null, rows.map(function (row) { return row.tokens; })) * 1.08;
      const x = function (ms) { return left + (ms - start) / (end - start) * plotW; };
      const y = function (value) { return top + plotH - value / max * plotH; };
      let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Historical Codex token usage and reset transitions">';

      let monthCursor = new Date(start);
      monthCursor.setUTCDate(1);
      let monthIndex = 0;
      while (monthCursor.getTime() < end) {
        const next = new Date(monthCursor); next.setUTCMonth(next.getUTCMonth() + 1);
        const mStart = Math.max(start, monthCursor.getTime());
        const mEnd = Math.min(end, next.getTime());
        svg += '<rect class="month-band' + (monthIndex % 2 ? ' alt' : '') + '" x="' + x(mStart) + '" y="' + top + '" width="' + Math.max(0, x(mEnd) - x(mStart)) + '" height="' + plotH + '"></rect>';
        svg += '<text class="axis-title" x="' + (x(mStart) + 8) + '" y="' + (top + 18) + '">' + monthCursor.toLocaleString('en-NZ', { month: 'long', timeZone: 'UTC' }) + '</text>';
        monthCursor = next; monthIndex += 1;
      }
      for (let i = 0; i <= 4; i += 1) {
        const value = max * i / 4;
        const py = y(value);
        svg += '<line class="grid-line" x1="' + left + '" y1="' + py + '" x2="' + (width - right) + '" y2="' + py + '"></line>';
        svg += '<text class="axis-label" text-anchor="end" x="' + (left - 10) + '" y="' + (py + 4) + '">' + formatTokens(value) + '</text>';
      }
      const barW = plotW / rows.length * .72;
      rows.forEach(function (row) {
        const ms = Date.parse(row.date + 'T00:00:00Z');
        const px = x(ms + DAY / 2) - barW / 2;
        const py = y(row.tokens);
        svg += '<rect class="hist-bar tip-target" data-tip="' + escapeHtml(row.date + ': ' + row.tokens.toLocaleString('en-NZ') + ' official tokens; local raw ratio ' + (row.rawToOfficialRatio == null ? 'n/a' : row.rawToOfficialRatio + 'x')) + '" x="' + px + '" y="' + py + '" width="' + barW + '" height="' + (top + plotH - py) + '" rx="2"></rect>';
      });
      const hourly = DATA.hourlyUsage.filter(function (row) { return Number.isFinite(row.estimatedDashboardTokens); });
      const path = hourly.map(function (row, index) {
        const ms = Date.parse(row.hour);
        return (index ? 'L' : 'M') + x(ms) + ',' + y(row.estimatedDashboardTokens);
      }).join(' ');
      svg += '<path class="hour-line" d="' + path + '"></path>';

      DATA.events.filter(function (event) { return event.logicalLane === 'main' && event.inferredAtMs >= start && event.inferredAtMs <= end; }).forEach(function (event) {
        const color = event.competing ? '#7d8790' : event.cause === 'scheduled-window-reset' ? '#17845b' : event.cause.indexOf('manual') >= 0 ? '#dc6d31' : '#c49520';
        const px = x(event.inferredAtMs);
        const tip = nzFull(event.inferredAtMs) + ' | ' + event.timingClass + ' | ' + event.cause + ' | confidence ' + Math.round(event.eventConfidence * 100) + '%';
        svg += '<line class="reset-line tip-target' + (event.competing ? ' competing' : '') + '" data-tip="' + escapeHtml(tip) + '" style="stroke:' + color + '" x1="' + px + '" y1="' + top + '" x2="' + px + '" y2="' + (top + plotH) + '"></line>';
        svg += '<path class="tip-target" data-tip="' + escapeHtml(tip) + '" fill="' + color + '" d="M' + (px - 5) + ',' + top + ' L' + (px + 5) + ',' + top + ' L' + px + ',' + (top + 10) + ' Z"></path>';
      });
      const currentPx = x(weekStart);
      svg += '<line class="current-line tip-target" data-tip="Observed current window start: ' + escapeHtml(nzFull(weekStart)) + '" x1="' + currentPx + '" y1="' + top + '" x2="' + currentPx + '" y2="' + (top + plotH) + '"></line>';
      for (let ms = start; ms <= end; ms += 7 * DAY) svg += '<text class="axis-label" text-anchor="middle" x="' + x(ms) + '" y="' + (height - 35) + '">' + new Date(ms).toISOString().slice(5, 10) + '</text>';
      svg += '<text class="axis-title" transform="rotate(-90 18 ' + (top + plotH / 2) + ')" x="18" y="' + (top + plotH / 2) + '">Official tokens per UTC day</text>';
      svg += '<text class="axis-label" x="' + left + '" y="' + (height - 10) + '">Blue bars: official daily totals / gold line: normalized hourly shape / green: scheduled / orange: early or manual candidate / grey dashed: competing / red: current start</text>';
      svg += '</svg>';
      $('historyChart').innerHTML = svg;
      bindTips($('historyChart'));
    }

    function renderHourChart(day) {
      const rows = DATA.hourlyUsage.filter(function (row) { return row.utcDate === day && Number.isFinite(row.estimatedDashboardTokens); }).sort(function (a, b) { return Date.parse(a.hour) - Date.parse(b.hour); });
      const width = 960, height = 310, left = 66, right = 20, top = 26, bottom = 56;
      const plotW = width - left - right, plotH = height - top - bottom;
      const max = Math.max(1, Math.max.apply(null, rows.map(function (row) { return row.estimatedDashboardTokens; })) * 1.08);
      let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Hourly estimated usage">';
      for (let i = 0; i <= 4; i += 1) {
        const value = max * i / 4;
        const py = top + plotH - value / max * plotH;
        svg += '<line class="grid-line" x1="' + left + '" y1="' + py + '" x2="' + (width - right) + '" y2="' + py + '"></line><text class="axis-label" text-anchor="end" x="' + (left - 8) + '" y="' + (py + 4) + '">' + formatTokens(value) + '</text>';
      }
      const barW = rows.length ? plotW / rows.length * .72 : 0;
      rows.forEach(function (row, index) {
        const px = left + index / Math.max(1, rows.length) * plotW + (plotW / Math.max(1, rows.length) - barW) / 2;
        const value = row.estimatedDashboardTokens;
        const py = top + plotH - value / max * plotH;
        const label = nzFull(Date.parse(row.hour)) + ' | estimated ' + value.toLocaleString('en-NZ') + ' dashboard tokens | raw ' + row.tokens.toLocaleString('en-NZ') + ' | ' + row.events + ' model calls';
        svg += '<rect class="hist-bar tip-target" data-tip="' + escapeHtml(label) + '" x="' + px + '" y="' + py + '" width="' + barW + '" height="' + (top + plotH - py) + '" rx="3"></rect>';
        if (index % 3 === 0) svg += '<text class="axis-label" text-anchor="middle" x="' + (px + barW / 2) + '" y="' + (height - 27) + '">' + nzDate(Date.parse(row.hour), true).split(', ').pop() + '</text>';
      });
      if (!rows.length) svg += '<text class="axis-label" text-anchor="middle" x="' + (width / 2) + '" y="' + (height / 2) + '">No local hourly telemetry for this official day.</text>';
      svg += '<text class="axis-title" x="' + left + '" y="' + (height - 8) + '">Pacific/Auckland hour; the UTC day may cross two local dates</text></svg>';
      $('hourChart').innerHTML = svg;
      bindTips($('hourChart'));
      const total = rows.reduce(function (sum, row) { return sum + row.estimatedDashboardTokens; }, 0);
      const peak = rows.slice().sort(function (a, b) { return b.estimatedDashboardTokens - a.estimatedDashboardTokens; })[0];
      const calls = rows.reduce(function (sum, row) { return sum + row.events; }, 0);
      $('hourSummary').innerHTML = '<span>Estimated total ' + formatTokens(total) + '</span><span>Model calls ' + calls.toLocaleString('en-NZ') + '</span>' + (peak ? '<span>Peak ' + escapeHtml(nzFull(Date.parse(peak.hour))) + ' / ' + formatTokens(peak.estimatedDashboardTokens) + '</span>' : '');
    }

    function renderHeatmap() {
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const max = Math.max.apply(null, rhythm);
      let html = '<div></div>';
      for (let hour = 0; hour < 24; hour += 1) html += '<div class="heat-hour">' + String(hour).padStart(2, '0') + '</div>';
      days.forEach(function (day, dayIndex) {
        html += '<div class="heat-label">' + day + '</div>';
        for (let hour = 0; hour < 24; hour += 1) {
          const value = rhythm[dayIndex * 24 + hour];
          const opacity = .08 + value / max * .82;
          html += '<div class="heat-cell tip-target" style="--heat:' + opacity.toFixed(3) + '" data-tip="' + day + ' ' + String(hour).padStart(2, '0') + ':00 NZ / ' + value.toFixed(2) + 'x average"></div>';
        }
      });
      $('heatmap').innerHTML = html;
      bindTips($('heatmap'));
      const indexed = rhythm.map(function (value, index) { return { value: value, index: index }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 3);
      $('primeWindow').textContent = 'Strongest historical windows: ' + indexed.map(function (item) { return days[Math.floor(item.index / 24)] + ' ' + String(item.index % 24).padStart(2, '0') + ':00 (' + item.value.toFixed(2) + 'x)'; }).join(', ') + '.';
    }

    function renderForecast(sim) {
      const width = 1400, height = 520, left = 70, right = 34, top = 54, bottom = 72;
      const plotW = width - left - right, plotH = height - top - bottom;
      const x = function (ms) { return left + (ms - sim.start) / (sim.end - sim.start) * plotW; };
      const y = function (value) { return top + (100 - value) / 100 * plotH; };
      let svg = '<svg id="forecastSvg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Interactive future capacity forecast">';
      let monthCursor = new Date(sim.start); monthCursor.setUTCDate(1); monthCursor.setUTCHours(0,0,0,0);
      let monthIndex = 0;
      while (monthCursor.getTime() < sim.end) {
        const next = new Date(monthCursor); next.setUTCMonth(next.getUTCMonth() + 1);
        const start = Math.max(sim.start, monthCursor.getTime()), end = Math.min(sim.end, next.getTime());
        svg += '<rect class="month-band' + (monthIndex % 2 ? ' alt' : '') + '" x="' + x(start) + '" y="' + top + '" width="' + Math.max(0, x(end) - x(start)) + '" height="' + plotH + '"></rect>';
        svg += '<text class="axis-title" x="' + (x(start) + 7) + '" y="' + (top + 17) + '">' + monthCursor.toLocaleString('en-NZ', { timeZone: NZ, month: 'long' }) + '</text>';
        monthCursor = next; monthIndex += 1;
      }
      state.usageBlocks.forEach(function (block) {
        const start = Math.max(sim.start, block.start), end = Math.min(sim.end, block.end);
        if (end > start) svg += '<rect class="usage-block ' + escapeHtml(block.mode) + ' tip-target" data-tip="' + escapeHtml(block.mode + ' usage: ' + nzFull(block.start) + ' to ' + nzFull(block.end)) + '" x="' + x(start) + '" y="' + top + '" width="' + (x(end) - x(start)) + '" height="' + plotH + '"></rect>';
      });
      for (let value = 0; value <= 100; value += 25) {
        svg += '<line class="grid-line" x1="' + left + '" y1="' + y(value) + '" x2="' + (width - right) + '" y2="' + y(value) + '"></line><text class="axis-label" text-anchor="end" x="' + (left - 9) + '" y="' + (y(value) + 4) + '">' + value + '%</text>';
      }
      svg += '<line class="threshold-line tip-target" data-tip="Goal stop threshold: 30% remaining" x1="' + left + '" y1="' + y(30) + '" x2="' + (width - right) + '" y2="' + y(30) + '"></line>';

      DATA.predictions.candidates.filter(function (item) { return item.timestampMs >= sim.start && item.timestampMs <= sim.end; }).forEach(function (item, index) {
        const px = x(item.timestampMs);
        const cls = item.timestampMs === backendReset ? 'official-line' : item.label === 'Billing-week anchor' ? 'billing-line' : 'candidate-line';
        const tip = item.label + ' | ' + nzFull(item.timestampMs) + ' | ' + Math.round(item.score * 100) + '% confidence | ' + item.evidence.map(function (e) { return e.basis; }).join(' / ');
        svg += '<line class="' + cls + ' tip-target" data-tip="' + escapeHtml(tip) + '" x1="' + px + '" y1="' + top + '" x2="' + px + '" y2="' + (top + plotH) + '"></line>';
        if (item.score >= .27 || item.timestampMs === backendReset) svg += '<text class="axis-label" text-anchor="start" transform="rotate(-45 ' + (px + 4) + ' ' + (top + 45 + index % 2 * 16) + ')" x="' + (px + 4) + '" y="' + (top + 45 + index % 2 * 16) + '">' + Math.round(item.score * 100) + '% ' + escapeHtml(item.label) + '</text>';
      });
      const line = sim.points.map(function (point, index) { return (index ? 'L' : 'M') + x(point.at) + ',' + y(point.capacity); }).join(' ');
      const area = line + ' L' + x(sim.end) + ',' + y(0) + ' L' + x(sim.start) + ',' + y(0) + ' Z';
      svg += '<path class="forecast-area" d="' + area + '"></path><path class="forecast-line" d="' + line + '"></path>';
      state.manualResets.filter(function (item) { return item.at >= sim.start && item.at <= sim.end; }).forEach(function (item) {
        const px = x(item.at);
        svg += '<line class="manual-line" x1="' + px + '" y1="' + top + '" x2="' + px + '" y2="' + (top + plotH) + '"></line><circle class="manual-marker tip-target" data-reset-id="' + escapeHtml(item.id) + '" data-tip="Hypothetical manual reset / drag to move / ' + escapeHtml(nzFull(item.at)) + '" cx="' + px + '" cy="' + (top + 10) + '" r="8"></circle>';
      });
      const tickStep = state.forecastDays <= 21 ? 2 * DAY : state.forecastDays <= 42 ? 4 * DAY : 7 * DAY;
      for (let ms = sim.start; ms <= sim.end; ms += tickStep) svg += '<text class="axis-label" text-anchor="middle" x="' + x(ms) + '" y="' + (height - 34) + '">' + escapeHtml(nzDate(ms, false)) + '</text>';
      svg += '<text class="axis-title" transform="rotate(-90 18 ' + (top + plotH / 2) + ')" x="18" y="' + (top + plotH / 2) + '">Weekly capacity remaining</text><text class="axis-label" x="' + left + '" y="' + (height - 9) + '">Solid green: backend schedule / orange dashed: retained phase / gold dotted: billing hypothesis / red: your manual reset / horizontal red: 30% stop line</text></svg>';
      $('forecastChart').innerHTML = svg;
      bindTips($('forecastChart'));
      const element = $('forecastSvg');
      element.addEventListener('click', function (event) {
        if (suppressGraphClick || event.target.closest('.manual-marker')) return;
        const at = graphTimeFromEvent(event, element, sim);
        state.manualResets.push({ id: uid('reset'), at: at });
        showToast('Manual reset added at ' + nzFull(at));
        commit();
      });
      element.querySelectorAll('.manual-marker').forEach(function (marker) {
        marker.addEventListener('pointerdown', function (event) {
          event.preventDefault(); event.stopPropagation();
          draggingReset = { id: marker.getAttribute('data-reset-id'), svg: element, sim: sim };
          suppressGraphClick = true;
        });
      });
    }

    function graphTimeFromEvent(event, svg, sim) {
      const rect = svg.getBoundingClientRect();
      const viewX = (event.clientX - rect.left) / rect.width * 1400;
      const ratio = clamp((viewX - 70) / (1400 - 70 - 34), 0, 1);
      return Math.round((sim.start + ratio * (sim.end - sim.start)) / HOUR) * HOUR;
    }

    document.addEventListener('pointerup', function (event) {
      if (!draggingReset) return;
      const at = graphTimeFromEvent(event, draggingReset.svg, draggingReset.sim);
      const item = state.manualResets.find(function (reset) { return reset.id === draggingReset.id; });
      if (item) item.at = at;
      draggingReset = null;
      window.setTimeout(function () { suppressGraphClick = false; }, 80);
      commit();
    });

    function renderLab() {
      const sim = simulate();
      const metrics = [
        ['Quota utilized', round(sim.utilized, 0) + ' units'],
        ['Token estimate', formatTokens(sim.estimatedTokens)],
        ['Efficiency', round(sim.efficiency, 0) + '%'],
        ['Usable time', round(sim.availability, 0) + '%'],
        ['End capacity', round(sim.endCapacity, 0) + '%']
      ];
      $('labMetrics').innerHTML = metrics.map(function (item) { return '<div class="lab-stat"><small>' + item[0] + '</small><strong>' + item[1] + '</strong></div>'; }).join('');
      renderForecast(sim);
    }

    function renderScenarioLists() {
      const resets = state.manualResets.slice().sort(function (a, b) { return a.at - b.at; });
      $('resetList').innerHTML = resets.length ? resets.map(function (item) {
        return '<div class="scenario-row"><span class="scenario-kind">Manual</span><input class="reset-time" data-id="' + escapeHtml(item.id) + '" type="datetime-local" value="' + localInput(item.at) + '"><button class="remove-reset" data-id="' + escapeHtml(item.id) + '" aria-label="Remove reset">x</button></div>';
      }).join('') : '<p class="section-note">No hypothetical reset markers.</p>';
      $('usageList').innerHTML = state.usageBlocks.length ? state.usageBlocks.slice().sort(function (a, b) { return a.start - b.start; }).map(function (item) {
        return '<div class="scenario-row"><span class="scenario-kind">' + escapeHtml(item.mode) + '</span><span class="mono" style="font-size:11px">' + escapeHtml(nzFull(item.start)) + ' to ' + escapeHtml(nzFull(item.end)) + '</span><button class="remove-block" data-id="' + escapeHtml(item.id) + '" aria-label="Remove usage window">x</button></div>';
      }).join('') : '<p class="section-note">No overrides. Forecast follows the historical rhythm.</p>';
      document.querySelectorAll('.reset-time').forEach(function (input) { input.addEventListener('change', function () { const item = state.manualResets.find(function (reset) { return reset.id === input.getAttribute('data-id'); }); if (item) { item.at = Date.parse(input.value); commit(); } }); });
      document.querySelectorAll('.remove-reset').forEach(function (button) { button.addEventListener('click', function () { state.manualResets = state.manualResets.filter(function (item) { return item.id !== button.getAttribute('data-id'); }); commit(); }); });
      document.querySelectorAll('.remove-block').forEach(function (button) { button.addEventListener('click', function () { state.usageBlocks = state.usageBlocks.filter(function (item) { return item.id !== button.getAttribute('data-id'); }); commit(); }); });
    }

    function renderEvidence() {
      const source = DATA.source;
      const items = [
        [source.files.toLocaleString('en-NZ'), 'rollout files'],
        [source.tokenEvents.toLocaleString('en-NZ'), 'model-usage events'],
        [source.rateSnapshots.toLocaleString('en-NZ'), 'rate-limit snapshots'],
        [(DATA.conversationEvidenceSummary ? DATA.conversationEvidenceSummary.total : 0).toLocaleString('en-NZ'), 'quota-context conversation signals'],
        [(DATA.ignoredModelOnlyHandoffs || []).length.toLocaleString('en-NZ'), 'model-only handoffs ignored']
      ];
      $('sourceGrid').innerHTML = items.map(function (item) { return '<div class="source-item"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>'; }).join('');
      $('eventRows').innerHTML = DATA.events.slice().sort(function (a, b) { return a.inferredAtMs - b.inferredAtMs; }).map(function (event) {
        const cls = event.eventConfidence >= .75 ? 'high' : event.eventConfidence >= .4 ? 'watch' : 'low';
        return '<tr><td class="mono">' + escapeHtml(nzDate(event.inferredAtMs, true)) + '</td><td>' + escapeHtml(event.logicalLane) + '<br><small>' + escapeHtml(event.planType) + '</small></td><td class="mono">' + escapeHtml(event.previousAdvertisedReset ? nzDate(Date.parse(event.previousAdvertisedReset), true) : 'unknown') + '</td><td class="mono">' + escapeHtml(nzDate(Date.parse(event.newAdvertisedReset), true)) + '</td><td>' + escapeHtml(event.timingClass) + (event.competing ? '<br><span class="badge low">competing</span>' : '') + '</td><td class="cause">' + escapeHtml(event.cause) + '</td><td><span class="badge ' + cls + '">' + Math.round(event.eventConfidence * 100) + '%</span></td></tr>';
      }).join('');
    }

    function bindTips(root) {
      root.querySelectorAll('.tip-target').forEach(function (element) {
        element.addEventListener('pointerenter', function (event) { showTip(event, element.getAttribute('data-tip')); });
        element.addEventListener('pointermove', function (event) { tooltip.style.left = event.clientX + 'px'; tooltip.style.top = event.clientY + 'px'; });
        element.addEventListener('pointerleave', hideTip);
      });
    }

    function syncControls() {
      $('usedInput').value = state.currentUsed;
      $('daysInput').value = state.forecastDays;
      $('burnInput').value = state.baseBurnPerDay;
      $('tokenInput').value = Math.round(state.tokenCalibration);
      $('rhythmToggle').checked = state.useHistoricalRhythm;
      $('billingToggle').checked = state.applyBillingResets;
      $('watchToggle').checked = state.applyWatchResets;
    }

    function bindControls() {
      document.querySelectorAll('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          document.querySelectorAll('.tab').forEach(function (item) { item.classList.toggle('active', item === tab); });
          document.querySelectorAll('.panel').forEach(function (panel) { panel.classList.toggle('active', panel.id === 'panel-' + tab.getAttribute('data-tab')); });
          history.replaceState(null, '', '#' + tab.getAttribute('data-tab'));
        });
      });
      [['usedInput','currentUsed'],['daysInput','forecastDays'],['burnInput','baseBurnPerDay'],['tokenInput','tokenCalibration']].forEach(function (binding) {
        $(binding[0]).addEventListener('change', function () { state[binding[1]] = Number($(binding[0]).value); commit(); });
      });
      [['rhythmToggle','useHistoricalRhythm'],['billingToggle','applyBillingResets'],['watchToggle','applyWatchResets']].forEach(function (binding) {
        $(binding[0]).addEventListener('change', function () { state[binding[1]] = $(binding[0]).checked; commit(); });
      });
      $('historyDay').addEventListener('change', function () { renderHourChart($('historyDay').value); });
      $('addResetNow').addEventListener('click', function () { state.manualResets.push({ id: uid('reset'), at: baseNow + DAY }); commit(); });
      $('clearResets').addEventListener('click', function () { state.manualResets = []; commit(); });
      $('blockForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const start = Date.parse($('blockStart').value), end = Date.parse($('blockEnd').value);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { showToast('Usage window end must be after its start.'); return; }
        state.usageBlocks.push({ id: uid('block'), start: start, end: end, mode: $('blockMode').value });
        commit();
      });
      $('exportScenario').addEventListener('click', function () {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scenario: state }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'codex-reset-scenario.json'; link.click(); URL.revokeObjectURL(link.href);
      });
      $('importScenario').addEventListener('change', function (event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = function () { try { const parsed = JSON.parse(reader.result); const incoming = parsed.scenario || parsed; state = Object.assign({}, defaults, incoming, { version: 2 }); commit(); showToast('Scenario imported.'); } catch (error) { showToast('That scenario file is not valid JSON.'); } }; reader.readAsText(file);
      });
      $('resetScenario').addEventListener('click', function () { if (window.confirm('Reset the forecast scenario to defaults?')) { state = JSON.parse(JSON.stringify(defaults)); commit(); } });
    }

    function initialize() {
      $('snapshotStamp').innerHTML = '<strong>STATIC BACKEND SNAPSHOT</strong>' + escapeHtml(nzFull(Date.parse(DATA.account.refreshedAt))) + ' NZ<br>Main ' + DATA.account.main.usedPercent + '% used / Spark ' + DATA.account.spark.usedPercent + '% used<br>Update the meter in Forecast Lab as it changes.';
      const peakDay = DATA.officialDaily.slice().sort(function (a, b) { return b.tokens - a.tokens; })[0];
      $('historyDay').value = peakDay.date;
      $('blockStart').value = localInput(baseNow + 6 * HOUR);
      $('blockEnd').value = localInput(baseNow + 18 * HOUR);
      bindControls();
      renderOverview(); renderHistory(); renderHourChart(peakDay.date); renderHeatmap(); renderLab(); renderScenarioLists(); renderEvidence(); syncControls();
      const hash = location.hash.replace('#', '');
      if (hash && document.querySelector('.tab[data-tab="' + hash + '"]')) document.querySelector('.tab[data-tab="' + hash + '"]').click();
    }
    initialize();
  })();
  </script>
</body>
</html>`;

const html = template.replace("__DATA__", safeJson);
fs.writeFileSync(outputPath, html, "utf8");
const docsPath = path.join(root, "docs");
fs.mkdirSync(docsPath, { recursive: true });
fs.writeFileSync(path.join(docsPath, "index.html"), html, "utf8");
fs.copyFileSync(dataPath, path.join(docsPath, "openai-reset-forensics-data.json"));
fs.copyFileSync(path.join(root, "outputs", "openai-reset-forensics-report.md"), path.join(docsPath, "openai-reset-forensics-report.md"));
console.log(JSON.stringify({ outputPath, docsPath, bytes: Buffer.byteLength(html), records: { daily: data.officialDaily.length, hourly: data.hourlyUsage.length, events: data.events.length, predictions: data.predictions.candidates.length }, liveUsedPercent: data.account.main.usedPercent }, null, 2));
