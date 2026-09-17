// Shared helpers for the /api/* serverless functions. Filenames starting
// with "_" are never routed by Vercel, so this file is safe to keep here.
//
// Storage: Upstash Redis's plain REST API (one JSON command array per POST),
// called with the built-in fetch -- no npm dependency, no build step, same
// "just static files" deploy this project has always been. Works with a
// database from Upstash's own free tier (upstash.com, no card needed) just
// as well as Vercel's paid KV/Redis marketplace integration -- both hand
// out the same REST URL + token shape, just under slightly different env
// var names depending on where you copied them from, so both are accepted.

var KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
var KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function kvConfigured() {
  return !!(KV_URL && KV_TOKEN);
}

async function kv(cmd) {
  if (!kvConfigured()) throw new Error("Storage is not connected yet (KV_REST_API_URL / KV_REST_API_TOKEN missing)");
  var r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  var j = await r.json();
  if (j && j.error) throw new Error(j.error);
  return j ? j.result : null;
}

function parseCookies(req) {
  var h = (req.headers && req.headers.cookie) || "";
  var out = {};
  h.split(";").forEach(function (p) {
    var i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Vercel's Node runtime pre-parses JSON bodies into req.body for standard
// serverless functions; the manual stream read is a defensive fallback only.
function readJsonBody(req) {
  return new Promise(function (resolve) {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === "string") {
        try { return resolve(JSON.parse(req.body || "{}")); } catch (e) { return resolve({}); }
      }
      return resolve(req.body);
    }
    var data = "";
    req.on("data", function (c) { data += c; });
    req.on("end", function () {
      try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
}

// Returns true and lets the caller proceed, or writes a 401 and returns
// false. Every admin-only endpoint starts with `if (!(await requireAdmin(req, res))) return;`
async function requireAdmin(req, res) {
  var token = parseCookies(req).admin_session;
  if (!token) { res.status(401).json({ error: "Not logged in." }); return false; }
  try {
    var ok = await kv(["GET", "admin_session:" + token]);
    if (!ok) { res.status(401).json({ error: "Session expired. Log in again." }); return false; }
    return true;
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
    return false;
  }
}

module.exports = { kv, kvConfigured, parseCookies, readJsonBody, requireAdmin };
