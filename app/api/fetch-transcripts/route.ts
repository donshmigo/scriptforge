import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

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

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

function segmentsToText(segments: TranscriptSegment[]): string {
  const lines: Array<{ offsetMs: number; text: string }> = [];

  for (const seg of segments) {
    const raw = seg?.text;
    if (!raw) continue;
    const text = raw
      .replace(/\[.*?\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    lines.push({ offsetMs: seg.offset ?? 0, text });
  }

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

async function fetchTranscriptForVideo(
  video: { id: string; title: string }
): Promise<TranscriptResult> {
  let segments: TranscriptSegment[] = [];

  try {
    segments = await YoutubeTranscript.fetchTranscript(video.id, { lang: "en" });
  } catch {
    // If English not found, try without language preference
    segments = await YoutubeTranscript.fetchTranscript(video.id);
  }

  if (!segments?.length) {
    throw new Error("No transcript segments returned");
  }

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

    const targets = videos.slice(0, 5);

    const results = await Promise.allSettled(
      targets.map((video) => fetchTranscriptForVideo(video))
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
