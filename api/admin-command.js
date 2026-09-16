var lib = require("./_lib");

var VALID = ["end-call", "remove-queued", "close-room"];

// Writes a short-lived instruction the target room's own next heartbeat
// will pick up and delete (see heartbeat.js) -- there's no persistent
// connection to push over, so delivery is "within one heartbeat interval,"
// a few seconds, not instant. Fine for moderation actions.
module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!(await lib.requireAdmin(req, res))) return;

  var body = await lib.readJsonBody(req);
  var room = String(body.room || "").slice(0, 40);
  var cmd = String(body.cmd || "");
  if (!room || VALID.indexOf(cmd) === -1) { res.status(400).json({ error: "invalid command" }); return; }

  var payload = { cmd: cmd, issuedAt: Date.now() };
  if (body.targetId) payload.targetId = String(body.targetId).slice(0, 100);

  try {
    await lib.kv(["SET", "cmd:" + room, JSON.stringify(payload), "EX", 30]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
