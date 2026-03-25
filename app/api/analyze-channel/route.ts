import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { transcripts } = await req.json();

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: "No transcripts provided." }, { status: 400 });
    }

    const resolvedKey = process.env.OPENAI_API_KEY || "";
    if (!resolvedKey) {
      return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: resolvedKey });

    // Cap each transcript and take up to 6 videos
    const MAX_WORDS = 5000;
    const usable = (transcripts as { title: string; text: string }[])
      .slice(0, 6)
      .map((t) => {
        const words = t.text.split(/\s+/);
        const trimmed = words.length > MAX_WORDS
          ? words.slice(0, MAX_WORDS).join(" ") + "\n[trimmed]"
          : t.text;
        return `=== "${t.title}" ===\n${trimmed}`;
      })
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a branding and writing-style analyst. Extract creator identity and writing DNA from YouTube transcripts. Be specific and concrete — not generic.",
        },
        {
          role: "user",
          content: `Analyze these YouTube transcripts and return a JSON object with exactly two top-level fields: "identity" and "styleAnalysis".

"identity" must be an object with these exact keys:
- name: the creator's name or handle (from how they refer to themselves, or leave blank)
- credibilityStack: specific credentials, results, numbers, proof points that establish their authority — be detailed and literal
- uniqueMethod: their specific framework, system, or approach that is distinct from generic advice
- contraryBelief: the core belief or opinion they hold that pushes back against conventional wisdom in their space
- targetPerson: the specific person this content is made for — their situation, problem, and desired outcome
- contentStyle: one of exactly "talking-head", "educational-breakdown", "story-driven", or "fast-lists" — choose whichever best matches these videos

"styleAnalysis" must be a detailed plain-text analysis (500–800 words) covering:
- Vocabulary: common words, phrases, sentence starters they use repeatedly
- Sentence structure: average length, rhythm, use of fragments vs full sentences
- Hook patterns: how they open videos — question, bold claim, story, statistic?
- Pacing: how they build tension and release it
- Transitions: exact phrases they use to move between sections
- Tone: where on the spectrum from casual/conversational to authoritative/formal
- Unique verbal patterns: filler phrases, callback patterns, rhetorical devices
- How they deliver value: teaching style, story-first, contrast-driven?

TRANSCRIPTS:
${usable}

Return ONLY valid JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      identity: {
        name: parsed.identity?.name ?? "",
        credibilityStack: parsed.identity?.credibilityStack ?? "",
        uniqueMethod: parsed.identity?.uniqueMethod ?? "",
        contraryBelief: parsed.identity?.contraryBelief ?? "",
        targetPerson: parsed.identity?.targetPerson ?? "",
        contentStyle: parsed.identity?.contentStyle ?? "talking-head",
      },
      styleAnalysis: parsed.styleAnalysis ?? "",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
