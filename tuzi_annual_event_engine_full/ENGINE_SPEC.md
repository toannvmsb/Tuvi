# TUZI Annual Event Prediction Engine — Full Implementation Spec v1.0

> Purpose: deterministic annual-event engine for Zi Wei Dou Shu/Tử Vi.  
> Default school profile: **Nam Phái / Tam Hợp**, with **Tứ Hóa as a dynamic activation layer**.  
> Narrative LLM (Claude) must never perform astrology calculations.

## 0. Important epistemic boundary

This system implements a traditional metaphysical interpretation framework, not a scientifically validated forecasting model.
Internal scores represent **rule convergence and engine confidence**, not empirical probability that an event will occur.

The codebase MUST distinguish:

- **Classical/configurable astrological rules**: chart construction, palace relations, school-specific Tứ Hóa tables, Đại Vận/Tiểu Hạn/Lưu Niên/Lưu Nguyệt calculations.
- **Engineering heuristics**: event weights, thresholds, convergence multipliers, conflict penalties, ranking and UI confidence.

Never mix these two categories without explicit versioning.

---

## 1. Design goals

The engine answers:

1. What themes are activated in the target year?
2. Which event classes are supported by the natal chart + Đại Vận + annual layer?
3. Is the direction positive, negative, or mixed?
4. How strong is the rule convergence?
5. Which lunar-month windows most strongly re-activate the event?

Core doctrine:

```text
Natal = potential
Da Han = formation
Annual = activation
Monthly = timing trigger
Narrative LLM = wording only
```

Hard rule:

```text
Monthly factors cannot independently create a major event
when natal + Da Han + annual layers do not support it.
```

---

## 2. Package contents

```text
config/schools/nam_phai_tam_hop_v1.json
config/schools/tu_hoa_bac_phai_scaffold.json
config/events/event_definitions.json
config/scoring_v1.json

rules/annual_event_rules_v1.yaml
rules/cross_event_rules_v1.yaml
rules/conflict_rules_v1.yaml

schemas/annual_prediction_input.schema.json
schemas/annual_prediction_output.schema.json
schemas/astrology_signal.schema.json

prompts/claude_narrative_prompt.md

tests/unit_test_spec.json
tests/golden_dataset_template.json
```

There are currently **85 event types** in the full ontology and **1343 baseline/special rules** in the generated v1 rulebook.

---

## 3. Recommended code architecture

```text
src/astrology/
  core/
    calendar/
    natal/
    dahan/
    annual/
    monthly/

  schools/
    interfaces/
    nam-phai/
    tu-hoa/

  signals/
    signal-normalizer.ts
    signal-factory.ts

  events/
    ontology.ts
    event-axis.ts
    detector.ts
    specific-event-resolver.ts

  scoring/
    scorer.ts
    convergence.ts
    conflict.ts
    confidence.ts
    suppression.ts

  timing/
    monthly.ts
    dou-jun.ts

  rules/
    loader.ts
    evaluator.ts
    validator.ts

  narrative/
    payload-builder.ts

  audit/
    trace.ts
    versioning.ts

  tests/
```

---

## 4. Calculation layer vs interpretation layer

### 4.1 Calculation layer

Must be deterministic:

- solar/lunar conversion
- stems/branches
- Mệnh/Thân
- Ngũ Hành Cục
- 14 main stars
- configured auxiliary stars
- original Tứ Hóa
- Đại Vận
- selected Tiểu Hạn method
- Lưu Niên / Thái Tuế
- annual Tứ Hóa
- selected moving stars
- Đẩu Quân
- Lưu Nguyệt and monthly Tứ Hóa

### 4.2 Signal layer

Transforms chart facts into normalized facts:

```ts
interface AstrologySignal {
  source: "NATAL" | "DA_HAN" | "ANNUAL" | "MONTHLY";
  family: EvidenceFamily;
  palace: Palace;
  signalType: string;
  targetAxis?: EventCategory;
  intensity: number; // 0..100
  polarity: "POSITIVE" | "NEGATIVE" | "ACTIVATING" | "NEUTRAL";
  metadata: Record<string, unknown>;
}
```

### 4.3 Event layer

Consumes ONLY normalized signals and event-axis definitions.

Do not directly query raw star positions from EventDetector.

This makes school implementations swappable.

---

## 5. Evidence families

Use families to prevent fake convergence:

```text
NATAL_STRUCTURE
DA_HAN_STRUCTURE
FOUR_TRANSFORMATION
TAI_SUI
TIEU_HAN
LUU_NIEN_DAI_HAN
LOC_TON_SYSTEM
MA_SYSTEM
ADVERSITY_CLUSTER
MAIN_STAR_PATTERN
TAM_HOP_STRUCTURE
SPECIAL_PATTERN
```

Examples:

- Lưu Lộc Tồn + Lưu Kình + Lưu Đà => one family: LOC_TON_SYSTEM.
- Tang + Hổ + Khốc + Hư => one family: ADVERSITY_CLUSTER.
- Hóa Lộc + Hóa Kỵ are same family for independence counting, though their polarity differs.

---

## 6. Event ontology

Full event definitions live in `config/events/event_definitions.json`.

Categories:

- **CAREER**: 14 events
- **FINANCE**: 13 events
- **PROPERTY**: 9 events
- **RELATIONSHIP**: 9 events
- **CHILDREN**: 5 events
- **HEALTH**: 9 events
- **MOBILITY**: 6 events
- **EDUCATION_REPUTATION**: 8 events
- **FAMILY**: 6 events
- **LEGAL**: 6 events

Do not create free-form event names in Claude.

---

## 7. Event-axis engine

Each event category has:

- primary palace(s)
- secondary palace(s)
- axis weights
- optional opposition/tam-hop context

Example Career:

```json
{
  "primary": [
    "QUAN_LOC"
  ],
  "secondary": [
    "MENH",
    "TAI_BACH",
    "THIEN_DI"
  ],
  "weights": {
    "QUAN_LOC": 1.0,
    "MENH": 0.75,
    "TAI_BACH": 0.65,
    "THIEN_DI": 0.6
  }
}
```

A signal contributes to an event only if it maps to the event's axis, unless a special cross-axis rule says otherwise.

---

## 8. Four Transformations

Tứ Hóa semantics should be represented as dynamics, not simple good/bad labels:

```text
Hóa Lộc  = opportunity/resource/attraction/opening
Hóa Quyền = action/control/responsibility/pressure/expansion
Hóa Khoa = stabilization/reputation/protection/planning
Hóa Kỵ   = obstruction/attachment/pressure/loss/unresolved issue
```

Meaning always depends on:

```text
Transformation × transformed star × palace × time level × event axis × context
```

Never implement `Hóa Kỵ = disaster`.

The default table is stored in the Nam Phái school config.
Because some schools differ for selected stems, the table MUST remain profile-specific and versioned.

---

## 9. Annual scoring

Base score:

```text
NatalPotential       15%
DaHanActivation      25%
AnnualAxisActivation 20%
AnnualFourTransform  15%
TieuHan               8%
LuuNienDaHan           7%
MovingStars            5%
StructuralSupport      5%
```

Then:

```text
finalScore =
  clamp(
    baseScore
    × convergenceMultiplier
    × conflictMultiplier,
    0, 100
  )
```

These percentages are engineering weights v1, not classical doctrine.

---

## 10. Major-event gate

Major event requires:

```text
NatalPotential >= 30
DaHanScore >= 45
AnnualActivation >= 55
IndependentEvidenceFamilies >= 3
```

VERY_HIGH requires at least five independent evidence families plus support from NATAL, DA_HAN and ANNUAL layers.

Suppression:

```ts
if (daHanScore < 25) finalScore = Math.min(finalScore, 59);

if (natalPotential < 25 && daHanScore < 30)
  majorEventAllowed = false;
```

---

## 11. Direction

Maintain positive and negative vectors separately.

```text
positive - negative >= 25 -> POSITIVE
negative - positive >= 25 -> NEGATIVE
otherwise -> MIXED
```

This avoids contradictory prose such as “very lucky yet catastrophic”.

Example:

```json
{
  "event": "FINANCE_LARGE_EXPENSE",
  "strength": 82,
  "positiveScore": 58,
  "negativeScore": 72,
  "direction": "MIXED"
}
```

Narrative can then say: strong financial activity, but with meaningful pressure/outflow.

---

## 12. Moving-star interpretation

### Lưu Thái Tuế
Role = annual spotlight / activation, not automatically good or bad.

### Lưu Thiên Mã
Role = movement / change trigger.
Interpret through target palace:
- Quan => career movement
- Di => travel/relocation
- Điền => property/household change
- Tài => dynamic cashflow

### Lưu Lộc Tồn system
Role = resource/accumulation but evaluate with Kình/Đà and surrounding context.

### Kình / Đà
Role = friction/obstacle/pressure; avoid literal disaster prediction.

### Tang/Hổ/Khốc/Hư
Role = adversity/stress/disruption family.
Do not equate Tang with death.

---

## 13. Specific-event resolver

The engine should first infer broad activity:

```text
CAREER_ACTIVITY
FINANCIAL_ACTIVITY
PROPERTY_ACTIVITY
RELATIONSHIP_ACTIVITY
HEALTH_ACTIVITY
MOBILITY_ACTIVITY
...
```

Then resolve to specific events.

Example:

```text
PROPERTY_ACTIVITY high
+ finance outflow high
+ supportive property direction
=> PROPERTY_PURCHASE candidate

PROPERTY_ACTIVITY high
+ movement high
+ outflow moderate
=> PROPERTY_RELOCATION / PROPERTY_RENOVATION candidates
```

Do not decide specific events from one star.

---

## 14. Cross-event reasoning

Use `rules/cross_event_rules_v1.yaml`.

Examples:

- large expense + property purchase => property-related cash outflow
- job change + cashflow pressure => career transition with temporary income volatility
- marriage + relocation => household formation
- business expansion + investment => capital deployment
- property sale + inflow => property liquidity event

Composite events are narrative helpers, not replacement for underlying scored events.

---

## 15. Monthly timing

Only run detailed monthly timing when:

```text
annualEventScore >= 55
```

Monthly score:

```text
AnnualEventBaseline   40%
MonthlyAxisHit        20%
MonthlyFourTransform  25%
DouJunInteraction     10%
OtherMonthlySignals    5%
```

Caps:

```text
Annual < 50 -> monthly <= 55
Annual < 35 -> monthly <= 45
```

This prevents a monthly layer from fabricating a major event.

Return time windows, not false exact dates.

If adjacent months score similarly, merge them.

Example:

```json
{
  "startLunarMonth": 5,
  "endLunarMonth": 6,
  "strength": "VERY_HIGH"
}
```

Peak-month rule:

Only present one month as uniquely dominant if:

```text
TopMonthScore - SecondMonthScore >= 12
```

---

## 16. Đẩu Quân

Implement behind the school interface because conventions may differ.

Default supported algorithm should be explicitly tested and documented in the selected school implementation.

Never bury the algorithm in EventDetector.

---

## 17. Health / legal / financial safety language

Health engine events describe astrological signals, not diagnosis.

Allowed:

```text
HEALTH_ATTENTION
HEALTH_TREATMENT
HEALTH_SURGERY_SIGNAL
HEALTH_ACCIDENT_SIGNAL
```

Forbidden event certainty:

```text
DEATH
CANCER
STROKE
```

Narrative must use:
- “nên chú ý”
- “tín hiệu”
- “giai đoạn nhạy cảm”
- “nếu có triệu chứng nên kiểm tra y tế”

The engine is not a clinical system.

---

## 18. Rule engine

Rules are data, not hard-coded if-statements.

```ts
interface EventRule {
  id: string;
  event: EventType;
  school?: AstrologySchool[];
  condition: RuleCondition;
  evidenceFamily: EvidenceFamily;
  polarity: Polarity;
  baseWeight: number;
  layerMultipliers?: Partial<Record<TimeLayer, number>>;
}
```

Rule loader requirements:

1. validate schema
2. reject duplicate IDs
3. load only compatible school rules
4. record exact rule version
5. expose rule trace in prediction output

---

## 19. Explainability

Every event must include:

```text
eventId
eventType
strength
direction
positiveScore
negativeScore
confidence
evidence[]
counterEvidence[]
independentEvidenceFamilies[]
reasoningChain[]
peakMonths[]
narrativeHints[]
```

Every evidence item must trace to:
- rule ID
- layer
- palace
- star/transformation/signal
- contribution

This allows the UI to show “Vì sao Tuzi luận như vậy?”

---

## 20. Confidence

Confidence != event probability.

Confidence measures rule agreement:

```text
LayerCoverage        35%
EvidenceIndependence 30%
RuleConsistency      20%
TimingConsistency    15%
```

Recommended labels:

```text
LOW
MEDIUM
HIGH
VERY_HIGH
```

Do not display statistical percentages to users unless future empirical calibration supports them.

---

## 21. Event ranking

Default UI:

- maximum 5 top events/year
- maximum 2 events/category
- deduplicate semantically overlapping events
- retain all raw candidates in developer/debug output

Deduplication examples:

```text
CAREER_ROLE_CHANGE
CAREER_INTERNAL_TRANSFER
CAREER_JOB_CHANGE
```

may roll up to a visible “Biến động công việc” card while retaining raw events internally.

---

## 22. Storage / audit

Recommended tables:

```text
astrology_school_profiles
astrology_rules
astrology_rule_versions
event_definitions
event_axis_definitions
star_semantics
transformation_semantics
annual_predictions
annual_prediction_events
prediction_evidence
prediction_months
```

Prediction snapshot must store:

```text
input_hash
chart_version
engine_version
rule_version
school_profile
output_json
created_at
```

Never overwrite prior rule versions.

---

## 23. API

### POST `/api/astrology/annual-events`

Input follows `annual_prediction_input.schema.json`.

Output follows `annual_prediction_output.schema.json`.

The API should support:

```json
{
  "options": {
    "monthlyTiming": true,
    "maxEvents": 5,
    "includeDebugTrace": false
  }
}
```

Admin/debug mode can include raw scoring.

---

## 24. LLM boundary

Claude receives only final structured JSON plus narrative prompt.

Claude may:
- summarize
- explain
- format
- offer practical, non-deterministic advice

Claude may NOT:
- recalculate the chart
- create extra stars
- change an event
- move timing
- increase/decrease score
- infer a diagnosis
- infer death
- state certainty

---

## 25. Test strategy

### Unit tests
- calendar conversion
- Mệnh/Thân
- Ngũ Hành Cục
- star placements
- Tứ Hóa by school
- Đại Vận
- Tiểu Hạn
- Lưu Niên
- moving stars
- Đẩu Quân
- Lưu Nguyệt

### Scoring tests
- suppression
- evidence-family dedupe
- conflict handling
- mixed polarity
- monthly cap
- high-event gate

### Golden tests
Use verified life-history cases.

Suggested fields:

```text
birth profile
verified event type
year
month if known
severity
source reliability
engine prediction
hit/miss
timing hit
false positives
```

Do not tune weights on one person's chart.

Suggested calibration:
- exploratory >= 50 cases
- useful calibration >= 200 cases
- hold out a validation set before changing production weights

---

## 26. Phased build

### Phase 1 — deterministic chart and signal layer
Implement all chart/time calculations and normalized signal output.

### Phase 2 — full annual ontology
Load the complete event definitions and generated v1 rulebook.

### Phase 3 — convergence/conflict/cross-event
Implement evidence independence, mixed direction and synthesis.

### Phase 4 — monthly timing
Add Đẩu Quân, Lưu Nguyệt, monthly Tứ Hóa and timing windows.

### Phase 5 — narrative
Connect Claude only after deterministic outputs are stable.

### Phase 6 — golden dataset and calibration
Backtest and version weight changes.

---

## 27. Definition of Done

Production v1 is done when:

- deterministic natal/Da Han/annual/monthly calculations pass fixtures
- school profile selects exact Tứ Hóa/Tiểu Hạn conventions
- all configured events have rule coverage
- no double counting across evidence families
- major-event gates work
- monthly layer cannot invent events
- every user-visible claim is traceable
- safety tests pass
- Claude cannot alter calculation data
- golden-dataset evaluation report exists
- all predictions store engine/rule versions

---

## 28. Instructions to Claude Code

1. Read this file.
2. Read all files in `/config`, `/rules`, `/schemas`, `/tests`.
3. Do not alter astrology rules silently.
4. Implement interfaces before business logic.
5. Build school-specific calculation modules behind interfaces.
6. Build normalized signal layer.
7. Build generic rule evaluator.
8. Build event scorer and all gates.
9. Add traceability before UI.
10. Run tests after each module.
11. Do not connect LLM until calculation tests pass.
12. If a classical rule is ambiguous by school, expose it as configuration; never guess.
