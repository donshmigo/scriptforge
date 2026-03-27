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

// YouTube InnerTube API client — same API the YouTube website uses internally
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_CONTEXT = {
  client: {
    hl: "en",
    gl: "US",
    clientName: "WEB",
    clientVersion: "2.20241126.01.00",
  },
};

/** Fetch the watch page and extract the serialized player response to get caption track URLs */
async function getCaptionTracksFromPage(videoId: string): Promise<
  { baseUrl: string; languageCode: string; kind?: string }[]
> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Watch page HTTP ${res.status}`);
  const html = await res.text();

  // Try multiple markers YouTube uses
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

  return [];
}

/** Use YouTube InnerTube API /player endpoint to get caption tracks */
async function getCaptionTracksFromAPI(videoId: string): Promise<
  { baseUrl: string; languageCode: string; kind?: string }[]
> {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
      },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        videoId,
      }),
    }
  );
  if (!res.ok) throw new Error(`InnerTube player API HTTP ${res.status}`);
  const data = await res.json();
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

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

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  // Try InnerTube API first (more reliable from servers), fall back to page scrape
  let tracks: { baseUrl: string; languageCode: string; kind?: string }[] = [];

  try {
    tracks = await getCaptionTracksFromAPI(video.id);
  } catch {
    // fallback
  }

  if (tracks.length === 0) {
    try {
      tracks = await getCaptionTracksFromPage(video.id);
    } catch {
      // fallback failed too
    }
  }

  if (tracks.length === 0) throw new Error("No caption tracks found");

  // Prefer manual English captions over auto-generated
  const track =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode === "en") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  // Fetch caption XML (try both srv3 and srv1)
  for (const fmt of ["srv3", "srv1"]) {
    const sep = track.baseUrl.includes("?") ? "&" : "?";
    const capUrl = `${track.baseUrl}${sep}fmt=${fmt}`;

    const capRes = await fetch(capUrl, { headers: { "User-Agent": BROWSER_UA } });
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

  throw new Error("Captions found but could not parse content");
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
