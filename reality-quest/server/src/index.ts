import { parseServerEnv } from './env';
import { createMemorySummaryService } from './memorySummaryService';
import { memoryItemSchema, saveMemoryInputSchema } from './schemas';
import { createPostgresService } from './postgresService';
import { createServer } from 'node:net';

const env = parseServerEnv(process.env);
const postgres = createPostgresService({
  databaseUrl: env.databaseUrl,
  tableName: env.memoriesTable,
});
const summaryService = createMemorySummaryService({
  apiKey: env.googleApiKey,
  model: env.geminiTextModel,
});

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
  });

const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new Error('Invalid JSON body');
  }
};

const handleCreateMemory = async (request: Request): Promise<Response> => {
  const raw = await readJsonBody(request);
  const parsed = saveMemoryInputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(400, { error: 'Invalid request', details: parsed.error.flatten() });
  }

  try {
    const imageUrl = `data:image/jpeg;base64,${parsed.data.imageBase64.replace(/^data:[^,]+,/, '')}`;
    const summary = await summaryService.summarize(parsed.data);
    const emotionTag = parsed.data.matchedObjects[0] ?? null;
    const item = await postgres.insertMemory({
      imageUrl,
      summary,
      sourceRequestId: parsed.data.sourceRequestId,
      emotionTag,
    });
    return jsonResponse(201, { item: memoryItemSchema.parse(item) });
  } catch (error) {
    return jsonResponse(500, { error: `Create memory failed: ${String(error)}` });
  }
};

const handleListMemories = async (): Promise<Response> => {
  try {
    const items = await postgres.listMemories();
    return jsonResponse(200, { items: items.map((item) => memoryItemSchema.parse(item)) });
  } catch (error) {
    return jsonResponse(500, { error: `List memories failed: ${String(error)}` });
  }
};

const handleRandomMemory = async (): Promise<Response> => {
  try {
    const item = await postgres.pickRandomMemory();
    if (!item) return jsonResponse(200, { item: null });
    return jsonResponse(200, { item: memoryItemSchema.parse(item) });
  } catch (error) {
    return jsonResponse(500, { error: `Random memory failed: ${String(error)}` });
  }
};

const canListenOnPort = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });

const findAvailablePort = async (preferredPort: number): Promise<number> => {
  const maxAttempts = 10;
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;
    const available = await canListenOnPort(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available port from ${preferredPort} to ${preferredPort + maxAttempts - 1}`);
};

postgres
  .init()
  .then(async () => {
    const port = await findAvailablePort(env.port);
    Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') {
          return jsonResponse(204, {});
        }
        if (request.method === 'GET' && url.pathname === '/api/memories') {
          return handleListMemories();
        }
        if (request.method === 'GET' && url.pathname === '/api/memories/random') {
          return handleRandomMemory();
        }
        if (request.method === 'POST' && url.pathname === '/api/memories') {
          return handleCreateMemory(request);
        }
        return jsonResponse(404, { error: 'Not found' });
      },
    });
    if (port !== env.port) {
      console.warn(`[server] port ${env.port} is in use, running on http://localhost:${port}`);
      return;
    }
    console.log(`[server] running on http://localhost:${port}`);
  })
  .catch((error: unknown) => {
    console.error('[server] failed to initialize', error);
    void postgres.close().catch(() => undefined);
    process.exit(1);
  });
