// REXXA AI · Edge Function "rexxa-proxy"
// Perantara untuk penyedia AI (format OpenAI) yang memblokir panggilan langsung dari browser (CORS).
// Alur: REXXA → https://<project>.supabase.co/functions/v1/rexxa-proxy/<path> → <Base URL penyedia>/<path>
// - Hanya pengguna yang sudah masuk akun sinkron REXXA yang boleh memakai (token Supabase diperiksa).
// - Hanya path API AI yang dikenal yang diteruskan; host tujuan wajib https dan bukan alamat jaringan lokal.
// - API key penyedia diteruskan apa adanya lewat header x-upstream-auth dan tidak disimpan atau dicatat.
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
//         nama: rexxa-proxy → tempel kode ini → Deploy → matikan "Verify JWT".
import { createClient } from "npm:@supabase/supabase-js@2.76.1";

const VERSION = "1.0.0";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, x-upstream-base, x-upstream-auth",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "content-type",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const AUTH_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const sb = createClient(SUPABASE_URL, AUTH_KEY, { auth: { persistSession: false } });

// path yang boleh diteruskan (API format OpenAI)
const PATHS = /^\/(chat\/completions|completions|embeddings|models(\/[\w.\-:@/]+)?|images\/(generations|edits)|audio\/(transcriptions|speech))$/;

// tolak host lokal / jaringan privat (mencegah function dipakai mengakses jaringan internal)
function badHost(h: string) {
  const host = h.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (host.includes(":")) return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80") || host === "::";
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/rexxa-proxy/, "") || "/";
  if (path === "/" && req.method === "GET") return json({ ok: true, name: "rexxa-proxy", version: VERSION });

  // 1) wajib masuk akun sinkron REXXA
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return json({ error: { message: "Proxy REXXA: belum masuk ke akun sinkron (Dashboard → Sinkronisasi)." } }, 401);

  // 2) validasi tujuan
  if (!PATHS.test(path)) return json({ error: { message: `Proxy REXXA: path ${path} tidak diizinkan.` } }, 400);
  let base: URL;
  try { base = new URL(req.headers.get("x-upstream-base") || ""); } catch { return json({ error: { message: "Proxy REXXA: Base URL tidak valid." } }, 400); }
  if (base.protocol !== "https:" || badHost(base.hostname))
    return json({ error: { message: "Proxy REXXA: Base URL harus https dan bukan alamat jaringan lokal." } }, 400);
  const target = base.origin + base.pathname.replace(/\/+$/, "") + path + url.search;

  // 3) teruskan permintaan (streaming jawaban ikut diteruskan apa adanya)
  const headers = new Headers();
  const auth = req.headers.get("x-upstream-auth");
  if (auth) headers.set("Authorization", auth);
  headers.set("Content-Type", req.headers.get("content-type") || "application/json");
  headers.set("Accept", req.headers.get("accept") || "*/*");
  headers.set("User-Agent", "REXXA-AI-proxy/" + VERSION);
  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
    });
  } catch (e: any) {
    return json({ error: { message: "Proxy REXXA: tidak bisa menghubungi penyedia (" + (e?.message || e) + ")." } }, 502);
  }
  if (res.status >= 300 && res.status < 400)
    return json({ error: { message: `Proxy REXXA: penyedia mengalihkan ke alamat lain (HTTP ${res.status}). Periksa Base URL.` } }, 502);
  return new Response(res.body, {
    status: res.status,
    headers: { ...CORS, "Content-Type": res.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
  });
});
