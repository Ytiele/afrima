var crypto = require("crypto");
var lib = require("./_lib");

module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  var body = await lib.readJsonBody(req);
  var password = process.env.ADMIN_PASSWORD;
  if (!password) { res.status(500).json({ error: "ADMIN_PASSWORD is not set on the server." }); return; }
  if (!body.password || body.password !== password) { res.status(401).json({ error: "Wrong password." }); return; }
  if (!lib.kvConfigured()) { res.status(500).json({ error: "Storage is not connected yet." }); return; }

  var token = crypto.randomBytes(24).toString("hex");
  try {
    await lib.kv(["SET", "admin_session:" + token, "1", "EX", 43200]); // 12h
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
    return;
  }
  res.setHeader("Set-Cookie",
    "admin_session=" + token + "; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict");
  res.status(200).json({ ok: true });
};
