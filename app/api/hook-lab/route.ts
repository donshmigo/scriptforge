import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { HOOK_LIBRARY } from "@/lib/hook-library";

// Map UI video type labels → exact section headers in HOOK_LIBRARY
const CATEGORY_MAP: Record<string, string> = {
  "Educational":           "# Educational Hooks",
  "Myth":                  "# Myth Hooks",
  "Comparison":            "# Comparison Hooks",
  "List":                  "# List Hooks",
  "Authority":             "# Authority Hooks",
  "Common Mistake":        "# Common Mistake Hooks",
  "Selling":               "# Selling Hooks",
  "Story-Telling":         "# Story-Telling Hooks",
  "Tutorial/Step-by-Step": "# Tutorial/Step-by-Step Hooks",
};

export async function POST(req: NextRequest) {
  try {
    const { topic, videoType } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API not configured." }, { status: 500 });
    }

    const isGeneral = !videoType || videoType === "General";
    const categoryHeader = isGeneral ? null : CATEGORY_MAP[videoType];

    const categoryInstruction = isGeneral
      ? `The video type is "General". Randomly select 10 hook templates spread across any categories from the HOOK_LIBRARY. Pick diverse hooks from different sections.`
      : `The video type is "${videoType}". Find the section "${categoryHeader}" in the HOOK_LIBRARY and select 10 unique hook templates ONLY from that section.`;

    const systemInstruction = `You are Hook Lab, an expert at writing scroll-stopping Instagram Reel opening hooks. Your job is to generate 10 customized, ready-to-speak hooks for the user's Reel topic.

${categoryInstruction}

For each of the 10 selected templates:
1. Replace ALL placeholders (e.g., (insert niche), (insert action), (Insert item)) with specific, vivid words and short phrases based on the user's Reel topic.
2. Check that the customized hook makes sense and fits the topic naturally. If a hook is a bad fit, swap it for a different one from the same section.
3. Make sure every hook sounds natural when spoken aloud — exactly as someone would say it on camera.

CRITICAL OUTPUT RULES:
- Every hook must be written as SPOKEN WORDS ONLY. No brackets, no parentheses, no stage directions, no labels, no formatting notes.
- No hooks with text in [brackets] or (parentheses) in the final output.
- No placeholders remaining — every template must be fully customized.
- Natural, conversational tone. Short, punchy sentences. Designed to stop a scroll.
- Output ONLY a numbered list of 10 hooks. No intro text, no explanations, no section headers.`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `HOOK_LIBRARY:\n${HOOK_LIBRARY}\n\nREEL TOPIC: "${topic.trim()}"\n\nGenerate 10 customized, spoken hooks now.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const hooks = raw
      .split("\n")
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line) => line.length > 0);

    return NextResponse.json({ hooks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
