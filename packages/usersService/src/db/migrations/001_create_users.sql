CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  display_name  VARCHAR(64),
  pronouns      TEXT,
  avatar_url    TEXT,
  status        VARCHAR(20) DEFAULT 'offline',
  bio           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
