require("dotenv").config();

const path = require("node:path");
const express = require("express");
const pool = require("../src/db");
const ensureDatabase = require("../src/ensure-db");
const pasteRoutes = require("../src/routes/pastes");

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));

// Ensure the database schema exists before handling requests.
app.use(async (req, res, next) => {
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    res.status(503).json({ error: "Database is temporarily unavailable." });
  }
});

app.get("/api/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "error" });
  }
});

app.use(pasteRoutes);

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }

  console.error("Unhandled request error:", error.message);
  return res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pastebin-Lite server running on port ${PORT}`);
  });
}

module.exports = app;
