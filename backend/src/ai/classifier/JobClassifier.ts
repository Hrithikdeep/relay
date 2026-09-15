import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export type JobCategory =
  | 'email'
  | 'webhook'
  | 'database'
  | 'image'
  | 'payment'
  | 'notification'
  | 'analytics'
  | 'other';

export interface JobClassification {
  category: JobCategory;
  estimatedDurationSeconds: number;
  riskScore: number;
  priority: number;
  confidence: number;
  reasoning: string;
}

const CATEGORIES: JobCategory[] = [
  'email',
  'webhook',
  'database',
  'image',
  'payment',
  'notification',
  'analytics',
  'other',
];

const DEFAULT_CLASSIFICATION: JobClassification = {
  category: 'other',
  estimatedDurationSeconds: 30,
  riskScore: 0.5,
  priority: 0,
  confidence: 0,
  reasoning: 'AI classification unavailable; returning default classification.',
};

const classificationPrompt = PromptTemplate.fromTemplate(
  `You are a background job classification system for an AI-native job queue platform.

Classify the job below and respond with ONLY a raw JSON object (no markdown, no code fences, no extra text) matching exactly this shape:
{{
  "category": one of [{categories}],
  "estimatedDurationSeconds": number,
  "riskScore": number between 0 and 1,
  "priority": integer between 0 and 10,
  "confidence": number between 0 and 1,
  "reasoning": short string explaining the classification
}}

Job name: {jobName}
Job description: {description}
Job payload (JSON): {payload}`
);

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function parseClassificationResponse(raw: string): JobClassification {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const data = JSON.parse(cleaned) as Partial<JobClassification>;

  const category = CATEGORIES.includes(data.category as JobCategory)
    ? (data.category as JobCategory)
    : DEFAULT_CLASSIFICATION.category;

  return {
    category,
    estimatedDurationSeconds:
      Number(data.estimatedDurationSeconds) || DEFAULT_CLASSIFICATION.estimatedDurationSeconds,
    riskScore: clamp(Number(data.riskScore), 0, 1, DEFAULT_CLASSIFICATION.riskScore),
    priority: clamp(Number(data.priority), 0, 10, DEFAULT_CLASSIFICATION.priority),
    confidence: clamp(Number(data.confidence), 0, 1, DEFAULT_CLASSIFICATION.confidence),
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : 'No reasoning provided.',
  };
}

export async function classifyJob(
  jobName: string,
  jobPayload: unknown,
  description?: string
): Promise<JobClassification> {
  if (!config.openai.apiKey) {
    logger.info(`Skipping AI classification for "${jobName}" - no OpenAI API key configured`);
    return DEFAULT_CLASSIFICATION;
  }

  try {
    const model = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      model: config.openai.model,
      temperature: 0,
    });

    const chain = classificationPrompt.pipe(model);

    const response = await chain.invoke({
      jobName,
      description: description ?? 'none provided',
      payload: JSON.stringify(jobPayload ?? {}),
      categories: CATEGORIES.join(', '),
    });

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return parseClassificationResponse(content);
  } catch (error) {
    logger.error(`AI classification failed for "${jobName}":`, error);
    return DEFAULT_CLASSIFICATION;
  }
}
