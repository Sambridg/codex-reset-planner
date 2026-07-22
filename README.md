# Codex Reset Planner

An unofficial, evidence-ranked timeline and scenario planner for investigating Codex weekly usage windows.

The app combines official daily usage totals with local rollout telemetry, advertised reset deadlines, inferred quota-lane transitions, billing-cycle hypotheses, and manual scenario controls. It is designed to distinguish observed facts from competing reset theories.

## Reset identity rule

Reset events are reconstructed by quota lane, using the backend limit ID and plan. Model names are observation sources only. Switching models does not create a reset event, and model-only handoffs are explicitly discarded.

Spark is shown separately only when the backend reports the separate `codex_bengalfox` limit ID.

## Public app

GitHub Pages serves the sanitized static app from `docs/`:

<https://sambridg.github.io/codex-reset-planner/>

## Repository layout

- `docs/index.html`: standalone planner and visualization.
- `docs/openai-reset-forensics-data.json`: sanitized evidence dataset.
- `docs/openai-reset-forensics-report.md`: generated forensic report.
- `work/build-reset-forensics.mjs`: local evidence extraction and reset reconstruction.
- `work/build-reset-planner.mjs`: standalone dashboard generator.
- `work/probe-codex-account-latest.mjs`: read-only current-account probe for a local Codex app-server.

## Build

```powershell
npm run build
```

The forensic build is machine-specific. It scans local Codex rollout files under the current user's `.codex` directory and uses the configured historical date range and account snapshot. The planner build can be run independently after a data file exists:

```powershell
npm run build:planner
```

Run the dependency-free regression suite with:

```powershell
npm test
```

The tests cover Pacific/Auckland daylight-saving transitions, quota-lane identity, model-only handoff rejection, and public-data sanitization.

The account probe uses the locally installed Codex CLI. Set `CODEX_EXECUTABLE` only when an alternate installation should be used; the probe never downloads a package automatically.

## Privacy boundary

The published dataset contains aggregate counts and confidence-ranked signals. Raw conversation excerpts, session identifiers, local file paths, authentication data, and API credentials are excluded. The local `outputs/` directory is ignored by Git.

## Limitations

- Historical reset causes are inferred unless directly observed through the live account meter.
- Conversation statements are weak corroboration, never proof of a reset-button action.
- Daily account totals and raw local token telemetry are different accounting surfaces.
- Hourly dashboard-token values are normalized estimates, not an official hourly ledger.
- Billing-cycle re-synchronization remains a hypothesis.
- This project is not affiliated with or endorsed by OpenAI.
