var lib = require("./_lib");

// A practitioner's tab calls this every few seconds while their room is
// open, and immediately after anything changes (a patient joins/leaves, a
// call starts/ends). It writes the room's current snapshot (short TTL, so a
// closed tab just disappears within ~15s with no explicit goodbye needed)
// and, in the same round trip, hands back any pending admin command for
// that room -- reusing the heartbeat as the delivery channel means the
// practitioner doesn't need a second poll loop.
//
// Deliberately never sends the consultation notes -- only who's where and
// for how long. Also deliberately soft-fails: if storage isn't configured
// yet, or a request errors, the app must keep working exactly as it did
// before this feature existed.
module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!lib.kvConfigured()) { res.status(200).json({ ok: false }); return; }

  var body = await lib.readJsonBody(req);
  var room = String(body.room || "").slice(0, 40);
  if (!room) { res.status(400).json({ error: "room required" }); return; }

  var current = null;
  if (body.current) {
    current = {
      id: String(body.current.id || "").slice(0, 100),
      name: String(body.current.name || "").slice(0, 80),
      seek: String(body.current.seek || "").slice(0, 80),
      callStart: Number(body.current.callStart) || 0
    };
  }
  var queue = Array.isArray(body.queue) ? body.queue.slice(0, 50).map(function (q) {
    return {
      id: String((q && q.id) || "").slice(0, 100),
      name: String((q && q.name) || "").slice(0, 80),
      seek: String((q && q.seek) || "").slice(0, 80),
      at: Number(q && q.at) || 0
    };
  }) : [];

  var snapshot = {
    room: room,
    practitioner: {
      name: String((body.practitioner && body.practitioner.name) || "").slice(0, 80),
      title: String((body.practitioner && body.practitioner.title) || "").slice(0, 80)
    },
    onBreak: !!body.onBreak,
    current: current,
    queue: queue,
    updatedAt: Date.now()
  };

  try {
    await lib.kv(["SET", "room:" + room, JSON.stringify(snapshot), "EX", 15]);
    var cmdRaw = await lib.kv(["GET", "cmd:" + room]);
    var command = null;
    if (cmdRaw) {
      try { command = JSON.parse(cmdRaw); } catch (e) { command = null; }
      await lib.kv(["DEL", "cmd:" + room]);
    }
    res.status(200).json({ ok: true, command: command });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
