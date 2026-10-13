const express = require("express");
const {
  getCurrentTimeMs,
  createPaste,
  getPaste
} = require("../services/pasteService");

const router = express.Router();

function validateCreateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return "content must be a non-empty string.";
  }

  for (const field of ["ttl_seconds", "max_views"]) {
    if (body[field] !== undefined) {
      if (
        !Number.isSafeInteger(body[field]) ||
        body[field] < 1
      ) {
        return `${field} must be an integer greater than or equal to 1.`;
      }
    }
  }

  return null;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/api/pastes", async (req, res) => {
  const validationError = validateCreateInput(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const nowMs = getCurrentTimeMs(req);
    const paste = await createPaste({
      content: req.body.content,
      ttlSeconds: req.body.ttl_seconds ?? null,
      maxViews: req.body.max_views ?? null,
      nowMs
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    return res.status(201).json({
      id: paste.id,
      url: `${baseUrl}/p/${paste.id}`
    });
  } catch (error) {
    console.error("Paste creation failed:", error.message);
    return res.status(500).json({ error: "Unable to create paste." });
  }
});

router.get("/api/pastes/:id", async (req, res) => {
  try {
    const nowMs = getCurrentTimeMs(req);
    const paste = await getPaste(req.params.id, nowMs);

    if (!paste) {
      return res.status(404).json({ error: "Paste not found." });
    }

    return res.status(200).json(paste);
  } catch (error) {
    console.error("Paste retrieval failed:", error.message);
    return res.status(500).json({ error: "Unable to retrieve paste." });
  }
});

router.get("/p/:id", async (req, res) => {
  try {
    const nowMs = getCurrentTimeMs(req);
    const paste = await getPaste(req.params.id, nowMs);

    if (!paste) {
      return res.status(404).type("text").send("Paste not found.");
    }

    const safeContent = escapeHtml(paste.content);

    return res
      .status(200)
      .type("html")
      .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pastebin-Lite</title>
</head>
<body>
  <h1>Paste</h1>
  <pre>${safeContent}</pre>
</body>
</html>`);
  } catch (error) {
    console.error("Paste page retrieval failed:", error.message);
    return res.status(500).type("text").send("Unable to display paste.");
  }
});

module.exports = router;