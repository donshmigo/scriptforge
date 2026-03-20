import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

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

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const INNERTUBE_PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

// Try multiple InnerTube clients in order — different clients return different caption data
const CLIENTS = [
  {
    ua: ANDROID_UA,
    context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
  },
  {
    ua: BROWSER_UA,
    context: { client: { clientName: "WEB", clientVersion: "2.20240101.09.00", hl: "en", gl: "US" } },
  },
  {
    ua: BROWSER_UA,
    context: { client: { clientName: "TVHTML5", clientVersion: "7.20240101.16.00", hl: "en", gl: "US" } },
  },
];

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

  // srv3 format: <p t="OFFSET_MS" ...> — flexible attribute order
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

  // srv1 fallback: <text start="0.5" dur="2.0">...</text>
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

  return paragraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function getCaptionTracks(videoId: string): Promise<{ languageCode: string; baseUrl: string }[]> {
  for (const client of CLIENTS) {
    try {
      const res = await fetch(INNERTUBE_PLAYER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": client.ua },
        body: JSON.stringify({ context: client.context, videoId }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tracks: { languageCode: string; baseUrl: string }[] =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      if (tracks.length > 0) return tracks;
    } catch {
      // try next client
    }
  }
  return [];
}

async function fetchTranscriptForVideo(video: { id: string; title: string }): Promise<TranscriptResult> {
  const tracks = await getCaptionTracks(video.id);

  if (tracks.length === 0) throw new Error("No captions available for this video");

  const track =
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  // Force srv3 format for consistent XML parsing
  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const captionUrl = track.baseUrl.includes("fmt=")
    ? track.baseUrl
    : `${track.baseUrl}${sep}fmt=srv3`;

  const capRes = await fetch(captionUrl, {
    headers: { "User-Agent": ANDROID_UA },
  });

  if (!capRes.ok) throw new Error(`Caption fetch error: ${capRes.status}`);

  const xml = await capRes.text();
  if (!xml) throw new Error("Empty caption response");

  const lines = parseTimedTextXml(xml);
  if (lines.length === 0) throw new Error(`No transcript lines parsed (xml: ${xml.slice(0, 100)})`);

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
    const { videos } = (await req.json()) as {
      videos: { id: string; title: string }[];
    };

    if (!videos?.length) {
      return NextResponse.json({ error: "No videos provided." }, { status: 400 });
    }

    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    // Try videos one by one until we have 5 successful transcripts
    for (const video of videos) {
      if (transcripts.length >= 5) break;
      try {
        const result = await fetchTranscriptForVideo(video);
        transcripts.push(result);
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
