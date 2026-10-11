CREATE TABLE IF NOT EXISTS batches (
  id                TEXT PRIMARY KEY,
  status            TEXT NOT NULL CHECK (status IN ('open','sealed','anchored')),
  created_at        TEXT NOT NULL,
  sealed_at         TEXT,
  root              TEXT,
  leaf_count        INTEGER,
  anchor_seq        INTEGER,
  anchor_entry_json TEXT,
  eth_chain_id      INTEGER,
  eth_contract      TEXT,
  eth_anchor_id     INTEGER,
  eth_tx_hash       TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id                 TEXT PRIMARY KEY,
  batch_id           TEXT NOT NULL REFERENCES batches(id),
  leaf_index         INTEGER,
  kind               TEXT NOT NULL CHECK (kind IN ('file','manifest')),
  leaf_hash          TEXT NOT NULL UNIQUE,
  content_hash       TEXT NOT NULL,
  file_name          TEXT,
  mime               TEXT,
  size               INTEGER,
  metadata_json      TEXT NOT NULL,
  ai_suggestion_json TEXT,
  confirmed_by       TEXT NOT NULL,
  confirmed_at       TEXT NOT NULL,
  manifest_json      TEXT,
  storage_mode       TEXT NOT NULL DEFAULT 'none' CHECK (storage_mode IN ('none','preview','copy')),
  file_ref           TEXT,
  preview_ref        TEXT,
  preview_sha256     TEXT,
  visibility         TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  sim_kind           TEXT,
  sim_value          TEXT,
  work_id            TEXT,
  version_no         INTEGER,
  parent_leaf        TEXT,
  creator_pub        TEXT,
  created_at         TEXT NOT NULL,
  UNIQUE (batch_id, leaf_index)
);

CREATE INDEX IF NOT EXISTS idx_records_content ON records(content_hash);
CREATE INDEX IF NOT EXISTS idx_records_work    ON records(work_id, version_no);
CREATE INDEX IF NOT EXISTS idx_records_creator ON records(creator_pub);

CREATE TABLE IF NOT EXISTS creators (
  public_key   TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     TEXT NOT NULL,
  type   TEXT NOT NULL,
  detail TEXT
);

CREATE TABLE IF NOT EXISTS audit_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at      TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  result_json TEXT NOT NULL
);
