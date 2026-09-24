# TUZI Monthly Event Timing Engine v2.0
## Technical Rule Spec for Claude Code

> Purpose: determine which lunar month(s) are the strongest timing windows for an event that has already been identified at annual level by the TUZI Annual Event Prediction Engine.

> Core principle: the monthly layer does not invent major events. It times events already supported by Natal → Da Han → Annual layers.

## 1. Scope

This module answers one question:

> Given an already confirmed annual event, which lunar month or month-window most strongly re-activates the same event axis?

It must not answer:
- Which month is lucky/unlucky in general?
- Which month has the most good/bad stars?
- Can a monthly signal alone create a major event?

Required pipeline:

```text
Natal
→ Da Han
→ Annual Event Candidate
→ Dou Jun
→ 12 Monthly Charts
→ Monthly Four Transformations
→ Event-Axis Matching
→ Cross-Layer Echo
→ Monthly Timing Score
→ Peak Month / Timing Window
→ Event Phase
```

## 2. Hard Gate: Annual Before Monthly

```ts
if (annualEvent.score < 50) {
  return blockedTiming("ANNUAL_EVENT_TOO_WEAK");
}

if (annualEvent.score >= 55) {
  monthlyTimingAllowed = true;
}

if (annualEvent.score >= 75) {
  monthlyTimingPriority = "HIGH";
}
```

Monthly factors can refine timing. Monthly factors cannot independently create a major annual event.

## 3. Required Inputs

```ts
interface MonthlyTimingInput {
  natalContext: NatalContext;
  daHanContext: DaHanContext;
  annualContext: AnnualContext;
  annualEvent: AnnualEventPrediction;
  schoolProfile: MonthlyTimingSchoolConfig;
  options?: {
    useMonthlyMovingStars?: boolean;
    allowMonthSegments?: boolean;
    includeDebugTrace?: boolean;
  };
}
```

Annual event input:

```ts
interface AnnualEventPrediction {
  eventId: string;
  eventType: EventType;
  category: EventCategory;
  score: number;
  direction: "POSITIVE" | "NEGATIVE" | "MIXED";
  eventAxis: EventAxis;
  evidence: Evidence[];
  independentEvidenceFamilies: EvidenceFamily[];
  reasoningChain: ReasoningStep[];
}
```

## 4. Dou Jun — Determine Lunar Month 1

Default TUZI method:

```text
1. Start at the palace carrying the target year's Tai Sui / annual earthly branch.
2. Treat that palace as lunar month 1.
3. Count backward to the native's lunar birth month.
4. From that palace, treat Zi hour as hour 1.
5. Count forward to the native's birth-hour branch.
6. The resulting palace is Dou Jun.
7. Dou Jun = Monthly Ming Palace for lunar month 1.
8. Each subsequent lunar month advances one palace forward.
```

Earthly branch index:

```ts
const BRANCH_INDEX = {
  ZI: 0, CHOU: 1, YIN: 2, MAO: 3, CHEN: 4, SI: 5,
  WU: 6, WEI: 7, SHEN: 8, YOU: 9, XU: 10, HAI: 11
};
```

Formula:

```ts
function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function calculateDouJun(
  annualBranchIndex: number,
  lunarBirthMonth: number,
  birthHourBranchIndex: number
): number {
  return mod12(
    annualBranchIndex
    - (lunarBirthMonth - 1)
    + birthHourBranchIndex
  );
}
```

Monthly Ming palace:

```ts
function getMonthlyMingPalace(
  douJunIndex: number,
  lunarMonth: number
): number {
  return mod12(douJunIndex + lunarMonth - 1);
}
```

## 5. Build the Full 12-Palace Monthly Chart

Do not store only the Monthly Ming palace.

Build the complete monthly functional palace set:

```text
Ming
Parents
Fortune
Property
Career
Friends
Travel
Health
Finance
Children
Spouse
Siblings
```

Store cross-layer overlap:

```ts
interface MonthlyFunctionalPalace {
  monthlyRole: PalaceRole;
  physicalBranch: EarthlyBranch;

  overlapsNatalRole?: PalaceRole;
  overlapsDaHanRole?: PalaceRole;
  overlapsAnnualRole?: PalaceRole;

  natalPalaceId?: string;
  daHanPalaceId?: string;
  annualPalaceId?: string;
}
```

## 6. Same-Function Overlap

Use the strongest applicable pattern only:

| Pattern | Score |
|---|---:|
| Monthly ↔ Natal event palace | +8 |
| Monthly ↔ Da Han event palace | +12 |
| Monthly ↔ Annual event palace | +16 |
| Monthly ↔ Annual + Da Han | +22 |
| Monthly ↔ Natal + Da Han + Annual | +28 |

Internal concept:

```text
SAME_FUNCTION_OVERLAP
```

## 7. Event Axis Lock

Monthly timing must stay locked to the annual event axis.

Example:

```text
Annual Event: CAREER_PROMOTION
Career Axis: Career + Ming + Finance + Travel
```

If Monthly Hua Lu lands in Spouse only and no documented cross-event rule links it:

```text
timing contribution ≈ 0
```

Hard principle:

```text
Good/bad monthly signals matter only when they activate the SAME event axis.
```

## 8. Monthly Geometry

```text
Direct / same palace       1.00
Opposition                 0.85
Trine / San Fang           0.70
Adjacent                   0.25
Unrelated                  0.00
```

For Hua Ji under profiles emphasizing opposition:

```text
Ji direct                  1.00
Ji opposition              1.05
```

This must be school-configurable.

## 9. Monthly Four Transformations

This is the principal timing trigger.

Semantics:

```text
Hua Lu:
opening
resource
opportunity
attraction
beginning

Hua Quan:
action
execution
pressure
control
change
responsibility

Hua Ke:
formalization
recognition
stabilization
documentation
resolution

Hua Ji:
obstruction
pressure
consequence
attachment
delay
unresolved matter
closure
```

Never hard-code:
- Lu = good event
- Ji = disaster

## 10. Transformation Echo

Same transformation, same target:

```text
Annual Lu + Monthly Lu same target       +22
Annual Quan + Monthly Quan same target   +22
Annual Ke + Monthly Ke same target       +18
Annual Ji + Monthly Ji same target       +25
```

Different transformation, same event target:

```text
Annual Lu + Monthly Quan                 +16
Annual Quan + Monthly Ke                 +14
Annual Lu + Monthly Ji                   +16
Annual Quan + Monthly Ji                 +17
Annual Ke + Monthly Quan                 +14
```

Direction is resolved separately.

## 11. Cross-Layer Transformation Echo

Compare Monthly Four Transformations against:

```text
Annual Event Palace
Da Han Event Palace
Natal Event Palace
```

Recommended priority:

```text
Monthly → Annual event target     1.00
Monthly → Da Han event target     0.85
Monthly → Natal event target      0.70
```

If the same monthly transformation hits the same event axis across multiple layers:

```text
CROSS_LAYER_ECHO = true
```

## 12. Lower-Level Hits Upper-Level Rule

```ts
function scoreUpperLayerHit(
  monthlyTransformation: TransformationHit,
  annualEvent: AnnualEventPrediction,
  daHanContext: DaHanContext,
  annualContext: AnnualContext
): number {
  let score = 0;

  if (hitsAnnualEventAxis(monthlyTransformation, annualEvent)) {
    score += scoreDirectness(monthlyTransformation) * 1.00;
  }

  if (hitsDaHanEventAxis(monthlyTransformation, annualEvent, daHanContext)) {
    score += scoreDirectness(monthlyTransformation) * 0.85;
  }

  if (hitsNatalEventAxis(monthlyTransformation, annualEvent)) {
    score += scoreDirectness(monthlyTransformation) * 0.70;
  }

  return score;
}
```

Apply family caps to avoid double counting.

## 13. Tam Phuong Tu Chinh

For each event axis, inspect:

```text
Primary palace
+ two San Fang palaces
+ opposition palace
```

Weights:

```text
Primary palace    1.00
Opposition        0.85
San Fang          0.70
Adjacent          0.25
```

## 14. Dou Jun Interaction

Recommended timing contribution before component cap:

```text
Dou Jun lies on Event Axis                      +8
Dou Jun overlaps Annual Event Palace            +10
Dou Jun palace transformation hits Event Axis   +8
Annual Ming transformation hits Dou Jun         +8
Mutual Dou Jun ↔ Annual Ming interaction        +12
```

Overall component is capped later.

## 15. Monthly Moving Stars

Optional secondary timing layer:

```text
Monthly Tian Ma on Event Axis       +6
Monthly Lu Cun on Event Axis        +5
Monthly Qing/Tuo on Event Axis      +4 pressure
Monthly Hong/Xi on Relationship     +4 activation
Monthly Kui/Yue on relevant axis    +3 support
```

Evidence-family deduplication still applies.

## 16. Monthly Evidence Families

```ts
enum MonthlyEvidenceFamily {
  MONTHLY_PALACE_RESONANCE,
  MONTHLY_FOUR_TRANSFORMATION,
  CROSS_LAYER_TRANSFORMATION_ECHO,
  DOU_JUN_INTERACTION,
  MONTHLY_LOC_TON_SYSTEM,
  MONTHLY_MA_SYSTEM,
  MONTHLY_ADVERSITY_CLUSTER,
  MONTHLY_SUPPORTING_STARS,
  MONTHLY_SPECIAL_PATTERN
}
```

Examples:

```text
Monthly Lu Cun + Qing + Tuo = one independent family
Tang + Hu + Khoc + Hu = one independent family
```

## 17. Month Boundary Policy

Recommended default:

```json
{
  "monthlyPalaceBoundary": "LUNAR_MONTH",
  "monthlyTransformationBoundary": "SOLAR_TERM_JIEQI",
  "allowMonthSegments": true
}
```

Meaning:
- Monthly palace changes at lunar month boundary.
- Monthly Four Transformations may change when the monthly heavenly stem changes at solar-term boundary.

This remains configurable by school.

## 18. Monthly Segments

```ts
interface MonthlySegment {
  lunarMonth: number;
  segmentIndex: number;

  startDate: string;
  endDate: string;

  monthlyMingPalace: PalacePosition;

  monthStem: HeavenlyStem;
  monthBranch: EarthlyBranch;

  fourTransformations: FourTransformationSet;

  boundaryReason:
    | "LUNAR_MONTH_START"
    | "SOLAR_TERM_CHANGE";
}
```

## 19. Leap Month Policy

```ts
type LeapMonthPolicy =
  | "SAME_AS_PREVIOUS_MONTH"
  | "FIRST_HALF_PREVIOUS_SECOND_HALF_NEXT"
  | "SCHOOL_SPECIFIC";
```

Do not hard-code one convention in core.

## 20. Monthly Event Score v2

```text
Annual Event Baseline            25%
Monthly Event Axis Resonance     20%
Monthly Four Transformation      25%
Cross-Layer Transformation Echo  15%
Dou Jun Interaction               5%
Monthly Moving Stars              5%
Structural Confirmation           5%
```

Total = 100%.

These are engineering heuristics, not classical probability.

## 21. Component Caps

```ts
const CAPS = {
  annualBaseline: 25,
  axisResonance: 20,
  monthlyFourTransformation: 25,
  crossLayerEcho: 15,
  douJun: 5,
  movingStars: 5,
  structuralConfirmation: 5
};
```

## 22. Score Function

```ts
function scoreMonth(
  annualEvent: AnnualEventPrediction,
  monthContext: MonthlyContext,
  natal: NatalContext,
  daHan: DaHanContext,
  annual: AnnualContext
): MonthlyEventScore {

  if (annualEvent.score < 50) {
    return blockedMonthlyScore();
  }

  const annualBaseline =
    annualEvent.score * 0.25;

  const axisResonance =
    clamp(scoreAxisResonance(
      annualEvent, monthContext, natal, daHan, annual
    ), 0, 20);

  const monthlyTuHoa =
    clamp(scoreMonthlyTransformations(
      annualEvent, monthContext
    ), 0, 25);

  const crossLayerEcho =
    clamp(scoreTransformationEcho(
      annualEvent, monthContext, natal, daHan, annual
    ), 0, 15);

  const douJun =
    clamp(scoreDouJun(
      annualEvent, monthContext
    ), 0, 5);

  const movingStars =
    clamp(scoreMonthlyMovingStars(
      annualEvent, monthContext
    ), 0, 5);

  const structural =
    clamp(scoreStructuralConfirmation(
      annualEvent, monthContext
    ), 0, 5);

  let rawScore =
      annualBaseline
    + axisResonance
    + monthlyTuHoa
    + crossLayerEcho
    + douJun
    + movingStars
    + structural;

  rawScore =
    applyMonthlyConvergence(
      rawScore,
      monthContext.independentEvidenceFamilies
    );

  rawScore =
    applyMonthlyCaps(
      rawScore,
      annualEvent.score
    );

  return buildMonthlyEventScore(rawScore);
}
```

## 23. Monthly Convergence Multiplier

```text
1 family   ×1.00
2          ×1.03
3          ×1.07
4          ×1.12
5+         ×1.18
```

Cap = 1.20.

## 24. Monthly Suppression / Caps

```ts
if (annualEvent.score < 50) {
  timingAllowed = false;
}

if (annualEvent.score < 55) {
  finalMonthScore = Math.min(finalMonthScore, 60);
}

if (annualEvent.score < 40) {
  finalMonthScore = Math.min(finalMonthScore, 45);
}
```

Version and calibrate these thresholds.

## 25. Timing Intensity

```text
<55     No strong timing evidence
55–64   Notable
65–74   Activity window
75–84   Strong timing window
85+     Very strong timing window
```

Not statistical probability.

## 26. VERY_HIGH Timing Gate

Only if:

```text
MonthScore >= 85
AND AnnualEvent.score >= 70
AND IndependentMonthlyFamilies >= 4
AND Monthly Four Transformation hits Annual Event Axis
AND CrossLayerEcho == true
```

Otherwise cap at HIGH.

## 27. Timing Windows

Merge adjacent months when:

```ts
score(monthA) >= 70
score(monthB) >= 70
abs(scoreA - scoreB) <= 10
```

Maximum merged window: 3 adjacent lunar months.

## 28. Unique Peak Month Rule

Present one uniquely dominant month only if:

```text
TopMonthScore >= 75
AND TopMonthScore - SecondMonthScore >= 12
```

Otherwise present a range.

## 29. Event Phase Model

```ts
type EventPhase =
  | "NONE"
  | "ONSET"
  | "PEAK"
  | "FORMALIZATION"
  | "PRESSURE"
  | "RESOLUTION";
```

Default mapping:

```text
Hua Lu     → ONSET
Hua Quan   → PEAK / EXECUTION
Hua Ke     → FORMALIZATION / RESOLUTION
Hua Ji     → PRESSURE / CONSEQUENCE
```

Context may override.

## 30. Event-Specific Timing Profiles

```ts
interface EventTimingProfile {
  eventType: EventType;
  axis: EventAxis;
  preferredTransformations: FourTransformation[];
  adverseTransformations: FourTransformation[];
  activationStars: Star[];
  phaseMapping: Partial<Record<FourTransformation, EventPhase>>;
  specialPatterns?: TimingPatternRule[];
}
```

### Career
Priority: Quan, Lu, Ke, Tian Ma.

### Finance
Positive/resource: Lu, Lu Cun, Wu Qu, Tian Fu, Ke.
Pressure/outflow: Ji, Da Hao, Xiao Hao, Kong, Jie, Qing, Tuo.

### Property
Priority: Lu, Quan, Ke, Tian Ma.
Always inspect Finance axis simultaneously.

### Relationship
Support: Lu, Ke, Hong Luan, Tian Xi, Tao Hua.
Change: Quan, Tian Ma.
Pressure: Ji, Qing, Tuo, Kong, Jie.

### Health
Pressure: Ji, Qing, Tuo, Huo, Ling, Hu, Kong, Jie.
Protective: Ke, Kui, Yue, Zuo, You.
User-facing wording must remain risk/attention based.

### Legal
Focus: Career, Travel, Friends, Ming.
Pressure: Ji, Ju Men, Qing, Tuo, Guan Fu.
Resolution: Ke, Kui, Yue.

## 31. Monthly Trigger Interface

```ts
interface MonthlyTrigger {
  ruleId: string;

  type:
    | "PALACE_OVERLAP"
    | "FOUR_TRANSFORMATION"
    | "TRANSFORMATION_ECHO"
    | "DOU_JUN"
    | "MOVING_STAR"
    | "SAN_FANG"
    | "OPPOSITION"
    | "SPECIAL_PATTERN";

  sourceLevel: "MONTHLY";

  targetLevel:
    | "NATAL"
    | "DA_HAN"
    | "ANNUAL";

  sourcePalace?: Palace;
  targetPalace?: Palace;

  eventAxis: EventCategory;

  score: number;

  polarity:
    | "POSITIVE"
    | "NEGATIVE"
    | "ACTIVATING";

  evidenceFamily: MonthlyEvidenceFamily;

  descriptionCode: string;
}
```

## 32. Monthly Event Score Interface

```ts
interface MonthlyEventScore {
  lunarMonth: number;
  score: number;
  phase: EventPhase;

  positiveScore: number;
  negativeScore: number;

  independentEvidenceFamilies:
    MonthlyEvidenceFamily[];

  triggers: MonthlyTrigger[];

  segments?: MonthlySegmentScore[];

  debugBreakdown?: {
    annualBaseline: number;
    axisResonance: number;
    monthlyTuHoa: number;
    crossLayerEcho: number;
    douJun: number;
    movingStars: number;
    structural: number;
  };
}
```

## 33. Timing Result Interface

```ts
interface EventTimingResult {
  eventId: string;
  eventType: EventType;

  annualScore: number;

  monthlyScores: MonthlyEventScore[];

  windows: TimingWindow[];

  peakWindow: TimingWindow | null;

  timingConfidence:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "VERY_HIGH";

  reasoningChain: TimingReason[];
}
```

## 34. Timing Window Interface

```ts
interface TimingWindow {
  startLunarMonth: number;
  endLunarMonth: number;

  startDate?: string;
  endDate?: string;

  peakLunarMonth?: number;

  intensity:
    | "NOTABLE"
    | "ACTIVITY"
    | "STRONG"
    | "VERY_STRONG";

  phases: EventPhase[];

  scoreRange: {
    min: number;
    max: number;
  };
}
```

## 35. Timing Confidence

```text
Annual confirmation        25%
Axis matching              20%
Cross-layer Tu Hoa         30%
Evidence independence      15%
Adjacent-month coherence   10%
```

## 36. Core YAML Rules

```yaml
id: MONTHLY_GENERIC_ECHO_001

require:
  annual_event_exists: true
  annual_event_score:
    gte: 55

condition:
  monthly_transformation_hits:
    annual_event_axis: true

weight:
  direct: 15
  opposition: 13
  trine: 10

evidence_family:
  MONTHLY_FOUR_TRANSFORMATION
```

```yaml
id: MONTHLY_TRIPLE_LEVEL_001

condition:
  same_event_axis_active_at:
    - DA_HAN
    - ANNUAL
    - MONTHLY

bonus: 12

evidence_family:
  CROSS_LAYER_TRANSFORMATION_ECHO
```

```yaml
id: MONTHLY_TUHOA_ECHO_001

condition:
  annual_transformation:
    same_target_as_month: true

score:
  HOA_LOC: 15
  HOA_QUYEN: 17
  HOA_KHOA: 13
  HOA_KY: 19

evidence_family:
  CROSS_LAYER_TRANSFORMATION_ECHO
```

## 37. Career Job Change YAML

```yaml
id: MONTHLY_TIMING_CAREER_JOB_CHANGE_001

event:
  CAREER_JOB_CHANGE

require:
  annual_event_score:
    gte: 55

event_axis:
  primary:
    - QUAN_LOC

  secondary:
    - MENH
    - THIEN_DI
    - TAI_BACH

monthly_triggers:

  - type: MONTHLY_TRANSFORMATION
    transformation: HOA_QUYEN
    target: EVENT_AXIS

    score:
      direct: 18
      opposition: 15
      trine: 12

  - type: MONTHLY_STAR
    star: THIEN_MA
    target: EVENT_AXIS
    score: 7

  - type: ANNUAL_MONTHLY_TRANSFORMATION_ECHO
    target: SAME_EVENT_PALACE
    score: 15

  - type: SAME_FUNCTION_OVERLAP
    levels:
      - MONTHLY
      - ANNUAL
    score: 12

phase_rules:
  HOA_LOC: ONSET
  HOA_QUYEN: PEAK
  HOA_KHOA: FORMALIZATION
  HOA_KY: PRESSURE
```

## 38. Peak Candidate Rule

```yaml
id: MONTHLY_PEAK_EVENT_001

require:
  month_score:
    gte: 75

  independent_families:
    gte: 3

  annual_event_score:
    gte: 60

result:
  timing_level: STRONG
  phase: PEAK_CANDIDATE
```

## 39. Very Strong Rule

```yaml
id: MONTHLY_VERY_STRONG_001

require:
  month_score:
    gte: 85

  annual_event_score:
    gte: 70

  independent_monthly_families:
    gte: 4

  monthly_four_transformation_hits_annual_event_axis:
    equals: true

  cross_layer_echo:
    equals: true

result:
  timing_level: VERY_STRONG
```

## 40. Main Orchestration

```ts
function calculateEventTiming(
  input: MonthlyTimingInput
): EventTimingResult {

  const {
    annualEvent,
    natalContext,
    daHanContext,
    annualContext,
    schoolProfile
  } = input;

  validateAnnualEvent(annualEvent);

  if (annualEvent.score < 50) {
    return blockedTimingResult(annualEvent);
  }

  const douJun =
    calculateDouJunFromProfile(
      natalContext,
      annualContext,
      schoolProfile
    );

  const monthlyCharts =
    build12MonthlyCharts(
      douJun,
      natalContext,
      annualContext,
      schoolProfile
    );

  const monthlyScores: MonthlyEventScore[] = [];

  for (const monthlyChart of monthlyCharts) {

    const segments =
      buildMonthlySegments(
        monthlyChart,
        schoolProfile
      );

    const segmentScores =
      segments.map(segment =>
        scoreMonth(
          annualEvent,
          segment,
          natalContext,
          daHanContext,
          annualContext
        )
      );

    monthlyScores.push(
      aggregateMonthSegments(
        monthlyChart,
        segmentScores
      )
    );
  }

  const windows =
    detectTimingWindows(monthlyScores);

  const peakWindow =
    choosePeakWindow(windows);

  const timingConfidence =
    calculateTimingConfidence(
      annualEvent,
      monthlyScores,
      windows
    );

  return {
    eventId: annualEvent.eventId,
    eventType: annualEvent.eventType,
    annualScore: annualEvent.score,
    monthlyScores,
    windows,
    peakWindow,
    timingConfidence,
    reasoningChain:
      buildTimingReasoningChain(
        monthlyScores,
        peakWindow
      )
  };
}
```

## 41. Recommended Code Structure

```text
src/astrology/timing/

  dou-jun/
    calculate-dou-jun.ts
    dou-jun.types.ts

  monthly-chart/
    monthly-palace.ts
    monthly-functional-palaces.ts
    build-monthly-chart.ts

  monthly-calendar/
    lunar-boundaries.ts
    solar-term-boundaries.ts
    leap-month-policy.ts

  transformations/
    monthly-stem.ts
    monthly-tu-hoa.ts

  resonance/
    palace-overlap.ts
    event-axis-match.ts
    transformation-echo.ts
    san-fang-tu-chinh.ts

  moving-stars/
    monthly-moving-stars.ts

  scoring/
    monthly-score.ts
    monthly-convergence.ts
    monthly-caps.ts
    timing-confidence.ts

  phase/
    event-phase.ts

  windows/
    timing-window.ts

  explain/
    timing-reasoning.ts

  config/
    monthly-timing-school-profile.ts

  tests/
```

## 42. Monthly School Config

```ts
interface MonthlyTimingSchoolConfig {
  id: string;

  douJunMethod:
    | "TAI_SUI_BIRTH_MONTH_BIRTH_HOUR"
    | "CUSTOM";

  monthlyPalaceBoundary:
    | "LUNAR_MONTH";

  monthlyTransformationBoundary:
    | "LUNAR_MONTH"
    | "SOLAR_TERM_JIEQI";

  fourTransformationTable:
    TransformationTableId;

  geometryWeights: {
    direct: number;
    opposition: number;
    trine: number;
    adjacent: number;
  };

  kyOppositionWeight: number;

  useMonthlyMovingStars: boolean;

  leapMonthPolicy: LeapMonthPolicy;

  thresholds: {
    minAnnualScoreForTiming: number;
    strongTiming: number;
    veryStrongTiming: number;
  };
}
```

Recommended default:

```json
{
  "id": "TUZI_MONTHLY_NAM_PHAI_V2",
  "douJunMethod": "TAI_SUI_BIRTH_MONTH_BIRTH_HOUR",
  "monthlyPalaceBoundary": "LUNAR_MONTH",
  "monthlyTransformationBoundary": "SOLAR_TERM_JIEQI",
  "fourTransformationTable": "NAM_PHAI_V1",
  "geometryWeights": {
    "direct": 1.0,
    "opposition": 0.85,
    "trine": 0.70,
    "adjacent": 0.25
  },
  "kyOppositionWeight": 1.05,
  "useMonthlyMovingStars": true,
  "leapMonthPolicy": "SCHOOL_SPECIFIC",
  "thresholds": {
    "minAnnualScoreForTiming": 55,
    "strongTiming": 75,
    "veryStrongTiming": 85
  }
}
```

## 43. Debug Output

```json
{
  "month": 6,
  "event": "CAREER_JOB_CHANGE",
  "score": 87,

  "breakdown": {
    "annualBaseline": 20.5,
    "axisResonance": 17,
    "monthlyTuHoa": 23,
    "crossLayerEcho": 13,
    "douJun": 4,
    "movingStars": 5,
    "structural": 4.5
  },

  "independentFamilies": [
    "MONTHLY_PALACE_RESONANCE",
    "MONTHLY_FOUR_TRANSFORMATION",
    "CROSS_LAYER_TRANSFORMATION_ECHO",
    "MONTHLY_MA_SYSTEM"
  ],

  "reasoning": [
    "Monthly Career overlaps Annual Career",
    "Monthly Hua Quan hits Career Axis",
    "Annual Hua Quan and Monthly Hua Quan share target",
    "Monthly Tian Ma activates Travel",
    "Career axis already active in Da Han"
  ]
}
```

## 44. User-Facing Output

```text
BIẾN ĐỘNG CÔNG VIỆC

Mức độ trong năm:
Rất mạnh

Diễn biến thời gian:

Tháng 3 âm:
Tín hiệu bắt đầu tăng.

Tháng 4–5 âm:
Cửa sổ mạnh nhất.

Tháng 6 âm:
Xu hướng xác lập hoặc ổn định rõ hơn.
```

## 45. Narrative Rules

Claude may say:
- tín hiệu bắt đầu tăng
- giai đoạn đáng chú ý
- cửa sổ mạnh
- khả năng tập trung vào
- xu hướng xác lập

Claude must not say:
- chắc chắn xảy ra
- nhất định vào tháng 5
- 100%

## 46. Unit Tests

T001 — Dou Jun deterministic fixture  
T002 — Month sequence from Dou Jun  
T003 — Annual gate blocks weak annual event  
T004 — Monthly cannot create annual event  
T005 — Same-function overlap evidence  
T006 — Triple-level overlap stronger than two-level  
T007 — Four Transformation echo generated  
T008 — Event Axis Lock rejects unrelated monthly Lu  
T009 — Monthly Lu Cun/Qing/Tuo count as one family  
T010 — Adjacent strong months merge  
T011 — Unique peak requires >=12 point lead  
T012 — No false precision when adjacent scores close  
T013 — Health narrative safety  
T014 — Jieqi split keeps one monthly palace but allows different monthly Tứ Hóa

## 47. Golden-Test Fields

```ts
interface TimingGoldenCase {
  birthProfileId: string;
  eventType: EventType;

  actualYear: number;
  actualLunarMonth?: number;

  eventVerified: boolean;

  annualPrediction: {
    eventScore: number;
  };

  timingPrediction: {
    topMonths: number[];
    windows: TimingWindow[];
  };

  evaluation: {
    monthHit?: boolean;
    withinOneMonth?: boolean;
    falsePeak?: boolean;
    notes?: string;
  };
}
```

Recommended evaluation:
- exact lunar month hit
- ±1 lunar month hit
- top-2-window hit
- false strong-month count

Do not tune on one person's chart.

## 48. Implementation Priority

Phase 1:
- Dou Jun
- 12 monthly palace charts
- Event Axis Lock
- Same Function Overlap

Phase 2:
- Monthly Tứ Hóa
- Transformation Echo
- Cross-Layer Echo

Phase 3:
- Jieqi segmentation
- Monthly moving stars
- Convergence

Phase 4:
- Timing windows
- Phase classifier
- Narrative payload

Phase 5:
- Golden dataset
- Backtesting
- Weight calibration

## 49. Definition of Done

```text
✓ Dou Jun passes fixtures
✓ 12 monthly palace sequence is deterministic
✓ Monthly full 12-palace chart is available
✓ Event Axis Lock works
✓ Same-function overlap works
✓ Monthly Tứ Hóa is profile-configurable
✓ Jieqi/month-boundary policy is explicit
✓ Cross-layer echo works
✓ Evidence families prevent double counting
✓ Annual weak events cannot become strong monthly events
✓ Timing windows merge adjacent months
✓ Event phases are generated
✓ Developer trace is fully auditable
✓ Narrative LLM cannot alter timing
✓ Health/legal/finance wording safety tests pass
```

## 50. CLAUDE CODE INSTRUCTION

```text
Implement Monthly Event Timing Engine v2.0 exactly from this spec.

Important:
- Do not replace the existing Annual Event Engine.
- Monthly timing consumes AnnualEventPrediction as input.
- Do not let monthly rules create annual events.
- Keep all school-dependent rules configurable.
- Implement Dou Jun and monthly palace calculations as deterministic modules.
- Implement Monthly Tứ Hóa behind the selected school profile.
- Add cross-layer transformation echo.
- Add event-axis lock.
- Add evidence-family deduplication.
- Add timing windows and phase classification.
- Add full debug trace.
- Do not connect Claude narrative until all calculation tests pass.

Before coding:
1. Map each section of this spec to modules/files.
2. Create TypeScript interfaces.
3. Create fixtures for Dou Jun/month sequence.
4. Create tests T001–T014.
5. Then implement module-by-module.
```

## 51. Final Doctrine

```text
EVENT EXISTENCE
=
Natal
× Da Han
× Annual

EVENT TIMING
=
Annual Event
× Monthly Palace Resonance
× Monthly Four Transformations
× Cross-Layer Echo
× Dou Jun
× Supporting Monthly Signals
```

The key question is not:

```text
Which month has more good/bad stars?
```

The key question is:

```text
Which month most strongly re-activates
the SAME event axis already confirmed
at Da Han and Annual level?
```

That is the core logic of TUZI Monthly Event Timing Engine v2.0.
