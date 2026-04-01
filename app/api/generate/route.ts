import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Vercel Pro: up to 300s for long AI generation
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getWritingStyle } from "@/lib/personas";
import { getHooksForReelType } from "@/lib/viral-hooks";
import { withRetry } from "@/lib/openai-retry";

interface CreatorProfile {
  path: "experienced" | "new";
  name: string;
  channelUrl?: string;
  credibilityStack: string;
  uniqueMethod: string;
  contraryBelief: string;
  targetPerson: string;
  contentStyle: string;
  profileDoc?: string;
}

export interface GenerateRequest {
  platform?: "youtube" | "reels";
  reelType?: string;
  videoTitle: string;
  videoIdea?: string;
  userIntro?: string;
  referenceInfo?: string;
  subheadings?: string;
  scriptLength: string;
  styleAnalysis: string;
  scriptSamples: { name: string; sample: string }[];
  creatorProfile: CreatorProfile;
  introGuide?: string;
  scriptGuide?: string;
  personaId?: string;
  apiKey: string;
  anthropicApiKey?: string;
  // Revision mode — when both are provided, revise the existing script
  currentScript?: string;
  feedbackMessage?: string;
}

const YOUTUBE_LENGTH_TARGETS: Record<string, { words: string; duration: string; maxTokens: number }> = {
  "1": { words: "870–1,160",   duration: "6–8 minutes",   maxTokens: 3000 },
  "2": { words: "1,160–1,450", duration: "8–10 minutes",  maxTokens: 3500 },
  "3": { words: "1,450–1,740", duration: "10–12 minutes", maxTokens: 4200 },
  "4": { words: "1,740–2,175", duration: "12–15 minutes", maxTokens: 5000 },
  "5": { words: "2,175–2,900", duration: "15–20 minutes", maxTokens: 6500 },
  // legacy keys
  short:  { words: "870–1,160",   duration: "6–8 minutes",   maxTokens: 3000 },
  medium: { words: "1,450–1,740", duration: "10–12 minutes", maxTokens: 4200 },
  long:   { words: "2,175–2,900", duration: "15–20 minutes", maxTokens: 6500 },
};

// Instagram Reels / TikTok — ~150 WPM speaking pace
// maxTokens includes room for the script + 3 hook alternatives (~150 extra tokens)
const REELS_LENGTH_TARGETS: Record<string, { words: string; duration: string; maxTokens: number; wpm: number }> = {
  "1": { words: "50–75",   duration: "20–30 seconds", maxTokens: 600,  wpm: 150 },
  "2": { words: "75–100",  duration: "30–40 seconds", maxTokens: 700,  wpm: 150 },
  "3": { words: "100–125", duration: "40–50 seconds", maxTokens: 800,  wpm: 150 },
  "4": { words: "125–150", duration: "50–60 seconds", maxTokens: 900,  wpm: 150 },
  "5": { words: "150–225", duration: "60–90 seconds", maxTokens: 1100, wpm: 150 },
  // legacy keys
  short:  { words: "50–75",   duration: "20–30 seconds", maxTokens: 600,  wpm: 150 },
  medium: { words: "100–125", duration: "40–50 seconds", maxTokens: 800,  wpm: 150 },
  long:   { words: "150–225", duration: "60–90 seconds", maxTokens: 1100, wpm: 150 },
};

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      platform = "youtube",
      reelType,
      videoTitle,
      videoIdea = "",
      userIntro = "",
      referenceInfo = "",
      subheadings = "",
      scriptLength,
      styleAnalysis,
      scriptSamples = [],
      creatorProfile,
      introGuide = "",
      scriptGuide = "",
      personaId = "thomas",
      apiKey,
      anthropicApiKey,
      currentScript,
      feedbackMessage,
    } = body;

    // Fall back to server-side env vars — client-provided keys take precedence
    const resolvedAnthropicKey = anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY || "";
    const resolvedOpenAiKey    = apiKey?.trim()          || process.env.OPENAI_API_KEY    || "";

    if (!resolvedAnthropicKey && !resolvedOpenAiKey) {
      return NextResponse.json(
        { error: "No API key configured. Add your Anthropic key in Edit Profile → API Keys." },
        { status: 400 }
      );
    }
    if (!videoTitle) {
      return NextResponse.json({ error: "Video title is required." }, { status: 400 });
    }

    // Custom style requires at least one guide to be configured
    if (personaId === "custom") {
      const hasStyleGuide   = !!(body.styleAnalysis?.trim());
      const hasIntroGuide   = !!(body.introGuide?.trim());
      const hasScriptGuide  = !!(body.scriptGuide?.trim());
      if (!hasStyleGuide && !hasIntroGuide && !hasScriptGuide) {
        return NextResponse.json(
          { error: "Your Custom style has no guides set up yet. Open Edit Profile and add a Style Guide, Intro Guide, or Script Guide so the AI knows how to write your scripts." },
          { status: 400 }
        );
      }
    }

    const useAnthropic = !!resolvedAnthropicKey;
    const isReels = platform === "reels";
    const lengthTable = isReels ? REELS_LENGTH_TARGETS : YOUTUBE_LENGTH_TARGETS;
    const lengthTarget = lengthTable[scriptLength] ?? lengthTable.medium;
    const currentYear = new Date().getFullYear();

    // Map UI reelType slug → exact template name used in THOMAS_REELS_GUIDE
    const REEL_TYPE_LABELS: Record<string, string> = {
      "educational":  "TEMPLATE 1 — EDUCATIONAL",
      "myth":         "TEMPLATE 2 — MYTH",
      "comparison":   "TEMPLATE 3 — COMPARISON",
      "list":         "TEMPLATE 4 — LIST",
      "step-by-step": "TEMPLATE 5 — LONGER EDUCATIONAL STEP-BY-STEP",
      "selling":      "TEMPLATE 6 — SELLING",
    };
    const selectedReelTemplate = reelType ? REEL_TYPE_LABELS[reelType] : null;

    // Resolve writing style — provides the base writing framework
    const persona = getWritingStyle(personaId);

    // ── INPUT 1: STYLE ────────────────────────────────────────────────────────
    // Style analysis and script samples apply for ALL creators — not just Thomas.
    // If the user has analyzed their own scripts or uploaded a style guide, it overlays the base framework.

    const styleSection = `════════════════════════════════════════
INPUT 1 — STYLE GUIDE  [Writing Style: ${persona.name}]
Language, tone, word choice, sentence structure. This governs ALL writing decisions.
════════════════════════════════════════

${persona.styleGuide}

${styleAnalysis?.trim() ? `---

CREATOR'S FORENSIC STYLE ANALYSIS (extracted from this creator's actual scripts/voice — mirror this style precisely on top of the framework above):

${styleAnalysis}` : ""}

${scriptSamples.length > 0 ? `---

REAL SCRIPT EXAMPLES from this creator — pattern-match vocabulary, rhythm, and structure against these:

${scriptSamples.map((s, i) => `--- EXAMPLE ${i + 1}: "${s.name}" ---\n${s.sample}`).join("\n\n")}` : ""}`;

    // ── INPUT 2: IDENTITY ─────────────────────────────────────────────────────
    // Every creator uses their own identity — either a profileDoc (raw document) or structured fields.
    const profileDocText = creatorProfile?.profileDoc?.trim();

    const identitySection = profileDocText
      ? `════════════════════════════════════════
INPUT 2 — WHO AM I
All proof points, stories, audience, beliefs. Use ONLY the information in this document. Never invent.
════════════════════════════════════════

${profileDocText}

ANTI-FABRICATION — CRITICAL:
- Use ONLY the proof points, results, and stories documented above.
- Never invent outcomes, statistics, client results, or personal anecdotes not listed here.
- If a specific figure is needed but not documented, write [ADD DETAIL] — never guess.`
      : `════════════════════════════════════════
INPUT 2 — WHO AM I
All proof points, stories, audience, beliefs. Use ONLY the information documented below. Never invent.
════════════════════════════════════════

NAME: ${creatorProfile?.name || "[Name not set — add in Who Am I settings]"}

CREDIBILITY STACK — use these exact proof points when establishing authority:
${creatorProfile?.credibilityStack || "[Not set — add in Who Am I settings]"}

UNIQUE METHOD — when explaining HOW to achieve something, use this specific approach:
${creatorProfile?.uniqueMethod || "[Not set — add in Who Am I settings]"}

CONTRARIAN ANGLE — this belief shapes the video's positioning:
${creatorProfile?.contraryBelief || "[Not set — add in Who Am I settings]"}

TARGET AUDIENCE:
${creatorProfile?.targetPerson || "[Not set — add in Who Am I settings]"}

ANTI-FABRICATION — CRITICAL:
- Use ONLY the proof points, results, and stories documented above.
- Never invent outcomes, statistics, client results, or personal anecdotes not documented here.
- If a specific figure is needed but not documented above, write [ADD DETAIL] — never guess.`;

    // ── INPUTS 3 & 4 / 5: GUIDES (platform-aware) ────────────────────────────
    // For Reels: Input 5 (Reels Guide) replaces Input 3 & 4 entirely.
    // For YouTube: normal Input 3 + Input 4.
    const guideSection = isReels
      ? `════════════════════════════════════════
INPUT 5 — INSTAGRAM REELS / TIKTOK SCRIPT GUIDE  [Writing Style: ${persona.name}]
Replaces Input 3 (Intro) and Input 4 (Script) for short-form output.
Input 1 (Style) and Input 2 (Identity) still apply in full.
════════════════════════════════════════

${persona.reelsGuide ?? persona.scriptGuide}

---

TARGET FOR THIS REEL: ${lengthTarget.words} spoken words (≈ ${lengthTarget.duration} at ~150 WPM).
${selectedReelTemplate
  ? `SELECTED TEMPLATE: Use "${selectedReelTemplate}" from Input 5 above. Follow its formula, section structure, and word-count rules exactly. Do not deviate to a different template.`
  : `Choose the template from Input 5 that best matches the Video Idea. Follow its formula, section structure, and word-count rules exactly.`}

════════════════════════════════════════
HOOK INSPIRATION LIBRARY
Use these as structural patterns for the opening hook sentence only.
Never copy verbatim. Adapt to the writing style voice (Input 1) and the creator's credibility (Input 2).
Anti-fabrication rules still apply — no invented numbers or claims.
════════════════════════════════════════

${getHooksForReelType(reelType ?? "educational")}`
      : `════════════════════════════════════════
INPUT 3 — HOW TO WRITE AN INTRODUCTION  [Writing Style: ${persona.name}]
Intro beats, modes, USP. Nothing else.
════════════════════════════════════════

${introGuide?.trim() || persona.introGuide}

════════════════════════════════════════
INPUT 4 — HOW TO WRITE A SCRIPT  [Writing Style: ${persona.name}]
Body structure, rehooks, story flow, outro, CTAs. Intro is governed by Input 3.
════════════════════════════════════════

${scriptGuide?.trim() || persona.scriptGuide}`;

    // ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
    const systemPrompt = `You are writing a ${isReels ? "short-form Instagram Reels / TikTok" : "YouTube"} script using the "${persona.name}" writing style. Each input governs exactly one domain.

CONFLICT RESOLUTION:
- Language, tone, word choice, sentence structure → Input 1 (Style Guide)
- Proof points, stories, audience, beliefs → Input 2 (Who Am I)
${isReels
  ? `- Short-form structure, template choice, word targets → Input 5 (Reels Guide) — this replaces Input 3 & 4 entirely for this output`
  : `- Intro beats, modes, USP → Input 3 (Intro Guide)
- Body structure, rehooks, story flow, outro, CTAs → Input 4 (Script Guide)`}

The current year is ${currentYear}. Never reference a past year as if it is the current one.

ANTI-FABRICATION RULES — non-negotiable:
- Use ONLY proof points and figures documented in Input 2. When a specific figure is needed but not documented, write [ADD NUMBER] — never invent a number.
- Never claim the creator tested, used, reviewed, or recommends a specific product, tool, camera, software, or service unless it appears explicitly in Input 2 or in the video's reference material below.
- Never fabricate specific statistics, follower counts, revenue figures, views, or dates not documented in Input 2.

${styleSection}

${identitySection}

${guideSection}

ABSOLUTE OUTPUT FORMAT RULES:
- Write spoken words only. Production notes in [brackets] are allowed per Input 1 (Style Guide).
- No hype language. No generic filler. No 'Hey guys', 'welcome back', 'smash that like button'.
${isReels
  ? `- No section headers or bold subheadings. Flowing prose only.
- The entire script must fit within ${lengthTarget.words} words. Every word earns its place.`
  : `- Body text is prose paragraphs with bold subheadings — never bullet points.
- One CTA maximum. One idea per sentence. 2–3 sentences per paragraph.
- The intro must follow the Beat structure from Input 3 exactly. 50–80 words maximum for the intro.
- Rehooks at every major section boundary using contrast, stakes, or curiosity — never 'moving on to...' or 'next, we're going to talk about...'.`}`;

    // ── USER PROMPT ───────────────────────────────────────────────────────────
    const introInstruction = userIntro?.trim()
      ? `EXACT ${isReels ? "OPENING HOOK" : "INTRODUCTION"} — USE WORD FOR WORD AS THE OPENING (do not alter a single word):
"""
${userIntro.trim()}
"""

Use this ${isReels ? "hook" : "introduction"} to understand the video's angle, tone, and core promise. ${isReels ? "Build the entire reel around this hook — it sets the one message you must deliver." : "Continue the script seamlessly from where this intro leaves off, matching its energy perfectly. The rest of the script must fulfil exactly what this intro promises."}`
      : isReels
        ? `Write the opening hook — first 1–2 sentences only. Lead with contrast, tension, a bold claim, or a provocative question. No warmup, no greeting, no context before the idea. Start with the most compelling line you can write.`
        : `Write the intro using Input 3's Beat structure (Beat 1: Proof → [Beat 1B if contrarian-mode] → Beat 2: Promise → Beat 3: Bridge → [Beat 4 if stakes needed]). 50–80 words maximum. Start with 'I' and a specific documented proof point. No greeting, no warmup, no context before topic clarity.`;

    const referenceBlock = referenceInfo?.trim()
      ? `REFERENCE MATERIAL (draw facts, examples, and talking points primarily from this — do not invent details not present here):
---
${referenceInfo.trim()}
---` : "";

    const ideaBlock = videoIdea?.trim()
      ? `${isReels ? "REEL" : "VIDEO"} CONCEPT & ANGLE:
${videoIdea.trim()}` : "";

    // Build the section labels list for the chosen template
    const REEL_TYPE_SECTIONS: Record<string, string[]> = {
      "educational":  ["HOOK", "REINFORCE HOOK", "MAIN POINT 1", "CONTRAST", "MAIN POINT 2", "CTA"],
      "myth":         ["HOOK", "EXPLAIN MYTH", "CHALLENGE MYTH", "MAIN POINT", "REITERATE", "CTA"],
      "comparison":   ["HOOK", "EXPLAIN BELIEF", "SIMPLIFY", "MAIN POINT", "REITERATE", "CTA"],
      "list":         ["HOOK", "REINFORCE", "THE LIST", "CTA"],
      "step-by-step": ["HOOK", "DEEPEN HOOK", "EXPLAIN CONCEPT", "THE STEPS", "SHOWCASE RESULTS", "CTA"],
      "selling":      ["HOOK", "SOLUTION", "THE STEPS", "CTA"],
    };
    const sections = REEL_TYPE_SECTIONS[reelType ?? "educational"] ?? REEL_TYPE_SECTIONS["educational"];
    const sectionGuide = sections.map(s => `## ${s}`).join(" → ");

    const userPrompt = isReels
      ? `Write a complete Instagram Reel / TikTok script.

VIDEO TITLE / TOPIC: "${videoTitle}"
${ideaBlock}

${introInstruction}

TARGET: ${lengthTarget.words} spoken words (≈ ${lengthTarget.duration} at ~150 WPM). Do not exceed this. Every word must earn its place.

${referenceBlock}

OUTPUT FORMAT — follow this structure exactly:
${sections.map(s => `## ${s}\n[${s.toLowerCase()} content here]`).join("\n\n")}

Rules:
- Each section starts with its ## label on its own line, immediately followed by the spoken words — no blank line between the label and the text.
- No extra commentary, no preamble, no "here's the script" — start immediately with ## ${sections[0]}.
- Pure spoken prose within each section — no nested headers, no bullet points.
- End the script after the final section. Nothing after CTA.

AFTER THE SCRIPT, add this exact delimiter on its own line:
===HOOK ALTERNATIVES===
Then write 3 alternative hook sentences (the ${sections[0]} section only) as numbered options:
1. [alternative hook 1]
2. [alternative hook 2]
3. [alternative hook 3]

Each alternative must be a different structural approach drawn from the Hook Inspiration Library in the system prompt. All three must follow Input 1 (Style) and use only Input 2 (Identity) for any proof points.

Write the reel script now (starting with ## ${sections[0]}):`
      : `Write a complete YouTube script for the following video.

VIDEO TITLE: "${videoTitle}"
${ideaBlock}

${introInstruction}

TARGET LENGTH: ${lengthTarget.words} spoken words (approximately ${lengthTarget.duration} at a natural speaking pace).

${referenceBlock}

${subheadings?.trim() ? `SCRIPT OUTLINE / SUBHEADINGS (follow this structure for the body sections — use ascending value order per Input 4):\n${subheadings.trim()}` : ""}

OUTPUT FORMAT:
- Follow the full Script Architecture from Input 4: Intro → Body (ascending order) → Rehooks → Outro.
- Bold subheadings mark each new body section. Body is prose paragraphs — no bullets.
- Production notes allowed in [square brackets] where relevant.
- Outro follows the 3-step structure: Summarise → Visualise outcome → Frame next problem + CTA.
- The script ends when the CTA ends. Nothing after that.

Write the complete script now:`;

    // ── REVISION MODE ─────────────────────────────────────────────────────────
    // When currentScript + feedbackMessage are both provided, revise the existing script.
    const isRevision = !!(currentScript?.trim() && feedbackMessage?.trim());

    const finalSystemPrompt = isRevision
      ? `You are revising a ${isReels ? "short-form Reels/TikTok" : "YouTube"} script. Apply the user's feedback precisely.

WRITING STYLE (maintain throughout):
${persona.styleGuide}

CREATOR IDENTITY (use only these proof points):
${identitySection}

REVISION RULES:
- Change only what the feedback requests. Leave everything else exactly as written.
- Return the COMPLETE revised script — not just the changed section.
- Maintain all original formatting: bold subheadings, section structure, production notes.
- Do not add commentary, preambles, or explanations — output the script only.`
      : systemPrompt;

    const finalUserPrompt = isRevision
      ? `CURRENT SCRIPT:
${currentScript}

USER FEEDBACK: ${feedbackMessage}

Return the complete revised script now:`
      : userPrompt;

    const revisionMaxTokens = isRevision
      ? Math.max(lengthTarget.maxTokens, 3000)
      : lengthTarget.maxTokens;

    // ── GENERATION ────────────────────────────────────────────────────────────
    let raw = "";

    if (useAnthropic) {
      const anthropic = new Anthropic({ apiKey: resolvedAnthropicKey });
      const message = await withRetry(() =>
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: revisionMaxTokens,
          temperature: 0.65,
          system: finalSystemPrompt,
          messages: [{ role: "user", content: finalUserPrompt }],
        })
      );
      raw = (message.content[0] as { type: string; text: string })?.text ?? "";
    } else {
      const openai = new OpenAI({ apiKey: resolvedOpenAiKey });
      const completion = await withRetry(() =>
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: finalUserPrompt },
          ],
          temperature: 0.65,
          max_tokens: revisionMaxTokens,
        })
      );
      raw = completion.choices[0]?.message?.content ?? "";
    }

    // ── Parse hook alternatives (Reels only) ─────────────────────────────────
    let hookAlternatives: string[] = [];
    let rawScript = raw;

    if (isReels) {
      const delimIdx = raw.indexOf("===HOOK ALTERNATIVES===");
      if (delimIdx !== -1) {
        rawScript = raw.slice(0, delimIdx).trim();
        const altBlock = raw.slice(delimIdx + "===HOOK ALTERNATIVES===".length).trim();
        hookAlternatives = altBlock
          .split("\n")
          .map((l) => l.replace(/^\d+\.\s*/, "").trim())
          .filter(Boolean);
      }
    }

    // Strip meta comments, stray stage directions (keep Thomas's deliberate bracket notes)
    const script = rawScript
      .replace(/^\/\/\s*Template:.*$/im, "")
      .replace(/\[(?:PAUSE|BEAT|B-ROLL[^\]]*|CUT TO[^\]]*|EMPHASIS[^\]]*)\]/gi, "")
      .replace(/\*\*([^*]+)\*\*/g, "**$1**")    // preserve bold
      .replace(/\*([^*]+)\*/g, "$1")             // strip italic only
      .replace(/^#{1,6}\s*(production notes?|director.?s? notes?|filming tips?|editing tips?).*/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({ script, hookAlternatives });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    const lower = message.toLowerCase();

    // Auth / key problems
    if (
      message.includes("401") ||
      lower.includes("incorrect api key") ||
      lower.includes("invalid api key") ||
      lower.includes("authentication") ||
      lower.includes("unauthorized")
    ) {
      return NextResponse.json(
        { error: "Your API key is invalid or expired. Double-check it in Edit Profile → API Keys." },
        { status: 401 }
      );
    }

    // Billing / quota exhausted
    if (
      message.includes("402") ||
      lower.includes("quota") ||
      lower.includes("billing") ||
      lower.includes("insufficient_quota") ||
      lower.includes("credit") ||
      lower.includes("payment")
    ) {
      return NextResponse.json(
        { error: "Your API account has run out of credits. Top up your account at the provider's website and try again." },
        { status: 402 }
      );
    }

    // Rate limit
    if (message.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
      return NextResponse.json(
        { error: "You're sending requests too quickly. Wait 30 seconds and try again." },
        { status: 429 }
      );
    }

    // Input too long / context window exceeded
    if (
      lower.includes("context_length_exceeded") ||
      lower.includes("maximum context") ||
      lower.includes("too many tokens") ||
      lower.includes("prompt is too long") ||
      lower.includes("reduce the length")
    ) {
      return NextResponse.json(
        { error: "Your inputs are too long for the AI to process. Try shortening your reference material, profile, or script guide and generate again." },
        { status: 400 }
      );
    }

    // Model overloaded / capacity
    if (
      lower.includes("overloaded") ||
      lower.includes("capacity") ||
      lower.includes("service unavailable") ||
      message.includes("529") ||
      message.includes("503")
    ) {
      return NextResponse.json(
        { error: "The AI service is under heavy load right now. Wait 30–60 seconds and try again." },
        { status: 503 }
      );
    }

    // Permission / model access
    if (message.includes("403") || lower.includes("permission") || lower.includes("not allowed") || lower.includes("access denied")) {
      return NextResponse.json(
        { error: "Your API key doesn't have access to the required model. Check your account plan at the provider's website." },
        { status: 403 }
      );
    }

    // Timeout
    if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("econnreset") || lower.includes("aborted")) {
      return NextResponse.json(
        { error: "The generation took too long and timed out. Try a shorter script length or simplify your inputs." },
        { status: 504 }
      );
    }

    // Fallback — don't expose raw SDK stack traces
    return NextResponse.json(
      { error: "Something went wrong while generating your script. Please try again, and if it keeps happening, check your API key in Edit Profile." },
      { status: 500 }
    );
  }
}
