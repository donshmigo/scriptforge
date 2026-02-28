import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withRetry } from "@/lib/openai-retry";

export interface AnalyzeRequest {
  scripts: Array<{ name: string; text: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();
    const { scripts } = body;

    if (!scripts || scripts.length === 0) {
      return NextResponse.json({ error: "No scripts provided." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Cap each transcript at 6,000 words to stay well inside TPM limits.
    // YouTube transcripts can be 4–8k words each; 10 × 8k = ~80k tokens input alone.
    const MAX_WORDS_PER_SCRIPT = 6000;
    const trimmedScripts = scripts.map((s) => {
      const words = s.text.split(/\s+/);
      const trimmed = words.length > MAX_WORDS_PER_SCRIPT
        ? words.slice(0, MAX_WORDS_PER_SCRIPT).join(" ") + "\n[... transcript trimmed for analysis ...]"
        : s.text;
      return { name: s.name, text: trimmed };
    });

    // Use at most 8 scripts to keep the prompt manageable
    const analysisScripts = trimmedScripts.slice(0, 8);

    const scriptDump = analysisScripts
      .map((s, i) => `--- SCRIPT ${i + 1}: "${s.name}" ---\n\n${s.text}`)
      .join("\n\n\n");

    const prompt = `You are a forensic linguist and elite ghostwriter. I'm giving you ${analysisScripts.length} YouTube scripts by the same creator. Your job is to produce the most exhaustive possible "Creator Voice & Script DNA" document — one so precise and granular that an AI could produce a new script completely indistinguishable from this creator's real work.

IMPORTANT — PACING NOTATION: These transcripts use two special markers derived from the creator's actual recorded delivery timing:
- "..." = a natural short pause or breath (gap of ~1.5–3 seconds in delivery)
- A blank line between paragraphs = a longer beat or section break (gap of 3+ seconds)
Use these markers to study and document the creator's pacing rhythm, breath cadence, and where they naturally slow down or speed up.

Do NOT give surface-level observations. Go deep into the actual language of these scripts. Quote liberally and directly. Every claim must be backed by a real example pulled from the text.

---

## 1. TONE FINGERPRINT
Describe the emotional register in precise terms. Is it confident? Matter-of-fact? Excited? Conspiratorial? Urgent? Give at least 5 specific adjectives and justify each one with a direct quote from the scripts that demonstrates that quality.

## 2. VOCABULARY PROFILE — EXACT WORD BANK
This section must be exhaustive. Go through the scripts word by word and catalogue:

**High-frequency power words** (list every notable word they use more than once, with the exact sentences they appeared in)

**Signature adjectives** — adjectives they use to describe results, content, strategies, and people. List them all with examples.

**Signature verbs** — the action words they prefer. Do they say "grow" or "scale"? "build" or "create"? "make" or "produce"? Extract their actual verb preferences with examples.

**Numbers and specificity** — how do they use numbers? Do they say "a lot" or "100,000"? "quickly" or "in 6 weeks"? Extract every specific number/timeframe used across all scripts and show the pattern.

**Words they NEVER use** — based on what's absent, list words a generic creator would use that this creator avoids entirely (e.g. "amazing", "guys", "awesome", "content creator", etc.)

**Contractions and informality** — catalogue every contraction they use and show where. How informal is their language on a scale of 1–10?

## 3. SENTENCE ARCHITECTURE
Analyze the actual grammatical structure of their sentences:

**Sentence length distribution** — pull 20 real sentences from the scripts and measure them. Short (1–8 words), Medium (9–20 words), Long (21+ words). What's the ratio? Show the actual sentences.

**Sentence starters** — list every distinct way they start sentences. What percentage start with "And"? "But"? "So"? "Now"? "The"? "This"? Quote real examples of each.

**Paragraph rhythm** — how do they sequence short vs. long sentences within a paragraph? Show a real paragraph and annotate it.

**Punctuation patterns** — do they use em-dashes? Ellipses? How? Quote examples.

**Incomplete/fragment sentences** — do they use intentional sentence fragments? List every example found.

## 4. TRANSITIONAL LANGUAGE — COMPLETE CATALOGUE
List EVERY transitional phrase found across all scripts, grouped by function:

**Opening a new section:** (e.g. "And that starts with...", "Now...", "So...")
**Bridging within a section:** (e.g. "And here is what I mean.", "Let me show you...")
**Re-hooks and retention:** (e.g. "But here is the thing...", "This is very important...")
**Contrast/counter:** (e.g. "The thing is...", "Not at all...")
**Emphasis:** (e.g. "can't emphasize this enough", "this is powerful if it's done right")
**Closing a section:** (e.g. "So...", "Now that you understand...")

For each phrase: quote the EXACT line from the script it appeared in.

## 5. HOOK ARCHITECTURE — FORMULA EXTRACTION
Analyze every hook across all scripts. For each video:
- Quote the exact opening 3–5 sentences verbatim
- Label the hook type (Investment, Myth-bust, Result-first, Story-drop, etc.)
- Identify the exact credibility signal used (number, result, timeframe, personal story)
- Identify the curiosity gap created
- Measure how many sentences before the bridge to the main promise ("And in this video...")

Then derive the master hook template this creator uses, showing how their components stack.

## 6. PROOF & CREDIBILITY PATTERNS
How does this creator prove they know what they're talking about? Catalogue every credibility technique:
- Exact numbers they drop (followers, views, revenue, time) — list all of them
- How they reference personal experience (first-person past tense patterns)
- How they use contrast ("This video got 80K views. The second got 5.5 million.")
- How they handle the "but I'm not an expert" objection
- The specific language of their social proof

## 7. SCRIPT STRUCTURE — SECTION BY SECTION
Map out the exact structure used across all scripts:
- What is each section called / what does it accomplish?
- Exact opening line formula for each section
- Exact closing/bridge formula for each section
- Where re-hooks appear and what language they use
- The psychological arc: how tension builds and resolves

## 8. HOW THEY TEACH
This creator is educational. How exactly do they teach?
- Do they lead with the rule or the example?
- How do they use numbered lists (and what language introduces them)?
- How do they simplify complex ideas (specific simplification phrases they use)?
- How do they handle objections mid-script?
- What is their "show don't tell" vs. "tell then show" ratio?

## 9. CALL TO ACTION LANGUAGE
Quote every CTA from every script verbatim. Then identify:
- The exact transition phrase before every CTA
- The format (command, invitation, tease?)
- What they ask the viewer to do and the exact words used
- How they reference the next video

## 10. DELIVERY PACING & RHYTHM
Using the "..." short-pause markers and paragraph breaks as data points from the creator's actual recorded delivery:

**Speaking cadence** — are they generally fast-paced or measured? Do they rush through lists or slow down for emphasis?

**Pause placement patterns** — where do they consistently pause? Before key reveals? After strong claims? At transition points? Quote 5–8 examples of "..." placement with the text around them.

**Beat structure** — where do the paragraph breaks (long beats) occur? What content triggers a full stop vs. continuing?

**Rhythm pattern** — describe their overall rhythm in concrete terms (e.g. "3–4 fast sentences then a pause", "single punchy line, long pause, then explanation"). Show a real example.

**Pacing shifts** — do they slow down for credibility moments and speed up for hooks/energy? Where and how?

## 11. COMPLETE SIGNATURE PHRASE LIBRARY
Pull every phrase that is distinctly this creator's. Not common phrases — phrases that are idiosyncratic to them. List a minimum of 25, each with the exact sentence it appeared in and the script it came from.

## 12. THE GHOSTWRITING RULEBOOK
Based on everything above, write a precise 20-rule ghostwriting guide. Each rule must be:
- Specific (not "be conversational" — instead "open 40% of sentences with And, But, So, or Now")
- Backed by evidence from the scripts
- Immediately actionable

---

HERE ARE THE SCRIPTS:

${scriptDump}

---

Be exhaustive. Be forensic. Quote everything. The output should be long — that's the point. A shallow analysis produces generic scripts. Only extreme depth produces authentic imitation.`;

    const identityPrompt = `You are analyzing ${analysisScripts.length} YouTube scripts by the same creator. Extract the following four things about WHO this creator is and HOW they position themselves. Be specific — quote actual numbers, phrases, and examples from the scripts wherever possible.

Return ONLY valid JSON in exactly this shape:
{
  "credibilityStack": "A thorough list of every specific proof point, result, metric, and credential mentioned across all scripts — include exact numbers (follower counts, revenue figures, timeframes, views, years of experience, etc.). This is used as the creator's authority foundation.",
  "uniqueMethod": "The creator's specific approach, framework, or system. What is their proprietary way of achieving results? What do they call it? What's their step-by-step sequence that is distinctly theirs (not generic advice)?",
  "contraryBelief": "What does this creator believe that contradicts the standard advice in their space? What common approaches do they argue against? What is their contrarian take that shapes their angle?",
  "targetPerson": "Based on the problems solved and who is addressed — who is the single most specific person this content is created for? Include their situation, frustration, and desired outcome."
}

SCRIPTS:
${scriptDump}`;

    // Run style analysis first, then identity (sequential avoids simultaneous rate-limit hits)
    const styleCompletion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 8192,
      })
    );

    const identityCompletion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: identityPrompt }],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      })
    );

    const analysis = styleCompletion.choices[0]?.message?.content ?? "";

    let identityExtract: {
      credibilityStack: string;
      uniqueMethod: string;
      contraryBelief: string;
      targetPerson: string;
    } = { credibilityStack: "", uniqueMethod: "", contraryBelief: "", targetPerson: "" };

    try {
      const raw = identityCompletion.choices[0]?.message?.content ?? "{}";
      identityExtract = JSON.parse(raw);
    } catch {
      // Return analysis even if identity extraction fails to parse
    }

    return NextResponse.json({ analysis, identityExtract });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed.";

    if (message.includes("401") || message.includes("Incorrect API key")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your OpenAI API key." },
        { status: 401 }
      );
    }

    if (message.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
