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

// Netlify microservice handles YouTube scraping (Vercel IPs are blocked by YouTube)
const TRANSCRIPT_SERVICE_URL =
  process.env.TRANSCRIPT_SERVICE_URL || "https://yt-transcript-service.netlify.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videos } = body as { videos: { id: string; title: string }[] };

    if (!videos?.length)
      return NextResponse.json({ error: "No videos provided." }, { status: 400 });

    const res = await fetch(`${TRANSCRIPT_SERVICE_URL}/api/fetch-transcripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos }),
    });

    let data: FetchTranscriptsResponse;
    try {
      data = await res.json();
    } catch {
      return NextResponse.json(
        { error: "Transcript service timed out — try again." },
        { status: 504 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: (data as any).error || "Transcript service error." },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
