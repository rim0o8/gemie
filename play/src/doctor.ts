import type { AppConfig, UserIO } from './types';

type ModelsResponse = {
  readonly models?: ReadonlyArray<{ readonly name?: string }>;
  readonly error?: {
    readonly code?: number;
    readonly message?: string;
    readonly status?: string;
  };
};

const endpoint = (apiKey: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

const liveWsEndpoint = (apiKey: string): string =>
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;

type SocketProbeResult = {
  readonly ok: boolean;
  readonly detail: string;
};

type DoctorDeps = {
  readonly fetcher?: typeof fetch;
  readonly probeLiveSocket?: (apiKey: string, model: string, timeoutMs: number) => Promise<SocketProbeResult>;
  readonly timeoutMs?: number;
};

const readJson = async (response: Response): Promise<ModelsResponse> => {
  try {
    return (await response.json()) as ModelsResponse;
  } catch {
    return {};
  }
};

const hasTargetModel = (models: ReadonlyArray<{ readonly name?: string }> | undefined, model: string): boolean =>
  (models ?? []).some((m) => (m.name ?? '').endsWith(`/${model}`));

const asErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'unknown error');

const defaultProbeLiveSocket = async (
  apiKey: string,
  _model: string,
  timeoutMs: number,
): Promise<SocketProbeResult> => {
  const WebSocketCtor = (globalThis as unknown as { WebSocket?: new (url: string) => any }).WebSocket;
  if (!WebSocketCtor) {
    return { ok: false, detail: 'WebSocket runtime is not available' };
  }

  return await new Promise<SocketProbeResult>((resolve) => {
    const ws = new WebSocketCtor(liveWsEndpoint(apiKey));
    const timer = setTimeout(() => {
      ws.close();
      resolve({ ok: false, detail: `timeout ${timeoutMs}ms` });
    }, timeoutMs);

    ws.onopen = () => {
      clearTimeout(timer);
      ws.close();
      resolve({ ok: true, detail: 'open' });
    };
    ws.onerror = () => {
      clearTimeout(timer);
      resolve({ ok: false, detail: 'error event' });
    };
    ws.onclose = (event: { code: number; reason: string }) => {
      clearTimeout(timer);
      if (event.code === 1000) {
        resolve({ ok: true, detail: `close ${event.code}` });
        return;
      }
      resolve({ ok: false, detail: `close code=${event.code} reason=${event.reason}` });
    };
  });
};

export const runDoctor = async (
  config: AppConfig,
  io: Pick<UserIO, 'print' | 'printError'>,
  deps: DoctorDeps = {},
): Promise<boolean> => {
  const fetcher = deps.fetcher ?? fetch;
  const probeLiveSocket = deps.probeLiveSocket ?? defaultProbeLiveSocket;
  const timeoutMs = deps.timeoutMs ?? 5000;

  io.print('doctor: Gemini API 接続診断を開始します');

  try {
    const response = await fetcher(endpoint(config.apiKey));
    const body = await readJson(response);

    if (!response.ok) {
      const status = body.error?.status ?? 'UNKNOWN_STATUS';
      const message = body.error?.message ?? 'unknown error';
      io.printError(`doctor: NG - models.list failed (${response.status} ${status}): ${message}`);
      return false;
    }

    const available = hasTargetModel(body.models, config.model);
    if (!available) {
      io.printError(`doctor: NG - target model not found: ${config.model}`);
      io.printError('doctor: モデル名を .env の GEMINI_LIVE_MODEL で変更してください');
      return false;
    }

    io.print(`doctor: OK - model available: ${config.model}`);
    const socketCheck = await probeLiveSocket(config.apiKey, config.model, timeoutMs);
    if (!socketCheck.ok) {
      io.printError(`doctor: NG - websocket failed: ${socketCheck.detail}`);
      return false;
    }

    io.print(`doctor: OK - websocket reachable (${socketCheck.detail})`);
    return true;
  } catch (error) {
    const message = asErrorMessage(error);
    io.printError(`doctor: NG - network/access error: ${message}`);
    return false;
  }
};
