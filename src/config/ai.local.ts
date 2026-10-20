import {AiConfig} from '../engine/aiProvider';

/**
 * Optional remote AI configuration.
 *
 * Kept out of the engine so credentials never live in application code, and
 * shipped with `enabled: false` so the app is fully offline by default.
 *
 * To try a live provider, fill in your own values here on your machine and do
 * NOT commit them. The app keeps working with the local deterministic engine
 * whether this is configured or not.
 */
export const AI_LOCAL_CONFIG: AiConfig = {
  enabled: false,
  // baseUrl: 'https://your-endpoint.example.com/v1',
  // apiKey: process.env.LUMA_AI_KEY ?? '',   // never bake a real key into the bundle
  // model: 'your-model-name',
  timeoutMs: 8000,
};
