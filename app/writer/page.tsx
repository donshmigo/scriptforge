"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Onboarding from "@/components/Onboarding";
import EditProfileModal from "@/components/EditProfileModal";
import type { CreatorProfile, StyleProfile, PersonaProfile, WhoAmI } from "@/lib/types";
import { WRITING_STYLES, DEFAULT_STYLE_ID, getWritingStyle } from "@/lib/personas";
import { createClient } from "@/lib/supabase/client";
import { getAllPersonaProfiles, upsertPersonaProfile } from "@/lib/supabase/profiles";

type ScriptLength = "1" | "2" | "3" | "4" | "5";
type Platform = "youtube" | "reels";
type ReelType = "educational" | "myth" | "comparison" | "list" | "step-by-step" | "selling";

const REEL_TYPES: { id: ReelType; label: string; sub: string }[] = [
  { id: "educational",  label: "Educational",   sub: "Hook → insight → contrast → CTA" },
  { id: "myth",         label: "Mythbuster",     sub: "Hook → bust a belief → truth → CTA" },
  { id: "comparison",   label: "Comparison",     sub: "X vs Y → simplify → depth → CTA" },
  { id: "list",         label: "List",           sub: "Hook → 3–7 quick tips → CTA" },
  { id: "step-by-step", label: "Step-by-Step",   sub: "Hook → system → results → CTA" },
  { id: "selling",      label: "Selling",        sub: "Pain point → solution → steps → CTA" },
];

const YOUTUBE_LENGTHS: Record<ScriptLength, { label: string; sub: string }> = {
  "1": { label: "6–8 min",   sub: "~1,000 words" },
  "2": { label: "8–10 min",  sub: "~1,300 words" },
  "3": { label: "10–12 min", sub: "~1,600 words" },
  "4": { label: "12–15 min", sub: "~2,000 words" },
  "5": { label: "15–20 min", sub: "~2,500 words" },
};

const REELS_LENGTHS: Record<ScriptLength, { label: string; sub: string }> = {
  "1": { label: "20–30 sec",  sub: "~65 words" },
  "2": { label: "30–40 sec",  sub: "~90 words" },
  "3": { label: "40–50 sec",  sub: "~110 words" },
  "4": { label: "50–60 sec",  sub: "~135 words" },
  "5": { label: "60–90 sec",  sub: "~190 words" },
};

// API keys stay device-local; all profile data moves to Supabase
const LS_KEY          = "yt_api_key";
const LS_ANT_KEY      = "yt_anthropic_key";
const LS_WRITING_STYLE = "yt_persona_id";

function whoAmIToCreatorProfile(w: WhoAmI): CreatorProfile {
  return {
    path: "experienced",
    name: w.name,
    channelUrl: w.channelUrl,
    credibilityStack: w.credibilityStack,
    uniqueMethod: w.uniqueMethod,
    contraryBelief: w.contraryBelief,
    targetPerson: w.targetPerson,
    contentStyle: w.contentStyle,
    completedAt: Date.now(),
  };
}

function creatorProfileToWhoAmI(p: CreatorProfile): WhoAmI {
  return {
    name: p.name,
    channelUrl: p.channelUrl,
    credibilityStack: p.credibilityStack,
    uniqueMethod: p.uniqueMethod,
    contraryBelief: p.contraryBelief,
    targetPerson: p.targetPerson,
    contentStyle: p.contentStyle,
  };
}

function countWords(text: string): number {
  return text.replace(/#{1,6}\s+/g, "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Replaces the content of the first ## HOOK section in a Reels script.
 * Finds the text between "## HOOK\n" and the next "## " section marker.
 */
function swapHook(script: string, newHook: string): string {
  return script.replace(
    /(^##\s*HOOK\s*\n)([\s\S]*?)(\n##\s)/im,
    `$1${newHook}\n$3`
  );
}

function estimatedReadTime(words: number, wpm = 145): string {
  const totalSeconds = Math.round((words / wpm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds}s`;
}

// Template section names that should render as Reels-style chips (not YouTube bold headers)
const REELS_SECTION_NAMES = new Set([
  "HOOK", "REINFORCE HOOK", "REINFORCE", "MAIN POINT 1", "MAIN POINT 2", "MAIN POINT",
  "CONTRAST", "EXPLAIN MYTH", "CHALLENGE MYTH", "REITERATE", "EXPLAIN BELIEF",
  "SIMPLIFY", "THE LIST", "DEEPEN HOOK", "EXPLAIN CONCEPT", "THE STEPS",
  "SHOWCASE RESULTS", "SOLUTION", "CTA",
]);

function renderScript(raw: string): React.ReactNode[] {
  const lines = raw.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={key++} className="h-3" />); continue; }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold uppercase tracking-widest mt-6 mb-2" style={{ color: "var(--accent)" }}>
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      const label = trimmed.replace(/^##\s+/, "").toUpperCase();
      if (REELS_SECTION_NAMES.has(label)) {
        // Reels template section — compact pill chip
        elements.push(
          <div key={key++} className="flex items-center gap-2 mt-5 mb-1.5">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(124,92,252,0.25)" }}
            >
              {label}
            </span>
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
        );
      } else {
        // YouTube section header
        elements.push(
          <h2 key={key++} className="text-base font-bold uppercase tracking-widest mt-8 mb-3 pb-2 border-b" style={{ color: "var(--accent)", borderColor: "var(--border)" }}>
            {label}
          </h2>
        );
      }
      continue;
    }
    if (trimmed === "---") {
      elements.push(<hr key={key++} className="my-8 border-t" style={{ borderColor: "var(--border-light)" }} />);
      continue;
    }
    // Render **bold** inline text
    if (trimmed.includes("**")) {
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="leading-7 mb-1" style={{ color: "var(--foreground)" }}>
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i}>{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
      continue;
    }
    elements.push(
      <p key={key++} className="leading-7 mb-1" style={{ color: "var(--foreground)" }}>{trimmed}</p>
    );
  }
  return elements;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<Record<string, PersonaProfile>>({});
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [introGuide, setIntroGuide] = useState("");
  const [scriptGuide, setScriptGuide] = useState("");
  const [personaId, setPersonaId] = useState(DEFAULT_STYLE_ID);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // ── Variable inputs (per video) ───────────────────────────────────────────
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [reelType, setReelType] = useState<ReelType>("educational");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoIdea, setVideoIdea] = useState("");
  const [referenceInfo, setReferenceInfo] = useState("");
  const [subheadings, setSubheadings] = useState("");
  const [userIntro, setUserIntro] = useState("");
  const [scriptLength, setScriptLength] = useState<ScriptLength>("3");

  // Reference file upload
  const [refUploading, setRefUploading] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Generation
  const [script, setScript] = useState("");
  const [hookAlternatives, setHookAlternatives] = useState<string[]>([]);
  const [selectedHookIdx, setSelectedHookIdx] = useState<number>(-1); // -1 = original
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [reviseLoading, setReviseLoading] = useState(false);
  const [reviseError, setReviseError] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load persisted data from Supabase + localStorage (API keys only)
  useEffect(() => {
    const rawKey    = localStorage.getItem(LS_KEY);
    const rawAntKey = localStorage.getItem(LS_ANT_KEY);
    if (rawKey)    setApiKey(rawKey);
    if (rawAntKey) setAnthropicApiKey(rawAntKey);

    const rawPersona = localStorage.getItem(LS_WRITING_STYLE);
    const pid = rawPersona ?? DEFAULT_STYLE_ID;
    setPersonaId(pid);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setReady(true); return; }
      setUserId(user.id);
      getAllPersonaProfiles(supabase, user.id).then((profiles) => {
        setAllProfiles(profiles);
        setReady(true);
      });
    });
  }, []);

  // Derive current profile state whenever personaId or allProfiles changes
  useEffect(() => {
    const profile = allProfiles[personaId];
    const writingStyle = getWritingStyle(personaId);
    if (profile) {
      setCreatorProfile(whoAmIToCreatorProfile(profile.whoAmI));
      setStyleProfile(profile.styleProfile);
      setIntroGuide(profile.introGuide || writingStyle.introGuide);
      setScriptGuide(profile.scriptGuide || writingStyle.scriptGuide);
    } else {
      setCreatorProfile(null);
      setStyleProfile(null);
      setIntroGuide(writingStyle.introGuide);
      setScriptGuide(writingStyle.scriptGuide);
    }
  }, [personaId, allProfiles]);

  // Update local state + Supabase for the current persona
  const persistAll = useCallback(
    (profile: CreatorProfile, style: StyleProfile | null, key?: string, antKey?: string, iGuide?: string, sGuide?: string) => {
      const updatedProfile: Partial<PersonaProfile> = {};
      updatedProfile.whoAmI = creatorProfileToWhoAmI(profile);
      updatedProfile.styleProfile = style;
      if (iGuide !== undefined) updatedProfile.introGuide = iGuide;
      if (sGuide !== undefined) updatedProfile.scriptGuide = sGuide;

      // Update local state
      setCreatorProfile(profile);
      setStyleProfile(style);
      if (iGuide !== undefined) setIntroGuide(iGuide);
      if (sGuide !== undefined) setScriptGuide(sGuide);

      // Update allProfiles cache
      setAllProfiles((prev) => ({
        ...prev,
        [personaId]: {
          whoAmI: updatedProfile.whoAmI!,
          styleProfile: style,
          introGuide: iGuide ?? prev[personaId]?.introGuide ?? "",
          scriptGuide: sGuide ?? prev[personaId]?.scriptGuide ?? "",
        },
      }));

      // Save API keys locally
      if (key !== undefined) {
        setApiKey(key);
        if (key) localStorage.setItem(LS_KEY, key);
        else localStorage.removeItem(LS_KEY);
      }
      if (antKey !== undefined) {
        setAnthropicApiKey(antKey);
        if (antKey) localStorage.setItem(LS_ANT_KEY, antKey);
        else localStorage.removeItem(LS_ANT_KEY);
      }

      // Save profile data to Supabase
      if (userId) {
        const supabase = createClient();
        upsertPersonaProfile(supabase, userId, personaId, updatedProfile);
      }
    },
    [personaId, userId]
  );

  const handlePersonaChange = useCallback((pid: string) => {
    setPersonaId(pid);
    localStorage.setItem(LS_WRITING_STYLE, pid);
    // Derived state useEffect handles loading the new persona's data
  }, []);

  const handleOnboardingComplete = useCallback(
    (profile: CreatorProfile, style: StyleProfile | null, styleId?: string) => {
      const targetPersonaId = styleId ?? personaId;
      const writingStyle = getWritingStyle(targetPersonaId);
      const whoAmI = creatorProfileToWhoAmI(profile);
      const newPersonaProfile: PersonaProfile = {
        whoAmI,
        styleProfile: style,
        introGuide: writingStyle.introGuide,
        scriptGuide: writingStyle.scriptGuide,
      };

      // Update persona selection
      setPersonaId(targetPersonaId);
      localStorage.setItem(LS_WRITING_STYLE, targetPersonaId);

      // Update allProfiles cache
      setAllProfiles((prev) => ({ ...prev, [targetPersonaId]: newPersonaProfile }));

      // Save to Supabase
      if (userId) {
        const supabase = createClient();
        upsertPersonaProfile(supabase, userId, targetPersonaId, newPersonaProfile);
      }
    },
    [personaId, userId]
  );

  // Upload reference file for per-video use
  const handleRefFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setRefUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      const texts: string[] = data.scripts.map((s: { text: string }) => s.text);
      setReferenceInfo((prev) => (prev ? prev + "\n\n---\n\n" : "") + texts.join("\n\n---\n\n"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "File upload failed.");
    } finally {
      setRefUploading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    // API keys are optional on the client — server uses env vars as fallback
    if (!videoTitle.trim()) { setError("Please enter a video title."); return; }
    if (!creatorProfile) { setError("Creator profile not found. Please complete onboarding."); return; }

    setLoading(true);
    setError("");
    setScript("");
    setHookAlternatives([]);
    setSelectedHookIdx(-1);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          reelType: platform === "reels" ? reelType : undefined,
          videoTitle,
          videoIdea,
          userIntro,
          referenceInfo,
          subheadings,
          scriptLength,
          styleAnalysis: styleProfile?.analysis ?? "",
          scriptSamples: (styleProfile?.scripts ?? [])
            .filter((s) => s.sample)
            .slice(0, 3)
            .map((s) => ({ name: s.name, sample: s.sample })),
          creatorProfile,
          introGuide,
          scriptGuide,
          personaId,
          apiKey,
          anthropicApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setScript(data.script);
      if (data.hookAlternatives?.length) {
        setHookAlternatives(data.hookAlternatives);
        setSelectedHookIdx(-1);
      }
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [apiKey, anthropicApiKey, platform, reelType, videoTitle, videoIdea, userIntro, referenceInfo, subheadings, scriptLength, styleProfile, creatorProfile, introGuide, scriptGuide, personaId]);

  const handleRevise = useCallback(async () => {
    if (!feedbackMessage.trim()) return;
    if (!script) return;

    setReviseLoading(true);
    setReviseError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          videoTitle,
          scriptLength,
          styleAnalysis: styleProfile?.analysis ?? "",
          scriptSamples: [],
          creatorProfile,
          personaId,
          apiKey,
          anthropicApiKey,
          currentScript: script,
          feedbackMessage: feedbackMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revision failed.");
      setScript(data.script);
      setFeedbackMessage("");
      setHookAlternatives([]);
      setSelectedHookIdx(-1);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setReviseError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setReviseLoading(false);
    }
  }, [feedbackMessage, script, platform, videoTitle, scriptLength, styleProfile, creatorProfile, personaId, apiKey, anthropicApiKey]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [script]);

  const handleDownload = useCallback(() => {
    const safeTitle = videoTitle.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_") || "script";
    const platformLabel = platform === "reels" ? "Reel" : "YouTube";
    const filename = `${safeTitle}_${platformLabel}.html`;
    const wpm = platform === "reels" ? 150 : 145;
    const wc = countWords(script);
    const speakTime = estimatedReadTime(wc, wpm);
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Convert script markdown to HTML
    const bodyHtml = script.split("\n").map((line) => {
      const t = line.trim();
      if (!t) return `<div class="spacer"></div>`;
      if (t.startsWith("## ")) {
        const label = t.replace(/^##\s+/, "").toUpperCase();
        if (REELS_SECTION_NAMES.has(label)) {
          return `<div class="section-chip"><span class="chip">${label}</span></div>`;
        }
        return `<h2>${label}</h2>`;
      }
      if (t.startsWith("### ")) return `<h3>${t.replace(/^###\s+/, "")}</h3>`;
      if (t === "---") return `<hr>`;
      // inline bold
      const html = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      return `<p>${html}</p>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${videoTitle || "Script"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8f8f8;
    color: #111;
    padding: 48px 24px;
    line-height: 1.75;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    padding: 52px 60px;
    box-shadow: 0 4px 40px rgba(0,0,0,0.08);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }
  .platform-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 6px;
    background: #ede9fe;
    color: #6d28d9;
  }
  .meta-info {
    font-size: 12px;
    color: #888;
  }
  .meta-info span { margin-right: 14px; }
  .meta-info strong { color: #444; font-weight: 600; }
  h1 {
    font-size: 26px;
    font-weight: 700;
    color: #0f0f0f;
    margin-bottom: 8px;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .divider {
    height: 1px;
    background: #ebebeb;
    margin: 28px 0 32px;
  }
  p {
    font-size: 15.5px;
    color: #1a1a1a;
    margin-bottom: 6px;
    line-height: 1.8;
  }
  strong { font-weight: 600; }
  h2 {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6d28d9;
    margin: 36px 0 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebebeb;
  }
  h3 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6d28d9;
    margin: 28px 0 10px;
  }
  .section-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 22px 0 8px;
  }
  .section-chip::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ebebeb;
  }
  .chip {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 9px;
    border-radius: 5px;
    background: #ede9fe;
    color: #6d28d9;
    border: 1px solid #ddd6fe;
    white-space: nowrap;
  }
  hr {
    border: none;
    border-top: 1px solid #ebebeb;
    margin: 32px 0;
  }
  .spacer { height: 4px; }
  .footer {
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid #ebebeb;
    font-size: 11px;
    color: #aaa;
    text-align: center;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .page { box-shadow: none; padding: 40px; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="meta">
    <span class="platform-badge">${platformLabel}</span>
    <div class="meta-info">
      <span><strong>${wc.toLocaleString()}</strong> words</span>
      <span>~<strong>${speakTime}</strong> speak time</span>
      <span>${date}</span>
    </div>
  </div>
  <h1>${videoTitle || "Untitled Script"}</h1>
  <div class="divider"></div>
  <div class="content">
${bodyHtml}
  </div>
  <div class="footer">Generated with Script Writer · ${platformLabel} · ${date}</div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [script, videoTitle, platform]);

  const wordCount = script ? countWords(script) : 0;

  if (!ready) return null;
  // Show onboarding when user has no profiles at all (new sign-up)
  if (Object.keys(allProfiles).length === 0) {
    return (
      <Onboarding
        userId={userId ?? ""}
        personaId={personaId}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  const fixedGuideCount = [introGuide, scriptGuide].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {showEditProfile && (
        <EditProfileModal
          profile={creatorProfile ?? {
            path: "experienced", name: "", channelUrl: "", credibilityStack: "",
            uniqueMethod: "", contraryBelief: "", targetPerson: "", contentStyle: "talking-head",
            completedAt: Date.now(),
          }}
          styleProfile={styleProfile}
          apiKey={apiKey}
          anthropicApiKey={anthropicApiKey}
          introGuide={introGuide}
          scriptGuide={scriptGuide}
          personaId={personaId}
          userId={userId ?? ""}
          onSave={(p, s, k, antK, iG, sG) => { persistAll(p, s, k, antK, iG, sG); setShowEditProfile(false); }}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {/* Header */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{ borderColor: "var(--border)", background: "rgba(15,15,19,0.92)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--accent)" }}>▶</div>
            <div>
              <h1 className="text-lg font-bold leading-none group-hover:opacity-90" style={{ color: "var(--foreground)" }}>ScriptForge</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>YouTube Script Generator</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {script && (
              <button
                onClick={() => {
                  setScript("");
                  setVideoTitle("");
                  setVideoIdea("");
                  setUserIntro("");
                  setReferenceInfo("");
                  setSubheadings("");
                  setHookAlternatives([]);
                  setSelectedHookIdx(-1);
                  setFeedbackMessage("");
                  setError("");
                  setReviseError("");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                title="Clear and start a new script"
              >
                <span>↺</span> New Script
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: styleProfile ? "var(--green)" : "var(--accent)" }} />
              {creatorProfile?.name || "Creator"}
              {styleProfile && <span style={{ color: "var(--border-light)" }}>· {styleProfile.scripts.length} scripts</span>}
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-8">
        {/* LEFT: Output */}
        <div className="order-2 xl:order-1">
          {!script && !loading && (
            <div className="rounded-2xl border flex flex-col items-center justify-center text-center py-24 px-8 sticky top-24" style={{ borderColor: "var(--border)", background: "var(--surface)", minHeight: 500 }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5" style={{ background: "var(--accent-glow)", border: "1px solid var(--border-light)" }}>✍️</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Your script will appear here</h2>
              <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                Fill in your video details and hit Generate. Every script is written from your identity, positioning, and voice.
              </p>
              {!styleProfile && (
                <div className="mt-6 px-4 py-3 rounded-xl text-xs leading-5 max-w-sm text-left" style={{ background: "rgba(124,92,252,0.08)", color: "var(--accent)", border: "1px solid rgba(124,92,252,0.2)" }}>
                  <strong>Tip:</strong> Add your scripts in Edit Profile → Style to unlock authentic voice matching.
                </div>
              )}
            </div>
          )}
          {loading && (
            <div className="rounded-2xl border flex flex-col items-center justify-center text-center py-24 px-8 sticky top-24" style={{ borderColor: "var(--border)", background: "var(--surface)", minHeight: 500 }}>
              <div className="flex gap-1.5 mb-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Writing in your voice…</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Applying your identity, positioning, and style — 20–40 seconds</p>
            </div>
          )}
          {script && (
            <div ref={outputRef} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{platform === "reels" ? "Reel Script" : "Generated Script"}</span>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
                    <span><span className="font-medium" style={{ color: "var(--foreground)" }}>{wordCount.toLocaleString()}</span> words</span>
                    <span>·</span>
                    <span>~<span className="font-medium" style={{ color: "var(--foreground)" }}>{estimatedReadTime(wordCount, platform === "reels" ? 150 : 145)}</span> speak time</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    title="Download as .txt"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border-light)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.5 1v7M3.5 5.5l3 3 3-3M2 10h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: copied ? "var(--accent-glow)" : "var(--surface)", color: copied ? "var(--accent)" : "var(--muted)", border: "1px solid var(--border-light)" }}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Hook Selector — Reels only */}
              {platform === "reels" && hookAlternatives.length > 0 && (
                <div className="px-6 py-3 border-b flex flex-col gap-2" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                      style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(124,92,252,0.25)" }}
                    >
                      HOOK
                    </span>
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Pick the best opening hook</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {/* Original hook option */}
                    {[{ label: "Original (generated)", hook: null }, ...hookAlternatives.map((h, i) => ({ label: `Option ${i + 1}`, hook: h }))].map(({ label, hook }, idx) => {
                      const isSelected = (hook === null && selectedHookIdx === -1) || selectedHookIdx === idx - 1;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (hook === null) {
                              setSelectedHookIdx(-1);
                            } else {
                              setSelectedHookIdx(idx - 1);
                              setScript((prev) => swapHook(prev, hook));
                            }
                          }}
                          className="text-left rounded-lg px-3 py-2 transition-all"
                          style={{
                            background: isSelected ? "var(--accent-glow)" : "var(--surface)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold mt-0.5 flex-shrink-0" style={{ color: isSelected ? "var(--accent)" : "var(--muted)" }}>{label}</span>
                            {hook && <span className="text-xs leading-5" style={{ color: "var(--foreground)" }}>{hook}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
                <div className="text-sm">{renderScript(script)}</div>

                {/* Feedback / Revision */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Request a revision</p>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => { setFeedbackMessage(e.target.value); setReviseError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRevise(); }}
                    placeholder={`e.g. "Change the CTA to mention my free guide instead" or "The intro feels too long — tighten it"`}
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", outline: "none" }}
                  />
                  {reviseError && (
                    <p className="text-xs mt-1.5" style={{ color: "var(--red)" }}>{reviseError}</p>
                  )}
                  <button
                    onClick={handleRevise}
                    disabled={reviseLoading || !feedbackMessage.trim()}
                    className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                  >
                    {reviseLoading
                      ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-accent/30 border-t-current animate-spin inline-block" />Revising…</>
                      : <><span>↺</span> Revise Script</>
                    }
                  </button>
                  <p className="text-center text-xs mt-1.5" style={{ color: "var(--muted)" }}>⌘↵ to revise</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Inputs */}
        <div className="order-1 xl:order-2 flex flex-col gap-5">

          {/* ── WRITING STYLE SELECTOR ───────────────────────────────────── */}
          <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Writing Style</p>
            <div className="grid grid-cols-2 gap-2.5">
              {WRITING_STYLES.map((style) => {
                const active = personaId === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => style.available && handlePersonaChange(style.id)}
                    disabled={!style.available}
                    className="relative flex flex-col gap-2 rounded-xl p-3.5 text-left transition-all"
                    style={{
                      background: active ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      opacity: style.available ? 1 : 0.45,
                      cursor: style.available ? "pointer" : "not-allowed",
                    }}
                  >
                    {!style.available && (
                      <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "9px" }}>
                        Soon
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: active ? style.color : `${style.color}22`, color: active ? "#fff" : style.color }}
                      >
                        {style.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-none truncate" style={{ color: "var(--foreground)" }}>
                          {style.name}
                        </p>
                        {active ? (
                          <p className="text-xs mt-0.5 leading-3" style={{ color: "var(--accent)", fontSize: "10px" }}>Active</p>
                        ) : (
                          <p className="text-xs mt-0.5 leading-3" style={{ color: "var(--muted)", fontSize: "10px" }}>{style.contentType}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs leading-4" style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {style.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FIXED INPUTS status bar ───────────────────────────────────── */}
          <div className="rounded-2xl border px-5 py-4 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Fixed Inputs</p>
              <button onClick={() => setShowEditProfile(true)} className="text-xs" style={{ color: "var(--accent)" }}>
                Edit →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {[
                {
                  label: "My Style",
                  value: styleProfile ? `${styleProfile.scripts.length} scripts analyzed` : "Not configured",
                  ok: !!styleProfile,
                },
                {
                  label: "Who Am I",
                  value: creatorProfile?.name || "Not configured",
                  ok: !!creatorProfile?.name,
                },
                {
                  label: "Intro Guide",
                  value: introGuide ? `${countWords(introGuide).toLocaleString()} words` : "Not uploaded",
                  ok: !!introGuide,
                },
                {
                  label: "Script Guide",
                  value: scriptGuide ? `${countWords(scriptGuide).toLocaleString()} words` : "Not uploaded",
                  ok: !!scriptGuide,
                },
              ].map(({ label, value, ok }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ok ? "var(--green)" : "var(--border-light)" }} />
                  <span className="text-xs w-20 flex-shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
                  <span className="text-xs leading-5 truncate" style={{ color: ok ? "var(--foreground)" : "var(--border-light)" }}>
                    {value}
                  </span>
                </div>
              ))}
              {fixedGuideCount < 2 && (
                <p className="text-xs mt-1 leading-4" style={{ color: "var(--muted)" }}>
                  Add your intro & script writing guides in <button onClick={() => setShowEditProfile(true)} className="underline" style={{ color: "var(--accent)" }}>Edit Profile</button> for better results.
                </p>
              )}
            </div>
          </div>

          {/* ── VARIABLE INPUTS ───────────────────────────────────────────── */}
          <div className="rounded-2xl border p-5 flex flex-col gap-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>

            {/* Platform toggle */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Platform</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "youtube" as Platform, icon: "▶", label: "YouTube",            sub: "Long-form scripts" },
                  { id: "reels"   as Platform, icon: "⬜", label: "Instagram · TikTok", sub: "Reels & short-form"  },
                ] as const).map(({ id, icon, label, sub }) => {
                  const active = platform === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setPlatform(id)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all"
                      style={{
                        background: active ? "var(--accent-glow)" : "var(--surface-2)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <div>
                        <p className="text-xs font-semibold leading-none" style={{ color: active ? "var(--accent)" : "var(--foreground)" }}>{label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)", fontSize: "10px" }}>{sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reel Type selector — only for Instagram/TikTok */}
            {platform === "reels" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Type of Video</label>
                <div className="relative">
                  <select
                    value={reelType}
                    onChange={(e) => setReelType(e.target.value as ReelType)}
                    className="w-full appearance-none rounded-lg px-3 py-2.5 pr-8 text-sm outline-none cursor-pointer"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {REEL_TYPES.map(({ id, label, sub }) => (
                      <option key={id} value={id}>{label} — {sub}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }}>▾</span>
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {REEL_TYPES.find(t => t.id === reelType)?.sub}
                </p>
              </div>
            )}

            {/* 1. Video Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Video Title <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. How I Built a SaaS in 7 Days (From Zero)"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* 2. Video Idea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Video Idea
                <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px" }}>optional</span>
              </label>
              <textarea
                value={videoIdea}
                onChange={(e) => setVideoIdea(e.target.value)}
                placeholder={"Describe the concept, angle, or what you want covered.\n\ne.g. I want to cover the 3 biggest mistakes beginners make when posting Reels — focus on algorithm timing, wrong hooks, and ignoring audio trends."}
                rows={4}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 90 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* 3. Reference Information */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Reference Information
                  <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px" }}>optional</span>
                </label>
                <button
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  disabled={refUploading}
                  className="text-xs px-2.5 py-1 rounded-lg disabled:opacity-50"
                  style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {refUploading ? "Uploading…" : "Upload file"}
                </button>
                <input
                  ref={refFileInputRef}
                  type="file"
                  accept=".docx,.txt,.md"
                  multiple
                  className="hidden"
                  onChange={(e) => handleRefFileUpload(e.target.files)}
                />
              </div>
              <textarea
                value={referenceInfo}
                onChange={(e) => setReferenceInfo(e.target.value)}
                placeholder={"Paste articles, stats, product specs, research, talking points — anything the script should pull from.\n\nWhen provided, the AI primarily draws facts and examples from this material."}
                rows={5}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 100 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              {referenceInfo && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {countWords(referenceInfo).toLocaleString()} words · AI will draw facts primarily from this
                </p>
              )}
            </div>

            {/* 4. Subheadings / Outline — YouTube only */}
            {platform === "youtube" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Subheadings / Outline
                  <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px" }}>optional</span>
                </label>
                <textarea
                  value={subheadings}
                  onChange={(e) => setSubheadings(e.target.value)}
                  placeholder={"List the sections or talking points you want covered.\n\ne.g.\n- Why most people post at the wrong time\n- The 3 hook formats that actually convert\n- How audio trends change the game"}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 90 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            )}

            {/* 5. Opening hook / Introduction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                {platform === "reels" ? "Opening Hook" : "Your Introduction"}
                <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px" }}>optional</span>
              </label>
              <textarea
                value={userIntro}
                onChange={(e) => setUserIntro(e.target.value)}
                placeholder={platform === "reels"
                  ? "Write your opening hook word-for-word. The AI uses it exactly as written and builds the reel around it."
                  : "Write your intro word-for-word. The AI uses it exactly as written, then builds the rest of the script to match its angle, energy, and promise."}
                rows={platform === "reels" ? 2 : 4}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: platform === "reels" ? 60 : 90 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* 6. Script / Reel Length */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                {platform === "reels" ? "Reel Length" : "Script Length"}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["1", "2", "3", "4", "5"] as ScriptLength[]).map((len) => {
                  const info = platform === "reels" ? REELS_LENGTHS : YOUTUBE_LENGTHS;
                  const active = scriptLength === len;
                  return (
                    <button
                      key={len}
                      onClick={() => setScriptLength(len)}
                      className="rounded-lg px-1.5 py-2.5 text-xs font-medium transition-all flex flex-col items-center gap-0.5"
                      style={{ background: active ? "var(--accent-glow)" : "var(--surface-2)", color: active ? "var(--accent)" : "var(--muted)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
                    >
                      <span className="font-semibold" style={{ fontSize: "10px" }}>{info[len].label}</span>
                      <span style={{ fontSize: "9px", opacity: 0.7 }}>{info[len].sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "#fff", boxShadow: loading ? "none" : "0 0 28px var(--accent-glow)" }}
          >
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />{platform === "reels" ? "Writing your reel…" : "Writing your script…"}</>
            ) : (
              <><span>✦</span> {platform === "reels" ? "Generate Reel Script" : "Generate Script"}</>
            )}
          </button>

          {script && (
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              Done —{" "}
              <button onClick={handleCopy} className="underline" style={{ color: "var(--accent)" }}>copy to clipboard</button>
              {" "}or scroll left to read
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
