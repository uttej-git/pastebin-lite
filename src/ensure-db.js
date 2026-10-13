const pool = require("./db");

let initializationPromise;

function ensureDatabase() {
  if (!initializationPromise) {
    initializationPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        max_views INTEGER,
        view_count INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT valid_max_views
          CHECK (max_views IS NULL OR max_views >= 1),
        CONSTRAINT valid_view_count
          CHECK (view_count >= 0)
      );
    `).catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

module.exports = ensureDatabase;
