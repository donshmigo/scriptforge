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

/**
 * Convert raw transcript segments from youtubei.js into clean prose.
 * Each segment has a .snippet.text — we join them with space, inserting
 * paragraph breaks where the timestamp gap suggests a natural pause.
 */
function segmentsToText(
  segments: Array<{ start_ms?: string | number; snippet?: { text?: string } }>
): string {
  const lines: Array<{ startMs: number; text: string }> = [];

  for (const seg of segments) {
    const raw = seg?.snippet?.text;
    if (!raw) continue;
    const text = raw
      .replace(/\[.*?\]/g, "")   // strip [Music], [Applause] etc
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const startMs =
      typeof seg.start_ms === "number"
        ? seg.start_ms
        : parseInt(String(seg.start_ms ?? "0"), 10);
    lines.push({ startMs, text });
  }

  if (lines.length === 0) return "";

  const paragraphs: string[] = [];
  let current: string[] = [];
  let prevStartMs = 0;

  for (const line of lines) {
    const gapSec = (line.startMs - prevStartMs) / 1000;
    if (gapSec >= 3.0 && current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
    current.push(line.text);
    prevStartMs = line.startMs;
  }
  if (current.length > 0) paragraphs.push(current.join(" "));

  return paragraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function fetchTranscriptForVideo(
  yt: Innertube,
  video: { id: string; title: string }
): Promise<TranscriptResult> {
  const info = await yt.getInfo(video.id);
  const transcriptInfo = await info.getTranscript();

  const segments =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transcriptInfo as any)?.transcript?.content?.body?.initial_segments ?? [];

  const text = segmentsToText(segments);
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

    // Limit to 5 videos to keep token usage manageable
    const targets = videos.slice(0, 5);

    // Create one Innertube session reused for all videos
    const yt = await Innertube.create({ generate_session_locally: true });

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
