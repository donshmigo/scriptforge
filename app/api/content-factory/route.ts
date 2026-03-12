import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { THOMAS_REELS_GUIDE } from "@/lib/thomas-guides";
import { HOOK_LIBRARY } from "@/lib/hook-library";

// Map content types → hook library section headers
const HOOK_SECTION_MAP: Record<string, string> = {
  "Educational":            "# Educational Hooks",
  "Myth":                   "# Myth Hooks",
  "Comparison":             "# Comparison Hooks",
  "List":                   "# Educational Hooks",
  "Step-by-step / Tutorial":"# Educational Hooks",
  "Selling":                "# Authority Hooks",
  "Storytelling":           "# Story-Telling Hooks",
  "Case Study / Results":   "# Authority Hooks",
  "Common Mistake":         "# Myth Hooks",
  "Authority / FAQ / Quick Tip": "# Authority Hooks",
};

// Map content types → template name inside THOMAS_REELS_GUIDE
const TEMPLATE_MAP: Record<string, string> = {
  "Educational":            "TEMPLATE 1 — EDUCATIONAL",
  "Myth":                   "TEMPLATE 2 — MYTH",
  "Comparison":             "TEMPLATE 3 — COMPARISON",
  "List":                   "TEMPLATE 4 — LIST",
  "Step-by-step / Tutorial":"TEMPLATE 5 — LONGER EDUCATIONAL STEP-BY-STEP",
  "Selling":                "TEMPLATE 6 — SELLING",
  "Storytelling":           "TEMPLATE 1 — EDUCATIONAL",
  "Case Study / Results":   "TEMPLATE 1 — EDUCATIONAL",
  "Common Mistake":         "TEMPLATE 2 — MYTH",
  "Authority / FAQ / Quick Tip": "TEMPLATE 1 — EDUCATIONAL",
};

/** Extract all hooks from a named section of HOOK_LIBRARY */
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

/**
 * Build hook reference using ALL hooks from each relevant section.
 * GPT picks the best-fitting hook for each day's specific topic — same logic as Hook Lab.
 */
function buildHookReference(contentTypes: string[]): string {
  const seen = new Set<string>();
  const sections: string[] = [];
  for (const type of contentTypes) {
    const header = HOOK_SECTION_MAP[type] ?? "# Educational Hooks";
    if (seen.has(header)) continue;
    seen.add(header);
    const hooks = extractHookSection(header);
    if (hooks.length > 0) {
      sections.push(`${header}\n${hooks.map(h => `- ${h}`).join("\n")}`);
    }
  }
  return sections.join("\n\n");
}

function buildPrompt(niche: string): string {
  const cta = `Follow for more ${niche} content.`;

  // Day 1-3 must use these types only — gather hooks for them in advance
  const day13Types = ["Educational", "Myth", "Comparison", "List", "Step-by-step / Tutorial", "Selling"];
  const hookReference = buildHookReference(day13Types);

  return `You are an expert Instagram Reels content strategist and short-form scriptwriter. Generate a complete 30-day content plan including full scripts for Day 1, 2, and 3.

USER INPUT:
- Niche: "${niche}"

════════════════════════════════════════
SHORT-FORM SCRIPT RULES — MANDATORY
Apply these rules to every fullScript you write for Day 1, 2, and 3.
════════════════════════════════════════
${THOMAS_REELS_GUIDE}

════════════════════════════════════════
HOOK REFERENCE (for Day 1–3 scripts only)
Read ALL templates in the relevant section. Pick the ONE that is the best structural fit for that day's specific topic — not just any hook. Customise ALL placeholders so no (insert X) text remains. The hook must be spoken words only.
════════════════════════════════════════
${hookReference}

════════════════════════════════════════
OUTPUT REQUIREMENTS
════════════════════════════════════════
Return a single valid JSON object with exactly two top-level keys: "preview" and "calendar".

"preview" — array of exactly 3 objects (Day 1, 2, 3). Each object:
- day: number (1, 2, or 3)
- type: string (content type — must be from Day 1-3 allowed list below)
- topic: string (main topic, max 12 words)
- primaryHook: string (fully written spoken hook — NO placeholders, NO brackets, ready to say on camera)
- secondaryHooks: string[] (exactly 2 alternative hooks — also fully written, no placeholders)
- fullScript: string (the complete spoken script as a single string — NO section labels, NO headers, NO brackets, NO placeholders, NO stage directions — pure flowing prose/speech exactly as it would be spoken, following all SHORT-FORM SCRIPT RULES and the matching template above)
- caption: string (max 100 words: hook reworded + 1-sentence summary + CTA: "${cta}")

CRITICAL for fullScript:
- fullScript must be a plain string, not an object.
- Follow the exact template structure from the SHORT-FORM SCRIPT RULES above that matches the day's content type.
- Every word must serve Hook, Actionable, Proof, or CTA — no wasted words.
- No section headers, bold text, or labels in the output — pure spoken prose.
- No brackets, no parentheses, no placeholders remaining.
- Ideal length: 150–200 words for most types. Step-by-step: 250–275 words. Selling: 125–150 words.

"calendar" — array of exactly 30 objects (Day 1 to 30). Each object:
- day: number (1 to 30)
- type: string (content category)
- topic: string (main topic for that day, max 12 words)

PLANNING RULES:
1. Distribution (Exact across 30 days): List: 4, Educational: 4, Common Mistake: 3, Myth: 3, Step-by-step / Tutorial: 5, Storytelling: 2, Case Study / Results: 3, Comparison: 3, Authority / FAQ / Quick Tip: 3.
2. Scheduling: No single content type may appear more than twice in any 7-day window.
3. All topics must be relevant to the niche: "${niche}". Max 12 words per topic.
4. Day 1-3 content types MUST be from: Educational, Myth, Comparison, List, Step-by-step / Tutorial, or Selling.
5. CTA for all content: "${cta}"

ANTI-FABRICATION:
- For Storytelling: Do NOT invent specific outcomes, client results, or revenue figures. Keep it general and relatable.
- For Case Study / Results: No fabricated numbers, timelines, or client outcomes.
- Never invent statistics, follower counts, or dates.

Generate the JSON object now.`;
}

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
    const prompt = buildPrompt(niche.trim());

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: 9000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const plan = JSON.parse(raw);

    if (!plan.preview || !plan.calendar || plan.calendar.length !== 30) {
      throw new Error("Invalid plan structure received. Please try again.");
    }

    // Normalise fullScript — ensure it's always a string
    plan.preview.forEach((p: { fullScript?: unknown }) => {
      if (typeof p.fullScript === "object" && p.fullScript !== null) {
        p.fullScript = Object.values(p.fullScript as Record<string, string>).join(" ");
      }
      if (typeof p.fullScript !== "string" || !p.fullScript.trim()) {
        p.fullScript = "Script generation error — please regenerate.";
      }
    });

    return NextResponse.json(plan);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
