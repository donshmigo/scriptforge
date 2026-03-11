import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Vercel Pro: up to 300s for long AI generation
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { THOMAS_WHO_AM_I } from "@/lib/thomas-guides";
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
}

const YOUTUBE_LENGTH_TARGETS: Record<string, { words: string; duration: string; maxTokens: number }> = {
  short:  { words: "750–1,050",   duration: "5–7 minutes",   maxTokens: 2500 },
  medium: { words: "1,500–2,250", duration: "10–15 minutes", maxTokens: 4096 },
  long:   { words: "3,000+",      duration: "20+ minutes",   maxTokens: 6000 },
};

// Instagram Reels / TikTok — ~150 WPM speaking pace
// maxTokens includes room for the script + 3 hook alternatives (~150 extra tokens)
const REELS_LENGTH_TARGETS: Record<string, { words: string; duration: string; maxTokens: number; wpm: number }> = {
  short:  { words: "60–90",   duration: "15–30 seconds", maxTokens: 700,  wpm: 150 },
  medium: { words: "130–180", duration: "45–60 seconds", maxTokens: 1000, wpm: 150 },
  long:   { words: "225–300", duration: "90–120 seconds", maxTokens: 1400, wpm: 150 },
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
    // Precedence: forensic analysis of real scripts > writing style's Style Guide
    const styleSection = `════════════════════════════════════════
INPUT 1 — STYLE GUIDE  [Writing Style: ${persona.name}]
Language, tone, word choice, sentence structure. This governs ALL writing decisions.
════════════════════════════════════════

${persona.styleGuide}

${styleAnalysis?.trim() ? `---

FORENSIC STYLE ANALYSIS (extracted from this creator's actual published scripts — apply on top of the Style Guide above):

${styleAnalysis}` : ""}

${scriptSamples.length > 0 ? `---

REAL SCRIPT EXAMPLES — pattern-match every sentence against these:

${scriptSamples.map((s, i) => `--- EXAMPLE ${i + 1}: "${s.name}" ---\n${s.sample}`).join("\n\n")}` : ""}`;

    // ── INPUT 2: IDENTITY ─────────────────────────────────────────────────────
    // Precedence: creator profile fields > Thomas's Who Am I default
    const identitySection = `════════════════════════════════════════
INPUT 2 — WHO AM I
All proof points, stories, audience, beliefs. Use ONLY figures and stories from here. Never invent.
════════════════════════════════════════

${THOMAS_WHO_AM_I}

${creatorProfile ? `---

CREATOR PROFILE (use these specific details — they override/supplement the defaults above):

NAME: ${creatorProfile.name || "Thomas Graham"}

CREDIBILITY STACK (use these exact proof points when establishing authority):
${creatorProfile.credibilityStack || "See proof points above."}

UNIQUE METHOD (when explaining HOW to achieve something, use this specific approach — not generic advice):
${creatorProfile.uniqueMethod || "See unique method above."}

CONTRARIAN ANGLE (this belief shapes the video's positioning):
${creatorProfile.contraryBelief || "See core beliefs above."}

TARGET AUDIENCE:
${creatorProfile.targetPerson || "See target audience above."}` : ""}`;

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

    // ── GENERATION ────────────────────────────────────────────────────────────
    let raw = "";

    if (useAnthropic) {
      const anthropic = new Anthropic({ apiKey: resolvedAnthropicKey });
      const message = await withRetry(() =>
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: lengthTarget.maxTokens,
          temperature: 0.65,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        })
      );
      raw = (message.content[0] as { type: string; text: string })?.text ?? "";
    } else {
      const openai = new OpenAI({ apiKey: resolvedOpenAiKey });
      const completion = await withRetry(() =>
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.65,
          max_tokens: lengthTarget.maxTokens,
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

    if (message.includes("401") || message.includes("Incorrect API key")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your API key in Edit Profile." },
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
