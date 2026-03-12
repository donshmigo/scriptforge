import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { THOMAS_REELS_GUIDE } from "@/lib/thomas-guides";
import { HOOK_LIBRARY } from "@/lib/hook-library";

export const maxDuration = 300;

// ── Hook library helpers ────────────────────────────────────────────────────

const HOOK_SECTION_MAP: Record<string, string> = {
  "Educational":             "# Educational Hooks",
  "Myth":                    "# Myth Hooks",
  "Comparison":              "# Comparison Hooks",
  "List":                    "# Educational Hooks",
  "Step-by-step / Tutorial": "# Educational Hooks",
  "Selling":                 "# Authority Hooks",
  "Storytelling":            "# Story-Telling Hooks",
  "Case Study / Results":    "# Authority Hooks",
  "Common Mistake":          "# Myth Hooks",
  "Authority / FAQ / Quick Tip": "# Authority Hooks",
};

function extractHookSection(header: string): string[] {
  const lines = HOOK_LIBRARY.split("\n");
  const hooks: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const t = line.trim();
    if (t === header) { inSection = true; continue; }
    if (inSection && t.startsWith("# ")) break;
    if (inSection && t.startsWith("- ")) hooks.push(t.slice(2).trim());
  }
  return hooks;
}

/** Return all hooks from the section matching this content type */
function hooksForType(contentType: string): string {
  const header = HOOK_SECTION_MAP[contentType] ?? "# Educational Hooks";
  const hooks = extractHookSection(header);
  return `HOOK INSPIRATION LIBRARY (${contentType})\nRead every template. Pick the ONE best-fitting hook for the topic. Customise ALL placeholders — no (insert X) text may remain in the output.\n\n${hooks.map(h => `- ${h}`).join("\n")}`;
}

// ── Template / section maps ────────────────────────────────────────────────

const TEMPLATE_NAME_MAP: Record<string, string> = {
  "Educational":             "TEMPLATE 1 — EDUCATIONAL",
  "Myth":                    "TEMPLATE 2 — MYTH",
  "Comparison":              "TEMPLATE 3 — COMPARISON",
  "List":                    "TEMPLATE 4 — LIST",
  "Step-by-step / Tutorial": "TEMPLATE 5 — LONGER EDUCATIONAL STEP-BY-STEP",
  "Selling":                 "TEMPLATE 6 — SELLING",
  "Storytelling":            "TEMPLATE 1 — EDUCATIONAL",
  "Case Study / Results":    "TEMPLATE 1 — EDUCATIONAL",
  "Common Mistake":          "TEMPLATE 2 — MYTH",
  "Authority / FAQ / Quick Tip": "TEMPLATE 1 — EDUCATIONAL",
};

const SECTION_MAP: Record<string, string[]> = {
  "TEMPLATE 1 — EDUCATIONAL":                  ["HOOK", "REINFORCE HOOK", "MAIN POINT 1", "CONTRAST", "MAIN POINT 2", "CTA"],
  "TEMPLATE 2 — MYTH":                          ["HOOK", "EXPLAIN MYTH", "CHALLENGE MYTH", "MAIN POINT", "REITERATE", "CTA"],
  "TEMPLATE 3 — COMPARISON":                    ["HOOK", "EXPLAIN BELIEF", "SIMPLIFY", "MAIN POINT", "REITERATE", "CTA"],
  "TEMPLATE 4 — LIST":                          ["HOOK", "REINFORCE", "THE LIST", "CTA"],
  "TEMPLATE 5 — LONGER EDUCATIONAL STEP-BY-STEP": ["HOOK", "DEEPEN HOOK", "EXPLAIN CONCEPT", "THE STEPS", "SHOWCASE RESULTS", "CTA"],
  "TEMPLATE 6 — SELLING":                       ["HOOK", "SOLUTION", "THE STEPS", "CTA"],
};

// ── Single-script generator (mirrors /api/generate Reels exactly) ──────────

interface ScriptResult {
  raw: string;
  altHooks: string[];
}

async function generateReelScript(
  openai: OpenAI,
  topic: string,
  contentType: string,
  niche: string,
  currentYear: number,
): Promise<ScriptResult> {
  const templateName = TEMPLATE_NAME_MAP[contentType] ?? "TEMPLATE 1 — EDUCATIONAL";
  const sections = SECTION_MAP[templateName] ?? SECTION_MAP["TEMPLATE 1 — EDUCATIONAL"];
  const hookLib = hooksForType(contentType);
  const cta = `Follow for more ${niche} content.`;
  const wordTarget = "150–225";
  const durationTarget = "60–90 seconds";

  const systemPrompt = `You are writing a short-form Instagram Reels script. Each input governs exactly one domain.

CONFLICT RESOLUTION:
- Language, tone, word choice, sentence structure → INPUT 1 (Script Rules)
- Short-form structure, template choice, word targets → INPUT 5 (Reels Guide)

INPUT 1 — SCRIPT RULES
6th-grade reading level. Simple words only.
BANNED → REPLACEMENT:
progressive overload → lift more than last time | optimise → make better | implement → use/do | leverage → use | monetise → make money from | algorithm → what the app shows people | engagement → likes and comments | aesthetic → look/style | content strategy → what you post | niche → topic/what you talk about | authority → trust/being known for something | credibility → trust/proof | conversion → people buying | retention → people watching to the end | positioning → how people see you | transformation → change/result | framework → plan/steps | systematic → step by step | consistency → showing up regularly | trajectory → direction/path | cadence → how often | facilitate → help | cultivate → build/grow | resilience → bouncing back

YEAR RULE: The current year is ${currentYear}. If you reference any year, it must be ${currentYear}. Never write 2023, 2024, or any year other than ${currentYear}.

INPUT 2 — IDENTITY
NICHE: ${niche}
ANTI-FABRICATION: Do NOT invent specific follower counts, revenue figures, client results, or personal stories. Write as a trusted authority in ${niche} without fabricating specifics.

INPUT 5 — REELS GUIDE
${THOMAS_REELS_GUIDE}

SELECTED TEMPLATE: ${templateName}. Follow its formula, section structure, and word-count rules exactly.

TARGET: ${wordTarget} spoken words (≈ ${durationTarget} at ~150 WPM). Hit this range. Do not stop early.

CTA to use: "${cta}"

${hookLib}

ABSOLUTE OUTPUT RULES:
- The final script output must be pure flowing spoken prose — NO ## section labels, NO subheadings, NO bold text.
- No hype language, no "Hey guys", no "welcome back".
- Every word must serve Hook, Actionable, Proof, or CTA — no wasted words.
- Spoken words only. No brackets in the final script.`;

  const userPrompt = `Write a complete Instagram Reel script.

TOPIC: "${topic}"
CONTENT TYPE: ${contentType}

TARGET: ${wordTarget} spoken words. Count before finishing — expand with more actionable detail if under ${wordTarget.split("–")[0]} words.

OUTPUT: Write the full script as pure flowing spoken prose. No section headers, no subheadings, no labels. Start directly with the hook sentence.

After the script, add this exact line:
===ALTERNATIVE HOOKS===
Then write exactly 2 alternative opening hook sentences (first sentence only), each on its own numbered line, drawn from different templates in the HOOK INSPIRATION LIBRARY. Both must be fully customised — no placeholders remaining.

Write the script now:`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
    max_tokens: 1400,
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // Split script from alternative hooks
  const [scriptPart, altPart] = raw.split(/===ALTERNATIVE HOOKS===/);
  const altHooks = (altPart ?? "")
    .split("\n")
    .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(l => l.length > 10);

  return { raw: scriptPart?.trim() ?? "", altHooks: altHooks.slice(0, 2) };
}

// ── Calendar plan generator ────────────────────────────────────────────────

async function generateCalendarPlan(
  openai: OpenAI,
  niche: string,
): Promise<{ day: number; type: string; topic: string; primaryHook?: string; secondaryHooks?: string[]; caption?: string }[]> {
  const prompt = `You are an Instagram content strategist. Generate a 30-day Reels content calendar for the niche: "${niche}".

Return a JSON object with one key: "calendar" — an array of exactly 30 objects.
Each object:
- day: number (1 to 30)
- type: string (content category from the distribution below)
- topic: string (specific topic for that day, max 12 words, relevant to "${niche}")

DISTRIBUTION (exact): Educational: 4, List: 4, Step-by-step / Tutorial: 5, Myth: 3, Comparison: 3, Common Mistake: 3, Case Study / Results: 3, Storytelling: 2, Authority / FAQ / Quick Tip: 3.
Total = 30.

RULES:
- No single content type may appear more than twice in any 7-day window.
- Day 1, 2, and 3 must use only: Educational, Myth, Comparison, List, Step-by-step / Tutorial, or Selling.
- All topics must be specific and relevant to "${niche}".
- Topics must be 12 words or less.

Return ONLY the JSON object.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return parsed.calendar ?? [];
}

// ── Strip any stray section labels that GPT may still include ─────────────

function cleanScript(raw: string): string {
  return raw
    .replace(/^===.*$/gm, "")           // remove delimiter lines
    .replace(/^#{1,3} .+$/gm, "")       // remove any ## headings
    .replace(/\*\*.+?\*\*/g, "")        // remove any **bold** labels
    .replace(/\[.*?\]/g, "")            // remove [bracket] notes
    .replace(/\n{3,}/g, "\n\n")         // collapse triple+ newlines
    .trim();
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json();

    if (!niche?.trim()) {
      return NextResponse.json({ error: "Niche is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API not configured." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const nicheClean = niche.trim();
    const cta = `Follow for more ${nicheClean} content.`;
    const currentYear = new Date().getFullYear();

    // Step 1: Generate 30-day calendar (fast, no scripts)
    const calendar = await generateCalendarPlan(openai, nicheClean);

    if (!calendar || calendar.length !== 30) {
      throw new Error("Failed to generate calendar plan. Please try again.");
    }

    // Step 2: Generate Day 1-3 full scripts in parallel
    // Each uses the EXACT same prompt structure as the main app's Reels generator
    const [result1, result2, result3] = await Promise.all([
      generateReelScript(openai, calendar[0].topic, calendar[0].type, nicheClean, currentYear),
      generateReelScript(openai, calendar[1].topic, calendar[1].type, nicheClean, currentYear),
      generateReelScript(openai, calendar[2].topic, calendar[2].type, nicheClean, currentYear),
    ]);

    const results = [result1, result2, result3];

    const preview = [0, 1, 2].map((i) => {
      const { raw, altHooks } = results[i];
      const fullScript = cleanScript(raw);
      // Primary hook = first sentence of the script
      const primaryHook = fullScript.split(/[.!?]/)[0].trim() + ".";
      return {
        day: i + 1,
        type: calendar[i].type,
        topic: calendar[i].topic,
        primaryHook,
        secondaryHooks: altHooks,
        fullScript,
        caption: `${primaryHook} ${cta}`.trim(),
      };
    });

    return NextResponse.json({ preview, calendar });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
