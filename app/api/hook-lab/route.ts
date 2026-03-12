import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { HOOK_LIBRARY } from "@/lib/hook-library";

const CATEGORY_MAP: Record<string, string> = {
  "Educational":     "# Educational Hooks",
  "Comparison":      "# Comparison Hooks",
  "Myth":            "# Myth Hooks",
  "Story-Telling":   "# Story-Telling Hooks",
  "Authority":       "# Authority Hooks",
  "Day in the Life": "# Day in the Life Hooks",
};

/**
 * Extract every hook from a named section of the HOOK_LIBRARY.
 */
function extractSection(header: string): string[] {
  const lines = HOOK_LIBRARY.split("\n");
  const hooks: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === header) { inSection = true; continue; }
    if (inSection && trimmed.startsWith("# ")) break;
    if (inSection && trimmed.startsWith("- ")) hooks.push(trimmed.slice(2).trim());
  }

  return hooks;
}

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

    // Build the hook pool — ALL hooks from the relevant section(s)
    let hookPool: string[];

    if (isGeneral) {
      // For General: include every hook from every category
      hookPool = Object.values(CATEGORY_MAP).flatMap(extractSection);
    } else {
      const header = CATEGORY_MAP[videoType];
      if (!header) {
        return NextResponse.json({ error: `Unknown video type: ${videoType}` }, { status: 400 });
      }
      hookPool = extractSection(header);
      if (hookPool.length === 0) {
        return NextResponse.json({ error: `No hooks found for: ${videoType}` }, { status: 500 });
      }
    }

    const numberedPool = hookPool.map((h, i) => `${i + 1}. ${h}`).join("\n");

    const systemInstruction = `You are Hook Lab. Your job is to find the 10 most relevant hook templates from the list below for the user's Reel topic, then customise each one.

STEP 1 — SELECT:
Read every template and pick the 10 that are the BEST FIT for the Reel topic. Consider:
- Does the template's structure match what the topic is trying to communicate?
- Would this hook make someone stop scrolling for THIS specific topic?
- Prefer variety — don't pick 10 that all feel the same.

STEP 2 — CUSTOMISE:
For each selected template, replace EVERY placeholder — e.g. (insert action), (insert result), (Insert noun), # — with specific, vivid, topic-relevant words. No placeholder may remain.

OUTPUT RULES:
- Every hook must be written as SPOKEN WORDS ONLY. No brackets, no parentheses, no labels, no stage directions.
- Do NOT invent hooks not based on the templates. Every output hook must be a customised version of a template from the list.
- Output ONLY a numbered list of exactly 10 hooks. No intro, no explanations, no headers.`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `HOOK TEMPLATES:\n${numberedPool}\n\nREEL TOPIC: "${topic.trim()}"\n\nSelect the 10 best-fitting templates and customise them now.`,
        },
      ],
      temperature: 0.7,
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
