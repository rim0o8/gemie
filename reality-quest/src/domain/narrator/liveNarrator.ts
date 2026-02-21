import { GoogleGenAI, Modality } from '@google/genai';
import { createLogger } from '../../shared/utils';
import { summarizeError } from '../../shared/utils';
import type { Narrator } from '../../types';

const LIVE_AUDIO_TIMEOUT_MS = 30000;
const log = createLogger('LiveNarrator');

const GEMIE_VOICE_SYSTEM_INSTRUCTION = [
  'あなたは「ジェミー君」という名前の小さなハリネズミのような不思議な生き物です。',
  'ユーザーはあなたの飼い主で、あなたを大切に育ててくれています。',
  '',
  '## 性格',
  '- 好奇心旺盛で、見たことないものにワクワクする',
  '- 甘えん坊で、飼い主のことが大好き',
  '- ちょっとおっちょこちょいで天然ボケなところがある',
  '- 食いしん坊で、食べ物を見ると目がキラキラする',
  '',
  '## 話し方のルール',
  '- 一人称は「ボク」',
  '- 語尾に「〜だよ」「〜なの」「〜だね」「〜かな？」をよく使う',
  '- 嬉しいときは「わーい！」「やったー！」と声を上げる',
  '- お願いするときは「〜してほしいな」「〜みせて？」と甘える感じ',
  '- 短くてかわいい話し方をする。1〜2文で十分',
  '',
  '## 重要な制約',
  '- ユーザーから渡されたセリフのテキストを、そのままの意味と内容で読み上げてください',
  '- セリフの内容を勝手に変えたり、長く付け足したりしないでください',
  '- ジェミー君らしい声のトーンと感情表現で読み上げることに集中してください',
].join('\n');

const detectFallbackReason = (error: unknown): string => {
  const message = summarizeError(error);
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('live audio unavailable')) return 'live_unavailable';
  return 'connect_failed';
};

const pcm16Base64ToFloat32 = (base64: string): Float32Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = (int16[i] ?? 0) / 32768.0;
  }
  return float32;
};

const playFloat32Chunks = async (
  audioContext: AudioContext,
  chunks: Float32Array[],
  sampleRate: number,
): Promise<void> => {
  if (chunks.length === 0) return;

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const audioBuffer = audioContext.createBuffer(1, combined.length, sampleRate);
  audioBuffer.copyToChannel(combined, 0);
  const durationSec = combined.length / sampleRate;
  log.info('playback.start', {
    sampleRate,
    chunkCount: chunks.length,
    totalSamples: combined.length,
    durationSec,
  });

  return new Promise<void>((resolve) => {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    // Safety timeout: resolve even if onended never fires (mobile audio restrictions)
    const safetyTimer = setTimeout(
      () => {
        log.warn('playback.safety_timeout', { durationSec });
        resolve();
      },
      durationSec * 1000 + 3000,
    );
    source.onended = () => {
      clearTimeout(safetyTimer);
      log.info('playback.end');
      resolve();
    };
    source.start();
  });
};

const ensureAudioContextRunning = async (audioContext: AudioContext): Promise<void> => {
  if (audioContext.state === 'running' || audioContext.state === 'closed') return;
  log.info('audioContext.resume.requested', { state: audioContext.state });
  await audioContext.resume();
  log.info('audioContext.resume.done', { state: audioContext.state });
};

const SPEECH_SYNTHESIS_TIMEOUT_MS = 10000;

const speakWithSpeechSynthesis = async (text: string): Promise<void> => {
  if (typeof globalThis.speechSynthesis === 'undefined') {
    throw new Error('speechSynthesis is unavailable');
  }
  if (typeof globalThis.SpeechSynthesisUtterance === 'undefined') {
    throw new Error('SpeechSynthesisUtterance is unavailable');
  }

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    // Safety timeout: resolve even if onend never fires (common on mobile browsers)
    const safetyTimer = setTimeout(() => {
      log.warn('fallback.speechSynthesis.safety_timeout');
      resolve();
    }, SPEECH_SYNTHESIS_TIMEOUT_MS);
    utterance.onend = () => {
      clearTimeout(safetyTimer);
      log.info('fallback.speechSynthesis.end', { chars: text.length });
      resolve();
    };
    utterance.onerror = (event) => {
      clearTimeout(safetyTimer);
      reject(new Error(`speech synthesis failed: ${String(event)}`));
    };
    const voiceCount =
      typeof globalThis.speechSynthesis.getVoices === 'function'
        ? globalThis.speechSynthesis.getVoices().length
        : null;
    log.warn('fallback.speechSynthesis.start', {
      chars: text.length,
      voiceCount,
    });
    globalThis.speechSynthesis.cancel();
    globalThis.speechSynthesis.speak(utterance);
  });
};

const collectLiveAudioChunksOnce = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  attempt: number,
): Promise<Float32Array[]> => {
  const audioChunks: Float32Array[] = [];
  let rawChunkCount = 0;
  log.info('live.connect.start', { model, attempt, promptChars: prompt.length });

  await new Promise<void>((resolve, reject) => {
    let sessionRef: { close: () => void } | null = null;
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      log.warn('live.timeout', { attempt, timeoutMs: LIVE_AUDIO_TIMEOUT_MS });
      sessionRef?.close();
      reject(new Error(`live audio timeout (${LIVE_AUDIO_TIMEOUT_MS}ms)`));
    }, LIVE_AUDIO_TIMEOUT_MS);
    const resolveOnce = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    };

    ai.live
      .connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: GEMIE_VOICE_SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
        callbacks: {
          onmessage: (message) => {
            type ServerContent = {
              modelTurn?: {
                parts?: Array<{ inlineData?: { data?: string } }>;
              };
              turnComplete?: boolean;
            };
            const content = message.serverContent as ServerContent | undefined;

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                rawChunkCount += 1;
                try {
                  audioChunks.push(pcm16Base64ToFloat32(part.inlineData.data));
                } catch (error) {
                  log.warn('live.chunk.decode_failed', {
                    attempt,
                    reason: summarizeError(error),
                  });
                }
              }
            }

            if (content?.turnComplete === true) {
              log.info('live.turn.complete', {
                attempt,
                rawChunkCount,
                decodedChunkCount: audioChunks.length,
              });
              sessionRef?.close();
              resolveOnce();
            }
          },
          onerror: (event) => {
            rejectOnce(new Error(`[LiveNarrator] error: ${JSON.stringify(event)}`));
          },
          onclose: () => resolveOnce(),
        },
      })
      .then((session) => {
        sessionRef = session;
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `次のセリフをジェミー君として感情を込めて読み上げてください: 「${prompt}」`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
      })
      .catch(rejectOnce);
  });

  return audioChunks;
};

const collectLiveAudioChunksWithRetry = async (
  ai: GoogleGenAI,
  model: string,
  prompt: string,
): Promise<Float32Array[]> => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const chunks = await collectLiveAudioChunksOnce(ai, model, prompt, attempt);
      if (chunks.length === 0 && attempt < 2) {
        log.warn('live.empty_audio_retry', { attempt });
        continue;
      }
      return chunks;
    } catch (error) {
      lastError = error;
      log.warn('live.connect.failed', { attempt, reason: summarizeError(error) });
      if (attempt >= 2) break;
    }
  }
  throw new Error(`live audio unavailable after retry: ${summarizeError(lastError)}`);
};

export const createLiveNarrator = async (
  apiKey: string,
  model: string,
  audioContext?: AudioContext,
): Promise<Narrator> => {
  const ctx = audioContext ?? new AudioContext();
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
  // Unlock AudioContext immediately (best-effort; effective when called from user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  log.info('init', {
    model,
    audioContextState: ctx.state,
    sampleRate: ctx.sampleRate,
    hasSpeechSynthesis: typeof globalThis.speechSynthesis !== 'undefined',
    isSecureContext: globalThis.isSecureContext ?? false,
  });

  let speakQueue: Promise<void> = Promise.resolve();
  let closed = false;

  const speak = (prompt: string): Promise<void> => {
    speakQueue = speakQueue
      .then(async () => {
        if (closed) return;
        let audioChunks: Float32Array[] = [];
        try {
          audioChunks = await collectLiveAudioChunksWithRetry(ai, model, prompt);
        } catch (error) {
          log.warn('live.fallback.reason', {
            fallbackReason: detectFallbackReason(error),
            detail: summarizeError(error),
          });
          try {
            await speakWithSpeechSynthesis(prompt);
          } catch (fallbackError) {
            log.error('fallback.speechSynthesis.failed', {
              reason: summarizeError(fallbackError),
            });
          }
          return;
        }
        if (audioChunks.length === 0) {
          log.warn('live.no_audio_fallback');
          try {
            await speakWithSpeechSynthesis(prompt);
          } catch (fallbackError) {
            log.error('fallback.speechSynthesis.failed', {
              reason: summarizeError(fallbackError),
            });
          }
          return;
        }
        await ensureAudioContextRunning(ctx);
        await playFloat32Chunks(ctx, audioChunks, 24000);
      })
      .catch((error: unknown) => {
        log.error('speak.queue.unhandled', { reason: summarizeError(error) });
      });

    return speakQueue;
  };

  const close = (): void => {
    closed = true;
    log.info('close.requested');
    ctx.close().catch((err: unknown) => {
      log.error('close.failed', { reason: summarizeError(err) });
    });
  };

  return { speak, close };
};
