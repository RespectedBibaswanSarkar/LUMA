import {
  createAiProvider,
  DEFAULT_AI_CONFIG,
  LocalAiProvider,
  RemoteChatProvider,
  validateIntent,
  AiConfig,
} from '../src/engine/aiProvider';
import {EMPTY_INTENT} from '../src/engine/types';

const request = (utterance: string) => ({
  utterance,
  current: {...EMPTY_INTENT},
  hasGroup: false,
});

const configured: AiConfig = {
  enabled: true,
  baseUrl: 'https://unit.test/v1',
  apiKey: 'test-key',
  model: 'test-model',
  timeoutMs: 1000,
};

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

describe('LocalAiProvider', () => {
  it('answers deterministically with the local parser', async () => {
    const provider = new LocalAiProvider();
    const a = await provider.understand(request('a funny family film under 90 minutes'));
    const b = await provider.understand(request('a funny family film under 90 minutes'));
    expect(a.intent).toEqual(b.intent);
    expect(a.fellBack).toBe(false);
    expect(a.intent.maxRuntimeMin).toBe(90);
  });
});

describe('validateIntent', () => {
  it('accepts a well-formed payload', () => {
    const intent = validateIntent({
      genres: ['comedy'],
      moods: ['funny'],
      excludedGenres: ['horror'],
      maxRuntimeMin: 95,
      requireFamilyFriendly: true,
      noScary: true,
      maxIntensity: 'low',
      language: 'Hindi',
    });
    expect(intent).not.toBeNull();
    expect(intent!.maxRuntimeMin).toBe(95);
    expect(intent!.language).toBe('Hindi');
  });

  it('rejects non-objects, repairs malformed fields, and drops empty payloads', () => {
    expect(validateIntent(null)).toBeNull();
    expect(validateIntent('comedy')).toBeNull();
    const repaired = validateIntent({
      genres: 'comedy',
      moods: [1, 2],
      maxRuntimeMin: -5,
      maxIntensity: 'apocalyptic',
      requireFamilyFriendly: 'yes',
      noScary: true,
    });
    expect(repaired).not.toBeNull();
    expect(repaired!.genres).toEqual([]);
    expect(repaired!.moods).toEqual([]);
    expect(repaired!.maxRuntimeMin).toBeUndefined();
    expect(repaired!.maxIntensity).toBeUndefined();
    expect(repaired!.requireFamilyFriendly).toBe(false);
    expect(repaired!.noScary).toBe(true);
    // Nothing usable left in the payload => malformed, not "no constraints".
    expect(
      validateIntent({genres: 'comedy', maxRuntimeMin: -5, maxIntensity: 'apocalyptic'}),
    ).toBeNull();
  });

  it('clamps absurd runtimes', () => {
    expect(validateIntent({genres: ['comedy'], maxRuntimeMin: 99999})!.maxRuntimeMin).toBeUndefined();
  });
});

describe('RemoteChatProvider', () => {
  it('falls back to local when disabled', async () => {
    const provider = new RemoteChatProvider({...DEFAULT_AI_CONFIG, enabled: false});
    const result = await provider.understand(request('a comedy under 90 minutes'));
    expect(result.fellBack).toBe(true);
    expect(result.intent.maxRuntimeMin).toBe(90);
  });

  it('falls back on a non-2xx response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, false, 429));
    const provider = new RemoteChatProvider(configured, fetchImpl as unknown as typeof fetch);
    const result = await provider.understand(request('a comedy under 90 minutes'));
    expect(result.fellBack).toBe(true);
    expect(result.intent.maxRuntimeMin).toBe(90);
  });

  it('falls back on malformed model output', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({choices: [{message: {content: 'not json at all'}}]}));
    const provider = new RemoteChatProvider(configured, fetchImpl as unknown as typeof fetch);
    const result = await provider.understand(request('a comedy under 90 minutes'));
    expect(result.fellBack).toBe(true);
  });

  it('falls back when the model returns an unusable schema', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({choices: [{message: {content: '{"maxRuntimeMin":"soon"}'}}]}),
      );
    const provider = new RemoteChatProvider(configured, fetchImpl as unknown as typeof fetch);
    const result = await provider.understand(request('a comedy under 90 minutes'));
    expect(result.fellBack).toBe(true);
  });

  it('falls back when the network throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const provider = new RemoteChatProvider(configured, fetchImpl as unknown as typeof fetch);
    const result = await provider.understand(request('a comedy under 90 minutes'));
    expect(result.fellBack).toBe(true);
    expect(result.intent.genres).toContain('comedy');
  });

  it('uses a valid model response when one arrives', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content:
                'Here you go: {"genres":["drama"],"moods":["thoughtful"],"maxRuntimeMin":110,"noScary":true}',
            },
          },
        ],
      }),
    );
    const provider = new RemoteChatProvider(configured, fetchImpl as unknown as typeof fetch);
    const result = await provider.understand(request('a thoughtful drama under two hours'));
    expect(result.fellBack).toBe(false);
    expect(result.intent.genres).toEqual(['drama']);
    expect(result.intent.maxRuntimeMin).toBe(110);
    expect(result.intent.noScary).toBe(true);
  });
});

describe('createAiProvider', () => {
  it('defaults to the offline engine', () => {
    expect(createAiProvider().kind).toBe('local');
  });

  it('uses the remote provider only when enabled', () => {
    expect(createAiProvider(configured).kind).toBe('remote');
  });
});
