import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withRetry } from "@/lib/openai-retry";

export interface ScrapedVideo {
  id: string;
  title: string;
}

export interface ScrapeResult {
  channelName: string;
  videos: ScrapedVideo[];
  channelDescription: string;
  identityExtract: {
    credibilityStack: string;
    uniqueMethod: string;
    contraryBelief: string;
    targetPerson: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { channelUrl } = await req.json();

    if (!channelUrl?.trim()) {
      return NextResponse.json({ error: "Channel URL is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Normalize URL
    let url = channelUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;

    // Fetch channel page
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!pageRes.ok) {
      const hint = pageRes.status === 404
        ? "Channel not found — double-check your YouTube handle (e.g. youtube.com/@yourhandle)."
        : `Could not load channel page (${pageRes.status}).`;
      return NextResponse.json({ error: hint }, { status: 400 });
    }

    const html = await pageRes.text();

    // ── Extract channel name & description from main page ─────────────────────
    const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
    const channelName = ogTitleMatch?.[1]?.replace(/ - YouTube$/, "").trim() ?? "";

    let channelDescription = "";
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/);
    if (ogDescMatch?.[1]) channelDescription = ogDescMatch[1];

    try {
      const richDescMatch = html.match(/"description":\{"simpleText":"([\s\S]+?)"\},"canonicalChannelUrl"/);
      if (richDescMatch?.[1]) {
        channelDescription = richDescMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .slice(0, 1500);
      }
    } catch { /* ignore */ }

    // ── Extract channel ID (multiple patterns) ────────────────────────────────
    let channelId: string | null = null;
    const idPatterns = [
      /feeds\/videos\.xml\?channel_id=(UC[\w-]+)/,
      /"externalId":"(UC[\w-]+)"/,
      /"browseId":"(UC[\w-]+)"/,
      /youtube\.com\/channel\/(UC[\w-]+)/,
    ];
    for (const pattern of idPatterns) {
      const m = html.match(pattern);
      if (m?.[1]) { channelId = m[1]; break; }
    }

    // ── Fetch videos via ytInitialData from /videos tab (most reliable) ───────
    let videos: ScrapedVideo[] = [];

    const videosTabUrl = url.replace(/\/?$/, "/videos");
    try {
      const vtRes = await fetch(videosTabUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (vtRes.ok) {
        const vtHtml = await vtRes.text();

        // Also grab channel ID from this page if we don't have it yet
        if (!channelId) {
          for (const pattern of idPatterns) {
            const m = vtHtml.match(pattern);
            if (m?.[1]) { channelId = m[1]; break; }
          }
        }

        // Try to parse ytInitialData for structured video list
        const ytDataMatch = vtHtml.match(/var ytInitialData = (\{[\s\S]+?\});\s*<\/script>/);
        if (ytDataMatch?.[1]) {
          try {
            const ytData = JSON.parse(ytDataMatch[1]);
            const tabs: unknown[] =
              ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];

            for (const tab of tabs) {
              const tabR = (tab as Record<string, unknown>)?.tabRenderer as Record<string, unknown> | undefined;
              const content = tabR?.content as Record<string, unknown> | undefined;
              const items: unknown[] =
                (content?.richGridRenderer as Record<string, unknown>)?.contents as unknown[] ?? [];

              if (items.length > 0) {
                for (const item of items) {
                  const vid = (item as Record<string, unknown>)
                    ?.richItemRenderer as Record<string, unknown> | undefined;
                  const vr = (vid?.content as Record<string, unknown>)
                    ?.videoRenderer as Record<string, unknown> | undefined;
                  if (vr?.videoId) {
                    const titleRuns = (vr?.title as Record<string, unknown>)
                      ?.runs as { text?: string }[] | undefined;
                    const title = titleRuns?.[0]?.text ?? "";
                    if (title) videos.push({ id: String(vr.videoId), title });
                  }
                  if (videos.length >= 15) break;
                }
                if (videos.length > 0) break;
              }
            }
          } catch { /* fall through to regex fallback */ }
        }

        // Regex fallback: extract videoIds from the /videos page HTML
        if (videos.length === 0) {
          const seen = new Set<string>();
          const idMatches = [...vtHtml.matchAll(/"videoId":"([\w-]{11})"/g)];
          for (const m of idMatches) {
            if (!seen.has(m[1])) {
              seen.add(m[1]);
              // Try to find title near this match — look for "text":"..." within 300 chars
              const pos = m.index ?? 0;
              const nearby = vtHtml.slice(pos, pos + 400);
              const titleMatch = nearby.match(/"text":"([^"]{5,100})"/);
              const title = titleMatch?.[1] ?? m[1];
              videos.push({ id: m[1], title });
              if (videos.length >= 15) break;
            }
          }
        }
      }
    } catch { /* non-fatal */ }

    // ── Fallback: RSS feed if we have a channel ID but no videos yet ──────────
    if (videos.length === 0 && channelId) {
      try {
        const rssRes = await fetch(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        if (rssRes.ok) {
          const rssXml = await rssRes.text();
          const entryMatches = [...rssXml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
          videos = entryMatches
            .map((entry) => {
              const idMatch = entry[1].match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titleMatch = entry[1].match(/<title>([^<]+)<\/title>/);
              return {
                id: idMatch?.[1]?.trim() ?? "",
                title: titleMatch?.[1]?.trim() ?? "",
              };
            })
            .filter((v) => v.id && v.title)
            .slice(0, 15);
        }
      } catch { /* non-fatal */ }
    }

    const videoTitles = videos.map((v) => v.title);

    // ── Build context string for GPT ────────────────────────────────────────
    const contextParts: string[] = [];
    if (channelName) contextParts.push(`Channel Name: ${channelName}`);
    if (channelDescription) contextParts.push(`Channel Description:\n${channelDescription}`);
    if (videoTitles.length > 0) {
      contextParts.push(`Recent Video Titles (${videoTitles.length} most recent):\n${videoTitles.map((t) => `• ${t}`).join("\n")}`);
    }

    const context = contextParts.join("\n\n");

    if (!context.trim()) {
      return NextResponse.json({
        channelName: "",
        videos: [],
        channelDescription: "",
        channelId,
        identityExtract: { credibilityStack: "", uniqueMethod: "", contraryBelief: "", targetPerson: "" },
      });
    }

    // ── Extract identity with GPT ────────────────────────────────────────────
    const completion = await withRetry(() => openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are analyzing a YouTube channel's public data to infer the creator's identity and positioning. Use ONLY what the data actually shows — don't invent things not supported by the content.

${context}

Extract the following four things. Be specific. Use real language from the channel name, description, and video titles wherever possible.

Return ONLY valid JSON in this exact shape:
{
  "credibilityStack": "All credibility signals, authority markers, and proof points visible from this channel's public data. Include specific numbers, results, credentials, or experience indicators mentioned anywhere in the description or implied by video titles.",
  "uniqueMethod": "Based on the video topics, titles, and channel description — what appears to be this creator's specific system, framework, or approach? What sequence of steps or methodology do they teach? Be as specific as the data allows.",
  "contraryBelief": "Based on the content themes and framing of video titles — what does this creator appear to believe that challenges or contradicts the standard advice in their space? What conventional wisdom do they push back on?",
  "targetPerson": "Based on the content topics and language used — who is the specific person this channel is designed for? Describe their situation, their problem, and what outcome they're seeking."
}`,
        },
      ],
      temperature: 0.25,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }));

    let identityExtract = {
      credibilityStack: "",
      uniqueMethod: "",
      contraryBelief: "",
      targetPerson: "",
    };

    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      identityExtract = {
        credibilityStack: parsed.credibilityStack ?? "",
        uniqueMethod: parsed.uniqueMethod ?? "",
        contraryBelief: parsed.contraryBelief ?? "",
        targetPerson: parsed.targetPerson ?? "",
      };
    } catch { /* return empty extract */ }

    return NextResponse.json({
      channelName,
      videos,
      channelDescription,
      identityExtract,
    } satisfies ScrapeResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Channel scrape failed.";
    if (message.includes("401") || message.includes("Incorrect API key")) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }
    if (message.includes("429")) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
