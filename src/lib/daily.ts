import "server-only";

// Thin wrapper around Daily's REST API. DAILY_API_KEY never leaves this
// file — every call here runs inside a Route Handler, never in a Client
// Component. The app never talks WebRTC directly; Daily owns all of that
// (spec §4) — this module just creates/tears down rooms and mints
// short-lived, room-scoped tokens.

const DAILY_API = "https://api.daily.co/v1";

function authHeaders() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function createDailyRoom(consultationId: string) {
  const name = `consultation-${consultationId}`;
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        // Exactly two participants, auto-expire well past any realistic
        // consultation so an abandoned room can't linger indefinitely.
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3, // 3h safety net
        eject_at_room_exp: true,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Daily room creation failed: ${res.status} ${body}`);
  }
  return (await res.json()) as { name: string; url: string };
}

export async function createDailyToken(opts: {
  roomName: string;
  userName: string;
  isOwner: boolean;
}) {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: opts.roomName,
        user_name: opts.userName,
        is_owner: opts.isOwner,
        // Token itself expires quickly too — it's only meant to get this
        // one person into this one room for this one call.
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Daily token creation failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

export async function deleteDailyRoom(roomName: string) {
  const res = await fetch(`${DAILY_API}/rooms/${roomName}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  // 404 just means it's already gone (or expired) — not an error for us.
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Daily room deletion failed: ${res.status} ${body}`);
  }
}
