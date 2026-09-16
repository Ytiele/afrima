var lib = require("./_lib");

module.exports = async function (req, res) {
  var token = lib.parseCookies(req).admin_session;
  if (token) {
    try { await lib.kv(["DEL", "admin_session:" + token]); } catch (e) {}
  }
  res.setHeader("Set-Cookie", "admin_session=; Path=/; Max-Age=0");
  res.status(200).json({ ok: true });
};
