-- =========================================================
-- SESSION EXPRESS
-- =========================================================
-- La table sera également compatible avec connect-pg-simple.
-- =========================================================

CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire
ON session(expire);


-- =========================================================
-- ADMIN : DERNIÈRE CONNEXION
-- =========================================================

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;


-- =========================================================
-- FONCTION : MISE À JOUR AUTOMATIQUE DE updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- TRIGGER : ADMINS
-- =========================================================

DROP TRIGGER IF EXISTS trg_admins_updated_at
ON admins;

CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- TRIGGER : PUBLICATIONS
-- =========================================================

DROP TRIGGER IF EXISTS trg_publications_updated_at
ON publications;

CREATE TRIGGER trg_publications_updated_at
BEFORE UPDATE ON publications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- TRIGGER : EVENTS
-- =========================================================

DROP TRIGGER IF EXISTS trg_events_updated_at
ON events;

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- TRIGGER : ANNOUNCEMENTS
-- =========================================================

DROP TRIGGER IF EXISTS trg_announcements_updated_at
ON announcements;

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();