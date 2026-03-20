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

// YouTube's Android InnerTube client — bypasses bot detection on the player endpoint
const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const INNERTUBE_PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    androidSdkVersion: 34,
    osName: "Android",
    osVersion: "14",
    hl: "en",
    gl: "US",
  },
};

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

  // srv3 format: <p t="OFFSET_MS" d="DURATION_MS" ...> with optional <s> sub-elements
  // Use flexible attribute matching — YouTube attribute order is not guaranteed
  const pRegex = /<p\b[^>]*\bt="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;

  while ((m = pRegex.exec(xml)) !== null) {
    const offsetMs = parseInt(m[1], 10);
    const rawContent = m[2];

    // Extract text from <s> sub-segments if present, otherwise strip all tags
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = sRegex.exec(rawContent)) !== null) text += sm[1];
    if (!text) text = rawContent.replace(/<[^>]+>/g, "");

    text = decodeEntities(text).replace(/\s+/g, " ").trim();
    if (text) lines.push({ offsetMs, text });
  }

  if (lines.length > 0) return lines;

  // Fallback: srv1 format <text start="0.5" dur="2.0">...</text>
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

async function fetchTranscriptForVideo(video: { id: string; title: string }): Promise<TranscriptResult> {
  // 1. Get caption tracks via Android InnerTube player endpoint
  const playerRes = await fetch(INNERTUBE_PLAYER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId: video.id,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });

  if (!playerRes.ok) throw new Error(`Player API error: ${playerRes.status}`);

  const playerData = await playerRes.json();
  const tracks: { languageCode: string; baseUrl: string }[] =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (tracks.length === 0) throw new Error("No captions available for this video");

  // 2. Prefer English track, fall back to first available
  const track =
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  // 3. Force srv3 format for consistent parsing
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

  // 4. Parse and group into paragraph blocks
  const lines = parseTimedTextXml(xml);
  if (lines.length === 0) throw new Error(`No transcript lines parsed (xml length: ${xml.length})`);

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
