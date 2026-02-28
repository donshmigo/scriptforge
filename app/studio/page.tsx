"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Onboarding from "@/components/Onboarding";
import EditProfileModal from "@/components/EditProfileModal";
import type { CreatorProfile, StyleProfile } from "@/lib/types";
import { THOMAS_INTRO_GUIDE, THOMAS_SCRIPT_GUIDE } from "@/lib/thomas-guides";
import { PERSONAS, DEFAULT_PERSONA_ID, getPersona } from "@/lib/personas";

type ScriptLength = "short" | "medium" | "long";
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

const YOUTUBE_LENGTHS = {
  short:  { label: "Short",  sub: "5–7 min" },
  medium: { label: "Medium", sub: "10–15 min" },
  long:   { label: "Long",   sub: "20+ min" },
} as const;

const REELS_LENGTHS = {
  short:  { label: "Short",  sub: "15–30 sec" },
  medium: { label: "Medium", sub: "45–60 sec" },
  long:   { label: "Long",   sub: "90–120 sec" },
} as const;

const LS_PROFILE      = "yt_creator_profile";
const LS_STYLE        = "yt_style_profile";
const LS_INTRO_GUIDE  = "yt_intro_guide";
const LS_SCRIPT_GUIDE = "yt_script_guide";
const LS_PERSONA      = "yt_persona_id";

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
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [introGuide, setIntroGuide] = useState("");
  const [scriptGuide, setScriptGuide] = useState("");
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // ── Variable inputs (per video) ───────────────────────────────────────────
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [reelType, setReelType] = useState<ReelType>("educational");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoIdea, setVideoIdea] = useState("");
  const [referenceInfo, setReferenceInfo] = useState("");
  const [subheadings, setSubheadings] = useState("");
  const [userIntro, setUserIntro] = useState("");
  const [scriptLength, setScriptLength] = useState<ScriptLength>("medium");

  // Reference file upload
  const [refUploading, setRefUploading] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Generation
  const [script, setScript] = useState("");
  const [hookAlternatives, setHookAlternatives] = useState<string[]>([]);
  const [selectedHookIdx, setSelectedHookIdx] = useState<number>(-1); // -1 = original
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load persisted data
  useEffect(() => {
    const rawProfile = localStorage.getItem(LS_PROFILE);
    const rawStyle   = localStorage.getItem(LS_STYLE);
    const rawIntro   = localStorage.getItem(LS_INTRO_GUIDE);
    const rawScript  = localStorage.getItem(LS_SCRIPT_GUIDE);
    if (rawProfile) { try { setCreatorProfile(JSON.parse(rawProfile)); } catch { /* ignore */ } }
    if (rawStyle)   { try { setStyleProfile(JSON.parse(rawStyle)); }   catch { /* ignore */ } }
    // Seed with Thomas's guides as defaults if user hasn't uploaded custom ones
    const rawPersona = localStorage.getItem(LS_PERSONA);
    const pid = rawPersona ?? DEFAULT_PERSONA_ID;
    setPersonaId(pid);
    const persona = getPersona(pid);
    if (rawIntro)   setIntroGuide(rawIntro);
    else            setIntroGuide(persona.introGuide);
    if (rawScript)  setScriptGuide(rawScript);
    else            setScriptGuide(persona.scriptGuide);
    setReady(true);
  }, []);

  const persistAll = useCallback(
    (profile: CreatorProfile, style: StyleProfile | null, iGuide?: string, sGuide?: string) => {
      setCreatorProfile(profile);
      setStyleProfile(style);
      localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
      if (style) localStorage.setItem(LS_STYLE, JSON.stringify(style));
      else localStorage.removeItem(LS_STYLE);
      if (iGuide !== undefined) {
        setIntroGuide(iGuide);
        if (iGuide) localStorage.setItem(LS_INTRO_GUIDE, iGuide);
        else localStorage.removeItem(LS_INTRO_GUIDE);
      }
      if (sGuide !== undefined) {
        setScriptGuide(sGuide);
        if (sGuide) localStorage.setItem(LS_SCRIPT_GUIDE, sGuide);
        else localStorage.removeItem(LS_SCRIPT_GUIDE);
      }
    },
    []
  );

  const handlePersonaChange = useCallback((pid: string) => {
    const persona = getPersona(pid);
    setPersonaId(pid);
    localStorage.setItem(LS_PERSONA, pid);
    // Only switch guides if user hasn't uploaded custom ones
    const hasCustomIntro  = !!localStorage.getItem(LS_INTRO_GUIDE);
    const hasCustomScript = !!localStorage.getItem(LS_SCRIPT_GUIDE);
    if (!hasCustomIntro)  setIntroGuide(persona.introGuide);
    if (!hasCustomScript) setScriptGuide(persona.scriptGuide);
  }, []);

  const handleOnboardingComplete = useCallback(
    (profile: CreatorProfile, style: StyleProfile | null) => {
      persistAll(profile, style);
    },
    [persistAll]
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
  }, [platform, reelType, videoTitle, videoIdea, userIntro, referenceInfo, subheadings, scriptLength, styleProfile, creatorProfile, introGuide, scriptGuide, personaId]);

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
    const words = countWords(script);
    const speakTime = estimatedReadTime(words, wpm);
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Convert script markdown → HTML
    const scriptHtml = script
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t) return `<div class="spacer"></div>`;
        // Reels section chip (## KNOWN_SECTION)
        const h2match = t.match(/^##\s+(.+)$/);
        if (h2match) {
          const label = h2match[1].toUpperCase();
          if (REELS_SECTION_NAMES.has(label)) {
            return `<div class="section-chip"><span class="chip">${label}</span><span class="chip-rule"></span></div>`;
          }
          return `<h2>${label}</h2>`;
        }
        if (t.startsWith("### ")) return `<h3>${t.replace(/^###\s+/, "")}</h3>`;
        if (t === "---") return `<hr/>`;
        // Inline bold
        const html = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        return `<p>${html}</p>`;
      })
      .join("\n");

    const reelTypeLabel = platform === "reels"
      ? (REEL_TYPES.find(r => r.id === reelType)?.label ?? "Reel")
      : null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${videoTitle || "Script"}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #f6f5f3;
    color: #1a1a1a;
    padding: 48px 24px 80px;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  /* ── Header ── */
  .doc-header {
    padding: 36px 48px 28px;
    border-bottom: 1px solid #ebebeb;
    background: #fafaf9;
  }
  .doc-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .badge-platform {
    background: #ede9fe;
    color: #6d28d9;
    border: 1px solid #ddd6fe;
  }
  .badge-type {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }
  .badge-date {
    font-size: 11px;
    color: #9ca3af;
    font-weight: 500;
    margin-left: auto;
  }
  .doc-title {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
    color: #111827;
    margin-bottom: 14px;
  }
  .doc-stats {
    display: flex;
    gap: 20px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }
  .stat-label {
    font-size: 11px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  /* ── Script body ── */
  .doc-body {
    padding: 40px 48px 56px;
  }
  p {
    font-size: 16px;
    line-height: 1.85;
    color: #1f2937;
    margin-bottom: 6px;
  }
  h2 {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6d28d9;
    margin-top: 36px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid #ede9fe;
  }
  h3 {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6d28d9;
    margin-top: 28px;
    margin-bottom: 8px;
  }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 32px 0;
  }
  .spacer { height: 10px; }
  strong { font-weight: 700; color: #111827; }
  /* ── Reels section chips ── */
  .section-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    margin-bottom: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: #ede9fe;
    color: #6d28d9;
    border: 1px solid #ddd6fe;
    white-space: nowrap;
  }
  .chip-rule {
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }
  /* ── Footer ── */
  .doc-footer {
    padding: 16px 48px;
    border-top: 1px solid #ebebeb;
    background: #fafaf9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .doc-footer-text {
    font-size: 11px;
    color: #d1d5db;
    font-weight: 500;
  }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div class="doc-meta">
      <span class="badge badge-platform">${platform === "reels" ? "Instagram · TikTok" : "YouTube"}</span>
      ${reelTypeLabel ? `<span class="badge badge-type">${reelTypeLabel}</span>` : ""}
      <span class="badge-date">${dateStr}</span>
    </div>
    <div class="doc-title">${videoTitle || "Untitled Script"}</div>
    <div class="doc-stats">
      <div class="stat"><span class="stat-value">${words.toLocaleString()}</span><span class="stat-label">Words</span></div>
      <div class="stat"><span class="stat-value">~${speakTime}</span><span class="stat-label">Speak time</span></div>
      <div class="stat"><span class="stat-value">${wpm} WPM</span><span class="stat-label">Pace</span></div>
    </div>
  </div>
  <div class="doc-body">
    ${scriptHtml}
  </div>
  <div class="doc-footer">
    <span class="doc-footer-text">Generated with YouTube Script Gen</span>
    <span class="doc-footer-text">${creatorProfile?.name ?? ""}</span>
  </div>
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
  }, [script, videoTitle, platform, reelType, creatorProfile]);

  const wordCount = script ? countWords(script) : 0;

  if (!ready) return null;
  if (!creatorProfile) return <Onboarding onComplete={handleOnboardingComplete} />;

  const fixedGuideCount = [introGuide, scriptGuide].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {showEditProfile && (
        <EditProfileModal
          profile={creatorProfile}
          styleProfile={styleProfile}
          introGuide={introGuide}
          scriptGuide={scriptGuide}
          personaId={personaId}
          onSave={(p, s, iG, sG) => { persistAll(p, s, iG, sG); setShowEditProfile(false); }}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {/* Header */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{ borderColor: "var(--border)", background: "rgba(15,15,19,0.92)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--accent)" }}>▶</div>
            <div>
              <h1 className="text-lg font-bold leading-none" style={{ color: "var(--foreground)" }}>ScriptForge</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>YouTube Script Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: styleProfile ? "var(--green)" : "var(--accent)" }} />
              {creatorProfile.name || "Creator"}
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
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Inputs */}
        <div className="order-1 xl:order-2 flex flex-col gap-5">

          {/* ── PERSONA SELECTOR ─────────────────────────────────────────── */}
          <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Writing Style</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PERSONAS.map((persona) => {
                const active = personaId === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => persona.available && handlePersonaChange(persona.id)}
                    disabled={!persona.available}
                    className="relative flex flex-col gap-2 rounded-xl p-3.5 text-left transition-all"
                    style={{
                      background: active ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      opacity: persona.available ? 1 : 0.45,
                      cursor: persona.available ? "pointer" : "not-allowed",
                    }}
                  >
                    {!persona.available && (
                      <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "9px" }}>
                        Soon
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: active ? persona.color : `${persona.color}22`, color: active ? "#fff" : persona.color }}
                      >
                        {persona.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-none truncate" style={{ color: active ? "var(--foreground)" : "var(--foreground)" }}>
                          {persona.name}
                        </p>
                        {active && (
                          <p className="text-xs mt-0.5 leading-3" style={{ color: "var(--accent)", fontSize: "10px" }}>Active</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs leading-4" style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {persona.tagline}
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
                  value: creatorProfile.name || "Not configured",
                  ok: !!creatorProfile.name,
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
              <div className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as ScriptLength[]).map((len) => {
                  const info = platform === "reels" ? REELS_LENGTHS : YOUTUBE_LENGTHS;
                  const active = scriptLength === len;
                  return (
                    <button
                      key={len}
                      onClick={() => setScriptLength(len)}
                      className="rounded-lg px-3 py-2.5 text-xs font-medium transition-all flex flex-col items-center gap-0.5"
                      style={{ background: active ? "var(--accent-glow)" : "var(--surface-2)", color: active ? "var(--accent)" : "var(--muted)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
                    >
                      <span className="font-semibold">{info[len].label}</span>
                      <span style={{ fontSize: "10px", opacity: 0.8 }}>{info[len].sub}</span>
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
