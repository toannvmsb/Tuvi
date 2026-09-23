# CLAUDE CODE KICKOFF

Implement the TUZI Annual Event Prediction Engine described in this repository.

## Non-negotiable architecture

- deterministic astrology calculation layer
- profile-driven school conventions
- normalized AstrologySignal layer
- generic rule engine
- evidence-family deduplication
- convergence + conflict + cross-event resolvers
- monthly timing only after annual event exists
- complete reasoning trace
- narrative LLM only after calculation output

## First task

Before coding features, produce:
1. an implementation checklist mapped to ENGINE_SPEC.md sections;
2. interfaces/types for school profile, chart context, signal, event rule, event prediction;
3. fixture strategy for chart calculations;
4. rule-loader schema validation;
5. unit tests for suppression, double-counting, mixed direction, monthly cap.

Then implement module-by-module and keep the application build green.
