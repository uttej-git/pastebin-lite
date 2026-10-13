const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../api/index");
const pool = require("../src/db");

after(async () => {
  await pool.end();
});

test("GET /api/healthz returns a healthy status", async () => {
  const response = await request(app).get("/api/healthz");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("POST /api/pastes rejects empty content", async () => {
  const response = await request(app)
    .post("/api/pastes")
    .send({ content: "   " });

  assert.equal(response.status, 400);
  assert.ok(response.body.error);
});

test("POST /api/pastes rejects invalid view limits", async () => {
  const response = await request(app)
    .post("/api/pastes")
    .send({ content: "Invalid limit test", max_views: 0 });

  assert.equal(response.status, 400);
  assert.ok(response.body.error);
});

test("creates a paste and returns a share URL", async () => {
  const response = await request(app)
    .post("/api/pastes")
    .send({ content: "Automated test paste" });

  assert.equal(response.status, 201);
  assert.ok(response.body.id);
  assert.ok(response.body.url.endsWith(`/p/${response.body.id}`));
});

test("retrieves a created paste", async () => {
  const created = await request(app)
    .post("/api/pastes")
    .send({ content: "Automated retrieval test" });

  assert.equal(created.status, 201);

  const response = await request(app)
    .get(`/api/pastes/${created.body.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.content, "Automated retrieval test");
  assert.equal(response.body.remaining_views, null);
  assert.equal(response.body.expires_at, null);
});

test("returns 404 for a nonexistent paste", async () => {
  const response = await request(app)
    .get("/api/pastes/nonexistent-paste-id");

  assert.equal(response.status, 404);
  assert.ok(response.body.error);
});

test("HTML page safely displays text containing HTML characters", async () => {
  const created = await request(app)
    .post("/api/pastes")
    .send({ content: "<script>alert(1)</script>" });

  assert.equal(created.status, 201);

  const response = await request(app)
    .get(`/p/${created.body.id}`);

  assert.equal(response.status, 200);
  assert.match(response.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(response.text, /<script>alert\(1\)<\/script>/);
});
test("enforces the maximum view limit", async () => {
  const created = await request(app)
    .post("/api/pastes")
    .send({
      content: "One-view-only test",
      max_views: 1
    });

  assert.equal(created.status, 201);

  const firstView = await request(app)
    .get(`/api/pastes/${created.body.id}`);

  assert.equal(firstView.status, 200);
  assert.equal(firstView.body.remaining_views, 0);

  const secondView = await request(app)
    .get(`/api/pastes/${created.body.id}`);

  assert.equal(secondView.status, 404);
});
test("concurrent requests cannot exceed the maximum view limit", async () => {
  const created = await request(app)
    .post("/api/pastes")
    .send({
      content: "Concurrent access test",
      max_views: 1
    });

  assert.equal(created.status, 201);

  const pasteUrl = `/api/pastes/${created.body.id}`;

  const responses = await Promise.all([
    request(app).get(pasteUrl),
    request(app).get(pasteUrl)
  ]);

  const statuses = responses.map((response) => response.status).sort();

  assert.deepEqual(statuses, [200, 404]);
});
test("paste expires when its TTL has elapsed", async () => {
  const creationTime = 1791896700000;

  const created = await request(app)
    .post("/api/pastes")
    .set("x-test-now-ms", String(creationTime))
    .send({
      content: "TTL expiry test",
      ttl_seconds: 10
    });

  assert.equal(created.status, 201);

  const beforeExpiry = await request(app)
    .get(`/api/pastes/${created.body.id}`)
    .set("x-test-now-ms", String(creationTime + 5000));

  assert.equal(beforeExpiry.status, 200);

  const afterExpiry = await request(app)
    .get(`/api/pastes/${created.body.id}`)
    .set("x-test-now-ms", String(creationTime + 11000));

  assert.equal(afterExpiry.status, 404);
});

test("paste expires when TTL and view limits are both configured", async () => {
  const creationTime = 1791896700000;

  const created = await request(app)
    .post("/api/pastes")
    .set("x-test-now-ms", String(creationTime))
    .send({
      content: "Combined limits test",
      ttl_seconds: 10,
      max_views: 2
    });

  assert.equal(created.status, 201);

  const firstView = await request(app)
    .get(`/api/pastes/${created.body.id}`)
    .set("x-test-now-ms", String(creationTime + 1000));

  assert.equal(firstView.status, 200);
  assert.equal(firstView.body.remaining_views, 1);

  const afterExpiry = await request(app)
    .get(`/api/pastes/${created.body.id}`)
    .set("x-test-now-ms", String(creationTime + 11000));

  assert.equal(afterExpiry.status, 404);
});

