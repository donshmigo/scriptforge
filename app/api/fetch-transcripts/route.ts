import { NextRequest, NextResponse } from "next/server";

// Node.js runtime — Edge was timing out fetching multiple large HTML pages
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseTimedTextXml(xml: string): { offsetMs: number; text: string }[] {
  const lines: { offsetMs: number; text: string }[] = [];

  // srv3 format
  const pRegex = /<p\b[^>]*\bt="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(xml)) !== null) {
    const offsetMs = parseInt(m[1], 10);
    const rawContent = m[2];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = sRegex.exec(rawContent)) !== null) text += sm[1];
    if (!text) text = rawContent.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).replace(/\s+/g, " ").trim();
    if (text) lines.push({ offsetMs, text });
  }

  if (lines.length > 0) return lines;

  // srv1 fallback
  const textRegex = /<text\b[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = textRegex.exec(xml)) !== null) {
    const offsetMs = Math.round(parseFloat(m[1]) * 1000);
    const text = decodeEntities(m[2]).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) lines.push({ offsetMs, text });
  }

  return lines;
}

function linesToText(lines: { offsetMs: number; text: string }[]): string {
  if (lines.length === 0) return "";
  const paragraphs: string[] = [];
  let current: string[] = [];
  let prevOffsetMs = 0;
  for (const line of lines) {
    const gapSec = (line.offsetMs - prevOffsetMs) / 1000;
    if (gapSec >= 3.0 && current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
    current.push(line.text);
    prevOffsetMs = line.offsetMs;
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
}

interface CaptionTrack { languageCode: string; baseUrl: string; }

// Bracket-balanced JSON array extractor — handles nested objects/arrays
function extractJsonArray(html: string, key: string): string | null {
  const idx = html.indexOf(`"${key}":`);
  if (idx === -1) return null;
  const start = html.indexOf("[", idx + key.length + 2);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  // Primary: watch page (mimics real browser, less rate-limited than InnerTube API)
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/watch?v=${videoId}&hl=en`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "en-US,en;q=0.9",
          "Cookie": "CONSENT=YES+42; SOCS=CAESEwgDEgk0OTk5OTk5OTkYAxISCgIIABgDIgJlbiIBASoAKAE",
        },
      },
      10000
    );
    if (res.ok) {
      const html = await res.text();
      const raw = extractJsonArray(html, "captionTracks");
      if (raw) {
        const tracks: CaptionTrack[] = JSON.parse(raw);
        const valid = tracks.filter((t) => t?.baseUrl);
        if (valid.length > 0) return valid;
      }
    }
  } catch { /* fall through */ }

  // Fallback: InnerTube Android client
  try {
    const res = await fetchWithTimeout(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
        },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
          videoId,
        }),
      },
      8000
    );
    if (res.ok) {
      const data = await res.json();
      const tracks: CaptionTrack[] = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      if (tracks.length > 0) return tracks;
    }
  } catch { /* fall through */ }

  return [];
}

async function fetchTranscriptForVideo(video: { id: string; title: string }): Promise<TranscriptResult> {
  const tracks = await getCaptionTracks(video.id);
  if (tracks.length === 0) throw new Error("No captions available");

  const track =
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const captionUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}${sep}fmt=srv3`;

  const capRes = await fetchWithTimeout(captionUrl, { headers: { "User-Agent": BROWSER_UA } }, 8000);
  if (!capRes.ok) throw new Error(`Caption fetch ${capRes.status}`);

  const xml = await capRes.text();
  if (!xml) throw new Error("Empty caption response");

  const lines = parseTimedTextXml(xml);
  if (lines.length === 0) throw new Error("No lines parsed from caption XML");

  const text = linesToText(lines);
  if (!text) throw new Error("Empty transcript after parsing");

  return {
    id: video.id,
    title: video.title,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = (await req.json()) as { videos: { id: string; title: string }[] };

    if (!videos?.length) {
      return NextResponse.json({ error: "No videos provided." }, { status: 400 });
    }

    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const video of videos) {
      if (transcripts.length >= 5) break;
      try {
        transcripts.push(await fetchTranscriptForVideo(video));
      } catch (err) {
        failed.push({
          id: video.id,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ transcripts, failed } satisfies FetchTranscriptsResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcripts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
