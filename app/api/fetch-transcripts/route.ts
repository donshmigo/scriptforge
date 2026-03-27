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

let _innertube: Awaited<ReturnType<typeof Innertube.create>> | null = null;

async function getInnertube() {
  if (!_innertube) {
    _innertube = await Innertube.create();
  }
  return _innertube;
}

function segmentsToText(
  segments: { startMs: number; text: string }[]
): string {
  if (!segments.length) return "";
  const paras: string[] = [];
  let cur: string[] = [];
  let prev = 0;
  for (const s of segments) {
    if ((s.startMs - prev) / 1000 >= 3 && cur.length) {
      paras.push(cur.join(" "));
      cur = [];
    }
    cur.push(s.text);
    prev = s.startMs;
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function fetchTranscript(
  yt: Awaited<ReturnType<typeof Innertube.create>>,
  video: { id: string; title: string }
): Promise<TranscriptResult> {
  const info = await yt.getInfo(video.id);
  const transcriptInfo = await info.getTranscript();

  const rawSegments =
    transcriptInfo?.transcript?.content?.body?.initial_segments ?? [];

  const segments = rawSegments
    .filter((seg: any) => seg.type === "TranscriptSegment")
    .map((seg: any) => ({
      startMs: parseInt(seg.start_ms, 10) || 0,
      text: (seg.snippet?.toString?.() ?? "").trim(),
    }))
    .filter((s: { startMs: number; text: string }) => s.text);

  if (segments.length === 0) throw new Error("Empty transcript");

  const text = segmentsToText(segments);
  if (!text) throw new Error("Empty text after formatting");

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
    if (!videos?.length)
      return NextResponse.json(
        { error: "No videos provided." },
        { status: 400 }
      );

    const yt = await getInnertube();

    // Try up to 10 videos to collect 5 successes
    const candidates = videos.slice(0, 10);
    const transcripts: TranscriptResult[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const video of candidates) {
      if (transcripts.length >= 5) break;

      try {
        transcripts.push(await fetchTranscript(yt, video));
      } catch (err) {
        failed.push({
          id: video.id,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ transcripts, failed });
  } catch (err) {
    // If the cached client is stale, reset it for next request
    _innertube = null;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
