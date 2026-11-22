// Minimal API helper for conformance checks.
export const BASE = 'http://localhost:4000/api/v1';
export const USERS = {
  admin: ['admin_csth', 'LabourRoom@Admin2026'],
  doctor: ['dr.perera', 'Perera@Doctor2026'],
  nurse: ['nurse.fernando', 'Fernando@Nurse2026'],
};

const tokens = {};

export async function login(who) {
  if (tokens[who]) return tokens[who];
  const [username, password] = USERS[who] ?? who;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`login ${who} failed: ${JSON.stringify(body)}`);
  tokens[who] = { token: body.data.accessToken, user: body.data.user };
  return tokens[who];
}

export async function call(who, method, path, data) {
  const { token } = await login(who);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

export function show(label, r, pick) {
  const out = pick ? pick(r.body) : r.body?.error ?? r.body?.data ?? r.body;
  console.log(`[${r.status}] ${label}:`, typeof out === 'string' ? out.slice(0, 300) : JSON.stringify(out)?.slice(0, 600));
}
