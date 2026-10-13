const { randomBytes } = require("node:crypto");
const pool = require("../db");

function getCurrentTimeMs(req) {
  if (
    process.env.TEST_MODE === "1" &&
    req.headers["x-test-now-ms"] !== undefined
  ) {
    const testTime = Number(req.headers["x-test-now-ms"]);

    if (!Number.isFinite(testTime)) {
      throw new Error("Invalid x-test-now-ms header");
    }

    return testTime;
  }

  return Date.now();
}

function generatePasteId() {
  return randomBytes(8).toString("hex");
}

async function createPaste({
  content,
  ttlSeconds = null,
  maxViews = null,
  nowMs = Date.now()
}) {
  const id = generatePasteId();
  const expiresAt =
    ttlSeconds === null ? null : new Date(nowMs + ttlSeconds * 1000);

  await pool.query(
    `INSERT INTO pastes (id, content, expires_at, max_views)
     VALUES ($1, $2, $3, $4)`,
    [id, content, expiresAt, maxViews]
  );

  return { id, expires_at: expiresAt };
}

async function getPaste(id, nowMs) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, content, expires_at, max_views, view_count
       FROM pastes
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const paste = result.rows[0];
    const expired =
      paste.expires_at !== null &&
      new Date(paste.expires_at).getTime() <= nowMs;
    const limitReached =
      paste.max_views !== null &&
      paste.view_count >= paste.max_views;

    if (expired || limitReached) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      "UPDATE pastes SET view_count = view_count + 1 WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");

    return {
      content: paste.content,
      remaining_views:
        paste.max_views === null
          ? null
          : Math.max(0, paste.max_views - paste.view_count - 1),
      expires_at: paste.expires_at
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getCurrentTimeMs,
  createPaste,
  getPaste
};