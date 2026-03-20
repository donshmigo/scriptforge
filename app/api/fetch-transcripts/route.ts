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

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  // Method 1: Direct timedtext URL — fastest, no session needed
  for (const params of [`v=${video.id}&lang=en&kind=asr&fmt=srv3`, `v=${video.id}&lang=en&fmt=srv3`]) {
    try {
      const res = await fetch(`https://www.youtube.com/api/timedtext?${params}`, {
        headers: { "User-Agent": ANDROID_UA },
      });
      if (res.ok) {
        const xml = await res.text();
        const lines = parseXml(xml);
        if (lines.length > 0) {
          const text = toText(lines);
          if (text) return { id: video.id, title: video.title, text, wordCount: text.split(/\s+/).filter(Boolean).length };
        }
      }
    } catch { /* try next */ }
  }

  // Method 2: InnerTube Android player — get caption track URL then fetch XML
  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
      videoId: video.id,
    }),
  });

  if (!playerRes.ok) throw new Error(`Player API ${playerRes.status}`);

  const playerData = await playerRes.json();
  const tracks: { languageCode: string; baseUrl: string }[] =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (tracks.length === 0) throw new Error("No captions available");

  const track =
    tracks.find(t => t.languageCode === "en") ??
    tracks.find(t => t.languageCode?.startsWith("en")) ??
    tracks[0];

  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const capUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}${sep}fmt=srv3`;

  const capRes = await fetch(capUrl, { headers: { "User-Agent": ANDROID_UA } });
  if (!capRes.ok) throw new Error(`Caption fetch ${capRes.status}`);

  const xml = await capRes.text();
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
        // Retry once after a short delay in case of rate limiting
        await sleep(800);
        try {
          transcripts.push(await fetchTranscript(video));
        } catch (err2) {
          failed.push({ id: video.id, reason: err2 instanceof Error ? err2.message : String(err2) });
        }
      }
    }

    return NextResponse.json({ transcripts, failed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
