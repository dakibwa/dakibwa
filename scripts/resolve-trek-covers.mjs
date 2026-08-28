#!/usr/bin/env node
/**
 * Cache real record fronts for /trek/ walked days.
 *
 * Matches live in data/trek-matches.json (lyrics, then song, then album).
 * Prefer a printed wall card; otherwise Cover Art Archive; otherwise a
 * documented fallback URL (Dump has no CAA front). Never invent a sleeve.
 *
 *   node scripts/resolve-trek-covers.mjs
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const matchesPath = path.join(root, "data/trek-matches.json");
const daysPath = path.join(root, "data/trek-days.json");
const outJson = path.join(root, "data/trek-covers.json");
const outDir = path.join(root, "public/trek/covers");
const groundsDir = path.join(root, "public/trek/grounds");
const UA = "AkibwaTrek/1.0 (https://akibwa.com/trek/; dakibwa@gmail.com)";
const SIZE = 128;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "cover";

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) return null;
  const kind = (res.headers.get("content-type") || "").toLowerCase();
  if (kind && !kind.includes("image") && !kind.includes("octet-stream")) return null;
  return buf;
}

async function mb(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (res.status === 503 || res.status === 429) {
    await sleep(1600);
    return mb(url);
  }
  if (!res.ok) throw new Error(`MusicBrainz ${res.status} ${url}`);
  return res.json();
}

async function searchReleaseGroup(artist, album) {
  const q = `artist:"${artist.replace(/"/g, "")}" AND releasegroup:"${album.replace(/"/g, "")}"`;
  const url =
    "https://musicbrainz.org/ws/2/release-group/?query=" +
    encodeURIComponent(q) +
    "&fmt=json&limit=8";
  const data = await mb(url);
  const hits = data["release-groups"] || [];
  const want = slug(album);
  const scored = hits.filter((h) => Number(h.score) >= 70);
  scored.sort((a, b) => {
    const ta = slug(a.title) === want ? 0 : 1;
    const tb = slug(b.title) === want ? 0 : 1;
    if (ta !== tb) return ta - tb;
    const pa = String(a["primary-type"] || "").toLowerCase() === "album" ? 0 : 1;
    const pb = String(b["primary-type"] || "").toLowerCase() === "album" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (Number(b.count) || 0) - (Number(a.count) || 0);
  });
  return scored[0] || null;
}

async function fetchCoverFromMbid(mbid) {
  try {
    const res = await fetch(`https://coverartarchive.org/release-group/${mbid}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "follow"
    });
    if (res.ok) {
      const data = await res.json();
      const images = data.images || [];
      const front = images.find((i) => i.front) || images.find((i) => (i.types || []).includes("Front"));
      const url = front?.thumbnails?.["500"] || front?.thumbnails?.large || front?.image;
      if (url) {
        const img = await fetchBuf(url.replace(/^http:\/\//, "https://"));
        if (img) return img;
      }
    }
  } catch {
    // fall through
  }
  const fromGroup = await fetchBuf(`https://coverartarchive.org/release-group/${mbid}/front-500`);
  if (fromGroup) return fromGroup;
  await sleep(900);
  const rg = await mb(`https://musicbrainz.org/ws/2/release-group/${mbid}?inc=releases&fmt=json`);
  const releases = [...(rg.releases || [])].sort((a, b) => {
    const rank = (s) => (String(s?.status).toLowerCase() === "official" ? 0 : 1);
    return rank(a) - rank(b);
  });
  for (const r of releases.slice(0, 8)) {
    await sleep(350);
    const img = await fetchBuf(`https://coverartarchive.org/release/${r.id}/front-500`);
    if (img) return img;
  }
  return null;
}

async function writeCover(buf, file) {
  await sharp(buf).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 76 }).toFile(path.join(outDir, file));
}

async function fromWall(id) {
  const wall = path.join(root, "public/album-art", `${id}-wall.webp`);
  const card = path.join(root, "public/album-art", `${id}-card.avif`);
  try {
    return await readFile(wall);
  } catch {
    try {
      return await readFile(card);
    } catch {
      return null;
    }
  }
}

async function prepareGrounds() {
  const srcDir = "/opt/cursor/artifacts/assets";
  await mkdir(groundsDir, { recursive: true });
  const countries = ["france", "germany", "austria", "slovenia", "croatia", "serbia", "bulgaria"];
  for (const name of countries) {
    const src = path.join(srcDir, `trek-ground-${name}.png`);
    const dest = path.join(groundsDir, `${name}.webp`);
    await sharp(src).resize(256, 256, { fit: "cover" }).webp({ quality: 68 }).toFile(dest);
  }
  await sharp(path.join(srcDir, "trek-contour-ground.png"))
    .resize(960, 540, { fit: "cover" })
    .webp({ quality: 62 })
    .toFile(path.join(groundsDir, "contour.webp"));
  await sharp(path.join(srcDir, "trek-rest-mark-v2.png"))
    .resize(64, 64, { fit: "cover" })
    .webp({ quality: 72 })
    .toFile(path.join(root, "public/trek/rest-mark.webp"));
  console.log("grounds + rest mark written");
}

const curated = JSON.parse(await readFile(matchesPath, "utf8"));
const days = JSON.parse(await readFile(daysPath, "utf8")).days;
await mkdir(outDir, { recursive: true });

const titles = {};
const fileCache = new Map();

for (const [gps, rec] of Object.entries(curated.matches)) {
  const file = rec.file || `${slug(rec.album || rec.song || gps)}.webp`;
  const dest = path.join(outDir, file);
  let buf = fileCache.get(file) || null;

  if (!buf && rec.wallId) {
    buf = await fromWall(rec.wallId);
    if (buf) console.log(`= ${gps}  wall ${rec.wallId}  ${rec.artist} — ${rec.album}`);
  }

  if (!buf) {
    try {
      buf = await readFile(dest);
      fileCache.set(file, buf);
      console.log(`= ${gps}  keep ${file}`);
    } catch {
      buf = null;
    }
  }

  if (!buf && rec.mbid) {
    process.stdout.write(`? ${gps}  CAA ${rec.mbid}  `);
    try {
      buf = await fetchCoverFromMbid(rec.mbid);
    } catch (err) {
      console.log("ERR", err.message);
    }
    if (buf) console.log("ok");
    else console.log("miss");
    await sleep(700);
  }

  if (!buf) {
    process.stdout.write(`? ${gps}  search ${rec.artist} — ${rec.album}  `);
    await sleep(1100);
    try {
      const hit = await searchReleaseGroup(rec.artist, rec.album);
      if (hit) {
        rec.mbid = hit.id;
        await sleep(400);
        buf = await fetchCoverFromMbid(hit.id);
      }
    } catch (err) {
      console.log("ERR", err.message);
    }
    console.log(buf ? `→ ${rec.mbid}` : "no CAA");
  }

  if (!buf && rec.coverUrls) {
    for (const url of rec.coverUrls) {
      process.stdout.write(`? ${gps}  url  `);
      buf = await fetchBuf(url);
      console.log(buf ? "ok" : "miss");
      if (buf) break;
      await sleep(400);
    }
  }

  if (!buf) {
    console.log(`! ${gps}  NO COVER  ${rec.artist} — ${rec.album}`);
    titles[gps] = { matched: false, reason: "no-cover", ...rec };
    continue;
  }

  if (!fileCache.has(file)) {
    await writeCover(buf, file);
    fileCache.set(file, buf);
  }

  titles[gps] = {
    matched: true,
    src: `/trek/covers/${file}`,
    kind: rec.kind,
    song: rec.song || null,
    album: rec.album,
    artist: rec.artist,
    source: rec.source,
    note: rec.note || null,
    mbid: rec.mbid || null,
    wallId: rec.wallId || null
  };
}

for (const [gps, reason] of Object.entries(curated.unmatched || {})) {
  if (!titles[gps]) titles[gps] = { matched: false, reason };
}

const daysOut = {};
for (const d of days) {
  if (!d.walked || !d.title) continue;
  const rec = titles[d.title];
  if (rec?.matched) daysOut[d.n] = rec;
}

await writeFile(
  outJson,
  JSON.stringify(
    {
      source: "curated lyrics/song/album matches; printed wall cards, Cover Art Archive, Discogs",
      rule: curated.rule,
      resolvedAt: new Date().toISOString(),
      titles,
      days: daysOut
    },
    null,
    2
  ) + "\n"
);

try {
  await prepareGrounds();
} catch (err) {
  console.log("grounds skipped:", err.message);
}

const files = (await readdir(outDir)).filter((f) => f.endsWith(".webp"));
const matchedTitles = Object.keys(titles).filter((t) => titles[t]?.matched).length;
console.log(
  `matched ${matchedTitles} titles; ${Object.keys(daysOut).length} walked days with art; ${files.length} cover files`
);
