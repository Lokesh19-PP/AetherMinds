PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS batches (
  id                  TEXT PRIMARY KEY,
  status              TEXT NOT NULL CHECK (status IN ('open', 'sealed', 'anchored')),
  root                TEXT,
  leaf_count          INTEGER,
  created_at          TEXT NOT NULL,
  sealed_at           TEXT,
  anchored_at         TEXT,
  anchor_seq          INTEGER,
  anchor_entry_json   TEXT,
  ethereum_tx_hash    TEXT,
  ethereum_anchor_id  INTEGER,
  eth_chain_id        INTEGER,
  eth_contract        TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id                  TEXT PRIMARY KEY,
  batch_id            TEXT NOT NULL REFERENCES batches(id),
  leaf_index          INTEGER,
  content_hash        TEXT NOT NULL,
  leaf_hash           TEXT NOT NULL,
  kind                TEXT NOT NULL DEFAULT 'file',
  title               TEXT,
  file_name           TEXT,
  mime                TEXT,
  size                INTEGER,
  storage_mode        TEXT NOT NULL DEFAULT 'none' CHECK (storage_mode IN ('none', 'preview', 'copy')),
  file_ref            TEXT,
  preview_ref         TEXT,
  preview_sha256      TEXT,
  visibility          TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  store_name          TEXT,
  metadata_json       TEXT,
  ai_suggestion_json  TEXT,
  confirmed_by        TEXT,
  confirmed_at        TEXT,
  manifest_json       TEXT,
  work_id             TEXT,
  version_no          INTEGER,
  parent_leaf         TEXT,
  creator_pub         TEXT,
  created_at          TEXT NOT NULL,
  UNIQUE (leaf_hash),
  UNIQUE (batch_id, leaf_index)
);

CREATE INDEX IF NOT EXISTS idx_records_batch ON records(batch_id);
CREATE INDEX IF NOT EXISTS idx_records_content ON records(content_hash);
CREATE INDEX IF NOT EXISTS idx_records_work ON records(work_id, version_no);

CREATE TABLE IF NOT EXISTS audit_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at              TEXT NOT NULL,
  issue_count         INTEGER NOT NULL DEFAULT 0,
  result_json         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creators (
  public_key          TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  created_at          TEXT NOT NULL
);
