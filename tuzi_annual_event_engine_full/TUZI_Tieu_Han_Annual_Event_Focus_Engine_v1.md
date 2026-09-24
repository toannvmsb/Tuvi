# TUZI Tiểu Hạn Annual Event Focus Engine v1.0
## Technical Specification for Claude Code

> Purpose: integrate **Tiểu Hạn Tam Hợp** as a first-class annual-event focus layer in the existing TUZI Annual Event Prediction Engine and Monthly Event Timing Engine.
>
> Default implementation profile: **Nam Phái / Tam Hợp**.
>
> Important: astrology calculations are deterministic and school-profile-driven. Claude/LLM is narrative-only.

---

## 1. Core Doctrine

```text
Natal = lifetime structure / event potential
Đại Hạn = 10-year background and event formation
Tiểu Hạn Tam Hợp = concrete annual event focus
Lưu Niên Đại Hạn = how the Đại Hạn expresses itself in this specific year
Lưu Thái Tuế = annual spotlight / activation
Annual Tứ Hóa = annual mechanism and direction
Annual Moving Stars = event-specific annual triggers
Lưu Nguyệt = timing of the annual event
Lưu Nhật = optional fine timing after month is established
```

Core rule:

```text
Đại Hạn says what the 10-year period can produce.
Tiểu Hạn says which themes/events become concrete this year.
Lưu Niên Đại Hạn says how the Đại Hạn is expressed this year.
Lưu Thái Tuế / Tứ Hóa / sao lưu activate the event.
Lưu Nguyệt determines when the event is most likely to manifest.
```

---

## 2. Do Not Conflate Annual Systems

The engine must keep these separate:

```text
TIEU_HAN_TAM_HOP
LUU_NIEN_DAI_HAN
LUU_THAI_TUE
ANNUAL_MING
```

They may overlap physically on the chart but represent different interpretation layers.

---

## 3. School Profile

```ts
interface TieuHanSchoolProfile {
  id: string;
  method: "NAM_PHAI_TAM_HOP" | "TAI_SUI_ANNUAL" | "PHI_TINH" | "CUSTOM";
  genderDirectionRule: "MALE_FORWARD_FEMALE_BACKWARD" | "CUSTOM";
  useSanFangTuChinh: boolean;
  useDignity: boolean;
  useFiveElementModifiers: boolean;
  useAnnualMovingStars: boolean;
  useLuuNienDaiHan: boolean;
  useLuuThaiTue: boolean;
  eventPriorMultipliers: {
    primaryDomain: number;
    secondaryDomain: number;
    unrelated: number;
    contradictory: number;
  };
  axisConvergenceMultipliers: {
    twoLayers: number;
    threeLayers: number;
    fourLayers: number;
    cap: number;
  };
}
```

Recommended TUZI default:

```json
{
  "id": "TUZI_TIEU_HAN_NAM_PHAI_V1",
  "method": "NAM_PHAI_TAM_HOP",
  "genderDirectionRule": "MALE_FORWARD_FEMALE_BACKWARD",
  "useSanFangTuChinh": true,
  "useDignity": true,
  "useFiveElementModifiers": true,
  "useAnnualMovingStars": true,
  "useLuuNienDaiHan": true,
  "useLuuThaiTue": true,
  "eventPriorMultipliers": {
    "primaryDomain": 1.25,
    "secondaryDomain": 1.12,
    "unrelated": 1.0,
    "contradictory": 0.90
  },
  "axisConvergenceMultipliers": {
    "twoLayers": 1.12,
    "threeLayers": 1.25,
    "fourLayers": 1.35,
    "cap": 1.40
  }
}
```

All numeric multipliers are **engineering heuristics v1**, not classical probabilities.

---

## 4. Nam Phái / Tam Hợp Tiểu Hạn Starting Palace

```text
Birth year Dần – Ngọ – Tuất  → start Thìn
Birth year Thân – Tý – Thìn  → start Tuất
Birth year Tỵ – Dậu – Sửu    → start Mùi
Birth year Hợi – Mão – Mùi   → start Sửu
```

Direction:

```text
Male   → forward
Female → backward
```

This rule is profile-specific and must not be hard-coded in the generic core.

```ts
function getTieuHanStartBranch(branch: EarthlyBranch): EarthlyBranch {
  if (["DAN","NGO","TUAT"].includes(branch)) return "THIN";
  if (["THAN","TY","THIN"].includes(branch)) return "TUAT";
  if (["TI","DAU","SUU"].includes(branch)) return "MUI";
  return "SUU";
}
```

The exact age offset must reuse the existing canonical age service in TUZI.

---

## 5. Tiểu Hạn Context

```ts
interface TieuHanContext {
  year: number;
  palace: Palace;
  physicalBranch: EarthlyBranch;
  natalOverlap: Palace;
  sanFangPalaces: Palace[];
  oppositePalace: Palace;
  majorStars: Star[];
  auxiliaryStars: Star[];
  beneficStars: Star[];
  maleficStars: Star[];
  dignityMap: Record<string, StarDignity>;
  movingStars: AnnualMovingStar[];
  fiveElementModifier?: number;
  daHanOverlap?: Palace;
  luuNienDaHanOverlap?: Palace;
  luuThaiTueOverlap?: Palace;
  patterns: TieuHanPattern[];
  primaryDomains: EventCategory[];
  secondaryDomains: EventCategory[];
  eventPriorBoost: Partial<Record<EventType, number>>;
}
```

---

## 6. Tiểu Hạn Is an Annual Event Focus Layer

Do **not** implement Tiểu Hạn as a flat score such as `8%`.

Use:

```text
Tiểu Hạn = domain prior
          + event prior
          + structure confirmation
          + moving-star interaction
          + direction modifier
```

Tiểu Hạn must execute **before EventDetector final scoring**.

---

## 7. 12-Palace Event-Domain Mapping

### Mệnh
Primary: SELF, IDENTITY, CAREER, HEALTH, PERSONAL_DIRECTION.
Boost: CAREER_ROLE_CHANGE, CAREER_JOB_CHANGE, HEALTH_ATTENTION, MOBILITY_ENVIRONMENT_CHANGE, REPUTATION_PUBLIC_VISIBILITY.

### Phụ Mẫu
Primary: PARENTS, AUTHORITY, DOCUMENTS, SUPPORT.
Boost: FAMILY_PARENT_EVENT, FAMILY_PARENT_HEALTH_ATTENTION, LEGAL_DOCUMENT_ERROR, LEGAL_CONTRACT, EDUCATION_CERTIFICATION.

### Phúc Đức
Primary: MENTAL_STATE, LONG_TERM_STABILITY, FAMILY_BACKGROUND, FINANCIAL_RESILIENCE, RELATIONSHIP_STABILITY, HEALTH_RESILIENCE.
Boost: HEALTH_STRESS, HEALTH_FATIGUE, FINANCE_ASSET_ACCUMULATION, RELATIONSHIP_DEEPENING, FAMILY_HOME_EVENT.

### Điền Trạch
Primary: PROPERTY, HOUSEHOLD, REAL_ESTATE, FAMILY_ASSET.
Boost: PROPERTY_PURCHASE, PROPERTY_SALE, PROPERTY_RELOCATION, PROPERTY_RENOVATION, PROPERTY_LARGE_EXPENSE, PROPERTY_FAMILY_ASSET, PROPERTY_INHERITANCE, PROPERTY_DISPUTE.

### Quan Lộc
Primary: CAREER, BUSINESS, REPUTATION, RESPONSIBILITY.
Boost: CAREER_PROMOTION, CAREER_JOB_CHANGE, CAREER_ROLE_CHANGE, CAREER_INTERNAL_TRANSFER, CAREER_NEW_PROJECT, CAREER_LEADERSHIP, CAREER_BUSINESS_START, CAREER_BUSINESS_EXPANSION, CAREER_WORK_PRESSURE, CAREER_RECOGNITION, REPUTATION_RECOGNITION.

### Nô Bộc
Primary: TEAM, PARTNER, COLLEAGUE, NETWORK, COLLABORATION.
Boost: CAREER_WORK_CONFLICT, CAREER_NEW_PROJECT, RELATIONSHIP_SOCIAL_EXPANSION, LEGAL_CONTRACT, LEGAL_DISPUTE, FINANCE_FINANCIAL_DISPUTE.

### Thiên Di
Primary: MOBILITY, EXTERNAL_ENVIRONMENT, TRAVEL, RELOCATION, OVERSEAS, EXTERNAL_OPPORTUNITY.
Boost: MOBILITY_TRAVEL, MOBILITY_FREQUENT_TRAVEL, MOBILITY_RELOCATION, MOBILITY_OVERSEAS, MOBILITY_WORK_TRAVEL, MOBILITY_ENVIRONMENT_CHANGE, CAREER_JOB_CHANGE.

### Tật Ách
Primary: HEALTH, STRESS, INTERRUPTION, TREATMENT, SAFETY.
Boost: HEALTH_ATTENTION, HEALTH_TREATMENT, HEALTH_MEDICAL_CHECK, HEALTH_SURGERY_SIGNAL, HEALTH_ACCIDENT_SIGNAL, HEALTH_INJURY_SIGNAL, HEALTH_STRESS, HEALTH_FATIGUE, HEALTH_RECOVERY.

Never infer severe disease from this palace alone.

### Tài Bạch
Primary: FINANCE, INCOME, EXPENSE, INVESTMENT, DEBT, ASSET.
Boost: FINANCE_INCOME_GROWTH, FINANCE_BONUS, FINANCE_WINDFALL, FINANCE_LARGE_INFLOW, FINANCE_LARGE_EXPENSE, FINANCE_CASHFLOW_PRESSURE, FINANCE_INVESTMENT, FINANCE_INVESTMENT_GAIN, FINANCE_INVESTMENT_LOSS, FINANCE_DEBT_INCREASE, FINANCE_DEBT_REDUCTION, FINANCE_ASSET_ACCUMULATION.

### Tử Tức
Primary: CHILDREN, CREATION, PROJECT_OUTPUT, LEGACY.
Boost: CHILD_PREGNANCY_SIGNAL, CHILD_BIRTH_SIGNAL, CHILD_EDUCATION_EVENT, CHILD_HEALTH_EVENT, CHILD_MAJOR_CHANGE, CAREER_NEW_PROJECT.

### Phu Thê
Primary: RELATIONSHIP, MARRIAGE, PARTNERSHIP.
Boost: RELATIONSHIP_NEW, RELATIONSHIP_DEEPENING, RELATIONSHIP_ENGAGEMENT, RELATIONSHIP_MARRIAGE, RELATIONSHIP_CONFLICT, RELATIONSHIP_DISTANCE, RELATIONSHIP_SEPARATION, RELATIONSHIP_RECONCILIATION.

### Huynh Đệ
Primary: SIBLINGS, PEERS, RESOURCE_SHARING, COOPERATION.
Boost: FAMILY_SIBLING_EVENT, CAREER_WORK_CONFLICT, LEGAL_DISPUTE, FINANCE_FINANCIAL_DISPUTE.

---

## 8. Primary vs Secondary Domains

Tiểu Hạn palace determines the primary domain.
Tam Phương Tứ Chính determines secondary domains.

Example:

```text
Tiểu Hạn at Quan Lộc
Primary: Career
Secondary via Mệnh/Tài/Di: Self, Finance, Mobility
```

---

## 9. Tam Phương Tứ Chính

Analyze:

```text
main Tiểu Hạn palace
+ two trine palaces
+ opposition palace
```

Recommended structural weights:

```text
Main palace   1.00
Opposition    0.85
Trine         0.70
Adjacent      0.25
```

Example:

```text
Tiểu Hạn Quan strong
Tài has Kỵ
Di has Kình
```

Result:

```text
career activity = strong
direction = mixed
```

Possible manifestation: job change, role change, greater responsibility, temporary cashflow pressure.

---

## 10. Major-Star Structure

Never map one star directly to one event.

Bad:

```text
Phá Quân = job change
```

Correct:

```text
Phá Quân
+ Career axis
+ movement/change support
+ Da Han support
+ annual activation
→ CAREER_CHANGE_PATTERN
```

---

## 11. Tiểu Hạn Pattern Engine

```ts
enum TieuHanPattern {
  CAREER_CHANGE,
  CAREER_PROMOTION,
  CAREER_PRESSURE,
  FINANCIAL_GAIN,
  FINANCIAL_OUTFLOW,
  PROPERTY_CHANGE,
  PROPERTY_FORMATION,
  RELATIONSHIP_FORMATION,
  RELATIONSHIP_CONFLICT,
  CHILD_EVENT,
  HEALTH_PRESSURE,
  MOBILITY_CHANGE,
  LEGAL_CONFLICT,
  REPUTATION_GAIN
}
```

Patterns create event candidates; they do not finalize events.

---

## 12. Dignity Modifier

Miếu/Vượng/Hãm adjusts direction/intensity, not event type.

```ts
function dignityModifier(d: StarDignity): number {
  if (d === "MIEU") return 1.08;
  if (d === "VUONG") return 1.06;
  if (d === "DAC") return 1.04;
  if (d === "HAM") return 0.92;
  return 1.00;
}
```

Engineering heuristic only.

---

## 13. Five-Element Modifier

Optional structural modifier:

```text
Palace generates native   +5%
Same element               +2%
Native generates palace   -3%
Palace controls native    -5%
Native controls palace    -2%
```

Must never override stronger event evidence.

---

## 14. Đại Hạn × Tiểu Hạn

```text
Strong Tiểu Hạn + supportive Đại Hạn
→ event can become major

Strong Tiểu Hạn + contradictory Đại Hạn
→ event stays local/limited

Weak Tiểu Hạn + strong Đại Hạn
→ event remains possible but is not focal this year
```

---

## 15. Lưu Niên Đại Hạn

Interpretation:

```text
Đại Hạn = 10-year environment
Tiểu Hạn = concrete annual focus
Lưu Niên Đại Hạn = direction of the Đại Hạn this year
```

If Tiểu Hạn and Lưu Niên Đại Hạn support the same axis, create a strong convergence signal.
If they contradict, reduce scale or produce a mixed direction.

---

## 16. Lưu Thái Tuế

Lưu Thái Tuế = annual spotlight / activation.

If Tiểu Hạn and Lưu Thái Tuế activate the same domain:

```text
ANNUAL_FOCUS_CONVERGENCE
```

Do not infer good/bad from Thái Tuế alone.

---

## 17. Annual Moving Stars

Required:

```text
Lưu Thái Tuế
Lưu Lộc Tồn
Lưu Kình Dương
Lưu Đà La
Lưu Thiên Mã
Lưu Tang Môn
Lưu Bạch Hổ
Lưu Thiên Khốc
Lưu Thiên Hư
```

Optional:

```text
Lưu Đào Hoa
Lưu Hồng Loan
Lưu Thiên Hỷ
```

---

## 18. Moving Stars Must Be Palace-Specific

Never:

```text
Lưu Thiên Mã = generic +10 movement
```

Use:

```text
movingStar × palace × eventType
```

Examples:

```text
Lưu Mã at Quan → CAREER_JOB_CHANGE / INTERNAL_TRANSFER / WORK_TRAVEL
Lưu Mã at Điền → PROPERTY_RELOCATION / PROPERTY_CHANGE
Lưu Mã at Di → MOBILITY_TRAVEL / MOBILITY_OVERSEAS
```

---

## 19. Lưu Lộc Tồn

Examples:

```text
Lộc at Tài → income/resource events
Lộc at Quan → career/resource events
Lộc at Điền → asset/property support
```

Lộc + Mã can create `LOC_MA_INTERACTION` where appropriate.

---

## 20. Lưu Kình / Lưu Đà

```text
Kình = direct friction / abrupt pressure / conflict
Đà = delay / drag / obstruction
```

Always interpret through the palace.

---

## 21. Tang/Hổ/Khốc/Hư

One evidence family:

```text
ANNUAL_ADVERSITY_CLUSTER
```

Meaning: stress, loss, disruption, sadness, difficulty, interruption.
Do not hard-code Tang = death.

---

## 22. Đào / Hồng / Hỷ

Use only as event-specific activators.

```text
Đào/Hồng/Hỷ → Phu → relationship prior ↑
Đào/Hồng/Hỷ → Tử → child/family celebration prior ↑
```

Never infer marriage or pregnancy from one star alone.

---

## 23. Tiểu Hạn Moving-Star Interaction

```ts
interface TieuHanMovingStarInteraction {
  star: AnnualMovingStar;
  physicalPalace: Palace;
  tieuHanRelation: "DIRECT" | "OPPOSITION" | "TRINE" | "UNRELATED";
  targetEvents: EventType[];
  contribution: number;
  polarity: "POSITIVE" | "NEGATIVE" | "ACTIVATING";
}
```

---

## 24. Tiểu Hạn Event Focus Object

```ts
interface TieuHanEventFocus {
  palace: Palace;
  natalOverlap: Palace;
  primaryDomains: EventCategory[];
  secondaryDomains: EventCategory[];
  eventPriorMultipliers: Partial<Record<EventType, number>>;
  patterns: TieuHanPattern[];
  movingStarInteractions: TieuHanMovingStarInteraction[];
  sanFangSupport: number;
  polarityModifier: {
    positive: number;
    negative: number;
  };
  evidence: Evidence[];
}
```

---

## 25. Event Prior Logic

Recommended:

```text
Primary domain event      ×1.25
Secondary domain event    ×1.12
Unrelated                 ×1.00
Contradictory             ×0.90
```

These are engineering heuristics.

---

## 26. Axis Convergence

Count independent layers supporting the same event axis:

```text
Da Han
Tiểu Hạn
Lưu Niên Đại Hạn
Lưu Thái Tuế
Annual Tứ Hóa
Annual Moving Stars
```

Create:

```text
ANNUAL_EVENT_AXIS_CONVERGENCE
```

Recommended multiplier:

```text
2 independent layers  ×1.12
3                     ×1.25
4+                    ×1.35
cap                   ×1.40
```

---

## 27. Annual Engine v3 Pipeline

```text
Natal
↓
Da Han
↓
Tieu Han Calculator
↓
Tieu Han Palace Analyzer
↓
Tieu Han Event Focus
↓
Luu Nien Dai Han
↓
Luu Thai Tue
↓
Annual Tứ Hóa
↓
Annual Moving Stars
↓
Event Candidate Generation
↓
Event-Specific Prior Adjustment
↓
Axis Convergence
↓
Conflict Resolver
↓
Cross-Event Resolver
↓
Annual Events
↓
Monthly Timing v3
```

---

## 28. Annual Event Score v3

Base score before Tiểu Hạn multiplier:

```text
Natal Potential             15%
Da Han Potential            25%
Annual Activation           15%
Annual Four Transform       10%
Lưu Niên Đại Hạn            10%
Moving Stars                10%
Structural Support          15%
```

Then:

```ts
finalScore = clamp(
  baseScore
  * tieuHanEventPriorMultiplier
  * axisConvergenceMultiplier
  * conflictMultiplier,
  0,
  100
);
```

All weights are engineering heuristics.

---

## 29. Generic Event Evaluation

```ts
function evaluateAnnualEvent(
  event: EventType,
  context: AnnualPredictionContext
): AnnualEventPrediction {

  const baseScore = calculateBaseAnnualScore(event, context);

  const tieuHanMultiplier =
    context.tieuHanEventFocus.eventPriorMultipliers[event] ?? 1.0;

  const convergenceMultiplier =
    calculateAnnualAxisConvergence(event, context);

  const conflictMultiplier =
    calculateConflictMultiplier(event, context);

  const finalScore = clamp(
    baseScore
      * tieuHanMultiplier
      * convergenceMultiplier
      * conflictMultiplier,
    0,
    100
  );

  return buildAnnualEventPrediction(event, finalScore, context);
}
```

---

## 30. EventDetector Integration

```ts
const candidates = EventCandidateEngine.generate(natal, daHan, annual);

const focusedCandidates =
  TieuHanEventFocusEngine.apply(candidates, tieuHanContext);

const finalEvents =
  AnnualEventScorerV3.score(focusedCandidates, fullContext);
```

---

## 31. Monthly Timing v3 Integration

Add:

```text
MONTHLY → TIEU_HAN
```

to existing cross-layer timing relationships.

Recommended priority:

```text
Monthly → Tieu Han event palace   1.00
Monthly → Annual event palace     1.00
Monthly → Luu Nien Dai Han        0.90
Monthly → Da Han                  0.80
Monthly → Natal                   0.65
```

---

## 32. Monthly Tiểu Hạn Resonance

Example:

```text
Tiểu Hạn = Điền
Event = PROPERTY_PURCHASE
```

A month receives extra timing weight if:

```text
Monthly Điền overlaps Tiểu Hạn palace
OR Monthly Tứ Hóa hits Tiểu Hạn Điền
OR Monthly Lộc/Mã activates Tiểu Hạn Điền
```

Internal signal:

```text
MONTHLY_TIEU_HAN_RESONANCE
```

---

## 33. Monthly Timing v3 Formula

```text
Event Palace Match                18%
Monthly Tứ Hóa                    18%
Annual Moving-Star Resonance      12%
Monthly Moving Stars              12%
Monthly → Tiểu Hạn Resonance      15%
Cross-Layer Echo                  15%
Event-Specific Pattern             7%
Dou Jun / Structure                3%
```

Do not include Annual Event score directly in the month-ranking formula.
Annual score = event strength only.

---

## 34. Relative Timing Ranking

Every annual event receives a month, regardless of annual score.

```ts
const monthScores = scoreAll12MonthsForEvent(event);
const primaryMonth = argmax(monthScores);
const median = medianScore(monthScores);
const relativeTimingIndex = primaryMonth.score - median;
```

Return:

```text
primaryMonth
secondaryMonths
timingConfidence
```

No event should return `no timing` solely because annual score is below 50.

---

## 35. Timing Confidence

```text
Top - Second >= 15 → HIGH
8–14               → MEDIUM
<8                  → LOW
```

This measures timing specificity, not event probability.

---

## 36. Annual Debug Output

```json
{
  "tieuHan": {
    "palace": "QUAN_LOC",
    "natalOverlap": "TAI_BACH",
    "primaryDomains": ["CAREER"],
    "secondaryDomains": ["FINANCE", "MOBILITY"],
    "patterns": ["CAREER_CHANGE", "CAREER_PROMOTION"],
    "movingStars": ["LUU_THIEN_MA", "LUU_LOC_TON"],
    "eventPriorMultipliers": {
      "CAREER_JOB_CHANGE": 1.25,
      "CAREER_PROMOTION": 1.25,
      "CAREER_RECOGNITION": 1.25,
      "FINANCE_INCOME_GROWTH": 1.12
    }
  }
}
```

---

## 37. Event Debug Trace

```json
{
  "event": "CAREER_JOB_CHANGE",
  "baseScore": 56,
  "tieuHanMultiplier": 1.25,
  "axisConvergenceMultiplier": 1.12,
  "conflictMultiplier": 0.95,
  "finalScore": 74.5,
  "evidence": [
    "Tiểu Hạn in Career",
    "Lưu Thiên Mã activates Career",
    "Da Han supports Career",
    "Lưu Niên Đại Hạn supports Finance/Career axis"
  ]
}
```

---

## 38. YAML Rules

### Primary domain prior

```yaml
id: TIEU_HAN_PRIMARY_DOMAIN_001
condition:
  event_category_matches_tieu_han_primary_domain: true
action:
  event_prior_multiplier: 1.25
evidence_family:
  TIEU_HAN_STRUCTURE
```

### Secondary domain prior

```yaml
id: TIEU_HAN_SECONDARY_DOMAIN_001
condition:
  event_category_matches_tieu_han_secondary_domain: true
action:
  event_prior_multiplier: 1.12
evidence_family:
  TIEU_HAN_STRUCTURE
```

### Career focus

```yaml
id: TIEU_HAN_CAREER_001
condition:
  tieu_han_palace:
    equals: QUAN_LOC
actions:
  primary_domains:
    - CAREER
    - REPUTATION
  boost_events:
    CAREER_PROMOTION: 1.25
    CAREER_JOB_CHANGE: 1.25
    CAREER_ROLE_CHANGE: 1.25
    CAREER_RECOGNITION: 1.25
    CAREER_WORK_PRESSURE: 1.20
evidence_family:
  TIEU_HAN_STRUCTURE
```

### Property focus

```yaml
id: TIEU_HAN_PROPERTY_001
condition:
  tieu_han_palace:
    equals: DIEN_TRACH
actions:
  primary_domains:
    - PROPERTY
  boost_events:
    PROPERTY_PURCHASE: 1.25
    PROPERTY_SALE: 1.25
    PROPERTY_RELOCATION: 1.25
    PROPERTY_RENOVATION: 1.25
    PROPERTY_LARGE_EXPENSE: 1.20
evidence_family:
  TIEU_HAN_STRUCTURE
```

### Tiểu Hạn + Lưu Mã

```yaml
id: TIEU_HAN_LUU_MA_001
condition:
  moving_star:
    equals: LUU_THIEN_MA
  relation_to_tieu_han:
    in: [DIRECT, TRINE, OPPOSITION]
action:
  generate_pattern:
    - MOVEMENT_CHANGE
evidence_family:
  MA_SYSTEM
```

### Axis convergence

```yaml
id: ANNUAL_AXIS_CONVERGENCE_001
condition:
  same_event_axis_active_in:
    min_layers: 3
  layers:
    - DA_HAN
    - TIEU_HAN
    - LUU_NIEN_DAI_HAN
    - LUU_THAI_TUE
action:
  multiplier: 1.25
evidence_family:
  ANNUAL_AXIS_CONVERGENCE
```

---

## 39. Code Architecture

```text
src/astrology/
  tieu-han/
    calculator.ts
    tieu-han.types.ts
    palace-analyzer.ts
    san-fang-analyzer.ts
    dignity-analyzer.ts
    five-element-modifier.ts

  tieu-han/patterns/
    pattern-engine.ts
    career-patterns.ts
    finance-patterns.ts
    property-patterns.ts
    relationship-patterns.ts
    health-patterns.ts
    mobility-patterns.ts

  tieu-han/moving-stars/
    moving-star-interaction.ts
    loc-ton-system.ts
    ma-system.ts
    adversity-cluster.ts
    romance-stars.ts

  tieu-han/events/
    event-domain-map.ts
    event-prior-engine.ts
    event-focus-engine.ts

  annual/
    luu-nien-dai-han.ts
    luu-thai-tue.ts
    annual-transformations.ts
    annual-moving-stars.ts

  scoring/
    annual-axis-convergence.ts
    annual-event-scorer-v3.ts

  timing/
    monthly-tieu-han-resonance.ts
    monthly-event-timing-v3.ts

  audit/
    tieu-han-trace.ts

  tests/tieu-han/
```

---

## 40. Unit Tests

```text
TH001 Start-branch groups
TH002 Male forward / Female backward
TH003 Palace-domain mapping
TH004 Primary-domain event prior
TH005 Secondary-domain support
TH006 Same moving star in different palaces yields different events
TH007 Phá Quân alone cannot create CAREER_JOB_CHANGE
TH008 Đại Hạn contradiction reduces Tiểu Hạn event
TH009 Lưu Niên Đại Hạn confirmation increases convergence
TH010 Lưu Thái Tuế same-axis convergence
TH011 Lộc/Kình/Đà evidence-family deduplication
TH012 Tang/Hổ/Khốc/Hư adversity-family deduplication
TH013 Health-safety wording and event restrictions
TH014 Monthly → Tiểu Hạn resonance raises matching month
TH015 Low annual-strength event still gets primary timing month
```

---

## 41. Golden Dataset

```ts
interface TieuHanGoldenCase {
  profileId: string;
  year: number;
  tieuHanPalace: Palace;
  verifiedEvents: {
    eventType: EventType;
    category: EventCategory;
    severity: "MINOR" | "MEDIUM" | "MAJOR";
    lunarMonth?: number;
  }[];
  predictedPrimaryDomains: EventCategory[];
  predictedEvents: EventType[];
  evaluation: {
    primaryDomainHit: boolean;
    eventHit: boolean;
    falsePositiveCount: number;
    timingHit?: boolean;
  };
}
```

Recommended calibration:

```text
>=50 charts  exploratory validation
>=200 charts serious weight tuning
use a holdout dataset before production
```

---

## 42. Explainability

Every event must answer “Why this event?”

Example:

```text
1. Đại Hạn supports Career.
2. Tiểu Hạn enters Career palace.
3. Lưu Thiên Mã activates Career axis.
4. Lưu Niên Đại Hạn supports Finance/Career.
5. Annual Tứ Hóa reactivates Career.
```

No user-visible conclusion should exist without a traceable reasoning chain.

---

## 43. Narrative Boundary

Claude may explain and summarize structured outputs.
Claude must not calculate Tiểu Hạn, move the palace, invent stars, change event score, change timing or create unsupported events.

---

## 44. Implementation Order

```text
Phase 1
Tiểu Hạn calculator + school profile + palace-domain mapping

Phase 2
Tam Phương Tứ Chính + star patterns + dignity + five elements

Phase 3
Annual moving-star interactions + event prior engine

Phase 4
Lưu Niên Đại Hạn + Lưu Thái Tuế convergence + Annual Scorer v3

Phase 5
Monthly → Tiểu Hạn resonance + Monthly Timing v3

Phase 6
Golden dataset + backtesting + calibration
```

---

## 45. Definition of Done

```text
✓ Tiểu Hạn calculation is school-profile-driven
✓ Nam Phái starting groups pass fixtures
✓ Male/Female direction passes fixtures
✓ 12-palace domain mapping exists
✓ Tam Phương Tứ Chính is analyzed
✓ Tiểu Hạn is an Event Focus layer, not flat 8%
✓ Annual moving stars are palace/event-specific
✓ Tiểu Hạn + Đại Hạn interaction works
✓ Tiểu Hạn + LNĐH convergence works
✓ Tiểu Hạn + Thái Tuế convergence works
✓ Event priors are event-specific
✓ Evidence families prevent double counting
✓ Annual Event Detector consumes Tiểu Hạn before final scoring
✓ Monthly Timing v3 reactivates Tiểu Hạn axis
✓ Every event gets a primary timing month
✓ All outputs are auditable
✓ Claude cannot alter calculations
```

---

## 46. Claude Code Kickoff Instruction

```text
Read this specification and integrate it into the existing TUZI Annual Event Prediction Engine.

Do not rewrite the entire engine.

Required changes:
1. Add school-profile-driven Tiểu Hạn Tam Hợp calculator.
2. Add Tiểu Hạn Context and 12-palace domain mapping.
3. Add Tam Phương Tứ Chính analysis.
4. Add Tiểu Hạn Event Focus Engine.
5. Replace flat Tiểu Hạn weighting with event-specific prior multipliers.
6. Add annual moving-star × palace × event interaction.
7. Add convergence across Đại Hạn, Tiểu Hạn, Lưu Niên Đại Hạn and Lưu Thái Tuế.
8. Update Annual Event Scorer to v3.
9. Add Monthly → Tiểu Hạn resonance into Monthly Event Timing v3.
10. Keep all calculations deterministic and auditable.
11. Create tests TH001–TH015 before narrative integration.
12. Do not allow Claude/LLM to calculate astrology or alter scores/timing.

Before implementation:
- Map every section to target source files.
- List school-dependent assumptions.
- Reuse canonical calendar/age/chart services.
- Add fixtures before changing production scoring.
- Keep rule versions backward compatible.
```

---

## 47. Final TUZI Logic

```text
EVENT POTENTIAL
= Natal × Da Han

EVENT FOCUS
= Tiểu Hạn × Lưu Niên Đại Hạn × Lưu Thái Tuế

EVENT MECHANISM
= Annual Tứ Hóa × Annual Moving Stars × Star Patterns

EVENT STRENGTH
= Potential × Focus × Mechanism × Convergence × Conflict Resolution

EVENT TIMING
= Monthly Relative Ranking
× Monthly Tứ Hóa
× Monthly Moving Stars
× Monthly → Tiểu Hạn Resonance
× Cross-Layer Echo
```

This architecture should be treated as the new annual-event framework for TUZI.
