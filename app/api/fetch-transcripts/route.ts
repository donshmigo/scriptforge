import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

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

/** Parse a VTT timestamp like "00:01:23.456" into seconds */
function vttTimeToSeconds(ts: string): number {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

/** Clean a single VTT text line — strip inline tags and HTML entities */
function cleanLine(line: string): string {
  return line
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Return true if a line is VTT metadata (not spoken text) */
function isMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith("WEBVTT") || t.startsWith("Kind:") || t.startsWith("Language:")) return true;
  if (/^\d{2}:\d{2}[:.]\d/.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  return false;
}

interface VttCue {
  startSec: number;
  endSec: number;
  lines: string[];
}

/**
 * Parse a VTT subtitle file into prose that preserves the creator's pacing.
 *
 * YouTube auto-captions use "rolling" cues — the same line appears in 2–4
 * consecutive cue blocks as it scrolls across the screen. We use a sliding
 * window to skip any line seen in the last DEDUP_WINDOW cues, then use the
 * inter-cue gap times to inject natural pause markers:
 *   gap ≥ 3.0 s  →  new paragraph (beat / section break)
 *   gap ≥ 1.5 s  →  " ... "  (short pause / breath)
 */
function parseVtt(vtt: string): string {
  const blocks = vtt.split(/\n\n+/);
  const cues: VttCue[] = [];

  for (const block of blocks) {
    const rawLines = block.split("\n").map((l) => l.trim());
    const tsLine = rawLines.find((l) => /^\d{2}:\d{2}[:.]\d/.test(l));
    if (!tsLine) continue;

    const tsParts = tsLine.split("-->");
    const startSec = vttTimeToSeconds(tsParts[0]);
    const endSec = tsParts[1] ? vttTimeToSeconds(tsParts[1].split(/\s/)[0]) : startSec;

    const textLines = rawLines
      .filter((l) => !isMetaLine(l))
      .map(cleanLine)
      .filter(Boolean);

    if (textLines.length > 0) {
      cues.push({ startSec, endSec, lines: textLines });
    }
  }

  if (cues.length === 0) return "";

  // Sliding-window dedup: track when each line was last seen (cue index)
  const DEDUP_WINDOW = 6;
  const lastSeen = new Map<string, number>();

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let prevEndSec = 0;
  let lastAddedWasPause = false;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const gap = i === 0 ? 0 : cue.startSec - prevEndSec;

    // Only keep lines not seen in the recent window
    const newLines = cue.lines.filter((l) => {
      const seen = lastSeen.get(l);
      return seen === undefined || i - seen > DEDUP_WINDOW;
    });

    // Always update the seen map for all lines in this cue
    for (const l of cue.lines) lastSeen.set(l, i);

    // Skip cue entirely if no new content
    if (newLines.length === 0) {
      prevEndSec = cue.endSec;
      continue;
    }

    // Insert pacing markers — only when we have real new content to follow them
    if (gap >= 3.0 && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
      lastAddedWasPause = false;
    } else if (gap >= 1.5 && currentParagraph.length > 0 && !lastAddedWasPause) {
      currentParagraph.push("...");
      lastAddedWasPause = true;
    }

    currentParagraph.push(...newLines);
    lastAddedWasPause = false;
    prevEndSec = cue.endSec;
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  return paragraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function fetchTranscriptForVideo(
  videoId: string,
  tmpDir: string
): Promise<string> {
  const outTemplate = path.join(tmpDir, videoId);

  // yt-dlp: download auto-generated English subtitles, skip video download
  const cmd = [
    "yt-dlp",
    "--write-auto-sub",
    "--sub-lang", "en",
    "--skip-download",
    "--sub-format", "vtt",
    "--no-warnings",
    "--quiet",
    "-o", `"${outTemplate}"`,
    `"https://www.youtube.com/watch?v=${videoId}"`,
  ].join(" ");

  await execAsync(cmd, { timeout: 30_000 });

  // yt-dlp writes to <outTemplate>.en.vtt
  const vttPath = `${outTemplate}.en.vtt`;
  const vtt = await fs.readFile(vttPath, "utf-8");
  await fs.unlink(vttPath).catch(() => {});

  const text = parseVtt(vtt);
  if (!text) throw new Error("Empty transcript after parsing");
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = (await req.json()) as {
      videos: { id: string; title: string }[];
    };

    if (!videos?.length) {
      return NextResponse.json({ error: "No videos provided." }, { status: 400 });
    }

    // Limit to 5 videos to keep API costs and analysis token usage manageable
    const targets = videos.slice(0, 5);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yt-transcripts-"));

    const results = await Promise.allSettled(
      targets.map(async (video) => {
        const text = await fetchTranscriptForVideo(video.id, tmpDir);
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return {
          id: video.id,
          title: video.title,
          text,
          wordCount,
        } satisfies TranscriptResult;
      })
    );

    // Cleanup temp dir
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    const transcripts: TranscriptResult[] = [];
    const failed: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        transcripts.push(result.value);
      } else {
        failed.push(targets[i].id);
      }
    });

    return NextResponse.json({
      transcripts,
      failed,
    } satisfies FetchTranscriptsResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcripts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
