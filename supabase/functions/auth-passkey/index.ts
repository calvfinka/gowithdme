// supabase/functions/auth-passkey/index.ts
// Passkey (WebAuthn) untuk pengguna situs utama gowithdme.com.
//
// Endpoint (POST):
//   /options-register  [JWT]  -> challenge pendaftaran (pengguna sudah login)
//   /verify-register   [JWT]  -> simpan public key
//   /options-login     [tanpa JWT] -> challenge login (discoverable) + nonce
//   /verify-login      [tanpa JWT] -> verifikasi, balas {token_hash} untuk verifyOtp
//
// Setelan: Verify JWT = OFF (fungsi memeriksa token sendiri). Deploy lewat dashboard.

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13";
import { isoBase64URL } from "npm:@simplewebauthn/server@13/helpers";
import { createClient } from "npm:@supabase/supabase-js@2";

const RP_ID = "gowithdme.com";
const RP_NAME = "GoWithDME";
const ORIGINS = ["https://gowithdme.com", "https://www.gowithdme.com"];
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_PASSKEYS = 5;
const LIMIT_OPTIONS = 20; // permintaan challenge login per IP per 10 menit
const LIMIT_FAIL = 8;     // verifikasi gagal per IP per 10 menit
const WINDOW_MS = 10 * 60 * 1000;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function corsFor(req: Request) {
  const o = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsFor(req), "Content-Type": "application/json" },
  });

function clientIp(req: Request): string {
  const f = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
  return (f.split(",")[0] || "unknown").trim().slice(0, 64);
}

// ---------- pembatasan ----------
async function countAttempts(ip: string, kind: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await db.from("user_passkey_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip).eq("kind", kind).gt("at", since);
  return count ?? 0;
}
async function logAttempt(ip: string, kind: string) {
  await db.from("user_passkey_attempts").insert({ ip, kind });
}
async function cleanup() {
  const now = new Date().toISOString();
  await db.from("user_webauthn_challenges").delete().lt("expires_at", now);
  await db.from("user_passkey_attempts").delete()
    .lt("at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
}

// ---------- challenge ----------
function newNonce(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return isoBase64URL.fromBuffer(b);
}
async function saveChallenge(type: string, challenge: string, userId: string | null) {
  const nonce = newNonce();
  const { error } = await db.from("user_webauthn_challenges").insert({
    nonce, type, user_id: userId, challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });
  if (error) throw new HttpError(500, "Gagal menyimpan challenge.");
  return nonce;
}
// Ambil lalu hapus (atomik): sekali pakai, berhasil atau gagal.
async function consumeChallenge(nonce: string, type: string, userId: string | null): Promise<string> {
  if (!nonce || typeof nonce !== "string" || nonce.length > 100) {
    throw new HttpError(400, "Challenge tidak ada atau kedaluwarsa.");
  }
  let q = db.from("user_webauthn_challenges").delete()
    .eq("nonce", nonce).eq("type", type).gt("expires_at", new Date().toISOString());
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.select("challenge");
  if (error) throw new HttpError(500, "Gagal membaca challenge.");
  if (!data || data.length === 0) throw new HttpError(400, "Challenge tidak ada atau kedaluwarsa.");
  return data[0].challenge as string;
}

// ---------- JWT ----------
async function authenticate(req: Request) {
  const h = req.headers.get("Authorization") ?? "";
  const jwt = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!jwt) throw new HttpError(401, "Token wajib.");
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, "Token tidak valid.");
  return data.user;
}

// ---------- pendaftaran ----------
async function optionsRegister(req: Request) {
  const user = await authenticate(req);
  const { data: existing } = await db.from("user_passkeys")
    .select("credential_id, transports").eq("user_id", user.id);
  if ((existing?.length ?? 0) >= MAX_PASSKEYS) {
    throw new HttpError(409, "Batas passkey tercapai. Hapus salah satu dulu.");
  }
  const label = user.email ?? user.id;
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: label,
    userDisplayName: String(user.user_metadata?.nickname ?? label).slice(0, 60),
    userID: new TextEncoder().encode(user.id), // userHandle = id pengguna
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p: any) => ({
      id: p.credential_id,
      transports: p.transports?.length ? p.transports : undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",       // wajib discoverable: login tanpa mengetik email
      requireResidentKey: true,
      userVerification: "required",
    },
  });
  const nonce = await saveChallenge("register", options.challenge, user.id);
  return { options, nonce };
}

async function verifyRegister(req: Request, body: any) {
  const user = await authenticate(req);
  if (!body?.response) throw new HttpError(400, "Field 'response' wajib.");
  const expectedChallenge = await consumeChallenge(body.nonce, "register", user.id);

  let v;
  try {
    v = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch (e) {
    throw new HttpError(400, `Verifikasi gagal: ${(e as Error).message}`);
  }
  if (!v.verified || !v.registrationInfo) throw new HttpError(400, "Pendaftaran tidak valid.");

  const { count } = await db.from("user_passkeys")
    .select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PASSKEYS) throw new HttpError(409, "Batas passkey tercapai.");

  const { credential, credentialDeviceType, credentialBackedUp } = v.registrationInfo;
  const name = String(body.name ?? "Passkey").replace(/[<>]/g, "").trim().slice(0, 60) || "Passkey";
  const { error } = await db.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    name,
  });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Passkey ini sudah terdaftar.");
    throw new HttpError(500, "Gagal menyimpan passkey.");
  }
  return { ok: true };
}

// ---------- login ----------
async function optionsLogin(req: Request) {
  const ip = clientIp(req);
  if ((await countAttempts(ip, "options")) >= LIMIT_OPTIONS) {
    throw new HttpError(429, "Terlalu banyak percobaan. Tunggu beberapa menit.");
  }
  await logAttempt(ip, "options");
  // Tanpa allowCredentials: perangkat menampilkan passkey yang tersimpan untuk gowithdme.com.
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
  });
  const nonce = await saveChallenge("login", options.challenge, null);
  return { options, nonce };
}

async function verifyLogin(req: Request, body: any) {
  const ip = clientIp(req);
  if ((await countAttempts(ip, "fail")) >= LIMIT_FAIL) {
    throw new HttpError(429, "Terlalu banyak percobaan. Tunggu beberapa menit.");
  }
  const fail = async (status: number, msg: string) => {
    await logAttempt(ip, "fail");
    throw new HttpError(status, msg);
  };

  const resp = body?.response;
  if (!resp?.id || typeof resp.id !== "string") return fail(400, "Respons tidak valid.");

  let expectedChallenge: string;
  try { expectedChallenge = await consumeChallenge(body.nonce, "login", null); }
  catch (e) { await logAttempt(ip, "fail"); throw e; }

  const { data: row } = await db.from("user_passkeys")
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", resp.id).maybeSingle();
  if (!row) return fail(401, "Passkey tidak dikenali.");

  // userHandle (jika ada) harus sama dengan pemilik passkey.
  const uh = resp.response?.userHandle;
  if (uh) {
    let handle = "";
    try { handle = new TextDecoder().decode(isoBase64URL.toBuffer(uh)); } catch (_) { /* */ }
    if (handle !== row.user_id) return fail(401, "Passkey tidak cocok.");
  }

  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: resp,
      expectedChallenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: row.credential_id,
        publicKey: isoBase64URL.toBuffer(row.public_key),
        counter: Number(row.counter),
        transports: row.transports?.length ? row.transports : undefined,
      },
    });
  } catch (_e) {
    return fail(401, "Verifikasi passkey gagal.");
  }
  if (!v.verified) return fail(401, "Passkey ditolak.");

  await db.from("user_passkeys").update({
    counter: v.authenticationInfo.newCounter,
    backed_up: v.authenticationInfo.credentialBackedUp,
    last_used_at: new Date().toISOString(),
  }).eq("id", row.id);

  const { data: ud, error: uErr } = await db.auth.admin.getUserById(row.user_id);
  if (uErr || !ud?.user) throw new HttpError(401, "Akun tidak ditemukan.");
  const u: any = ud.user;
  if (u.banned_until && new Date(u.banned_until).getTime() > Date.now()) {
    throw new HttpError(403, "Akun ini sedang dibatasi.");
  }
  if (!u.email) throw new HttpError(409, "Akun ini tidak punya email untuk masuk.");

  const { data: link, error: lErr } = await db.auth.admin.generateLink({
    type: "magiclink", email: u.email,
  });
  const token_hash = link?.properties?.hashed_token;
  if (lErr || !token_hash) throw new HttpError(500, "Gagal membuat sesi.");
  return { ok: true, token_hash };
}

// ---------- router ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "Gunakan POST." }, 405);
  try {
    const origin = req.headers.get("Origin");
    if (origin && !ORIGINS.includes(origin)) throw new HttpError(403, "Origin tidak diizinkan.");
    const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
    const body = await req.json().catch(() => ({}));
    if (Math.random() < 0.05) cleanup().catch(() => {});
    switch (route) {
      case "options-register": return json(req, await optionsRegister(req));
      case "verify-register":  return json(req, await verifyRegister(req, body));
      case "options-login":    return json(req, await optionsLogin(req));
      case "verify-login":     return json(req, await verifyLogin(req, body));
      default: return json(req, { error: "Endpoint tidak dikenal." }, 404);
    }
  } catch (e) {
    if (e instanceof HttpError) return json(req, { error: e.message }, e.status);
    console.error("auth-passkey error:", e);
    return json(req, { error: "Kesalahan server." }, 500);
  }
});
