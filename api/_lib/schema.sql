-- Voice-tutor usage tables (Neon / DATABASE_URL). Apply once:
--   psql "$DATABASE_URL" -f api/_lib/schema.sql
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS voice_usage (
  device_id text NOT NULL,
  day       date NOT NULL,
  seconds   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, day)
);

CREATE TABLE IF NOT EXISTS voice_session (
  room       text PRIMARY KEY,
  device_id  text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);

-- Fast month rollups per device.
CREATE INDEX IF NOT EXISTS voice_usage_device_day_idx
  ON voice_usage (device_id, day);
