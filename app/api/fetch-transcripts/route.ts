import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";

export interface TranscriptResult {
  id: string;
  title: string;
  text: string;
  wordCount: number;
}

export interface FetchTranscriptsResponse {
  transcripts: TranscriptResult[];
  failed: string[];
}

function segmentsToText(segments: { offsetMs: number; text: string }[]): string {
  if (segments.length === 0) return "";

  const paragraphs: string[] = [];
  let current: string[] = [];
  let prevOffsetMs = 0;

  for (const line of segments) {
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

// Singleton Innertube instance — reused across requests in the same worker
let _yt: Innertube | null = null;
async function getInnertube(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({ retrieve_player: false });
  }
  return _yt;
}

async function fetchTranscriptForVideo(
  yt: Innertube,
  video: { id: string; title: string }
): Promise<TranscriptResult> {
  const info = await yt.getInfo(video.id);
  const transcriptInfo = await info.getTranscript();

  const rawSegments = transcriptInfo.transcript.content?.body?.initial_segments ?? [];

  const lines: { offsetMs: number; text: string }[] = [];
  for (const seg of rawSegments) {
    // Filter to TranscriptSegment nodes only (skip TranscriptSectionHeader etc.)
    if (seg.type !== "TranscriptSegment") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = seg as any;
    const raw: string = s.snippet?.toString?.() ?? "";
    const text = raw.replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    lines.push({ offsetMs: Number(s.start_ms) || 0, text });
  }

  if (lines.length === 0) throw new Error("No transcript segments found");

  const text = segmentsToText(lines);
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

    const targets = videos.slice(0, 5);
    const yt = await getInnertube();

    const results = await Promise.allSettled(
      targets.map((video) => fetchTranscriptForVideo(yt, video))
    );

    const transcripts: TranscriptResult[] = [];
    const failed: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        transcripts.push(result.value);
      } else {
        failed.push(targets[i].id);
      }
    });

    return NextResponse.json({ transcripts, failed } satisfies FetchTranscriptsResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcripts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
