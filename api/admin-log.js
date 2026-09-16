var lib = require("./_lib");

module.exports = async function (req, res) {
  if (!lib.kvConfigured()) { res.status(200).json({ ok: true, log: [], notConfigured: true }); return; }
  if (!(await lib.requireAdmin(req, res))) return;
  try {
    var raw = (await lib.kv(["LRANGE", "call-log", 0, 49])) || [];
    var log = raw.map(function (v) {
      try { return JSON.parse(v); } catch (e) { return null; }
    }).filter(Boolean);
    res.status(200).json({ ok: true, log: log });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
