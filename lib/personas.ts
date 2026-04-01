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

// ─── Custom ───────────────────────────────────────────────────────────────────
// Blank-slate style — the user defines every guide themselves.
// No pre-loaded style guide, intro guide, or script guide.
// All content comes entirely from the user's own configuration via Edit Profile.

const CUSTOM: WritingStyle = {
  id: "custom",
  name: "Custom",
  tagline: "Your rules. Your structure. Fully yours.",
  description: "A blank canvas — no pre-loaded guides. You write the style guide, intro rules, and script structure yourself. Best for creators who have a specific format they want to enforce.",
  avatar: "CU",
  color: "#FF4E50",
  available: true,
  contentType: "Custom",
  identity: {
    name: "",
    channelUrl: "",
    credibilityStack: "",
    uniqueMethod: "",
    contraryBelief: "",
    targetPerson: "",
    contentStyle: "talking-head",
  },
  styleGuide: "",
  introGuide: "",
  scriptGuide: "",
  reelsGuide: "",
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WRITING_STYLES: WritingStyle[] = [THOMAS, BEST_OF, PRODUCT_REVIEW, CUSTOM];

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
