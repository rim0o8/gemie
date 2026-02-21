import postgres from 'postgres';
import type { MemoryItem } from './schemas';

type PostgresServiceOptions = {
  readonly databaseUrl: string;
  readonly tableName: string;
};

type InsertRecord = {
  readonly imageUrl: string;
  readonly summary: string;
  readonly sourceRequestId: string;
  readonly emotionTag: string | null;
};

type MemoryRow = {
  readonly id: string;
  readonly image_url: string;
  readonly summary: string;
  readonly created_at: string;
  readonly source_request_id: string;
  readonly emotion_tag: string | null;
};

const quoteIdent = (ident: string): string => `"${ident.replaceAll('"', '""')}"`;

const mapMemoryRow = (row: MemoryRow): MemoryItem => ({
  id: row.id,
  imageUrl: row.image_url,
  summary: row.summary,
  createdAt:
    typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
  sourceRequestId: row.source_request_id,
  emotionTag: row.emotion_tag,
});

export const createPostgresService = (options: PostgresServiceOptions) => {
  const sql = postgres(options.databaseUrl, { max: 5 });
  const table = quoteIdent(options.tableName);

  const init = async (): Promise<void> => {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_url TEXT NOT NULL,
        summary TEXT NOT NULL,
        source_request_id TEXT NOT NULL,
        emotion_tag TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  };

  const listMemories = async (): Promise<readonly MemoryItem[]> => {
    const rows = await sql.unsafe<MemoryRow[]>(
      `
      SELECT id, image_url, summary, created_at, source_request_id, emotion_tag
      FROM ${table}
      ORDER BY created_at DESC
    `,
    );
    return rows.map(mapMemoryRow);
  };

  const insertMemory = async (record: InsertRecord): Promise<MemoryItem> => {
    const rows = await sql.unsafe<MemoryRow[]>(
      `
      INSERT INTO ${table} (image_url, summary, source_request_id, emotion_tag)
      VALUES ($1, $2, $3, $4)
      RETURNING id, image_url, summary, created_at, source_request_id, emotion_tag
    `,
      [record.imageUrl, record.summary, record.sourceRequestId, record.emotionTag],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Postgres insert failed: empty result');
    }
    return mapMemoryRow(row);
  };

  const pickRandomMemory = async (): Promise<MemoryItem | null> => {
    const rows = await sql.unsafe<MemoryRow[]>(
      `
      SELECT id, image_url, summary, created_at, source_request_id, emotion_tag
      FROM ${table}
      ORDER BY random()
      LIMIT 1
    `,
    );
    const row = rows[0];
    return row ? mapMemoryRow(row) : null;
  };

  const close = async (): Promise<void> => {
    await sql.end();
  };

  return { init, listMemories, insertMemory, pickRandomMemory, close };
};
