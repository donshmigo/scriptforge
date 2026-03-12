import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { HOOK_LIBRARY } from "@/lib/hook-library";

// Map UI video type labels → exact section headers in HOOK_LIBRARY
const CATEGORY_MAP: Record<string, string> = {
  "Educational":     "# Educational Hooks",
  "Comparison":      "# Comparison Hooks",
  "Myth":            "# Myth Hooks",
  "Story-Telling":   "# Story-Telling Hooks",
  "Authority":       "# Authority Hooks",
  "Day in the Life": "# Day in the Life Hooks",
};

/**
 * Extract hooks from a specific section of the HOOK_LIBRARY string.
 * Returns every "- ..." line that belongs to that section.
 */
function extractSection(header: string): string[] {
  const lines = HOOK_LIBRARY.split("\n");
  const hooks: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === header) {
      inSection = true;
      continue;
    }
    // A new section header signals the end of the current section
    if (inSection && trimmed.startsWith("# ")) {
      break;
    }
    if (inSection && trimmed.startsWith("- ")) {
      hooks.push(trimmed.slice(2).trim());
    }
  }

  return hooks;
}

/** Pick `n` random items from an array without replacement */
function sampleRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  while (result.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
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

    // ── Server-side category filtering ────────────────────────────────────────
    // We extract hooks on the server so GPT CANNOT stray into other categories.
    let selectedHooks: string[];

    if (isGeneral) {
      // Pull a diverse mix: up to 3 from each category, shuffle, take 20 as pool
      const pool: string[] = [];
      for (const header of Object.values(CATEGORY_MAP)) {
        const section = extractSection(header);
        pool.push(...sampleRandom(section, 3));
      }
      selectedHooks = sampleRandom(pool, 20);
    } else {
      const header = CATEGORY_MAP[videoType];
      if (!header) {
        return NextResponse.json({ error: `Unknown video type: ${videoType}` }, { status: 400 });
      }
      const section = extractSection(header);
      if (section.length === 0) {
        return NextResponse.json({ error: `No hooks found for category: ${videoType}` }, { status: 500 });
      }
      // Give GPT a pool of 20 random hooks from the correct section to choose from
      selectedHooks = sampleRandom(section, Math.min(20, section.length));
    }

    const hookPool = selectedHooks.map((h, i) => `${i + 1}. ${h}`).join("\n");

    const systemInstruction = `You are Hook Lab. Your ONLY job is to take the HOOK TEMPLATES below and customise them for the user's Reel topic.

RULES — READ CAREFULLY:
1. You MUST use ONLY the hook templates provided in HOOK TEMPLATES. Do NOT invent new hooks.
2. Choose the 10 best-fitting templates from the list. Skip any that are a genuinely poor fit for the topic.
3. For each chosen template, replace ALL placeholders — e.g. (insert action), (insert result), (Insert noun), # — with specific, vivid, topic-relevant words. Every placeholder must be gone.
4. Every finished hook must be written as SPOKEN WORDS ONLY. No brackets, no parentheses, no labels, no stage directions in the final output.
5. Output ONLY a numbered list of exactly 10 hooks. No intro text, no section headers, no explanations.`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `HOOK TEMPLATES:\n${hookPool}\n\nREEL TOPIC: "${topic.trim()}"\n\nCustomise 10 of these templates for the topic now.`,
        },
      ],
      temperature: 0.85,
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
