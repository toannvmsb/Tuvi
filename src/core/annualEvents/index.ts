export * from './types';
export { computeAnnualPrediction } from './engine';
export { generateAnnualOfflineSummary } from './offlineSummary';
export { buildAnnualNarrativePrompt } from './narrativePrompt';
export { analyzeAnnualEventsWithAI } from './ai';
export { eventTitleOf, categoryTitleOf } from './eventTitles';
export { explainEvent, explainMonthWindow, type EventExplanation } from './explain';
export { INTENSITY_VN, CONFIDENCE_VN } from './labels';
export { ENGINE_VERSION, RULE_VERSION, SCHOOL_PROFILE_ID } from './config';
