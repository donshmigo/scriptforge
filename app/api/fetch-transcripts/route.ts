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

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
    if ((l.offsetMs - prev) / 1000 >= 3 && cur.length) { paras.push(cur.join(" ")); cur = []; }
    cur.push(l.text);
    prev = l.offsetMs;
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras.map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
}

// Extract ytInitialPlayerResponse from the watch page HTML using bracket counting
function extractCaptionTracks(html: string): { languageCode: string; baseUrl: string }[] {
  const marker = "ytInitialPlayerResponse = ";
  const idx = html.indexOf(marker);
  if (idx === -1) return [];

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
    return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  } catch {
    return [];
  }
}

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  // Fetch the watch page — same request a real browser makes
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${video.id}`, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!watchRes.ok) throw new Error(`Watch page ${watchRes.status}`);

  const html = await watchRes.text();
  const tracks = extractCaptionTracks(html);

  if (tracks.length === 0) throw new Error("No captions");

  const track =
    tracks.find(t => t.languageCode === "en") ??
    tracks.find(t => t.languageCode?.startsWith("en")) ??
    tracks[0];

  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const capUrl = `${track.baseUrl}${sep}fmt=srv3`;

  const capRes = await fetch(capUrl, { headers: { "User-Agent": BROWSER_UA } });
  if (!capRes.ok) throw new Error(`Caption fetch ${capRes.status}`);

  const xml = await capRes.text();
  const lines = parseXml(xml);
  if (!lines.length) throw new Error("Empty captions");

  const text = toText(lines);
  if (!text) throw new Error("Empty text");

  return { id: video.id, title: video.title, text, wordCount: text.split(/\s+/).filter(Boolean).length };
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = (await req.json()) as { videos: { id: string; title: string }[] };
    if (!videos?.length) return NextResponse.json({ error: "No videos provided." }, { status: 400 });

    // Try up to 10 videos to collect 5 successes (more data = better style analysis)
    const candidates = videos.slice(0, 10);
    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const video of candidates) {
      if (transcripts.length >= 5) break;

      // 1s gap between requests to avoid triggering rate limits
      if (transcripts.length + failed.length > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }

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
