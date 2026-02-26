CREATE TABLE IF NOT EXISTS attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(127) NOT NULL,
  size_bytes  BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'processing',
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
