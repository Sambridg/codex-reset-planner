# Codex Reset and Usage Forensics

Generated: 23 Jul 2026, 07:00:21

## Operational answer

**EASE OFF: Reserve capacity for high-value actions until the next credible reset.**

The main allowance is 71% used and 29% remains. The current backend deadline is **29 Jul 2026, 09:19**. The model's earliest credible surprise-reset candidate is **23 Jul 2026, 13:01**, while the highest-confidence date remains **29 Jul 2026, 09:19**.

Recommended operating target: use valuable capacity aggressively but retain roughly **18%** until the earliest credible surprise window is resolved.

## Executive findings

- Historical schedule claims are recoverable at quota-lane granularity. 26 quota-window claims were reconstructed from 40 model observations and 171,703 rate snapshots.
- 3 model-only handoffs were deliberately excluded from reset inference. A model change is not a reset event.
- 4 clean main-lane transitions followed a prior deadline within six hours. This confirms that an offset reset can establish a real seven-day phase for at least one following cycle.
- 9 clean main-lane transitions occurred materially before the previously advertised deadline. Their existence is confirmed; manual versus automatic cause is usually not recorded.
- Conversation statements are corroborating evidence only. Plans, refusals, and retrospective discussion are never treated as proof that a reset occurred.
- Spark is separate only because the backend exposes the distinct `codex_bengalfox` limit ID. Model names alone never split a reset lane.
- The account history is daily, while local rollout events provide hourly activity shape. Raw local telemetry totals 2.29x the dashboard ledger across the overlap because they are different accounting surfaces. Hourly dashboard-token values are estimates produced by normalizing each UTC day's local shape to its official daily total.

## Current reset conflict

The current main window is anchored at **22 Jul 2026, 09:19:23** and advertises **29 Jul 2026, 09:19:23**.

A historical main-lane claim advertised **22 Jul 2026, 08:35:33**. Today's observed reset followed that older timer by approximately 0.73 hours.

A competing later claim advertised **25 Jul 2026, 15:26:23**. Today's reset occurred 78.12 hours before it. This is strong evidence that the single date shown in the product is not sufficient for forecasting, but it does not prove that every historical timer remains live.

## Reset-event ledger

| Inferred event | Timing | Prior deadline | New deadline | Delta | Confidence | Cause |
| --- | --- | --- | --- | --- | --- | --- |
| 24 May 2026, 08:33 | early-phase-shift | 27 May 2026, 08:43 | 31 May 2026, 08:33 | -72.16 h | 88% | unknown-system-or-hidden-lane |
| 31 May 2026, 10:34 | on-schedule | 31 May 2026, 08:33 | 7 Jun 2026, 10:34 | 2.02 h | 88% | scheduled-window-reset |
| 4 Jun 2026, 13:54 | early-phase-shift | 8 Jun 2026, 05:40 | 11 Jun 2026, 13:54 | -87.76 h | 88% | billing-phase-candidate |
| 11 Jun 2026, 13:55 | on-schedule | 11 Jun 2026, 13:54 | 18 Jun 2026, 13:55 | 0.01 h | 88% | scheduled-window-reset |
| 16 Jun 2026, 10:32 | early-phase-shift | 18 Jun 2026, 13:55 | 23 Jun 2026, 10:32 | -51.39 h | 88% | unknown-system-or-hidden-lane |
| 18 Jun 2026, 10:00 | early-phase-shift | 23 Jun 2026, 10:32 | 25 Jun 2026, 10:00 | -120.53 h | 88% | unknown-system-or-hidden-lane |
| 25 Jun 2026, 13:01 | on-schedule | 25 Jun 2026, 10:00 | 2 Jul 2026, 13:01 | 3.01 h | 88% | scheduled-window-reset |
| 29 Jun 2026, 18:37 | early-phase-shift | 2 Jul 2026, 13:01 | 6 Jul 2026, 18:37 | -66.38 h | 88% | unknown-system-or-hidden-lane |
| 30 Jun 2026, 14:49 | early-phase-shift | 6 Jul 2026, 18:37 | 7 Jul 2026, 14:49 | -147.8 h | 88% | unknown-system-or-hidden-lane |
| 7 Jul 2026, 17:02 | on-schedule | 7 Jul 2026, 14:49 | 14 Jul 2026, 17:02 | 2.21 h | 88% | scheduled-window-reset |
| 15 Jul 2026, 08:35 | early-phase-shift | 21 Jul 2026, 21:57 | 22 Jul 2026, 08:35 | -157.37 h | 88% | billing-phase-candidate |
| 18 Jul 2026, 15:26 | early-phase-shift | 25 Jul 2026, 10:45 | 25 Jul 2026, 15:26 | -163.31 h | 88% | unknown-system-or-hidden-lane |
| 22 Jul 2026, 09:19 | early-phase-shift | 27 Jul 2026, 22:36 | 29 Jul 2026, 09:19 | -133.28 h | 99% | automatic-reset-observed-credit-unchanged |

## Billing-cycle hypothesis

Billing-week anchors were generated from the surviving reset credit granted on 14 July at 05:34 NZ and projected at seven-day intervals inside each billing month. Events within 36 hours are marked as billing candidates, not confirmations.

June 14 does not show a clean universal main reset: the dominant main claim continued to advertise June 18. July 14 contains several competing quota-schedule observations. The July 22 event is consistent with a July 21 billing-week anchor after an idle/first-use delay, but retained session schedules remain a competing explanation.

## Current prediction candidates

| Candidate | Score | Band | Evidence |
| --- | --- | --- | --- |
| 23 Jul 2026, 13:01 | 28% | watch | Historical phase continuation |
| 23 Jul 2026, 13:55 | 28% | watch | Historical phase continuation |
| 23 Jul 2026, 16:54 | 16% | watch | Main-lane retained deadline |
| 25 Jul 2026, 08:38 | 17% | watch | Main-lane retained deadline |
| 25 Jul 2026, 10:45 | 17% | watch | Main-lane retained deadline |
| 25 Jul 2026, 15:26 | 35% | watch | Main-lane retained deadline |
| 26 Jul 2026, 10:34 | 28% | watch | Historical phase continuation |
| 27 Jul 2026, 22:36 | 29% | watch | Main-lane retained deadline |
| 28 Jul 2026, 05:34 | 34% | watch | Billing-week anchor |
| 28 Jul 2026, 17:02 | 28% | watch | Historical phase continuation |
| 29 Jul 2026, 09:19 | 92% | high | Current backend deadline; Main-lane retained deadline |
| 4 Aug 2026, 05:34 | 34% | watch | Billing-week anchor |

## Token-accounting comparison

| UTC day | Official tokens | Local raw tokens | Raw / official |
| --- | --- | --- | --- |
| 2026-07-16 | 562,180,597 | 2,180,131,959 | 3.878x |
| 2026-07-17 | 331,402,671 | 6,547,232,783 | 19.756x |
| 2026-07-18 | 346,308,858 | 327,129,445 | 0.945x |
| 2026-07-19 | 484,961,707 | 455,996,328 | 0.94x |
| 2026-07-20 | 12,956,733 | 50,230,628 | 3.877x |
| 2026-07-21 | 87,878 | 55,295,724 | 629.233x |

## Manual-reset attribution

No historical reset-credit redemption transaction is exposed in the available app-server history or rollout events. Generic `credits` fields in old token events are not the reset bank. A historical event is therefore labelled manual only as a candidate when a nearby conversation claims an action; even then, the statement is not treated as ground truth.

Prospectively, manual attribution can be made deterministic by recording the reset-credit inventory before and after every schedule transition. A count drop confirms a manual redemption; an unchanged inventory supports an automatic event.

## Evidence and limitations

- Source period: 22 May 2026, 00:00 through 23 Jul 2026, 00:00.
- Rollout files: 673; bytes scanned: 3,180,667,495.
- Token events: 130,523; hourly buckets: 650.
- Conversation signals: 245; imported and retrospective clues receive sharply reduced weight. Raw excerpts and session identifiers are not published.
- Multiple historical sessions can report conflicting deadlines for the same quota lane. Model identity is ignored for reset inference, and model-only handoffs are excluded.
- Raw tokens are not identical to weighted quota consumption. Guidance uses the live percentage as authoritative and raw tokens as activity-shape evidence.
