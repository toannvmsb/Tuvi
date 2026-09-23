# TUZI Annual Event Prediction Engine — Full Pack

This package is intended to be handed directly to Claude Code.

## Included

- Full implementation spec
- 85 event ontology entries
- 1343 generated baseline/special rules
- school profile configuration
- scoring and gating
- conflict and cross-event rules
- JSON schemas
- narrative prompt
- unit-test specification
- golden-dataset template

## Start here

1. `ENGINE_SPEC.md`
2. `config/schools/nam_phai_tam_hop_v1.json`
3. `config/events/event_definitions.json`
4. `rules/annual_event_rules_v1.yaml`
5. `rules/cross_event_rules_v1.yaml`
6. `rules/conflict_rules_v1.yaml`
7. `tests/unit_test_spec.json`

## Critical rule

Claude/LLM is narrative-only. It must never calculate or override astrology outputs.

## Important

This pack deliberately separates traditional Tử Vi configuration from engineering scoring heuristics.
All scoring weights are v1 implementation heuristics and should be calibrated with a verified golden dataset.
