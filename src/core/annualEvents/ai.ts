/**
 * Lối vào gọi AI cho Luận sự kiện năm — soạn prompt (narrativePrompt.ts) rồi gọi qua
 * utils/aiAnalysis.ts (dùng chung proxy/BYOK/fallback với mọi màn AI khác của app).
 */
import type { AstrologyResult } from '../../types';
import type { AIKeys } from '../../utils/aiAnalysis';
import { requestAnnualEventsNarrative } from '../../utils/aiAnalysis';
import type { AnnualPrediction } from './types';
import { buildAnnualNarrativePrompt } from './narrativePrompt';

export async function analyzeAnnualEventsWithAI(result: AstrologyResult, pred: AnnualPrediction): Promise<string> {
  const prompt = buildAnnualNarrativePrompt(pred, result.birthInfo.name);
  const keys: AIKeys = {
    anthropicApiKey: result.birthInfo.anthropicApiKey,
    openaiApiKey: result.birthInfo.openaiApiKey,
    aiProvider: result.birthInfo.aiProvider,
  };
  return requestAnnualEventsNarrative(prompt, keys);
}
