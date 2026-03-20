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
  failed: { id: string; reason: string }[];
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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
    if ((l.offsetMs - prev) / 1000 >= 3 && cur.length) { paras.push(cur.join(" ")); cur = []; }
    cur.push(l.text);
    prev = l.offsetMs;
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras.map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
}

// Extract balanced JSON array from HTML — handles nested objects/arrays
function extractArray(html: string, key: string): string | null {
  const idx = html.indexOf(`"${key}":`);
  if (idx === -1) return null;
  const start = html.indexOf("[", idx + key.length + 2);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]" && --depth === 0) return html.slice(start, i + 1);
  }
  return null;
}

interface Track { languageCode?: string; language_code?: string; baseUrl?: string; base_url?: string; }

async function getTracksForVideo(videoId: string): Promise<Track[]> {
  // Watch page — mimics real browser, returns full player JSON with captionTracks
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=YES+42; SOCS=CAESEwgDEgk0OTk5OTk5OTkYAxISCgIIABgDIgJlbiIBASoAKAE",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const html = await res.text();
      // Check we actually got a video page, not a YouTube error page
      if (html.includes('"captionTracks"')) {
        const raw = extractArray(html, "captionTracks");
        if (raw) {
          const tracks: Track[] = JSON.parse(raw);
          const valid = tracks.filter(t => t.baseUrl || t.base_url);
          if (valid.length > 0) return valid;
        }
      }
    }
  } catch { /* fall through */ }

  // Fallback — InnerTube Android player endpoint
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)" },
      body: JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
        videoId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const tracks: Track[] = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      if (tracks.length > 0) return tracks;
    }
  } catch { /* fall through */ }

  return [];
}

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  const tracks = await getTracksForVideo(video.id);
  if (!tracks.length) throw new Error("No captions available");

  const track =
    tracks.find(t => (t.languageCode ?? t.language_code) === "en") ??
    tracks.find(t => (t.languageCode ?? t.language_code ?? "").startsWith("en")) ??
    tracks[0];

  const url = (track.baseUrl ?? track.base_url ?? "");
  if (!url) throw new Error("No caption URL");

  const sep = url.includes("?") ? "&" : "?";
  const captionUrl = url.includes("fmt=") ? url : `${url}${sep}fmt=srv3`;

  const res = await fetch(captionUrl, {
    headers: { "User-Agent": BROWSER_UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Caption fetch ${res.status}`);

  const xml = await res.text();
  const lines = parseXml(xml);
  if (!lines.length) throw new Error("Could not parse captions");

  const text = toText(lines);
  if (!text) throw new Error("Empty transcript");

  return { id: video.id, title: video.title, text, wordCount: text.split(/\s+/).filter(Boolean).length };
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = (await req.json()) as { videos: { id: string; title: string }[] };
    if (!videos?.length) return NextResponse.json({ error: "No videos provided." }, { status: 400 });

    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const video of videos) {
      if (transcripts.length >= 5) break;
      try {
        transcripts.push(await fetchTranscript(video));
      } catch (err) {
        failed.push({ id: video.id, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({ transcripts, failed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
