import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const videoId = "dQw4w9WgXcQ";
  const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";

  try {
    const playerRes = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
          videoId,
        }),
      }
    );

    const playerData = await playerRes.json();
    const tracks: { languageCode: string; baseUrl: string }[] =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    if (!tracks.length) {
      return NextResponse.json({
        step: "player_api",
        playerStatus: playerRes.status,
        tracksFound: 0,
        error: "No caption tracks returned — player API likely blocked",
      });
    }

    const track = tracks.find((t) => t.languageCode === "en") ?? tracks[0];
    const capRes = await fetch(track.baseUrl, { headers: { "User-Agent": ANDROID_UA } });
    const xml = await capRes.text();

    return NextResponse.json({
      ok: true,
      playerStatus: playerRes.status,
      tracksFound: tracks.length,
      captionStatus: capRes.status,
      xmlLength: xml.length,
      sample: xml.slice(0, 100),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
