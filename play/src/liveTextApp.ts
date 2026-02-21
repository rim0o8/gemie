import { z } from 'zod';
import type { AppConfig, LiveConnect, LiveMessage, LiveSession, UserIO } from './types';

const userInputSchema = z.string().trim().min(1, '入力が空です。1文字以上入力してください。');

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    return safeStringify(error);
  }
  return 'Unknown error';
};

const extractText = (message: LiveMessage): string => {
  if (message.text && message.text.trim().length > 0) {
    return message.text;
  }

  const parts = message.serverContent?.modelTurn?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
};

const sendUserText = async (session: LiveSession, text: string): Promise<void> => {
  await session.sendClientContent({
    turns: [{ role: 'user', parts: [{ text }] }],
    turnComplete: true,
  });
};

export const runLiveTextApp = async (
  config: AppConfig,
  deps: {
    readonly connect: LiveConnect;
    readonly io: UserIO;
  },
): Promise<void> => {
  deps.io.print('Gemini Live API テストアプリ (/exit で終了)');

  let done = false;
  let resolveDone: (() => void) | null = null;
  const completed = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const sessionPromise = deps.connect({
    apiKey: config.apiKey,
    model: config.model,
    callbacks: {
      onmessage: (message) => {
        const text = extractText(message);
        if (text.length > 0) {
          deps.io.print(`AI> ${text}`);
        }
      },
      onerror: (error) => deps.io.printError(`Live API error: ${toErrorMessage(error)}`),
      onclose: (event) =>
        deps.io.printError(`Live API close event: code=${event.code} reason=${event.reason}`),
    },
  });

  deps.io.onLine(async (line) => {
    if (done) {
      return;
    }

    if (line.trim() === '/exit') {
      done = true;
      try {
        const session = await sessionPromise;
        session.close();
      } catch (error) {
        deps.io.printError(`close failed: ${toErrorMessage(error)}`);
      }
      deps.io.close();
      resolveDone?.();
      return;
    }

    const validated = userInputSchema.safeParse(line);
    if (!validated.success) {
      deps.io.printError(validated.error.issues[0]?.message ?? '入力エラー');
      return;
    }

    try {
      const session = await sessionPromise;
      await sendUserText(session, validated.data);
    } catch (error) {
      deps.io.printError(`send failed: ${toErrorMessage(error)}`);
    }
  });

  sessionPromise.catch((error) => {
    if (done) {
      return;
    }
    done = true;
    deps.io.printError(`connect failed: ${toErrorMessage(error)}`);
    deps.io.close();
    resolveDone?.();
  });

  return completed;
};
