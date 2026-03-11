import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const EDUCATIONAL_TEMPLATE = `// Educational Script Template
Formula: Hook → Reinforce Hook → Main Point 1 → Contrast → Main Point 2 → CTA
Section 1 – The Hook [Max 40 words]
Hook [Max 12 words]: One sentence that grabs attention with a surprising, emotional, or curiosity-based statement.
Reinforce Hook [Max 30 words]: 1–2 sentences that deepen curiosity, add a twist, or highlight why this matters.
Section 2 – The Body [Max 150 words]
Main Point 1 [Max 60 words]: 2–3 sentences explaining the first half of the main idea.
Contrast [Max 30 words]: 1–2 sentences challenging a common belief or presenting a counterpoint.
Main Point 2 [Max 60 words]: 2–3 sentences finishing the explanation + connecting it back to the contrast.
Section 3 - The CTA (Optional)
Call-To-Action [Max 25 words]: If growth is the goal → "Follow for more [Niche] content." If sales/leads is the goal → Insert a call-to-action that reflects the next step in your offer ladder.
Total Word Target: ~150 words (45 sec spoken) · Min ~100 words · Max ~250 words`;

const MYTH_TEMPLATE = `// Myth Script Template
Formula: Hook → Explain Myth → Challenge Myth → Main Point → Reiterate → CTA
Section 1 – Hook & Setup [40–90 words]
Hook [Max 12 words]: One sentence that grabs attention.
Explain Common Myth [Max 40 words]: 1–2 sentences summarizing the belief most people hold.
Challenge Common Myth [Max 25 words]: 1 sentence hinting at the truth that contradicts this myth.
Section 2 – The Body [80–140 words]
Main Point [Max 120 words]: 3–5 sentences explaining the truth behind the myth and why it matters.
Reiterate [Max 40 words]: 1–2 sentences reinforcing why this challenges a commonly held belief.
Section 3 – The CTA (Optional) [10–30 words]
Word Count Guidelines: Min ~100 words · Ideal 150-200 words · Max ~250 words`;

const COMPARISON_TEMPLATE = `// Comparison Script Template
Formula: Hook → Belief → Simplify → Main Point → Reiterate → CTA
Section 1 – Hook & Setup [40–70 words]
Hook [Max 30 words]: 1 sentence directly comparing two things (X vs Y).
Explain Belief [Max 30 words]: What most people assume about X vs Y.
Simplify Comparison [Max 40 words]: 1–2 sentences showing the simplest way to compare X vs Y.
Section 2 – The Body [80–150 words]
Main Point [Max 125 words]: 3–5 sentences giving depth, context, and practical examples.
Reiterate [Max 40 words]: 1–2 sentences reinforcing why this comparison matters.
Section 3 – The CTA (Optional) [10–30 words]
Word Count Guidelines: Min ~100 words · Ideal 150-200 words · Max ~250 words`;

const LIST_TEMPLATE = `// List Script Template
Formula: Hook → (Optional Reinforce) → The List → CTA (Optional)
Section 1 – Hook & Setup [40–70 words]
Hook [Max 20 words]: 1 sentence introducing the list with a number + a benefit or surprising twist.
Reinforce (optional) [Max 20 words]: 1 sentence that makes the list sound unique, urgent, or counterintuitive.
Section 2 – The List [80–150 words]
List Items [Max 120 words]: 3–7 points. Format each as: [Number]. [Item]: [1-2 sentences explaining benefit or why it matters.]
Section 3 - The CTA (Optional) [10–30 words]
Word Count Guidelines: Min ~100 words · Ideal 125–150 words · Max ~200 words`;

const STEP_BY_STEP_TEMPLATE = `// Step-by-step System Script
Formula: Hook → Introduce System → Steps → Payoff → Proof → CTA
Global Rules: Word Count: Ideal 150–175 words, Max 225 words, Min 125 words. Steps: Always 3–5 steps.
Hook: [Max 30 words, introducing the end result or benefit of the system.]
Provide Context: [Max 30 words, explaining why this system is interesting or unexpectedly effective.]
Sequential Actions (3-5 Steps): Write 3-5 sequential actions as a continuous mini-story. Opening: randomly pick one of "Start by..." | "First,..." | "Just start by..." | "All you need to do is...". Only use "Then" or "Next" as transition words.
Payoff: [Max 15 words, state one clear literal outcome.]
Showcase Results: [Max 40 words, prove the method works with a specific outcome, number, or transformation.]
Call-To-Action: [20-40 words]`;

const SELLING_TEMPLATE = `// Selling Template
Formula: Hook → Solution → Actionable Steps → Present Solution → CTA
Word Count: Min ~100 words · Ideal 125-150 words · Max ~200 words
Hook: [Max 25 words, 1 sentence stating a common pain point of ideal customer/client]
Solution: [Max 30 words, state the discovered solution to this problem]
Sequential Actions (3-5 Steps): [80–125 words, write 3-5 sequential actions as a continuous mini-story.]
Call-To-Action: [10–30 words, actual step on how someone can get the solution.]`;

function buildPrompt(niche: string, goal: "followers" | "sales"): string {
  const HOOK_REFERENCE = `[
    {"text": "I need someone to explain this because this (insert item / action) doesn't make any sense.", "category": "Educational"},
    {"text": "(Insert item/action) sounds insane but I'm gonna explain why it's actually true", "category": "Educational"},
    {"text": "Is it true that (insert action) will help you (Insert desired result)?", "category": "Myth"},
    {"text": "Did you know that (Insert wrong information/misconception) is totally a lie.", "category": "Myth"},
    {"text": "Can you tell the difference between these two?", "category": "Comparison"},
    {"text": "Have you ever wondered what's the difference between (Insert Item #1) and (Insert Item #2)?", "category": "Comparison"},
    {"text": "(Insert # of things) that everyone should know", "category": "List"},
    {"text": "(Insert # of things) I've learned as a (insert profession/kind of person)", "category": "List"},
    {"text": "The secret to (insert action/item/point)?", "category": "Step-by-step / Tutorial"},
    {"text": "This is how you make (insert desired result)", "category": "Step-by-step / Tutorial"},
    {"text": "If you're trying to (insert desired goal/target), watch this video.", "category": "Selling"},
    {"text": "Stop what you're doing. If you're gonna (Insert action 1), I need you to (Insert action 2) first.", "category": "Selling"},
    {"text": "A story about my biggest failure and what I learned", "category": "Storytelling"},
    {"text": "How I turned (Insert starting point) into (Insert result) with one simple strategy", "category": "Case Study / Results"},
    {"text": "The biggest mistake most (insert profession) make is (insert action).", "category": "Common Mistake"},
    {"text": "This is the golden rule of (Insert niche/industry).", "category": "Authority / FAQ / Quick Tip"}
  ]`;

  const ctaLogic = goal === "followers"
    ? `Follow for more ${niche} content.`
    : `Comment 'INFO' if you want details.`;

  return `You are an expert Instagram Reels content strategist. Generate a complete 30-day content plan.

USER INPUTS:
- Niche: "${niche}"
- Goal: "${goal}"

OUTPUT REQUIREMENTS:
Return a single, valid JSON object with exactly two top-level keys: "preview" and "calendar".

"preview" Key:
An array of exactly 3 objects for Day 1, Day 2, and Day 3. Each object must have:
- day: number (1, 2, or 3)
- type: string (content category from the allowed list)
- topic: string (the main topic/hook, max 12 words)
- primaryHook: string (selected from HOOK_LIST below, with placeholders filled in for the niche)
- secondaryHooks: string[] (array of exactly 2 alternative hook variations)
- fullScript: object (JSON object where each key is a section title and value is the generated text — follow the templates exactly)
- caption: string (max 100 words: [reworded version of the primary hook] + [1-sentence summary of video content] + [Required CTA: "${ctaLogic}"])

"calendar" Key:
An array of exactly 30 objects for Day 1 to Day 30. Each object must have:
- day: number (1 to 30)
- type: string (content category)
- topic: string (main topic/hook for that day, max 12 words)

PLANNING RULES:
1. Distribution (Exact): The 30-day plan MUST use this exact distribution: List: 4, Educational: 4, Common Mistake: 3, Myth: 3, Step-by-step / Tutorial: 5, Storytelling: 2, Case Study / Results: 3, Comparison: 3, Authority / FAQ / Quick Tip: 3.
2. Scheduling: No single content type may appear more than twice in any 7-day window.
3. Topics: All topics must be tailored to the niche: "${niche}". Topics must be 12 words or less.
4. CTA Logic: All CTAs must be: "${ctaLogic}"
5. Days 1-3 Content Types: MUST be selected ONLY from: 'Educational', 'Myth', 'Comparison', 'List', 'Step-by-step / Tutorial', or 'Selling'.
6. Script Generation: For the 3-day preview, generate a fullScript following the detailed templates in TEMPLATES. Each key in fullScript should be a section name from the template.
7. Hook Integration: Select a primaryHook from HOOK_LIST matching the content type. Fill in all placeholders with niche-specific content.

HOOK_LIST:
${HOOK_REFERENCE}

TEMPLATES:
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
    const { niche, goal } = await req.json();

    if (!niche?.trim()) {
      return NextResponse.json({ error: "Niche is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API not configured." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const prompt = buildPrompt(niche.trim(), goal ?? "followers");

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
