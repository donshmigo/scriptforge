import { NextRequest, NextResponse } from "next/server";

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

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip";

// Base64-encoded protobuf that requests caption/subtitle data in the player response
const CAPTION_PARAMS = "CgIQBg==";

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

async function callPlayerApi(videoId: string, client: "ANDROID" | "TVHTML5"): Promise<{ languageCode: string; baseUrl: string }[]> {
  const isAndroid = client === "ANDROID";
  const body = isAndroid
    ? {
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
            androidSdkVersion: 34,
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        params: CAPTION_PARAMS,
      }
    : {
        context: {
          client: {
            clientName: "TVHTML5",
            clientVersion: "7.20230405.08.01",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        params: CAPTION_PARAMS,
      };

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM394&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": isAndroid ? ANDROID_UA : "Mozilla/5.0",
        "X-Youtube-Client-Name": isAndroid ? "3" : "7",
        "X-Youtube-Client-Version": isAndroid ? "20.10.38" : "7.20230405.08.01",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error(`Player API ${res.status}`);
  const data = await res.json();
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

async function fetchTranscript(video: { id: string; title: string }): Promise<TranscriptResult> {
  // Try Android client first, fall back to TVHTML5 if no captions returned
  let tracks = await callPlayerApi(video.id, "ANDROID");

  if (tracks.length === 0) {
    await new Promise(r => setTimeout(r, 300));
    tracks = await callPlayerApi(video.id, "TVHTML5");
  }

  if (tracks.length === 0) throw new Error("No captions");

  const track =
    tracks.find(t => t.languageCode === "en") ??
    tracks.find(t => t.languageCode?.startsWith("en")) ??
    tracks[0];

  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const capUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}${sep}fmt=srv3`;

  const capRes = await fetch(capUrl, { headers: { "User-Agent": ANDROID_UA } });
  if (!capRes.ok) throw new Error(`Caption ${capRes.status}`);

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

    // Only try the first 10 — more than that causes rate limiting
    const candidates = videos.slice(0, 10);
    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const video of candidates) {
      if (transcripts.length >= 5) break;

      // Small delay between requests to avoid rate limiting
      if (transcripts.length + failed.length > 0) {
        await new Promise(r => setTimeout(r, 500));
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
