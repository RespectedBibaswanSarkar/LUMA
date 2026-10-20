import {Intent} from './types';
import {parseIntent} from './intentParser';

/**
 * AI provider abstraction.
 *
 * HONEST STATUS (see README "AI disclosures"):
 *   - `LocalAiProvider` is the default, fully offline, deterministic engine.
 *     It is what ships enabled and what the demo runs on.
 *   - `RemoteChatProvider` is a real client for any OpenAI-compatible
 *     chat-completions endpoint. It is implemented and unit-tested against a
 *     stubbed fetch, but it has NOT been exercised against a live provider in
 *     this environment: no credentials are configured and no key is embedded
 *     in the bundle. It stays disabled until a config file is supplied.
 *
 * The remote path is optional and never required: every failure mode falls
 * back to the local deterministic parser.
 */

export interface AiProviderRequest {
  utterance: string;
  current: Intent;
  hasGroup: boolean;
}

export interface AiProviderResponse {
  intent: Intent;
  /** Short human sentence describing what the provider understood. */
  explanation: string;
  /** Which provider actually produced this result. */
  provider: string;
  /** True when the remote provider failed and the local engine answered. */
  fellBack: boolean;
}

export interface AiProvider {
  readonly name: string;
  readonly kind: 'local' | 'remote';
  understand(request: AiProviderRequest): Promise<AiProviderResponse>;
}

/** Runtime configuration for the optional remote provider. */
export interface AiConfig {
  enabled: boolean;
  /** OpenAI-compatible base URL, e.g. https://api.example.com/v1 */
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  timeoutMs: 8000,
};

export const createDefaultConfig = (): AiConfig => {
  try {
    // Local, developer-owned override. Shipped disabled so the app is fully
    // offline unless someone deliberately configures a provider.
    const local = require('../config/ai.local') as {AI_LOCAL_CONFIG?: AiConfig};
    if (local?.AI_LOCAL_CONFIG) {
      return {...DEFAULT_AI_CONFIG, ...local.AI_LOCAL_CONFIG};
    }
  } catch {
    // No local config — remote provider stays disabled.
  }
  return {...DEFAULT_AI_CONFIG};
};

export class LocalAiProvider implements AiProvider {
  readonly name = 'LUMA local engine';
  readonly kind = 'local' as const;

  async understand(request: AiProviderRequest): Promise<AiProviderResponse> {
    const parse = parseIntent(request.utterance, request.current, {
      hasGroup: request.hasGroup,
    });
    return {
      intent: parse.intent,
      explanation: parse.needsClarification
        ? (parse.clarification ?? 'Could you rephrase that?')
        : parse.changes.length
          ? parse.changes.map(c => c.label).join(', ')
          : 'Request updated.',
      provider: this.name,
      fellBack: false,
    };
  }
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(item => typeof item === 'string');

const INTENSITIES = ['low', 'medium', 'high'];

/**
 * Validate an untrusted model response into a typed Intent.
 * Anything malformed returns null so the caller can fall back.
 */
export const validateIntent = (raw: unknown): Intent | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const intent: Intent = {
    genres: isStringArray(o.genres) ? o.genres.slice(0, 12) : [],
    moods: isStringArray(o.moods) ? o.moods.slice(0, 12) : [],
    excludedGenres: isStringArray(o.excludedGenres) ? o.excludedGenres.slice(0, 12) : [],
    requireFamilyFriendly: o.requireFamilyFriendly === true,
    noScary: o.noScary === true,
    groupIds: [],
  };
  if (typeof o.maxRuntimeMin === 'number' && o.maxRuntimeMin > 0 && o.maxRuntimeMin <= 600) {
    intent.maxRuntimeMin = Math.round(o.maxRuntimeMin);
  }
  if (typeof o.minRuntimeMin === 'number' && o.minRuntimeMin > 0 && o.minRuntimeMin <= 600) {
    intent.minRuntimeMin = Math.round(o.minRuntimeMin);
  }
  if (typeof o.maxIntensity === 'string' && INTENSITIES.includes(o.maxIntensity)) {
    intent.maxIntensity = o.maxIntensity as Intent['maxIntensity'];
  }
  if (typeof o.language === 'string' && o.language.length <= 24) {
    intent.language = o.language;
  }
  const usable =
    intent.genres.length > 0 ||
    intent.moods.length > 0 ||
    intent.excludedGenres.length > 0 ||
    intent.maxRuntimeMin !== undefined ||
    intent.minRuntimeMin !== undefined ||
    intent.requireFamilyFriendly ||
    intent.noScary ||
    intent.maxIntensity !== undefined ||
    intent.language !== undefined;
  // A response with nothing usable in it is malformed, not "no constraints".
  return usable ? intent : null;
};

export class RemoteChatProvider implements AiProvider {
  readonly name: string;
  readonly kind = 'remote' as const;

  constructor(
    private readonly config: AiConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.name = `Remote (${config.model ?? 'unspecified model'})`;
  }

  async understand(request: AiProviderRequest): Promise<AiProviderResponse> {
    const fallback = await new LocalAiProvider().understand(request);
    if (!this.config.enabled || !this.config.baseUrl || !this.config.apiKey) {
      return {...fallback, provider: this.name, fellBack: true};
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 8000);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You convert a TV viewer request into JSON with keys genres, moods, excludedGenres, maxRuntimeMin, minRuntimeMin, requireFamilyFriendly, noScary, maxIntensity, language. Return JSON only.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                utterance: request.utterance,
                previous: request.current,
              }),
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        return {...fallback, provider: this.name, fellBack: true};
      }
      const payload = (await response.json()) as {
        choices?: {message?: {content?: string}}[];
      };
      const content = payload?.choices?.[0]?.message?.content ?? '';
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      const parsed =
        jsonStart >= 0 && jsonEnd > jsonStart
          ? validateIntent(JSON.parse(content.slice(jsonStart, jsonEnd + 1)))
          : null;
      if (!parsed) {
        return {...fallback, provider: this.name, fellBack: true};
      }
      return {
        intent: parsed,
        explanation: 'Interpreted by the configured language model.',
        provider: this.name,
        fellBack: false,
      };
    } catch {
      // Timeout, rate limit, malformed payload, offline — all fall back.
      return {...fallback, provider: this.name, fellBack: true};
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Build the provider stack: remote if configured, local otherwise. */
export const createAiProvider = (config: AiConfig = createDefaultConfig()): AiProvider =>
  config.enabled ? new RemoteChatProvider(config) : new LocalAiProvider();
