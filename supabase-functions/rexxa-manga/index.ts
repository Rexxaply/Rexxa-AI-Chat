// REXXA AI · Edge Function "rexxa-manga"
// - Perantara pencarian MangaDex (MangaDex tidak mengizinkan permintaan langsung dari browser)
// - Pengecekan chapter baru terjadwal (dipanggil pg_cron tiap jam)
// - Mengirim Web Push ke perangkat pengguna
// - Unduh chapter: daftar chapter, alamat server MangaDex@Home, dan proxy gambar cadangan
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
//         nama: rexxa-manga → tempel kode ini → Deploy → matikan "Verify JWT".
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import webpush from "npm:web-push@3.6.7";

const VERSION = "1.6.0";
const WEEK = 7 * 864e5; // riwayat update disimpan 7 hari
const LANGS = ["id", "en"]; // bahasa yang didukung: Indonesia & Inggris
const LANG_NAME: Record<string, string> = { id: "Bahasa Indonesia", en: "Bahasa Inggris" };
const cleanLangs = (x: unknown) => { const a = (Array.isArray(x) ? x : []).filter((l) => LANGS.includes(String(l))); return a.length ? [...new Set(a.map(String))] : [...LANGS]; };
const MD = "https://api.mangadex.org";
const UA = "REXXA-AI/1.0 (personal chapter notifier)";
const MU = "https://api.mangaupdates.com/v1"; // MangaUpdates: sumber cadangan (data dari MangaUpdates.com)
const SEARCH_TIMEOUT = 4500;                  // batas waktu per sumber saat pencarian (ms)
const SEARCH_TTL = 30 * 60e3;                 // cache pencarian dianggap segar selama 30 menit
const MU_DELAY = 700;                         // jeda antar permintaan ke MangaUpdates (ms)
const MU_PER_RUN = 40;                        // maks. seri MangaUpdates dicek per jalan cron
const MAP_PER_RUN = 5;                        // maks. follow lama yang dipetakan otomatis per jalan cron
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rexxa-cron",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// kunci server: service_role (lama) atau secret key (baru)
function serviceKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (direct) return direct;
  const many = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (many) {
    try { const j = JSON.parse(many); const v = typeof j === "string" ? j : Object.values(j).find((x) => typeof x === "string"); if (v) return v as string; }
    catch { return many.split(",")[0].trim(); }
  }
  return "";
}
const SERVICE_KEY = serviceKey();
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/* ---------- penjelasan error database ---------- */
function dbError(e: any, where: string) {
  const m = String(e?.message || e || ""), code = String(e?.code || "");
  if (!SERVICE_KEY) return new Error("Edge Function tidak menemukan kunci server Supabase (SUPABASE_SERVICE_ROLE_KEY). Buka Edge Functions → Secrets dan pastikan kunci bawaan tersedia.");
  if (code === "42P01" || code === "PGRST205" || /does not exist|schema cache|Could not find the table/i.test(m))
    return new Error(`Tabel ${where} belum ada. Jalankan SQL Manga terbaru sampai muncul "Success" tanpa error merah, lalu coba Hubungkan lagi. [${code || "no-code"}: ${m}]`);
  if (code === "42501" || /permission denied/i.test(m))
    return new Error(`Server tidak punya izin ke tabel ${where}. Jalankan ulang SQL Manga terbaru (sudah berisi izin untuk server). [${code}: ${m}]`);
  if (/Invalid API key|JWT|apikey/i.test(m))
    return new Error(`Kunci server Supabase ditolak. Periksa secret SUPABASE_SERVICE_ROLE_KEY di Edge Functions. [${m}]`);
  return new Error(`Database (${where}): ${m}${code ? " [" + code + "]" : ""}`);
}

/* ---------- kunci rahasia (dibuat otomatis, disimpan di tabel privat) ---------- */
async function secrets() {
  if (!SERVICE_KEY) throw dbError(null, "rexxa_private");
  const { data, error: e1 } = await admin.from("rexxa_private").select("v").eq("k", "manga").maybeSingle();
  if (e1) throw dbError(e1, "rexxa_private");
  if (data?.v?.vapidPublic) return data.v as { vapidPublic: string; vapidPrivate: string; cronSecret: string };
  const keys = webpush.generateVAPIDKeys();
  const v = { vapidPublic: keys.publicKey, vapidPrivate: keys.privateKey, cronSecret: crypto.randomUUID().replace(/-/g, "") };
  const { error } = await admin.from("rexxa_private").upsert({ k: "manga", v });
  if (error) throw dbError(error, "rexxa_private");
  return v;
}

/* ---------- MangaDex ---------- */
// fetch dengan batas waktu; error diberi tanda `retry` bila layak pindah ke sumber lain
async function fetchT(u: string | URL, init: RequestInit, timeoutMs?: number) {
  const ctl = new AbortController();
  const t = timeoutMs ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try { return await fetch(u, { ...init, signal: ctl.signal }); }
  catch (e: any) {
    throw Object.assign(new Error(e?.name === "AbortError" ? `timeout ${timeoutMs} ms` : `jaringan: ${e?.message || e}`), { retry: true });
  } finally { if (t) clearTimeout(t); }
}
const httpErr = (src: string, status: number) =>
  Object.assign(new Error(`${src} HTTP ${status}`), { retry: status === 429 || status >= 500, rate: status === 429 });

async function md(path: string, params: Record<string, string | string[]> = {}, timeoutMs?: number) {
  const u = new URL(MD + path);
  for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).forEach((x) => u.searchParams.append(k, x));
  const r = await fetchT(u, { headers: { "User-Agent": UA, Accept: "application/json" } }, timeoutMs);
  if (r.status === 429) throw Object.assign(new Error("MangaDex membatasi permintaan (429)"), { rate: true, retry: true });
  if (!r.ok) throw httpErr("MangaDex", r.status);
  return await r.json();
}
// MangaUpdates API v1. POST /series/search menerima JSON {search} dan membalas {total_hits, page, per_page, results:[{record:{...}}]}
async function mu(path: string, body?: unknown, timeoutMs?: number) {
  const r = await fetchT(MU + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "User-Agent": UA, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeoutMs);
  if (!r.ok) throw httpErr("MangaUpdates", r.status);
  return await r.json();
}

/* ---------- cache (tabel rexxa_manga_cache; hanya diakses service_role) ---------- */
async function cacheGet(sumber: string, jenis: string, id: string) {
  const { data } = await admin.from("rexxa_manga_cache").select("data,updated_at").eq("sumber", sumber).eq("jenis", jenis).eq("series_id", id).maybeSingle();
  return data ? { data: data.data, at: new Date(data.updated_at).getTime() } : null;
}
async function cachePut(sumber: string, jenis: string, id: string, data: unknown) {
  const { error } = await admin.from("rexxa_manga_cache").upsert({ sumber, jenis, series_id: id, data, updated_at: new Date().toISOString() });
  if (error) console.error("cachePut", error.message);
}
const pickTitle = (a: any) => {
  const t = a?.title || {};
  const alt = (a?.altTitles || []).reduce((o: any, x: any) => ({ ...x, ...o }), {});
  return t.en || alt.en || t["ja-ro"] || alt.id || Object.values(t)[0] || "Tanpa judul";
};
const coverOf = (m: any) => {
  const c = (m.relationships || []).find((r: any) => r.type === "cover_art");
  return c?.attributes?.fileName ? `${m.id}/${c.attributes.fileName}` : "";
};
const mapManga = (m: any) => ({
  id: m.id,
  title: pickTitle(m.attributes),
  cover: coverOf(m),
  year: m.attributes?.year || null,
  status: m.attributes?.status || "",
  lastChapter: m.attributes?.lastChapter || "",
  desc: (m.attributes?.description?.id || m.attributes?.description?.en || "").slice(0, 280),
  tags: (m.attributes?.tags || []).slice(0, 4).map((t: any) => t.attributes?.name?.en).filter(Boolean),
});
/* ---------- pencarian: format seragam { sumber, id, judul, cover, status, chapterTerakhir, bisaDibaca } ---------- */
const coverProxy = (q: string) => `${SUPABASE_URL}/functions/v1/rexxa-manga?${q}`;
async function searchMD(q: string, langs: string[], onlyLangs: boolean) {
  const params: Record<string, string | string[]> = {
    title: q, limit: "20", "includes[]": "cover_art", "order[relevance]": "desc", "contentRating[]": ["safe", "suggestive"],
  };
  if (onlyLangs) params["availableTranslatedLanguage[]"] = langs;
  const j = await md("/manga", params, SEARCH_TIMEOUT);
  return (j.data || []).map((m: any) => {
    const x = mapManga(m);
    return {
      sumber: "mangadex", id: x.id, judul: x.title,
      cover: x.cover ? coverProxy("cover=" + encodeURIComponent(x.cover)) : "",
      status: x.status || null,
      // MangaDex hanya punya attributes.lastChapter (chapter akhir seri tamat); chapter terbaru butuh request feed terpisah
      chapterTerakhir: x.lastChapter || null,
      bisaDibaca: true,
      legacy: x, // bentuk lama untuk UI yang sekarang
    };
  });
}
async function searchMU(q: string, onlyLangs: boolean) {
  const j = await mu("/series/search", { search: q }, SEARCH_TIMEOUT);
  let rows = (j.results || []).map((r: any) => r?.record).filter((r: any) => r && r.series_id != null);
  // MangaUpdates tidak bisa difilter per bahasa lewat pencarian. Data rilisnya umumnya scanlation berbahasa Inggris,
  // jadi saat filter aktif kita hanya menyimpan seri yang punya rilis tercatat (latest_chapter > 0).
  if (onlyLangs) rows = rows.filter((r: any) => Number(r.latest_chapter) > 0);
  return rows.slice(0, 20).map((r: any) => {
    const img = r.image?.url?.original || r.image?.url?.thumb || ""; // struktur image.url.* perlu dikonfirmasi dari contoh respons
    return {
      sumber: "mangaupdates", id: String(r.series_id), judul: r.title || "Tanpa judul",
      cover: img ? coverProxy("mucover=" + encodeURIComponent(img)) : "",
      status: null, // pencarian MangaUpdates tidak mengembalikan status seri
      chapterTerakhir: r.latest_chapter != null ? String(r.latest_chapter) : null,
      bisaDibaca: false,
      url: r.url || null, tahun: r.year || null, tipe: r.type || null,
    };
  });
}
const qKey = (q: string, onlyLangs: boolean, langs: string[]) =>
  `${q.toLowerCase().replace(/\s+/g, " ").trim()}|${onlyLangs ? "f:" + langs.join(",") : "all"}`;
/* Urutan: MangaDex → MangaUpdates. Pindah sumber bila timeout, error jaringan, 5xx/429, atau hasil kosong.
   Semua gagal → data terakhir dari cache dengan penanda dataLama. */
async function searchFallback(q: string, langs: string[], onlyLangs: boolean) {
  const key = qKey(q, onlyLangs, langs);
  const sources = [
    { sumber: "mangadex", run: () => searchMD(q, langs, onlyLangs) },
    { sumber: "mangaupdates", run: () => searchMU(q, onlyLangs) },
  ];
  const tried: { sumber: string; hasil: string }[] = [];
  let failed = false;
  for (const s of sources) {
    const c = await cacheGet(s.sumber, "search", key);
    if (c && Date.now() - c.at < SEARCH_TTL && Array.isArray(c.data) && c.data.length) {
      return { sumber: s.sumber, hasil: c.data, dataLama: false, dariCache: true, cachedAt: new Date(c.at).toISOString(), tried };
    }
    try {
      const hasil = await s.run();
      if (hasil.length) {
        await cachePut(s.sumber, "search", key, hasil);
        return { sumber: s.sumber, hasil, dataLama: false, dariCache: false, tried };
      }
      tried.push({ sumber: s.sumber, hasil: "kosong" });
    } catch (e: any) {
      tried.push({ sumber: s.sumber, hasil: e?.message || String(e) });
      if (!e?.retry) return { sumber: s.sumber, hasil: [], dataLama: false, error: e?.message || String(e), tried };
      failed = true;
    }
  }
  if (failed) {
    for (const s of sources) {
      const c = await cacheGet(s.sumber, "search", key);
      if (c && Array.isArray(c.data) && c.data.length)
        return { sumber: s.sumber, hasil: c.data, dataLama: true, dariCache: true, cachedAt: new Date(c.at).toISOString(), tried };
    }
  }
  return { sumber: null, hasil: [], dataLama: false, semuaGagal: failed, tried };
}

/* ---------- normalisasi nomor chapter (deduplikasi lintas sumber & grup) ---------- */
// "114.50" → "114.5", "007" → "7", "c.10-12" → "10-12", "Extra 6" → "extra:6", tanpa nomor → "x:<judul>"
function chapterKey(ch: unknown, title?: unknown): string | null {
  const s = String(ch ?? "").trim().toLowerCase();
  const t = String(title ?? "").trim().toLowerCase();
  // nomor chapter selalu diutamakan: "117.5" + judul "EXTRA 6" tetap "117.5" (sama dengan sumber lain)
  const range = s.match(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)/);
  if (range) return `${Number(range[1])}-${Number(range[2])}`;
  const num = s.match(/\d+(?:\.\d+)?/);
  if (num) return String(Number(num[0]));
  const isExtra = /extra|special|omake|side ?story|bonus|epilog/.test(s + " " + t);
  if (isExtra) return "extra:" + (num ? Number(num[0]) : (t || s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "?");
  if (num) return String(Number(num[0]));
  const slug = (t || s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug ? "x:" + slug : null;
}
// nilai numerik untuk dibandingkan dengan last_seen_chapter (rentang memakai angka terbesar; extra/tanpa nomor → null)
function chapterNum(key: string | null): number | null {
  if (!key || key.startsWith("extra:") || key.startsWith("x:")) return null;
  const parts = key.split("-").map(Number);
  const n = Math.max(...parts);
  return Number.isFinite(n) ? n : null;
}
const normTitle = (t: unknown) => String(t ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+/g, "");
const mdTitles = (attr: any) => {
  const all = [...Object.values(attr?.title || {}), ...((attr?.altTitles || []).flatMap((o: any) => Object.values(o || {})))];
  return [...new Set(all.map(normTitle).filter(Boolean))];
};

/* ---------- MangaUpdates: detail seri & rilis ---------- */
async function muSeries(id: string) {
  const c = await cacheGet("mangaupdates", "series", id);
  if (c && Date.now() - c.at < 24 * 3600e3) return c.data;
  const d = await mu(`/series/${encodeURIComponent(id)}`, undefined, 6000);
  await cachePut("mangaupdates", "series", id, d);
  return d;
}
// Judul seri MangaUpdates + nama alternatif (field `associated` dibaca bila ada)
const muTitles = (rec: any) => [...new Set([rec?.title, ...((rec?.associated || []).map((a: any) => a?.title))].map(normTitle).filter(Boolean))];
// POST /releases/search {search, search_type:"series"} → results[].record {id, title, volume, chapter, groups[{name,group_id,url}], release_date}
// Arti persis `search_type:"series"` belum terdokumentasi lengkap, jadi hasil divalidasi: hanya rekaman yang judulnya cocok dengan seri yang dipakai.
async function muReleases(seriesId: string, seriesTitles: string[]) {
  const j = await mu("/releases/search", { search: seriesId, search_type: "series" }, 6000);
  return (j.results || []).map((r: any) => ({ rec: r?.record, meta: r?.metadata })).filter(({ rec, meta }: any) => {
    if (!rec || rec.chapter == null) return false;
    const sid = meta?.series?.series_id;
    if (sid != null) return String(sid) === String(seriesId);
    return seriesTitles.includes(normTitle(rec.title));
  }).map(({ rec }: any) => rec);
}

/* ---------- pemetaan MangaDex → MangaUpdates ---------- */
// 1) links.mu dari MangaDex. Nilainya ID untuk https://www.mangaupdates.com/series.html?id={id}; bisa ID lama (angka kecil)
//    yang tidak dikenali API v1, atau ID baru. Kandidat ID diverifikasi lewat GET /series/{id} + kecocokan judul.
// 2) Kalau gagal: cari judul di MangaUpdates → kandidat disimpan, user mengonfirmasi di UI.
async function mapMu(f: any) {
  const mdId = f.mangadex_id || (String(f.manga_id).startsWith("mu:") ? null : f.manga_id);
  if (!mdId) return { status: "skip" };
  const m = await md(`/manga/${mdId}`, {}, 6000);
  const attr = m?.data?.attributes || {};
  const titles = mdTitles(attr);
  const link = String(attr?.links?.mu || "").trim();
  const tryIds: string[] = [];
  if (/^\d{9,}$/.test(link)) tryIds.push(link);                          // series_id baru (angka panjang); ID lama (pendek) tidak dikenali API v1
  if (/^[0-9a-z]+$/i.test(link) && /[a-z]/i.test(link)) tryIds.push(String(parseInt(link, 36))); // bentuk base36 di URL baru
  for (const id of tryIds) {
    try {
      const d = await muSeries(id);
      if (d?.series_id != null && muTitles(d).some((t) => titles.includes(t))) {
        return { status: "auto", mu_id: String(d.series_id), via: "links.mu" };
      }
    } catch (_) { /* lanjut ke pencocokan judul */ }
    await sleep(MU_DELAY);
  }
  const q = Object.values(attr?.title || {})[0] as string || f.title;
  const j = await mu("/series/search", { search: String(q).slice(0, 100) }, 6000);
  const cands = (j.results || []).map((r: any) => r?.record).filter(Boolean).slice(0, 5).map((r: any) => ({
    id: String(r.series_id), judul: r.title, tahun: r.year || null, tipe: r.type || null, url: r.url || null,
    cover: r.image?.url?.thumb || r.image?.url?.original || "",
    cocok: titles.includes(normTitle(r.title)) && (!attr.year || !r.year || String(attr.year) === String(r.year)),
  })).sort((a: any, b: any) => Number(b.cocok) - Number(a.cocok));
  return { status: cands.length ? "pending" : "none", candidates: cands, link: link || null };
}
async function saveMapping(f: any, r: any) {
  const patch: any = {};
  if (r.status === "auto") {
    // kalau sudah ada follow khusus MangaUpdates untuk seri yang sama, gabungkan ke follow MangaDex ini
    await admin.from("rexxa_manga_follows").delete().eq("user_id", f.user_id).eq("mu_id", r.mu_id).neq("manga_id", f.manga_id);
    Object.assign(patch, { mu_id: r.mu_id, mu_match: "auto", mu_candidates: null });
  } else if (r.status === "pending") Object.assign(patch, { mu_match: "pending", mu_candidates: r.candidates });
  else if (r.status === "none") Object.assign(patch, { mu_match: "rejected", mu_candidates: [] });
  if (Object.keys(patch).length) {
    const { error } = await admin.from("rexxa_manga_follows").update(patch).eq("user_id", f.user_id).eq("manga_id", f.manga_id);
    if (error) throw error;
  }
  return patch;
}

const mapChapter = (c: any) => ({
  id: c.id,
  chapter: c.attributes?.chapter || "",
  volume: c.attributes?.volume || "",
  title: c.attributes?.title || "",
  publishAt: c.attributes?.publishAt || c.attributes?.readableAt || c.attributes?.createdAt,
  lang: c.attributes?.translatedLanguage || "",
  url: c.attributes?.externalUrl || `https://mangadex.org/chapter/${c.id}`,
});
const mdTime = (d: Date) => d.toISOString().slice(0, 19);
async function latestChapter(mangaId: string, langs: string[]) {
  const j = await md(`/manga/${mangaId}/feed`, {
    "translatedLanguage[]": langs, "order[publishAt]": "desc", limit: "1",
    "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"], includeFutureUpdates: "0",
  });
  return j.data?.[0] ? mapChapter(j.data[0]) : null;
}

/* ---------- Web Push ---------- */
async function pushTo(userId: string, payload: Record<string, unknown>) {
  const s = await secrets();
  webpush.setVapidDetails("mailto:rexxa@example.com", s.vapidPublic, s.vapidPrivate);
  const { data: subs } = await admin.from("rexxa_push_subs").select("*").eq("user_id", userId);
  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "normal" });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("rexxa_push_subs").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
      else console.error("push", e?.statusCode, e?.body || e?.message);
    }
  }
  return sent;
}

/* ---------- pengecekan chapter baru ---------- */
// simpan rilis ke riwayat; unique index (user_id, manga_id, lang, chapter_key) menolak duplikat
// lintas sumber/grup, dan hanya baris yang benar-benar tersimpan yang dikembalikan → dasar notifikasi
async function insertUpdates(rows: any[]) {
  const out: any[] = [];
  for (const r of rows) {
    const { data, error } = await admin.from("rexxa_manga_updates")
      .upsert(r, { onConflict: "user_id,manga_id,lang,chapter_key", ignoreDuplicates: true }).select("chapter_key,lang");
    if (error) { if (!/duplicate key/i.test(error.message)) console.error("insertUpdates", error.message); continue; }
    if (data?.length) out.push(r);
  }
  return out;
}

async function check(onlyUser?: string) {
  let q = admin.from("rexxa_manga_follows").select("*").order("checked_at", { ascending: true, nullsFirst: true }).limit(200);
  if (onlyUser) q = q.eq("user_id", onlyUser);
  const { data: follows, error } = await q;
  if (error) throw error;
  const perUser = new Map<string, any[]>();
  let checked = 0, found = 0, mapped = 0, muChecked = 0, mdRate = false, muRate = false;

  // pemetaan bertahap untuk follow lama yang belum punya mu_id (tanpa polling dari browser)
  for (const f of (follows || []).filter((x: any) => !x.mu_id && x.mu_match == null && x.mangadex_id).slice(0, MAP_PER_RUN)) {
    try { await saveMapping(f, await mapMu(f)); mapped++; } catch (e: any) { console.error("map", f.manga_id, e?.message); if (e?.rate) break; }
    await sleep(MU_DELAY);
  }
  const { data: fresh2 } = await admin.from("rexxa_manga_follows").select("manga_id,user_id,mu_id,mu_match").in("manga_id", (follows || []).map((f: any) => f.manga_id));
  const muMap = new Map((fresh2 || []).map((x: any) => [x.user_id + "|" + x.manga_id, x]));
  const muQueue = new Set((follows || []).filter((f: any) => {
    const x: any = muMap.get(f.user_id + "|" + f.manga_id) || f;
    return x.mu_id && ["auto", "confirmed"].includes(x.mu_match) && cleanLangs(f.langs).includes("en");
  }).sort((a: any, b: any) => new Date(a.mu_checked_at || 0).getTime() - new Date(b.mu_checked_at || 0).getTime())
    .slice(0, MU_PER_RUN).map((f: any) => f.user_id + "|" + f.manga_id));

  for (const f of follows || []) {
    const items: any[] = [];                     // kandidat rilis baru dari semua sumber
    const seen: Record<string, number> = { ...(f.last_seen_chapter || {}) };
    const patch: any = { checked_at: new Date().toISOString() };
    const isMuOnly = String(f.manga_id).startsWith("mu:");
    // --- MangaDex (Indonesia & Inggris), perilaku lama dipertahankan ---
    if (!isMuOnly && !mdRate) {
      try {
        const since = new Date(Math.max(new Date(f.last_chapter_at || f.created_at).getTime() - 60_000, Date.now() - 30 * 864e5));
        const j = await md(`/manga/${f.manga_id}/feed`, {
          "translatedLanguage[]": cleanLangs(f.langs),
          publishAtSince: mdTime(since), "order[publishAt]": "asc", limit: "50", includeFutureUpdates: "0",
          "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
        });
        const last = f.last_chapter_at ? new Date(f.last_chapter_at).getTime() : 0;
        const fresh = (j.data || []).map(mapChapter).filter((c: any) => new Date(c.publishAt).getTime() > last);
        if (fresh.length) {
          const newest = fresh[fresh.length - 1];
          patch.last_chapter_at = newest.publishAt; patch.last_chapter = { ...newest, source: "mangadex" };
        }
        // chapter lama (> 7 hari) tetap menggeser penanda, tapi tidak masuk riwayat / notifikasi
        for (const c of fresh.filter((c: any) => Date.now() - new Date(c.publishAt).getTime() < WEEK)) {
          items.push({ source: "mangadex", lang: c.lang, key: chapterKey(c.chapter, c.title), chapter_id: c.id,
            data: { ...c, manga_title: f.title, cover: f.cover, source: "mangadex" } });
        }
        checked++;
      } catch (e: any) {
        console.error("check md", f.manga_id, e?.message);
        if (e?.rate) mdRate = true;
      }
      await sleep(300); // jauh di bawah batas ±5 permintaan/detik MangaDex
    }
    // --- MangaUpdates (hanya Inggris; Indonesia tetap hanya dari MangaDex) ---
    const mx: any = muMap.get(f.user_id + "|" + f.manga_id) || f;
    if (muQueue.has(f.user_id + "|" + f.manga_id) && !muRate) {
      try {
        const sd = await muSeries(mx.mu_id);
        const recs = await muReleases(mx.mu_id, muTitles(sd));
        patch.mu_checked_at = new Date().toISOString();
        const firstSync = seen.en == null;   // pertama kali: jadikan patokan, tanpa notifikasi
        let maxN: number | null = null;
        for (const r of recs) {
          const key = chapterKey(r.chapter, r.title);
          const n = chapterNum(key);
          if (n != null) maxN = Math.max(maxN ?? n, n);
          const rd = r.release_date ? new Date(r.release_date) : null;
          if (firstSync || !key || !rd || isNaN(rd.getTime()) || Date.now() - rd.getTime() > WEEK) continue;
          const groups = (r.groups || []).map((g: any) => g?.name).filter(Boolean);
          items.push({ source: "mangaupdates", lang: "en", key, chapter_id: `mu:${mx.mu_id}:en:${key}`,
            data: { id: `mu:${r.id ?? key}`, chapter: String(r.chapter), title: groups.length ? `oleh ${groups.join(", ")}` : "", lang: "en",
              publishAt: rd.toISOString(), url: sd?.url || null, manga_title: f.title, cover: f.cover, source: "mangaupdates", groups } });
        }
        // cadangan: kalau daftar rilis kosong (mis. format pencarian rilis berubah), pakai latest_chapter dari detail seri
        if (!recs.length && !firstSync && sd?.latest_chapter != null) {
          const key = chapterKey(String(sd.latest_chapter));
          const n = chapterNum(key);
          if (key && n != null && n > (seen.en ?? -1)) {
            items.push({ source: "mangaupdates", lang: "en", key, chapter_id: `mu:${mx.mu_id}:en:${key}`,
              data: { id: `mu:latest:${key}`, chapter: String(sd.latest_chapter), title: "", lang: "en",
                publishAt: new Date().toISOString(), url: sd?.url || null, manga_title: f.title, cover: f.cover, source: "mangaupdates", groups: [] } });
          }
        }
        if (firstSync) {
          const base = Math.max(maxN ?? -1, Number(sd?.latest_chapter) || -1, chapterNum(chapterKey(f.last_chapter?.chapter)) ?? -1);
          if (base >= 0) seen.en = base;
        }
        if (isMuOnly) {
          const top = recs.map((r: any) => ({ r, n: chapterNum(chapterKey(r.chapter, r.title)) })).filter((x: any) => x.n != null).sort((a: any, b: any) => b.n - a.n)[0];
          const latest = top ? String(top.r.chapter) : (Number(sd?.latest_chapter) > 0 ? String(sd.latest_chapter) : null);
          if (latest) patch.last_chapter = { chapter: latest, lang: "en", url: sd?.url || null, source: "mangaupdates",
            publishAt: top?.r?.release_date ? new Date(top.r.release_date).toISOString() : null };
          checked++;
        }
        muChecked++;
      } catch (e: any) {
        console.error("check mu", f.manga_id, e?.message);
        if (e?.rate) muRate = true;
      }
      await sleep(MU_DELAY);
    }
    // --- deduplikasi & notifikasi ---
    try {
      // MangaDex dulu (bisa dibaca), lalu urut nomor; chapter yang tidak lebih tinggi dari last_seen_chapter
      // tidak disimpan lagi (mencegah dobel dengan riwayat lama yang belum punya chapter_key)
      const srcRank = (x: any) => (x.source === "mangadex" ? 0 : 1);
      const sortedItems = items.filter((i) => i.key).sort((a, b) => ((chapterNum(a.key) ?? 1e9) - (chapterNum(b.key) ?? 1e9)) || (srcRank(a) - srcRank(b)));
      const known: Record<string, number | undefined> = { ...seen };
      const rows = sortedItems.filter((i) => {
        const n = chapterNum(i.key);
        if (n == null) return true;
        if (known[i.lang] != null && n <= (known[i.lang] as number)) return false;
        known[i.lang] = n; return true;
      }).map((i) => ({ user_id: f.user_id, manga_id: f.manga_id, chapter_id: i.chapter_id,
        source: i.source, lang: i.lang, chapter_key: i.key, data: i.data }));
      const inserted = await insertUpdates(rows);
      const notify: any[] = [];
      for (const r of inserted) {
        const n = chapterNum(r.chapter_key);
        const prev = seen[r.lang];
        // numbered: hanya bila lebih tinggi dari last_seen_chapter; extra/tanpa nomor: chapter baru dalam 7 hari
        if (n == null || prev == null || n > prev) notify.push(r);
        if (n != null) seen[r.lang] = Math.max(prev ?? n, n);
      }
      patch.last_seen_chapter = seen;
      found += inserted.length;
      if (notify.length && f.notify !== false) {
        const arr = perUser.get(f.user_id) || []; arr.push({ f, fresh: notify.map((r) => r.data) }); perUser.set(f.user_id, arr);
      }
      await admin.from("rexxa_manga_follows").update(patch).eq("user_id", f.user_id).eq("manga_id", f.manga_id);
    } catch (e: any) { console.error("save", f.manga_id, e?.message); }
    if (mdRate && muRate) break;
  }
  // bersihkan riwayat update lebih dari seminggu (daftar manga yang diikuti tidak disentuh)
  try {
    let d1 = admin.from("rexxa_manga_updates").delete().lt("data->>publishAt", new Date(Date.now() - WEEK).toISOString());
    let d2 = admin.from("rexxa_manga_updates").delete().lt("created_at", new Date(Date.now() - 2 * WEEK).toISOString());
    if (onlyUser) { d1 = d1.eq("user_id", onlyUser); d2 = d2.eq("user_id", onlyUser); }
    await d1; await d2;
  } catch (e: any) { console.error("prune", e?.message); }
  let pushed = 0;
  for (const [uid, items] of perUser) {
    for (const { f, fresh } of items) {
      // satu notifikasi per manga per jalan: chapter tertinggi, sebut bahasa & sumber
      const sorted = [...fresh].sort((a: any, b: any) => (chapterNum(chapterKey(b.chapter)) ?? -1) - (chapterNum(chapterKey(a.chapter)) ?? -1));
      const c = sorted[0];
      const chNums = [...new Set(fresh.map((x: any) => chapterKey(x.chapter, x.title) || x.id))];
      const langsF = [...new Set(fresh.map((x: any) => x.lang))] as string[];
      const extra = chNums.length > 1 ? ` (+${chNums.length - 1} chapter lain)` : "";
      const flag = langsF.length > 1 ? "📖" : c.lang === "id" ? "🇮🇩" : c.lang === "en" ? "🇬🇧" : "📖";
      const langTxt = langsF.map((l) => LANG_NAME[l] || l).join(" & ");
      const viaMu = c.source === "mangaupdates";
      const iconUrl = !f.cover ? undefined : /^https?:/.test(f.cover) ? f.cover : `${SUPABASE_URL}/functions/v1/rexxa-manga?cover=${encodeURIComponent(f.cover)}`;
      pushed += await pushTo(uid, {
        title: `${flag} ${f.title}`,
        body: `Chapter ${c.chapter || "baru"}${c.title ? ` · ${c.title}` : ""} sudah rilis (${langTxt}${viaMu ? " · info MangaUpdates" : ""})${extra}`,
        url: c.url || (viaMu ? "./#manga" : undefined), tag: `manga-${f.manga_id}`, icon: iconUrl,
      });
    }
  }
  return { checked, found, pushed, mapped, muChecked, at: new Date().toISOString() };
}

/* ---------- unduh chapter (MangaDex) ---------- */
const MD_RATINGS = ["safe", "suggestive", "erotica", "pornographic"];
async function chapterList(mangaId: string, langs: string[]) {
  const out: any[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const j = await md(`/manga/${mangaId}/feed`, {
      "translatedLanguage[]": langs, "order[volume]": "asc", "order[chapter]": "asc", limit: "500", offset: String(offset),
      "contentRating[]": MD_RATINGS, "includes[]": "scanlation_group", includeEmptyPages: "0", includeFuturePublishAt: "0", includeExternalUrl: "0",
    }, 12000);
    for (const c of j.data || []) {
      const a = c.attributes || {};
      if (a.externalUrl || !(a.pages > 0)) continue;
      const g = (c.relationships || []).filter((r: any) => r.type === "scanlation_group").map((r: any) => r.attributes?.name).filter(Boolean);
      out.push({ id: c.id, ch: a.chapter ?? null, vol: a.volume ?? null, title: a.title || "", lang: a.translatedLanguage, pages: a.pages, group: g.join(", "), at: a.publishAt || a.createdAt });
    }
    if (offset + 500 >= (j.total || 0)) break;
    await sleep(250);
  }
  return out;
}
// lapor ke jaringan MangaDex@Home (diminta MangaDex agar node yang lambat/rusak bisa dideteksi)
function mdReport(url: string, ok: boolean, bytes: number, ms: number, cached: boolean) {
  if (/(^|\.)mangadex\.org$/.test(new URL(url).hostname)) return;
  fetch("https://api.mangadex.network/report", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ url, success: ok, bytes, duration: ms, cached }) }).catch(() => {});
}
function mdImgAllowed(raw: string) {
  try {
    const u = new URL(raw);
    const hostOk = u.hostname === "uploads.mangadex.org" || u.hostname.endsWith(".mangadex.network");
    return u.protocol === "https:" && hostOk && /^\/([\w-]+\/)?(data|data-saver)\/[0-9a-f]{32}\/[\w.-]+$/i.test(u.pathname) ? u : null;
  } catch { return null; }
}

/* ---------- router ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    // proxy sampul (MangaDex menolak hotlink gambar dari situs lain)
    const cover = url.searchParams.get("cover");
    if (req.method === "GET" && cover) {
      if (!/^[0-9a-f-]{36}\/[\w.-]+$/i.test(cover)) return json({ error: "cover tidak valid" }, 400);
      const r = await fetch(`https://uploads.mangadex.org/covers/${cover}.256.jpg`, { headers: { "User-Agent": UA } });
      return new Response(r.body, { status: r.status, headers: { ...CORS, "Content-Type": r.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "public, max-age=604800" } });
    }
    // proxy sampul MangaUpdates: hanya https ke domain mangaupdates.com
    const mucover = url.searchParams.get("mucover");
    if (req.method === "GET" && mucover) {
      let u: URL;
      try { u = new URL(mucover); } catch { return json({ error: "mucover tidak valid" }, 400); }
      if (u.protocol !== "https:" || !(u.hostname === "mangaupdates.com" || u.hostname.endsWith(".mangaupdates.com")))
        return json({ error: "host sampul tidak diizinkan" }, 400);
      const r = await fetchT(u, { headers: { "User-Agent": UA } }, 8000).catch(() => null);
      if (!r) return json({ error: "gagal memuat sampul" }, 502);
      return new Response(r.body, { status: r.status, headers: { ...CORS, "Content-Type": r.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "public, max-age=604800" } });
    }
    // proxy gambar chapter (cadangan bila browser tidak bisa mengambil langsung). Wajib login, hanya domain MangaDex.
    const mdimg = url.searchParams.get("mdimg");
    if (req.method === "GET" && mdimg) {
      const iu = mdImgAllowed(mdimg);
      if (!iu) return json({ error: "alamat gambar tidak diizinkan" }, 400);
      const tk = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: uu } = await admin.auth.getUser(tk);
      if (!uu?.user) return json({ error: "Belum masuk ke akun sinkron REXXA." }, 401);
      const t0 = Date.now();
      const r = await fetchT(iu, { headers: { "User-Agent": UA } }, 20000).catch(() => null);
      if (!r || !r.ok) { mdReport(iu.href, false, 0, Date.now() - t0, false); return json({ error: `gagal memuat gambar${r ? " (" + r.status + ")" : ""}` }, 502); }
      const buf = await r.arrayBuffer();
      mdReport(iu.href, true, buf.byteLength, Date.now() - t0, r.headers.get("X-Cache") === "HIT");
      return new Response(buf, { status: 200, headers: { ...CORS, "Content-Type": r.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "private, max-age=86400" } });
    }
    if (req.method === "GET") return json({ ok: true, name: "rexxa-manga", version: VERSION });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "";

    // dipanggil pg_cron
    if (action === "check" && req.headers.get("x-rexxa-cron")) {
      const s = await secrets();
      if (req.headers.get("x-rexxa-cron") !== s.cronSecret) return json({ error: "cron secret salah" }, 401);
      return json({ ok: true, ...(await check()) });
    }

    // selain cron: wajib login (token akun sinkron REXXA)
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user) return json({ error: "Belum masuk ke akun sinkron REXXA." }, 401);

    if (action === "setup") {
      const s = await secrets();
      return json({ ok: true, version: VERSION, vapidPublicKey: s.vapidPublic, cronSecret: s.cronSecret, functionUrl: `${SUPABASE_URL}/functions/v1/rexxa-manga` });
    }
    if (action === "diag") {
      const out: Record<string, unknown> = { version: VERSION, serviceKey: !!SERVICE_KEY };
      for (const t of ["rexxa_private", "rexxa_manga_follows", "rexxa_manga_updates", "rexxa_push_subs"]) {
        const { error } = await admin.from(t).select("*", { head: true, count: "exact" }).limit(1);
        out[t] = error ? dbError(error, t).message : "ok";
      }
      return json({ ok: true, diag: out });
    }
    if (action === "status") {
      const { data } = await admin.rpc("rexxa_cron_status");
      return json({ ok: true, version: VERSION, cron: data || null });
    }
    if (action === "search") {
      const q = String(body.q || "").trim().slice(0, 100);
      if (!q) return json({ ok: true, results: [] });
      const onlyLangs = body.onlyLangs !== false && body.onlyId !== false;
      const r = await searchFallback(q, cleanLangs(body.langs), onlyLangs);
      // `results` = bentuk lama (hanya MangaDex) agar UI sekarang tetap jalan; `hasil` = format seragam baru
      const results = r.sumber === "mangadex" ? r.hasil.map((h: any) => h.legacy).filter(Boolean) : [];
      const hasil = r.hasil.map(({ legacy, ...h }: any) => h);
      return json({ ok: true, results, hasil, sumber: r.sumber, dataLama: r.dataLama, semuaGagal: !!(r as any).semuaGagal, dariCache: !!r.dariCache, cachedAt: r.cachedAt || null, dicoba: r.tried, ...(r.error ? { error_sumber: r.error } : {}) });
    }
    if (action === "follow") {
      const m = body.manga || {};
      if (!/^[0-9a-f-]{36}$/i.test(m.id || "")) return json({ error: "ID manga tidak valid" }, 400);
      const langs = cleanLangs(body.langs);
      const last = await latestChapter(m.id, langs).catch(() => null);
      const row = {
        user_id: user.id, manga_id: m.id, title: String(m.title || "").slice(0, 200), cover: String(m.cover || "").slice(0, 200),
        langs, notify: true, last_chapter: last, last_chapter_at: last?.publishAt || new Date().toISOString(), checked_at: new Date().toISOString(),
      };
      const { error } = await admin.from("rexxa_manga_follows").upsert(row, { onConflict: "user_id,manga_id" });
      if (error) throw error;
      // pemetaan ke MangaUpdates langsung saat follow (gagal tidak membatalkan follow)
      let mapping: any = null;
      try { mapping = await saveMapping({ ...row, mangadex_id: m.id }, await mapMu({ ...row, mangadex_id: m.id })); } catch (e: any) { console.error("map on follow", e?.message); }
      return json({ ok: true, follow: { ...row, mangadex_id: m.id, ...(mapping || {}) } });
    }
    // ikuti manga yang hanya ada di MangaUpdates (tidak bisa dibaca, hanya info update bahasa Inggris)
    if (action === "follow_mu") {
      const id = String(body.mu_id || "").trim();
      if (!/^\d{1,20}$/.test(id)) return json({ error: "ID MangaUpdates tidak valid" }, 400);
      const sd = await muSeries(id);
      if (sd?.series_id == null) return json({ error: "Seri MangaUpdates tidak ditemukan" }, 404);
      const latest = Number(sd.latest_chapter) > 0 ? Number(sd.latest_chapter) : null; // 0 = belum ada rilis tercatat
      const img = sd.image?.url?.thumb || sd.image?.url?.original || "";
      const row = {
        user_id: user.id, manga_id: `mu:${id}`, source: "mangaupdates", mangadex_id: null, mu_id: id, mu_match: "confirmed", mu_candidates: null,
        title: String(sd.title || body.title || "").slice(0, 200),
        cover: img ? `${SUPABASE_URL}/functions/v1/rexxa-manga?mucover=${encodeURIComponent(img)}` : "",
        langs: ["en"], notify: true, checked_at: new Date().toISOString(),
        last_chapter: latest != null ? { chapter: String(latest), lang: "en", url: sd.url || null, source: "mangaupdates" } : null,
        last_chapter_at: new Date().toISOString(), last_seen_chapter: latest != null ? { en: latest } : {},
      };
      const { data: dup } = await admin.from("rexxa_manga_follows").select("manga_id").eq("user_id", user.id).eq("mu_id", id).maybeSingle();
      if (dup && dup.manga_id !== row.manga_id) return json({ error: "Seri ini sudah kamu ikuti lewat MangaDex." }, 409);
      const { error } = await admin.from("rexxa_manga_follows").upsert(row, { onConflict: "user_id,manga_id" });
      if (error) throw error;
      return json({ ok: true, follow: row });
    }
    if (action === "map_mu") {
      const { data: f } = await admin.from("rexxa_manga_follows").select("*").eq("user_id", user.id).eq("manga_id", String(body.manga_id || "")).maybeSingle();
      if (!f) return json({ error: "Follow tidak ditemukan" }, 404);
      const r = await mapMu(f);
      return json({ ok: true, ...(await saveMapping(f, r)), status: r.status });
    }
    if (action === "confirm_mu" || action === "reject_mu") {
      const { data: f } = await admin.from("rexxa_manga_follows").select("*").eq("user_id", user.id).eq("manga_id", String(body.manga_id || "")).maybeSingle();
      if (!f) return json({ error: "Follow tidak ditemukan" }, 404);
      if (action === "reject_mu") {
        await admin.from("rexxa_manga_follows").update({ mu_id: null, mu_match: "rejected", mu_candidates: null }).eq("user_id", user.id).eq("manga_id", f.manga_id);
        return json({ ok: true, mu_match: "rejected" });
      }
      const id = String(body.mu_id || "");
      if (!(f.mu_candidates || []).some((c: any) => c.id === id)) return json({ error: "Kandidat tidak dikenal, petakan ulang dulu." }, 400);
      await admin.from("rexxa_manga_follows").delete().eq("user_id", user.id).eq("mu_id", id).neq("manga_id", f.manga_id);
      const { error } = await admin.from("rexxa_manga_follows").update({ mu_id: id, mu_match: "confirmed", mu_candidates: null }).eq("user_id", user.id).eq("manga_id", f.manga_id);
      if (error) throw error;
      return json({ ok: true, mu_id: id, mu_match: "confirmed" });
    }
    if (action === "chapters") {
      const id = String(body.manga_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "ID manga tidak valid" }, 400);
      const langs = cleanLangs(body.langs);
      const chapters = await chapterList(id, langs);
      return json({ ok: true, chapters });
    }
    if (action === "pages") {
      const id = String(body.chapter_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "ID chapter tidak valid" }, 400);
      const j = await md(`/at-home/server/${id}`, {}, 10000);
      if (!j?.chapter?.hash) return json({ error: "Server gambar MangaDex tidak memberi alamat halaman" }, 502);
      return json({ ok: true, base: j.baseUrl, hash: j.chapter.hash, data: j.chapter.data || [], dataSaver: j.chapter.dataSaver || [] });
    }
    if (action === "check") return json({ ok: true, ...(await check(user.id)) });
    if (action === "test_push") {
      const n = await pushTo(user.id, { title: "🔔 Tes notifikasi REXXA", body: "Notifikasi chapter baru (Indonesia/Inggris) akan muncul seperti ini.", url: "./#manga", tag: "rexxa-test" });
      return json({ ok: true, sent: n });
    }
    return json({ error: "action tidak dikenal" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || String(e) }, 500);
  }
});
