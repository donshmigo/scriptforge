"use client";

import { useState, useRef, useCallback } from "react";
import type { CreatorProfile, StyleProfile, ContentStyle } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { upsertPersonaProfile } from "@/lib/supabase/profiles";
import { getWritingStyle } from "@/lib/personas";

interface OnboardingProps {
  userId?: string;
  personaId?: string;
  onComplete: (
    profile: CreatorProfile,
    styleProfile: StyleProfile | null,
    styleId?: string
  ) => void;
}

type Path = "youtube" | "manual" | null;

const CONTENT_STYLES: { id: ContentStyle; label: string; icon: string; desc: string }[] = [
  { id: "talking-head",         label: "Talking Head",        icon: "🎙️", desc: "Direct to camera, conversational" },
  { id: "educational-breakdown",label: "Educational",         icon: "📋", desc: "Structured sections, teach the how" },
  { id: "story-driven",         label: "Story-Driven",        icon: "📖", desc: "Personal narrative leads the value" },
  { id: "fast-lists",           label: "Fast Lists",          icon: "⚡", desc: "Dense, rapid-fire value delivery" },
];

const INPUT_STYLE = {
  background: "var(--surface-2)",
  color: "var(--foreground)",
  border: "1.5px solid var(--border)",
} as const;

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), #FF7B35)" }}
      />
    </div>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent)", fontFamily: "var(--font-syne)" }}>
      {children}
    </p>
  );
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold mb-1 leading-snug tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>
      {children}
    </h2>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-5 mb-4" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
      style={INPUT_STYLE}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,78,80,0.1)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none leading-6 transition-all"
      style={INPUT_STYLE}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,78,80,0.1)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

export default function Onboarding({ onComplete, userId = "", personaId: _defaultPersonaId = "thomas" }: OnboardingProps) {
  const [path, setPath] = useState<Path>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Shared identity fields
  const [name, setName] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [credibilityStack, setCredibilityStack] = useState("");
  const [uniqueMethod, setUniqueMethod] = useState("");
  const [contraryBelief, setContraryBelief] = useState("");
  const [targetPerson, setTargetPerson] = useState("");
  const [contentStyle, setContentStyle] = useState<ContentStyle>("talking-head");
  const [voiceSample, setVoiceSample] = useState("");

  // Profile document (Who Am I doc or voice sample)
  const [profileDoc, setProfileDoc] = useState("");
  const [profileDocName, setProfileDocName] = useState("");

  // Style profile
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleAnalysis, setStyleAnalysis] = useState("");

  // YouTube path state
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState("");

  // Document upload state
  const [docLoading, setDocLoading] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  const next = useCallback(() => { setError(""); setStep((s) => s + 1); }, []);
  const back = useCallback(() => { setError(""); setStep((s) => Math.max(0, s - 1)); }, []);

  // ── YouTube path: fetch transcripts + analyze ──────────────────────────────
  const handleYoutubeAnalyze = useCallback(async () => {
    if (!channelUrl.trim()) { setError("Please enter your YouTube channel URL."); return; }
    setError("");
    setYoutubeLoading(true);
    setYoutubeStatus("Fetching your channel…");
    setStep(2); // advance to loading screen

    try {
      // Step 1: scrape channel for video list
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim(), apiKey: "" }),
      });
      let scrapeData: any;
      try { scrapeData = await scrapeRes.json(); } catch { throw new Error("Could not reach channel — check the URL and try again."); }
      if (!scrapeRes.ok) throw new Error((scrapeData.error as string) || "Could not find this channel.");

      const videos = (scrapeData.videos ?? []) as { id: string; title: string }[];
      if (videos.length === 0) throw new Error("No videos found on this channel.");

      // Pre-fill name from channel if available
      if (scrapeData.channelName && !name) setName(scrapeData.channelName);

      setYoutubeStatus(`Found ${videos.length} videos — fetching transcripts…`);

      // Step 2: fetch transcripts
      const transcriptRes = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      let transcriptData: any;
      try { transcriptData = await transcriptRes.json(); } catch { throw new Error("Transcript request timed out — try again."); }
      if (!transcriptRes.ok) throw new Error((transcriptData.error as string) || "Could not fetch transcripts.");

      const transcripts = (transcriptData.transcripts ?? []) as { title: string; text: string }[];
      if (transcripts.length === 0) throw new Error("No transcripts available for this channel. Try uploading scripts manually.");

      setYoutubeStatus(`Analyzing ${transcripts.length} videos — building your writing profile…`);

      // Step 3: analyze channel (identity + style in one shot)
      const analyzeRes = await fetch("/api/analyze-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcripts }),
      });
      let analyzeData: any;
      try { analyzeData = await analyzeRes.json(); } catch { throw new Error("Analysis timed out — try again."); }
      if (!analyzeRes.ok) throw new Error((analyzeData.error as string) || "Analysis failed.");

      // Pre-fill identity fields from analysis
      const id = analyzeData.identity ?? {};
      if (id.name && !name)             setName(id.name);
      if (id.credibilityStack)          setCredibilityStack(id.credibilityStack);
      if (id.uniqueMethod)              setUniqueMethod(id.uniqueMethod);
      if (id.contraryBelief)            setContraryBelief(id.contraryBelief);
      if (id.targetPerson)              setTargetPerson(id.targetPerson);
      if (id.contentStyle)              setContentStyle(id.contentStyle as ContentStyle);

      // Set style profile from analysis
      const analysis = analyzeData.styleAnalysis ?? "";
      setStyleAnalysis(analysis);
      if (analysis) {
        setStyleProfile({
          scripts: transcripts.map((t) => ({
            name: t.title,
            preview: t.text.slice(0, 120),
            sample: t.text.split(/\s+/).slice(0, 500).join(" "),
            wordCount: t.text.split(/\s+/).filter(Boolean).length,
          })),
          analysis,
          analyzedAt: Date.now(),
        });
      }

      setYoutubeStatus("Done!");
      setStep(3); // advance to review
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep(1); // back to URL input
    } finally {
      setYoutubeLoading(false);
    }
  }, [channelUrl, name]);

  // ── Document upload (optional enhancement / manual path style) ─────────────
  const handleDocUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDocLoading(true);
    setError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Upload timed out — try again."); }
      if (!res.ok) throw new Error((data.error as string) || "Upload failed.");
      const scripts = data.scripts as { name: string; text: string; wordCount: number }[];
      if (!scripts?.length) throw new Error("No readable content found.");
      const fullText = scripts.map((s) => s.text).join("\n\n");
      setProfileDoc(fullText);
      setProfileDocName(scripts.map((s) => s.name).join(", "));
      // Also use as style profile if on YouTube path (supplement)
      // or as style guide if on manual path
      setStyleProfile({
        scripts: scripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.wordCount,
        })),
        analysis: styleAnalysis || fullText,
        analyzedAt: Date.now(),
        isDoc: !styleAnalysis,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setDocLoading(false);
    }
  }, [styleAnalysis]);

  // ── Complete onboarding ────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      // Build profile doc from voice sample if no doc was uploaded (manual path)
      let finalProfileDoc = profileDoc;
      if (!finalProfileDoc && voiceSample.trim()) {
        finalProfileDoc = `NAME: ${name}\nCONTENT ABOUT: ${topic}\n\nVOICE SAMPLE:\n${voiceSample}`;
      }

      const profile: CreatorProfile = {
        path: path === "youtube" ? "experienced" : "new",
        name,
        channelUrl,
        credibilityStack,
        uniqueMethod,
        contraryBelief,
        targetPerson,
        contentStyle,
        completedAt: Date.now(),
        profileDoc: finalProfileDoc,
      };

      // Use thomas framework (best guides) as default
      const framework = "thomas";
      const writingStyle = getWritingStyle(framework);

      if (userId) {
        const supabase = createClient();
        await upsertPersonaProfile(supabase, userId, framework, {
          whoAmI: {
            name,
            channelUrl,
            credibilityStack,
            uniqueMethod,
            contraryBelief,
            targetPerson,
            contentStyle,
            profileDoc: finalProfileDoc,
          },
          styleProfile,
          introGuide: writingStyle.introGuide,
          scriptGuide: writingStyle.scriptGuide,
        });
      }

      onComplete(profile, styleProfile, framework);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }, [path, name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle, profileDoc, voiceSample, styleProfile, topic, userId, onComplete]);

  // ── Step counts for progress bar ──────────────────────────────────────────
  const youtubeSteps = 5; // 0:path, 1:url, 2:loading, 3:review, 4:optional-doc
  const manualSteps  = 8; // 0:path, 1:name+topic, 2:credentials, 3:method, 4:edge, 5:audience, 6:voice, 7:optional-doc

  const totalSteps = path === "youtube" ? youtubeSteps : path === "manual" ? manualSteps : 1;
  const showProgress = step > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      style={{ background: "rgba(26,26,46,0.6)", backdropFilter: "blur(16px)" }}
    >
      <div
        className="w-full max-w-xl rounded-3xl flex flex-col animate-scale-in"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "92vh", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Progress bar */}
        {showProgress && (
          <div className="px-6 pt-5 pb-2 flex-shrink-0">
            <ProgressBar current={step} total={totalSteps} />
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">

          {/* ── STEP 0: Path Selection ── */}
          {step === 0 && (
            <div className="flex flex-col gap-6 animate-fade-in-up">
              <div className="text-center pt-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: "linear-gradient(135deg, rgba(255,78,80,0.1), rgba(255,123,53,0.1))", border: "1px solid rgba(255,78,80,0.2)" }}>✦</div>
                <p className="text-2xl font-bold mb-2 tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>Build your writing profile</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  We'll use your real content to make every script sound exactly like you.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setPath("youtube"); setStep(1); setError(""); }}
                  className="card-lift w-full rounded-2xl p-5 text-left flex items-start gap-4"
                  style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(255,78,80,0.1)", border: "1px solid rgba(255,78,80,0.2)" }}>📹</div>
                  <div>
                    <p className="text-sm font-bold mb-1 tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>I have a YouTube channel</p>
                    <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
                      We'll pull your videos and analyze your brand voice, writing style, and identity — automatically.
                    </p>
                  </div>
                  <span className="text-lg flex-shrink-0 mt-0.5 ml-auto" style={{ color: "var(--border-light)" }}>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setPath("manual"); setStep(1); setError(""); }}
                  className="card-lift w-full rounded-2xl p-5 text-left flex items-start gap-4"
                  style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.2)" }}>✏️</div>
                  <div>
                    <p className="text-sm font-bold mb-1 tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>I don't have YouTube</p>
                    <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
                      Answer a few questions about your voice, niche, and audience — we'll build your profile from scratch.
                    </p>
                  </div>
                  <span className="text-lg flex-shrink-0 mt-0.5 ml-auto" style={{ color: "var(--border-light)" }}>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ══ YOUTUBE PATH ══════════════════════════════════════════════════ */}

          {/* Y-Step 1: Channel URL */}
          {path === "youtube" && step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 1 of 4</StepLabel>
                <Question>What's your YouTube channel URL?</Question>
                <Hint>We'll fetch your recent videos and analyze them to extract your voice, style, and identity.</Hint>
              </div>
              <Input
                value={channelUrl}
                onChange={setChannelUrl}
                placeholder="https://youtube.com/@yourhandle"
              />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* Y-Step 2: Loading */}
          {path === "youtube" && step === 2 && (
            <div className="flex flex-col items-center justify-center gap-5 py-12">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(var(--accent), #FF7B35, rgba(255,78,80,0.1), var(--accent))", animation: "spinGradient 1.2s linear infinite" }} />
                <div className="absolute inset-1.5 rounded-full" style={{ background: "var(--surface)" }} />
                <div className="absolute inset-0 flex items-center justify-center text-base">✦</div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold mb-1 tracking-tight" style={{ color: "var(--foreground)", fontFamily: "var(--font-syne)" }}>{youtubeStatus || "Analyzing your channel…"}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>This takes about 30–60 seconds. Please don't close this window.</p>
              </div>
              {error && (
                <div className="w-full">
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Y-Step 3: Review extracted profile */}
          {path === "youtube" && step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <StepLabel>Step 2 of 4</StepLabel>
                <Question>Review your extracted profile</Question>
                <Hint>We pulled this from your videos. Edit anything that doesn't look right.</Hint>
              </div>

              {styleProfile && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.25)" }}>
                  <span style={{ color: "var(--green)" }}>✓</span>
                  <p className="text-xs" style={{ color: "var(--foreground)" }}>
                    <strong>Style profile built</strong> from {styleProfile.scripts.length} video{styleProfile.scripts.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Name or handle</label>
                  <Input value={name} onChange={setName} placeholder="e.g. Alex Hormozi" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Credibility Stack</label>
                  <Textarea value={credibilityStack} onChange={setCredibilityStack} placeholder="Your proof points, results, credentials, numbers…" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Unique Method / Framework</label>
                  <Textarea value={uniqueMethod} onChange={setUniqueMethod} placeholder="Your specific system or approach…" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Contrarian Belief</label>
                  <Textarea value={contraryBelief} onChange={setContraryBelief} placeholder="What most people in your space get wrong…" rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Who You're For</label>
                  <Input value={targetPerson} onChange={setTargetPerson} placeholder="The specific person this content is made for…" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Content Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_STYLES.map((cs) => {
                      const active = contentStyle === cs.id;
                      return (
                        <button key={cs.id} type="button" onClick={() => setContentStyle(cs.id)}
                          className="rounded-xl px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 transition-all"
                          style={{ background: active ? "var(--accent-glow)" : "var(--surface-2)", color: active ? "var(--accent)" : "var(--muted)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
                        >
                          <span>{cs.icon}</span>{cs.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* Y-Step 4: Optional document */}
          {path === "youtube" && step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 3 of 4 — Optional</StepLabel>
                <Question>Add anything else you want the AI to know</Question>
                <Hint>Upload a brand doc, bio, writing guide, or style reference. This supplements what we pulled from YouTube.</Hint>
              </div>

              {profileDoc ? (
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.25)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--green)" }}>✓</span>
                        <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{profileDocName}</p>
                      </div>
                      <p className="text-xs mt-0.5 ml-4" style={{ color: "var(--muted)" }}>{profileDoc.split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded</p>
                    </div>
                    <button type="button" onClick={() => { setProfileDoc(""); setProfileDocName(""); }}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >Remove</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => docFileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleDocUpload(e.dataTransfer.files); }}
                  className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-3 cursor-pointer"
                  style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
                >
                  {docLoading ? (
                    <span className="w-6 h-6 rounded-full border-2 border-current/20 border-t-current animate-spin" style={{ color: "var(--accent)" }} />
                  ) : (
                    <>
                      <span className="text-3xl">📄</span>
                      <div className="text-center">
                        <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Drop a document here</p>
                        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Brand guide, bio, writing doc · .pdf, .docx or .txt</p>
                      </div>
                      <span className="btn-press text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "0 3px 10px rgba(255,78,80,0.3)" }}>Browse files</span>
                    </>
                  )}
                </div>
              )}
              <input ref={docFileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => handleDocUpload(e.target.files)} />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* ══ MANUAL PATH ═══════════════════════════════════════════════════ */}

          {/* M-Step 1: Name + topic */}
          {path === "manual" && step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 1 of 7</StepLabel>
                <Question>Who are you and what do you create content about?</Question>
                <Hint>Start with the basics — we'll get into the details in the next few steps.</Hint>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Your name or handle</label>
                <Input value={name} onChange={setName} placeholder="e.g. Jordan Lee" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>What do you create content about?</label>
                <Textarea value={topic} onChange={setTopic} rows={3}
                  placeholder="e.g. personal finance for millennials, B2B sales coaching for SaaS founders, fitness for busy parents over 40…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Channel or website URL (optional)</label>
                <Input value={channelUrl} onChange={setChannelUrl} placeholder="https://…" />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 2: Credentials */}
          {path === "manual" && step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 2 of 7</StepLabel>
                <Question>What makes you credible on this topic?</Question>
                <Hint>Specific numbers, results, and proof points. This is what the AI uses to establish your authority — be concrete.</Hint>
              </div>
              <Textarea
                value={credibilityStack}
                onChange={setCredibilityStack}
                rows={6}
                placeholder={`Examples:
• 10 years as a CFP managing $40M+ in assets
• Helped 300+ clients pay off debt averaging $65K
• Paid off $80K of student loans in 3 years myself
• Featured in Forbes, Business Insider
• Built and sold a 7-figure business`}
              />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 3: Unique method */}
          {path === "manual" && step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 3 of 7</StepLabel>
                <Question>What's your unique approach or framework?</Question>
                <Hint>What specific system, method, or sequence do you use? What makes your approach different from generic advice in your space?</Hint>
              </div>
              <Textarea
                value={uniqueMethod}
                onChange={setUniqueMethod}
                rows={6}
                placeholder={`e.g. The 3-Phase Debt Protocol:
Phase 1 — Fix the cash flow leak (track every dollar for 30 days)
Phase 2 — Eliminate fixed cost bloat (not lattes — subscriptions, insurance, utilities)
Phase 3 — Aggressive debt stacking (highest-interest first, minimum on everything else)

This is different because most advice starts with budgeting apps. Mine starts with the psychology of avoidance.`}
              />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 4: Contrarian belief */}
          {path === "manual" && step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 4 of 7</StepLabel>
                <Question>What do most people in your space get wrong?</Question>
                <Hint>Your contrarian take — the core belief that sets your content apart from everyone else saying the same thing.</Hint>
              </div>
              <Textarea
                value={contraryBelief}
                onChange={setContraryBelief}
                rows={5}
                placeholder={`e.g. Everyone talks about cutting spending — the latte factor, stop eating out, skip the avocado toast.

That's not the problem. The average American wastes $400/month on forgotten subscriptions, over-insured cars, and inflated rent. You can't cut-coffee your way out of a structural cash problem.

The real lever is fixed costs, not discretionary spending.`}
              />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 5: Audience */}
          {path === "manual" && step === 5 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 5 of 7</StepLabel>
                <Question>Who is this content for?</Question>
                <Hint>Describe one specific person — their situation, the problem they're stuck on, and what they want to achieve.</Hint>
              </div>
              <Textarea
                value={targetPerson}
                onChange={setTargetPerson}
                rows={4}
                placeholder="e.g. Millennials earning $60–80K who feel behind financially, carry $30–50K in student debt or credit card debt, and want a clear, no-bullshit path to financial stability within 3 years."
              />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 6: Content style */}
          {path === "manual" && step === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <StepLabel>Step 6 of 7</StepLabel>
                <Question>What's your content style?</Question>
                <Hint>Pick the format that best describes how you present content to your audience.</Hint>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CONTENT_STYLES.map((cs) => {
                  const active = contentStyle === cs.id;
                  return (
                    <button key={cs.id} type="button" onClick={() => setContentStyle(cs.id)}
                      className="card-lift rounded-xl p-3.5 text-left"
                      style={{ background: active ? "rgba(255,78,80,0.06)" : "var(--surface-2)", border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`, boxShadow: active ? "0 4px 16px rgba(255,78,80,0.15)" : "none" }}
                    >
                      <p className="text-base mb-1.5">{cs.icon}</p>
                      <p className="text-xs font-bold" style={{ color: active ? "var(--accent)" : "var(--foreground)", fontFamily: "var(--font-syne)" }}>{cs.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{cs.desc}</p>
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

          {/* M-Step 7: Optional document */}
          {path === "manual" && step === 7 && (
            <div className="flex flex-col gap-4">
              <div>
                <StepLabel>Step 7 of 7 — Optional</StepLabel>
                <Question>Upload a script or style document</Question>
                <Hint>Have an existing script, brand doc, or writing guide? Upload it and the AI will use it to match your exact voice.</Hint>
              </div>

              {profileDoc ? (
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.25)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--green)" }}>✓</span>
                        <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{profileDocName}</p>
                      </div>
                      <p className="text-xs mt-0.5 ml-4" style={{ color: "var(--muted)" }}>{profileDoc.split(/\s+/).filter(Boolean).length.toLocaleString()} words</p>
                    </div>
                    <button type="button" onClick={() => { setProfileDoc(""); setProfileDocName(""); setStyleProfile(null); }}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >Remove</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => docFileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleDocUpload(e.dataTransfer.files); }}
                  className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-3 cursor-pointer"
                  style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
                >
                  {docLoading ? (
                    <span className="w-6 h-6 rounded-full border-2 border-current/20 border-t-current animate-spin" style={{ color: "var(--accent)" }} />
                  ) : (
                    <>
                      <span className="text-3xl">📂</span>
                      <div className="text-center">
                        <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Drop a file here</p>
                        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Script, brand doc, style guide · .pdf, .docx or .txt</p>
                      </div>
                      <span className="btn-press text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "0 3px 10px rgba(255,78,80,0.3)" }}>Browse files</span>
                    </>
                  )}
                </div>
              )}
              <input ref={docFileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => handleDocUpload(e.target.files)} />
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,78,80,0.07)", color: "var(--red)", border: "1px solid rgba(255,78,80,0.2)" }}>{error}</p>}
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          {/* Back button */}
          {step > 0 && !(path === "youtube" && step === 2) ? (
            <button type="button" onClick={back} className="btn-press text-sm font-medium px-4 py-2 rounded-xl"
              style={{ color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          {/* Primary action */}
          {step === 0 && <div />}

          {/* YouTube path actions */}
          {path === "youtube" && step === 1 && (
            <button type="button" onClick={handleYoutubeAnalyze}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Analyze Channel →
            </button>
          )}
          {path === "youtube" && step === 2 && <div />}
          {path === "youtube" && step === 3 && (
            <button type="button" onClick={() => { if (!name.trim()) { setError("Please enter your name or handle."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Looks good →
            </button>
          )}
          {path === "youtube" && step === 4 && (
            <button type="button" onClick={handleComplete} disabled={saving}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: saving ? "none" : "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Start Writing →"}
            </button>
          )}

          {/* Manual path actions */}
          {path === "manual" && step === 1 && (
            <button type="button" onClick={() => { if (!name.trim()) { setError("Please enter your name."); return; } if (!topic.trim()) { setError("Please describe what you create content about."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 2 && (
            <button type="button" onClick={() => { if (!credibilityStack.trim()) { setError("Please add at least one proof point."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 3 && (
            <button type="button" onClick={() => { if (!uniqueMethod.trim()) { setError("Please describe your method or approach."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 4 && (
            <button type="button" onClick={() => { if (!contraryBelief.trim()) { setError("Please share your contrarian take."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 5 && (
            <button type="button" onClick={() => { if (!targetPerson.trim()) { setError("Please describe who your content is for."); return; } next(); }}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 6 && (
            <button type="button" onClick={next}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              Next →
            </button>
          )}
          {path === "manual" && step === 7 && (
            <button type="button" onClick={handleComplete} disabled={saving}
              className="btn-press text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent), #FF7B35)", color: "#fff", boxShadow: saving ? "none" : "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}>
              {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Build My Profile →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
