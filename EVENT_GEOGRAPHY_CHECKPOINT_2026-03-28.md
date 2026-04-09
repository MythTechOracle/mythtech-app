# Event Geography Checkpoint

Date: 2026-03-28

## Scope

This report captures the first high-confidence event-geography expansion pass in `server/services/normalizationService.js`.

Anchor line:

The field is widening by recognition, not by invention.

Build law:

One incident may have many narrations, but it should keep one event location.

## Current Live State

Current live board state at report generation:

- Dashboard generated at `2026-03-28T15:33:12.407Z`
- Snapshot mode: `live_api`
- Visible tape rows: `1`
- Visible sample state: `extremely_thin`
- Current visible region: `Saudi Arabia`

Interpretation:

- the surface is still sparse
- the sparsity is governed, not accidental
- the geometry pass did not loosen the tape gate
- it improved location recognition where the text justified it

## 24h Event Geography Summary

24-hour normalized intake used for this checkpoint:

| Measure | Value |
| --- | ---: |
| Raw rows | 111 |
| Normalized rows | 111 |
| Resolved via `alias` | 25 |
| Resolved via `explicit_text` | 17 |
| Still `unknown` | 69 |
| Unique resolved event locations | 7 |

Resolved location types in the same 24-hour window:

| Type | Count |
| --- | ---: |
| `site` | 20 |
| `country` | 20 |
| `region` | 2 |
| `unknown` | 69 |

## Top Corrected Aliases Now Working

### 1. Prince Sultan Air Base -> Saudi Arabia

- Source: `alias`
- Type: `site`
- Confidence: `0.96`
- Rows resolved in 24h: `20`
- Distinct source countries: `Nigeria`, `Turkey`, `United States`, `India`

Examples:

- `Missile strike on Saudi air base injures 10 US troops`
- `Iranian strike wounds US troops and damages planes at Saudi air base`
- `10 US troops wounded in Iranian attack on Prince Sultan Airbase`

### 2. Iranian nuclear-facility / nuclear-linked-site wording -> Iran

- Source: `explicit_text`
- Type: `country`
- Confidence: `0.89`
- Rows resolved in 24h: `9`
- Distinct source countries: `United States`, `Canada`, `Azerbaijan`

Examples:

- `Attacks Ramp Up In Iran War Including Strikes On Iranian Nuclear Facilities`
- `Israel claims responsibility for strikes on Iranian nuclear - linked sites`

### 3. Base-in-Saudi wording -> Saudi Arabia

- Source: `explicit_text` and `alias`
- Type: `country`
- Confidence: `0.88`
- Rows resolved in 24h: `9` combined

Examples:

- `Israel hits Iranian nuke facilities and Tehran strikes base in Saudi Arabia , wounding US troops`
- `At least 12 US troops hurt in Iranian strike on Saudi base , refueling planes damaged`

### 4. Europe regulation coverage -> Europe

- Source: `alias`
- Type: `region`
- Confidence: `0.90`
- Rows resolved in 24h: `2`

Examples:

- `Europe Girds for Looming IoT Security Regulations`

### 5. New one-row proofs that the expansion path is working

- `Houthis claim responsibility for missile attack on Israel`
  - resolved to `Israel`
  - source country was `Russia`
  - translation-aware geometry upgrade worked

- `Iran Launches Assault on Kuwait Ports During Regional Escalation`
  - resolved to `Kuwait`
  - source country was `United States`

## High-Frequency Unknown Rows That Still Matter

These are the strongest current `Unknown` rows that still look operationally meaningful.

### Candidate rows for the next alias queue

1. `Belgium metro-track rescue incident`
   - Count: `2`
   - Translation already says `Belgium metro-track rescue incident`
   - Good next addition: `Belgique` -> `Belgium`

2. `Qatar Indian Navy Purnendu Tiwary Jailed ...`
   - Count: `1`
   - Translation already contains `Qatar`
   - Good next addition: stronger explicit-text detection for country-at-title-start patterns like `Qatar ...`

3. `Israel reports first missile attack from Yemen as war in Middle East intensifies`
   - Count: `1`
   - This is strategically relevant, but not alias-simple
   - It likely needs directional phrase logic, not just a plain alias, because `from Yemen` and `attack on Israel` are not the same geography

4. `Yemen missile launch marks a new inflection point in the war , Israel says`
   - Count: `1`
   - Same issue as above
   - Better treated as a phrase-aware target/origin problem than a loose alias

### Rows that should probably stay Unknown

- `President Trump Decision to Hit Iran Sparks Fears America Will Come Under Attack National Enquirer`
- `The FBI confirmed a hacking attack on the director's email`
- `Iran and the US harden their positions over talks to end the nearly month-old war`

These are broad, commentary-like, or non-localized enough that `Unknown` is the safer outcome.

## Next Alias Queue

Small, disciplined next queue:

1. `Belgique` / `Belgium`
   - High confidence
   - Translation already proves the country

2. `Qatar` title-start / court / jail phrasing
   - High confidence
   - Useful for policy/security rows that are clearly country-anchored but not preposition-anchored

3. Optional second pass: `Yemen` / `Israel` directional strike phrases
   - Not a simple alias expansion
   - Should be handled only if we add phrase-aware target/origin logic

Do not put `Middle East`, `Arab capitals`, or similarly broad phrasing into the next alias queue. Those are too general and would risk inventing geography.

## Overreach Watch

The main thing to watch now is not underreach. It is overreach in dual-location titles.

Examples to keep watching:

- `Israel hits Iranian nuclear facilities and Tehran strikes base in Saudi Arabia`
- `attack from Yemen` vs `attack on Israel`

These rows can contain:

- actor-country
- target-country
- retaliatory destination
- broader strategic context

So the next refinement should stay phrase-aware. We should not let a broad country alias silently win when the title really contains two different geographies.

## Checkpoint Verdict

PASS

Why:

- publisher-country leakage did not come back
- strategic site and country recognition improved meaningfully
- translated rows can now claim event geography when the translated text is strong enough
- the live field widened a bit through better recognition, not weaker filtering

## Next Move

Create the next small alias pass from the queue above, then follow it with another short checkpoint:

- corrected aliases added
- current top `Unknown` rows
- any dual-location rows that need phrase-aware handling
