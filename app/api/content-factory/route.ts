import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const EDUCATIONAL_TEMPLATE = `Educational Script Template
Formula: Hook → Reinforce Hook → Main Point 1 → Contrast → Main Point 2 → CTA
Section 1 – The Hook (max 40 words): Hook (max 12 words) + Reinforce Hook (max 30 words)
Section 2 – The Body (max 150 words): Main Point 1 (max 60 words) + Contrast (max 30 words) + Main Point 2 (max 60 words)
Section 3 – CTA (max 25 words)
Total: ~150 words (45 sec) · Min ~100 words · Max ~250 words`;

const MYTH_TEMPLATE = `Myth Script Template
Formula: Hook → Explain Myth → Challenge Myth → Main Point → Reiterate → CTA
Section 1 – Hook & Setup (40–90 words): Hook (max 12 words) + Explain Common Myth (max 40 words) + Challenge Myth (max 25 words)
Section 2 – The Body (80–140 words): Main Point (max 120 words) + Reiterate (max 40 words)
Section 3 – CTA (10–30 words)
Total: Min ~100 words · Ideal 150–200 words · Max ~250 words`;

const COMPARISON_TEMPLATE = `Comparison Script Template
Formula: Hook → Belief → Simplify → Main Point → Reiterate → CTA
Section 1 – Hook & Setup (40–70 words): Hook comparing two things (max 30 words) + Explain Belief (max 30 words) + Simplify Comparison (max 40 words)
Section 2 – The Body (80–150 words): Main Point (max 125 words) + Reiterate (max 40 words)
Section 3 – CTA (10–30 words)
Total: Min ~100 words · Ideal 150–200 words · Max ~250 words`;

const LIST_TEMPLATE = `List Script Template
Formula: Hook → (Optional Reinforce) → The List → CTA
Section 1 – Hook & Setup (40–70 words): Hook introducing the list with a number + benefit
Section 2 – The List (80–150 words): 3–7 items. Each: [Number]. [Item]: [1-2 sentences explaining benefit]
Section 3 – CTA (10–30 words)
Total: Min ~100 words · Ideal 125–150 words · Max ~200 words`;

const STEP_BY_STEP_TEMPLATE = `Step-by-Step Script Template
Formula: Hook → Context → Steps → Payoff → Proof → CTA
Hook (max 30 words): state the end result/benefit
Context (max 30 words): why this system is interesting or unexpectedly effective
Steps (3–5 sequential actions): mini-story format, use "Start by..." / "First..." / "Then..." / "Next..."
Payoff (max 15 words): one clear literal outcome
Proof (max 40 words): a specific outcome or transformation
CTA (20–40 words)
Total: Ideal 150–175 words · Min 125 words · Max 225 words`;

const SELLING_TEMPLATE = `Selling Script Template
Formula: Hook → Solution → Actionable Steps → CTA
Hook (max 25 words): 1 sentence stating a common pain point
Solution (max 30 words): the discovered solution
Steps (3–5, 80–125 words): sequential actions as a continuous mini-story
CTA (10–30 words): actual step on how someone can get the solution
Total: Min ~100 words · Ideal 125–150 words · Max ~200 words`;

function buildPrompt(niche: string): string {
  const cta = `Follow for more ${niche} content.`;

  return `You are an expert Instagram Reels content strategist. Generate a complete 30-day content plan.

USER INPUT:
- Niche: "${niche}"

OUTPUT REQUIREMENTS:
Return a single, valid JSON object with exactly two top-level keys: "preview" and "calendar".

"preview" Key:
An array of exactly 3 objects for Day 1, Day 2, and Day 3. Each object must have:
- day: number (1, 2, or 3)
- type: string (content category from the allowed list)
- topic: string (the main topic, max 12 words)
- primaryHook: string (fully written spoken hook — NO placeholders, NO brackets, NO parentheses — exactly as you would say it on camera)
- secondaryHooks: string[] (exactly 2 alternative hooks — also fully written spoken words, no placeholders)
- fullScript: object (keys = section names from template below, values = fully written spoken script text — NO placeholders, NO brackets, NO stage directions like "[insert X]")
- caption: string (max 100 words: reworded hook + 1-sentence summary + CTA: "${cta}")

"calendar" Key:
An array of exactly 30 objects for Day 1 to Day 30. Each object must have:
- day: number (1 to 30)
- type: string (content category)
- topic: string (main topic for that day, max 12 words)

PLANNING RULES:
1. Distribution (Exact): List: 4, Educational: 4, Common Mistake: 3, Myth: 3, Step-by-step / Tutorial: 5, Storytelling: 2, Case Study / Results: 3, Comparison: 3, Authority / FAQ / Quick Tip: 3.
2. Scheduling: No single content type may appear more than twice in any 7-day window.
3. Topics: All topics must be relevant to the niche: "${niche}". Topics must be 12 words or less.
4. Days 1-3 Content Types: MUST be selected ONLY from: 'Educational', 'Myth', 'Comparison', 'List', 'Step-by-step / Tutorial', or 'Selling'.
5. All hooks, script text, and captions must be written as SPOKEN WORDS ONLY. No brackets, no parentheses, no placeholder text like "(insert X)", no stage directions.
6. CTA for all content: "${cta}"

ANTI-FABRICATION RULES — CRITICAL:
- For Storytelling content: Do NOT invent specific personal outcomes, client results, revenue figures, or transformation stories. Keep it general and relatable without fabricating fake specifics.
- For Case Study / Results content: Do not invent specific numbers, timelines, or client outcomes. Use general framing only.
- Never fabricate statistics, follower counts, revenue figures, or specific dates.

TEMPLATES (use the matching template for each Day 1-3 fullScript):
${EDUCATIONAL_TEMPLATE}

${MYTH_TEMPLATE}

${COMPARISON_TEMPLATE}

${LIST_TEMPLATE}

${STEP_BY_STEP_TEMPLATE}

${SELLING_TEMPLATE}

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
      temperature: 0.8,
      max_tokens: 6000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const plan = JSON.parse(raw);

    if (!plan.preview || !plan.calendar || plan.calendar.length !== 30) {
      throw new Error("Invalid plan structure received. Please try again.");
    }

    plan.preview.forEach((p: { fullScript?: unknown }) => {
      if (typeof p.fullScript !== "object" || p.fullScript === null) {
        p.fullScript = { error: "Script not generated correctly." };
      }
    });

    return NextResponse.json(plan);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
