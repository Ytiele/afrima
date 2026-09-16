var lib = require("./_lib");

module.exports = async function (req, res) {
  if (!lib.kvConfigured()) { res.status(200).json({ ok: true, rooms: [], notConfigured: true }); return; }
  if (!(await lib.requireAdmin(req, res))) return;
  try {
    var keys = (await lib.kv(["KEYS", "room:*"])) || [];
    if (!keys.length) { res.status(200).json({ ok: true, rooms: [] }); return; }
    var values = await lib.kv(["MGET"].concat(keys));
    var rooms = values.filter(Boolean).map(function (v) {
      try { return JSON.parse(v); } catch (e) { return null; }
    }).filter(Boolean);
    res.status(200).json({ ok: true, rooms: rooms });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
