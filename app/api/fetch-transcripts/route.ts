import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

export interface TranscriptResult {
  id: string;
  title: string;
  text: string;
  wordCount: number;
}

export interface FetchTranscriptsResponse {
  transcripts: TranscriptResult[];
  failed: { id: string; title: string; reason: string }[];
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Consent cookies to bypass YouTube's EU/regional consent wall on serverless
const CONSENT_COOKIES =
  "SOCS=CAESEwgDEgk2ODE4MTAyNjQaAmVuIAEaBgiA_LyaBg; CONSENT=PENDING+987";

const YT_HEADERS = {
  "User-Agent": BROWSER_UA,
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: CONSENT_COOKIES,
};

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseXml(xml: string): { offsetMs: number; text: string }[] {
  const lines: { offsetMs: number; text: string }[] = [];
  let m: RegExpExecArray | null;

  // srv3 format: <p t="12345"><s>word</s></p>
  const p = /<p\b[^>]*\bt="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  while ((m = p.exec(xml)) !== null) {
    const raw = m[2];
    let text = "";
    const s = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = s.exec(raw)) !== null) text += sm[1];
    if (!text) text = raw.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).replace(/\s+/g, " ").trim();
    if (text) lines.push({ offsetMs: parseInt(m[1], 10), text });
  }
  if (lines.length > 0) return lines;

  // srv1 fallback: <text start="12.34">word</text>
  const t = /<text\b[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = t.exec(xml)) !== null) {
    const text = decodeEntities(m[2]).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) lines.push({ offsetMs: Math.round(parseFloat(m[1]) * 1000), text });
  }
  return lines;
}

function toText(lines: { offsetMs: number; text: string }[]): string {
  if (!lines.length) return "";
  const paras: string[] = [];
  let cur: string[] = [];
  let prev = 0;
  for (const l of lines) {
    if ((l.offsetMs - prev) / 1000 >= 3 && cur.length) {
      paras.push(cur.join(" "));
      cur = [];
    }
    cur.push(l.text);
    prev = l.offsetMs;
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
}

/** Extract caption tracks from the watch page HTML */
function extractCaptionTracks(html: string): { baseUrl: string; languageCode: string; kind?: string }[] {
  for (const marker of [
    "ytInitialPlayerResponse = ",
    "var ytInitialPlayerResponse = ",
  ]) {
    const idx = html.indexOf(marker);
    if (idx === -1) continue;

    let depth = 0;
    let i = idx + marker.length;
    const start = i;
    for (; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }

    try {
      const data = JSON.parse(html.slice(start, i));
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks?.length) return tracks;
    } catch { /* try next marker */ }
  }

  // Fallback: regex extraction of captionTracks JSON array
  const m = html.match(/"captionTracks":(\[.*?\])/s);
  if (m?.[1]) {
    try {
      // YouTube escapes URLs with \u0026 — JSON.parse handles that
      const tracks = JSON.parse(m[1]);
      if (tracks?.length) return tracks;
    } catch { /* ignore */ }
  }

  return [];
}

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  // Fetch watch page with consent cookies to bypass regional consent wall
  const watchRes = await fetch(
    `https://www.youtube.com/watch?v=${video.id}&hl=en`,
    { headers: { ...YT_HEADERS, Accept: "text/html" } }
  );
  if (!watchRes.ok) throw new Error(`Watch page HTTP ${watchRes.status}`);

  const html = await watchRes.text();

  // Check if we got a consent redirect instead of the real page
  if (html.includes("consent.youtube.com") && !html.includes("ytInitialPlayerResponse")) {
    throw new Error("Consent wall — cookies not accepted");
  }

  const tracks = extractCaptionTracks(html);
  if (tracks.length === 0) {
    // Include diagnostic info
    const hasPlayerResponse = html.includes("ytInitialPlayerResponse");
    const hasCaptions = html.includes("captionTracks");
    throw new Error(
      `No caption tracks (playerResponse=${hasPlayerResponse}, captionTracks=${hasCaptions}, htmlLen=${html.length})`
    );
  }

  // Prefer manual English captions over auto-generated
  const track =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  // Fetch caption XML — try srv1 first (most widely supported), then srv3
  for (const fmt of ["srv1", "srv3"]) {
    const sep = track.baseUrl.includes("?") ? "&" : "?";
    const capUrl = `${track.baseUrl}${sep}fmt=${fmt}`;

    const capRes = await fetch(capUrl, { headers: YT_HEADERS });
    if (!capRes.ok) continue;

    const xml = await capRes.text();
    const lines = parseXml(xml);
    if (lines.length === 0) continue;

    const text = toText(lines);
    if (!text) continue;

    return {
      id: video.id,
      title: video.title,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  }

  throw new Error("Caption tracks found but could not parse content");
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = (await req.json()) as {
      videos: { id: string; title: string }[];
    };
    if (!videos?.length)
      return NextResponse.json({ error: "No videos provided." }, { status: 400 });

    // Try up to 10 videos to collect 5 successes
    const candidates = videos.slice(0, 10);
    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; title: string; reason: string }[] = [];

    for (const video of candidates) {
      if (transcripts.length >= 5) break;

      try {
        transcripts.push(await fetchTranscript(video));
      } catch (err) {
        failed.push({
          id: video.id,
          title: video.title,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ transcripts, failed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
