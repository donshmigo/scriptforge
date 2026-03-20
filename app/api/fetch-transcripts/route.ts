import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";

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

// Module-level cache — reused across warm invocations
let _yt: Awaited<ReturnType<typeof Innertube.create>> | null = null;

async function getYT() {
  if (!_yt) {
    _yt = await Innertube.create({
      lang: "en",
      location: "US",
      generate_session_locally: true,
      retrieve_player: false,
    });
  }
  return _yt;
}

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

async function fetchTranscriptForVideo(video: { id: string; title: string }): Promise<TranscriptResult> {
  const yt = await getYT();

  // Get video info — this gives us caption track URLs via the player endpoint
  const info = await yt.getInfo(video.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTracks: any[] = (info as any).captions?.caption_tracks ?? [];

  if (rawTracks.length === 0) throw new Error("No captions available");

  // Prefer English, fall back to first available
  const track =
    rawTracks.find((t) => t.language_code === "en") ??
    rawTracks.find((t) => String(t.language_code).startsWith("en")) ??
    rawTracks[0];

  const baseUrl: string = track.base_url ?? track.baseUrl ?? "";
  if (!baseUrl) throw new Error("No caption URL found");

  const sep = baseUrl.includes("?") ? "&" : "?";
  const captionUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}${sep}fmt=srv3`;

  const capRes = await fetch(captionUrl);
  if (!capRes.ok) throw new Error(`Caption fetch ${capRes.status}`);

  const xml = await capRes.text();
  if (!xml) throw new Error("Empty caption response");

  const lines = parseTimedTextXml(xml);
  if (lines.length === 0) throw new Error("Could not parse caption XML");

  const text = linesToText(lines);
  if (!text) throw new Error("Empty transcript");

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
