CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_request_id TEXT NOT NULL,
  emotion_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
