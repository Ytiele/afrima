var lib = require("./_lib");

// Fired once when a consultation ends (either side), independent of the
// heartbeat, so "calls taken by a practitioner" survives past the room's
// short-lived live snapshot. Keeps only the last 200 entries. No note
// content here either -- name, title, patient name, duration, nothing else.
module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!lib.kvConfigured()) { res.status(200).json({ ok: false }); return; }

  var body = await lib.readJsonBody(req);
  var entry = {
    room: String(body.room || "").slice(0, 40),
    practitioner: String(body.practitioner || "").slice(0, 80),
    title: String(body.title || "").slice(0, 80),
    patientName: String(body.patientName || "").slice(0, 80),
    seek: String(body.seek || "").slice(0, 80),
    startedAt: Number(body.startedAt) || 0,
    endedAt: Number(body.endedAt) || Date.now()
  };

  try {
    await lib.kv(["LPUSH", "call-log", JSON.stringify(entry)]);
    await lib.kv(["LTRIM", "call-log", 0, 199]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
