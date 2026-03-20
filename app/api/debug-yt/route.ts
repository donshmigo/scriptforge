import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelUrl = searchParams.get("channel") ?? "https://www.youtube.com/@MrBeast";
  const videoId = searchParams.get("vid") ?? "dQw4w9WgXcQ";

  const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
  const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // ── Test 1: transcript fetch ─────────────────────────────────────────────
  let transcriptTest: Record<string, unknown> = {};
  try {
    const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
      body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } }, videoId }),
    });
    const playerData = await playerRes.json();
    const tracks: { languageCode: string; baseUrl: string }[] =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (tracks.length) {
      const track = tracks.find((t) => t.languageCode === "en") ?? tracks[0];
      const capRes = await fetch(track.baseUrl, { headers: { "User-Agent": ANDROID_UA } });
      const xml = await capRes.text();
      transcriptTest = { ok: true, playerStatus: playerRes.status, tracksFound: tracks.length, captionStatus: capRes.status, xmlLength: xml.length };
    } else {
      transcriptTest = { ok: false, playerStatus: playerRes.status, tracksFound: 0 };
    }
  } catch (e) { transcriptTest = { ok: false, error: String(e) }; }

  // ── Test 2: channel HTML scrape ──────────────────────────────────────────
  let channelTest: Record<string, unknown> = {};
  try {
    const url = channelUrl.replace(/\/?$/, "/videos");
    const pageRes = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9", Accept: "text/html" },
    });
    const html = await pageRes.text();

    const channelIdMatch = html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]+)/);
    const channelId = channelIdMatch?.[1] ?? null;

    const videoIdMatches = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map(m => m[1]);
    const uniqueIds = [...new Set(videoIdMatches)].slice(0, 5);

    channelTest = {
      ok: pageRes.status === 200,
      status: pageRes.status,
      htmlLength: html.length,
      channelIdFound: channelId,
      videoIdsFound: uniqueIds.length,
      videoIdSample: uniqueIds.slice(0, 3),
    };

    // Test RSS if we have channel ID
    if (channelId) {
      const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
      const rssXml = await rssRes.text();
      const rssVideoIds = [...rssXml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map(m => m[1]);
      channelTest.rss = { status: rssRes.status, videosFound: rssVideoIds.length, sample: rssVideoIds.slice(0, 3) };
    }
  } catch (e) { channelTest = { ok: false, error: String(e) }; }

  return NextResponse.json({ transcriptTest, channelTest });
}
