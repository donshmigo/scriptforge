// ─────────────────────────────────────────────────────────────────────────────
// Writing Styles — scripting framework templates
//
// A writing style defines HOW a script is written: voice, tone, sentence
// structure, intro architecture, body mechanics, rehooks, outro format, CTAs.
//
// Writing styles are content-type specific — each one is optimised for a
// particular kind of YouTube video (education, best-of comparisons, reviews).
//
// The creator's own profile (Who Am I: proof points, stories, identity) is
// always layered on top — the writing style is the framework, the creator is
// the voice.
//
// Precedence (highest → lowest):
//   User-uploaded custom guide > Writing style guide > Built-in defaults
// ─────────────────────────────────────────────────────────────────────────────

import {
  THOMAS_STYLE_GUIDE,
  THOMAS_INTRO_GUIDE,
  THOMAS_SCRIPT_GUIDE,
  THOMAS_REELS_GUIDE,
} from "./thomas-guides";

import {
  BEST_OF_STYLE_GUIDE,
  BEST_OF_INTRO_GUIDE,
  BEST_OF_SCRIPT_GUIDE,
} from "./best-of-guides";

import {
  PRODUCT_REVIEW_STYLE_GUIDE,
  PRODUCT_REVIEW_INTRO_GUIDE,
  PRODUCT_REVIEW_SCRIPT_GUIDE,
} from "./product-review-guides";

export interface WritingStyleIdentity {
  name: string;
  channelUrl: string;
  credibilityStack: string;
  uniqueMethod: string;
  contraryBelief: string;
  targetPerson: string;
  contentStyle: string;
}

export interface WritingStyle {
  id: string;
  name: string;
  tagline: string;
  description: string;
  avatar: string;             // initials shown in the card
  color: string;              // CSS color for the avatar background
  available: boolean;
  contentType: string;        // e.g. "Education", "Best Of", "Product Review"
  identity: WritingStyleIdentity;  // Input 2 — default Who Am I fields
  styleGuide: string;         // Input 1 — language, tone, word choice
  introGuide: string;         // Input 3 — intro beats, structure, USP
  scriptGuide: string;        // Input 4 — body, rehooks, story flow, outro, CTAs
  reelsGuide?: string;        // Input 5 — Reels/TikTok templates (overrides 3 & 4 for short-form)
}

// ─── Thomas Graham — Education ───────────────────────────────────────────────
// Calm, authoritative, sophisticated ideas in simple language.
// One idea per sentence. Beat-driven intros. Ascending value order.
// Proof-backed. Never hype. "Smart friend who figured it out."
// Best for: education, authority-building, professional expertise content.

const THOMAS: WritingStyle = {
  id: "thomas",
  name: "Thomas Graham",
  tagline: "Calm authority. Proof-backed. Zero hype.",
  description: "Sophisticated ideas in plain language. One idea per sentence. Beat-driven intros (Proof → Promise → Bridge). Ascending value order. The smart friend who already figured it out.",
  avatar: "TG",
  color: "#6366f1",
  available: true,
  contentType: "Education",
  identity: {
    name: "Thomas Graham",
    channelUrl: "https://youtube.com/@thomasgraham",
    credibilityStack: `• 0 to 300K Instagram followers in 6 months (same account: 0 to 100K in the first 6 weeks)
• 6-figure business built from that same Instagram audience ($10,000+/month)
• Nearly 10 years in content — multiple millions generated through content (not a single platform)
• Made millions working less than 20 hours a week
• Traveled to roughly 50 countries — never woken up to an alarm — never taken a meeting or call
• Over a hundred million views across content
• Studied and tested pretty much every type of hook

USE ONLY THESE FIGURES. Never invent a number. Write [ADD NUMBER] if a figure is needed but not listed here.`,
    uniqueMethod: `The Authority-First Approach: turning existing professional expertise into an inbound lead engine on Instagram — without chasing followers, without going viral, and without posting every day.

Core mechanism: positioning clarity over volume. A few hours a week with the right positioning outperforms daily posting with weak positioning. The goal is to become the trusted authority your ideal client already feels they know before they've ever spoken to you.

Thomas is not teaching people to become influencers. He is teaching established professionals to become respected authorities who attract clients — not chase them.`,
    contraryBelief: `Authority beats reach. A respected expert with 2,000 followers will consistently out-earn an entertainer with 200,000.

The most well-known and respected people in a field earn the most — not the most technically skilled. The market doesn't pay for the best. It pays for the most visible and most trusted.

More content does not equal more growth. More positioning clarity equals more growth. Volume is never the bottleneck.`,
    targetPerson: `A 35-year-old consultant, coach, or high-performing professional. Already earns well — somewhere between $5K and $50K a month from their expertise. Good at what they do but invisible online. Watches people with less skill making more money and it quietly bothers them. Doesn't want to become a content creator — wants inbound leads, professional respect, and the freedom to work on their terms.`,
    contentStyle: "talking-head",
  },
  styleGuide:  THOMAS_STYLE_GUIDE,
  introGuide:  THOMAS_INTRO_GUIDE,
  scriptGuide: THOMAS_SCRIPT_GUIDE,
  reelsGuide:  THOMAS_REELS_GUIDE,
};

// ─── Best Of ─────────────────────────────────────────────────────────────────
// Product comparison framework for "Best X" YouTube videos.
// Structured product sections with positioning, standout feature, specs,
// demo, limitation, and verdict beats. Ascending value order. Prose only.
// Best for: "best [product category]", top-N comparison, roundup videos.

const BEST_OF: WritingStyle = {
  id: "best-of",
  name: "Best Of",
  tagline: "Product comparisons. Structured sections. Verdict-driven.",
  description: "Purpose-built for 'Best X' comparison videos. Each product gets a structured section: positioning, standout feature, specs, demo walkthrough, honest limitation, and a clear verdict. Ascending value order. Prose only — never bullets.",
  avatar: "BO",
  color: "#10b981",
  available: true,
  contentType: "Best Of",
  identity: {
    name: "",
    channelUrl: "",
    credibilityStack: "",
    uniqueMethod: "",
    contraryBelief: "",
    targetPerson: "",
    contentStyle: "talking-head",
  },
  styleGuide:  BEST_OF_STYLE_GUIDE,
  introGuide:  BEST_OF_INTRO_GUIDE,
  scriptGuide: BEST_OF_SCRIPT_GUIDE,
};

// ─── Product Review ───────────────────────────────────────────────────────────
// Single-product review framework built around the expectations vs reality gap.
// Central tension through-line. Ascending evaluation categories. Segmented
// verdict by buyer type. Process-based demonstrations — never evaluate outputs.
// Best for: single product review videos, in-depth honest assessments.

const PRODUCT_REVIEW: WritingStyle = {
  id: "product-review",
  name: "Product Review",
  tagline: "Expectations vs reality. Central tension. Honest verdict.",
  description: "Built for single-product review videos. Every section is structured around what the viewer expects vs what actually happens. Ascending evaluation categories. Verdict segmented by buyer type. Shows product use — never evaluates specific on-screen outputs.",
  avatar: "PR",
  color: "#f97316",
  available: true,
  contentType: "Product Review",
  identity: {
    name: "",
    channelUrl: "",
    credibilityStack: "",
    uniqueMethod: "",
    contraryBelief: "",
    targetPerson: "",
    contentStyle: "talking-head",
  },
  styleGuide:  PRODUCT_REVIEW_STYLE_GUIDE,
  introGuide:  PRODUCT_REVIEW_INTRO_GUIDE,
  scriptGuide: PRODUCT_REVIEW_SCRIPT_GUIDE,
};

// ─── Alex Hormozi ─────────────────────────────────────────────────────────────
// High-density, math-backed, concrete frameworks with numbers.
// Lead with a bold contrarian claim. Value-first, always. Dense and punchy.

const HORMOZI_STYLE_GUIDE = `
## ALEX HORMOZI — STYLE GUIDE
### Dense, direct, math-backed. Every sentence earns ROI for the viewer.

---

### VOICE IN ONE SENTENCE
"Write like someone who has done the thing at scale, has the receipts, and respects the reader enough to skip the fluff and hand them the playbook."

Hormozi's writing is high-density and concrete. Every sentence either delivers a fact, a framework, or a mechanism. Ruthlessly anti-filler. The value per word is higher than any other creator in the business space.

---

### SENTENCE STRUCTURE
- Short declarative statements followed by the specific mechanism behind the claim.
- Heavy use of numbers, ratios, and math to prove points.
- Rhetorical questions used to pre-empt objections, answered immediately.
- Lists and frameworks are named and numbered.
- Sentence fragments used for emphasis: "That's the game."

TONE: Confident without arrogance. Direct without coldness. Conviction without hype. Never say 'amazing', 'incredible', 'game-changing'. Let the numbers do the talking.

---

### LANGUAGE PATTERNS HORMOZI USES
- "The math on this is..." — before quantifying a concept
- "Most people [wrong belief]. Here's why that's costing them." — before a reframe
- "There are only [X] ways to [outcome]." — framework setup
- "If you do nothing else from this video, do this." — highest-value moment signal
- "The reason this works is..." — mechanism explanation
- "So here's the playbook." — before a framework or numbered system
- "Let's make this concrete." — before a specific example

---

### WHAT TO NEVER WRITE
- Warm-ups, greetings, or context before the first claim
- Vague encouragement without a mechanism ("you've got this", "believe in yourself")
- Hype: "insane", "incredible", "absolutely crushing it"
- Hedging: "this might work for some people", "results may vary"
- Any sentence that could be removed without losing a concrete idea
`.trim();

const HORMOZI_INTRO_GUIDE = `
## ALEX HORMOZI — INTRO GUIDE
### Lead with a bold claim or a number that shouldn't be possible. Then give the mechanism.

---

### INTRO STRUCTURE

BEAT 1 — THE CLAIM: Open with a result or belief that challenges what the viewer assumes is possible. Should be specific and slightly outrageous. No warmup.
Example: "Most business owners are leaving 60% of their revenue on the table. Not because they need more customers. Because they're solving the wrong problem."

BEAT 2 — THE CREDENTIAL: One sentence that earns the right to make that claim. A specific number.
Example: "We've helped over 4,000 businesses fix this and the pattern is always the same."

BEAT 3 — THE PROMISE: What the viewer will walk away with. Specific deliverable, not a topic.
Example: "In this video I'm going to give you the exact framework we use — so you can fix this in the next 30 days."

BEAT 4 — THE BRIDGE: One line that points into the content.
Example: "And it starts with understanding why most offers fail before the customer even says no."

---

### HORMOZI INTRO RULES
- First sentence contains a number or a bold contrarian claim
- No greeting, no context, no setup
- Credential beat uses a documented figure — never invent
- Promise beat names a specific deliverable the viewer will receive
- 40–70 words total for the intro
`.trim();

const HORMOZI_SCRIPT_GUIDE = `
## ALEX HORMOZI — SCRIPT GUIDE
### Give, give, give. Dense value loops. Named frameworks. Math everywhere.

---

### THE MASTER PRINCIPLE
Volume of value delivered before any ask. The viewer should feel they received more than they paid (in time) before you ever point to an offer. Every section should be denser and more useful than the last.

---

### BODY STRUCTURE

VALUE LOOP (per point):
1. CLAIM: State the specific insight or recommendation. Bold and direct.
2. MECHANISM: Explain WHY it works. The math, the psychology, the cause-effect.
3. EXAMPLE: A specific, concrete case with numbers. Real scenario.
4. APPLICATION: Tell the viewer exactly what to do. The playbook.

FRAMEWORK NAMING: Every system, process, or concept gets a memorable name. "The Value Equation", "The Offer Stack", "The 4-Part Close". Named concepts are retained and shared.

ASCENDING DENSITY: Each section should be more actionable and more counterintuitive than the previous one. Never lead with the best insight.

---

### HORMOZI REHOOKS
One sentence maximum. Uses stakes or a counterintuitive setup.
Examples:
- "But that's the easy part. What I'm about to show you is where most people quit — and it's the only thing that actually matters."
- "Now that you have the foundation — here's the part nobody teaches."
- "Most people stop here. That's the mistake."

---

### OUTRO
1. Compress the key insight into one sentence
2. Frame the next problem: "But knowing this without [X] is like having a map with no starting point."
3. One CTA — the logical next resource or offer. Frame it as value, not a pitch.

---

### ABSOLUTE RULES
- Every claim needs a mechanism (why it works) or a number (proof it works)
- Named frameworks only — no unnamed processes
- One CTA maximum
- No hype language — let specificity do the persuading
`.trim();

const HORMOZI: WritingStyle = {
  id: "hormozi",
  name: "Alex Hormozi",
  tagline: "Dense value. Bold claims. The math always checks out.",
  description: "High-density, number-backed scripts. Lead with a bold contrarian claim. Give frameworks with names. Every sentence delivers a mechanism or a proof point. Ruthlessly anti-filler.",
  avatar: "AH",
  color: "#f59e0b",
  available: false, // Coming soon — guides are scaffolded, not yet verified
  contentType: "Education",
  identity: {
    name: "",
    channelUrl: "",
    credibilityStack: "",
    uniqueMethod: "",
    contraryBelief: "",
    targetPerson: "",
    contentStyle: "talking-head",
  },
  styleGuide:  HORMOZI_STYLE_GUIDE,
  introGuide:  HORMOZI_INTRO_GUIDE,
  scriptGuide: HORMOZI_SCRIPT_GUIDE,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WRITING_STYLES: WritingStyle[] = [THOMAS, BEST_OF, PRODUCT_REVIEW, HORMOZI];

export const DEFAULT_STYLE_ID = "thomas";

export function getWritingStyle(id: string): WritingStyle {
  return WRITING_STYLES.find((s) => s.id === id) ?? THOMAS;
}

// ─── Legacy aliases (kept for backwards compatibility during migration) ────────
/** @deprecated Use WritingStyle */
export type Persona = WritingStyle;
/** @deprecated Use WritingStyle */
export type PersonaIdentity = WritingStyleIdentity;
/** @deprecated Use WRITING_STYLES */
export const PERSONAS = WRITING_STYLES;
/** @deprecated Use DEFAULT_STYLE_ID */
export const DEFAULT_PERSONA_ID = DEFAULT_STYLE_ID;
/** @deprecated Use getWritingStyle */
export const getPersona = getWritingStyle;
