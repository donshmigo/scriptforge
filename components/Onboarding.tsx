"use client";

import { useState, useRef, useCallback } from "react";
import { type SampleScript } from "@/lib/scripts";
import type { CreatorProfile, StyleProfile, ContentStyle } from "@/lib/types";
import { WRITING_STYLES, getWritingStyle, type WritingStyle } from "@/lib/personas";
import { createClient } from "@/lib/supabase/client";
import { upsertPersonaProfile } from "@/lib/supabase/profiles";

interface OnboardingProps {
  userId?: string;
  personaId?: string;
  onComplete: (
    profile: CreatorProfile,
    styleProfile: StyleProfile | null,
    styleId?: string
  ) => void;
}

type Path = "experienced" | "new" | null;

interface FormData {
  name: string;
  channelUrl: string;
  credibilityStack: string;
  uniqueMethod: string;
  contraryBelief: string;
  targetPerson: string;
  contentStyle: ContentStyle;
  // new creator extras
  topic: string;
  background: string;
  proof: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  channelUrl: "",
  credibilityStack: "",
  uniqueMethod: "",
  contraryBelief: "",
  targetPerson: "",
  contentStyle: "talking-head",
  topic: "",
  background: "",
  proof: "",
};

const CONTENT_STYLES: { id: ContentStyle; label: string; desc: string; icon: string }[] = [
  { id: "talking-head", label: "Talking Head", desc: "Direct to camera, conversational", icon: "🎙️" },
  { id: "educational-breakdown", label: "Educational Breakdown", desc: "Structured sections, teach the how", icon: "📋" },
  { id: "story-driven", label: "Story-Driven", desc: "Personal narrative leads the value", icon: "📖" },
  { id: "fast-lists", label: "Fast Lists", desc: "Dense, high-velocity resource lists", icon: "⚡" },
];

// experienced: 0=path-select, 1=name+channel, 2=api-key, 3=upload+analyze(auto), 4=review-identity, 5=done
// new:         0=path-select, 1=background, 2=pov, 3=style, 4=api-key, 5=done

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i <= current ? "var(--accent)" : "var(--border-light)",
          }}
        />
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1.5 leading-4" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}

function StyledInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none font-sans"
      style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    />
  );
}

function StyledTextarea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-sans"
      style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    />
  );
}

export default function Onboarding({ onComplete, userId = "", personaId: defaultPersonaId = "thomas" }: OnboardingProps) {
  const [path, setPath] = useState<Path>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<WritingStyle | null>(WRITING_STYLES.find(s => s.available) ?? null);
  const [isCustomSelected, setIsCustomSelected] = useState(false);

  // Channel scrape state
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapedVideos, setScrapedVideos] = useState<{ id: string; title: string }[]>([]);

  // Transcript import state
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState("");

  // Script preview modal
  const [previewScript, setPreviewScript] = useState<SampleScript | null>(null);

  const [pendingScripts, setPendingScripts] = useState<SampleScript[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    <K extends keyof FormData>(key: K, val: FormData[K]) =>
      setForm((f) => ({ ...f, [key]: val })),
    []
  );

  const next = useCallback(() => { setError(""); setStep((s) => s + 1); }, []);
  const back = useCallback(() => { setError(""); setStep((s) => Math.max(0, s - 1)); }, []);

  const selectPath = (p: Path) => {
    setPath(p);
    // Pre-fill identity from the selected persona
    if (selectedPersona?.identity) {
      const id = selectedPersona.identity;
      setForm((f) => ({
        ...f,
        name:             f.name || id.name || "",
        credibilityStack: id.credibilityStack || f.credibilityStack,
        uniqueMethod:     id.uniqueMethod     || f.uniqueMethod,
        contraryBelief:   id.contraryBelief   || f.contraryBelief,
        targetPerson:     id.targetPerson     || f.targetPerson,
        contentStyle:     (id.contentStyle as ContentStyle) || f.contentStyle,
      }));
    }
    setStep(1);
  };

  // ── Step 0 Continue ──────────────────────────────────────────────────────────
  // Pre-made style → save style ID + complete immediately (no setup required).
  // Custom → launch the experienced setup flow (channel scrape + identity + style DNA).
  const handleStep0Continue = useCallback(async () => {
    if (isCustomSelected) {
      selectPath("experienced");
      return;
    }
    if (!selectedPersona) return;

    const blankProfile: CreatorProfile = {
      path: "experienced",
      name: "",
      channelUrl: "",
      credibilityStack: "",
      uniqueMethod: "",
      contraryBelief: "",
      targetPerson: "",
      contentStyle: "talking-head",
      completedAt: Date.now(),
    };

    // Save an empty profile row to Supabase so the writer page shows content
    if (userId) {
      const writingStyle = getWritingStyle(selectedPersona.id);
      const supabase = createClient();
      await upsertPersonaProfile(supabase, userId, selectedPersona.id, {
        whoAmI: { name: "", channelUrl: "", credibilityStack: "", uniqueMethod: "", contraryBelief: "", targetPerson: "", contentStyle: "talking-head" },
        styleProfile: null,
        introGuide: writingStyle.introGuide,
        scriptGuide: writingStyle.scriptGuide,
      });
    }

    onComplete(blankProfile, null, selectedPersona.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomSelected, selectedPersona, onComplete, userId]);

  // ── Channel scrape (experienced step 1 → 2) ─────────────────────────────────
  const handleScrapeAndAdvance = useCallback(async () => {
    setScrapeError("");
    if (!form.channelUrl.trim()) {
      // No URL entered — advance without scraping
      setStep(2);
      return;
    }
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: form.channelUrl, apiKey: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeError(data.error || "Could not scrape channel.");
        // Still advance — user can fill manually
      } else if (data.identityExtract) {
        const { credibilityStack, uniqueMethod, contraryBelief, targetPerson } = data.identityExtract;
        setForm((f) => ({
          ...f,
          credibilityStack: credibilityStack || f.credibilityStack,
          uniqueMethod: uniqueMethod || f.uniqueMethod,
          contraryBelief: contraryBelief || f.contraryBelief,
          targetPerson: targetPerson || f.targetPerson,
        }));
        setScrapedVideos(data.videos ?? []);
      }
    } catch {
      setScrapeError("Network error — you can fill the fields manually.");
    } finally {
      setScrapeLoading(false);
      setStep(2);
    }
  }, [form.channelUrl]);

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      const newScripts: SampleScript[] = data.scripts.map(
        (s: { name: string; text: string }) => ({ name: s.name, text: s.text })
      );
      setPendingScripts((prev) => {
        const names = new Set(prev.map((s) => s.name));
        return [...prev, ...newScripts.filter((s) => !names.has(s.name))];
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  // ── Analyze — runs style DNA + identity extraction in parallel ────────────────
  const handleAnalyze = useCallback(async () => {
    if (pendingScripts.length === 0) { setError("Add at least one script before analyzing."); return; }
    setAnalyzeLoading(true);
    setAnalyzeStatus("Running deep style analysis and extracting your positioning…");
    setError("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: pendingScripts.map((s) => ({ name: s.name, text: s.text })),
          apiKey: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      // Build style profile
      const profile: StyleProfile = {
        scripts: pendingScripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.text.split(/\s+/).filter(Boolean).length,
        })),
        analysis: data.analysis,
        analyzedAt: Date.now(),
      };
      setStyleProfile(profile);

      // For experienced: scripts may also refine identity — merge in any improvements
      if (data.identityExtract) {
        const { credibilityStack, uniqueMethod, contraryBelief, targetPerson } = data.identityExtract;
        setForm((f) => ({
          ...f,
          // Only overwrite if field is currently empty (don't replace channel-scraped data)
          credibilityStack: f.credibilityStack || credibilityStack || "",
          uniqueMethod: f.uniqueMethod || uniqueMethod || "",
          contraryBelief: f.contraryBelief || contraryBelief || "",
          targetPerson: f.targetPerson || targetPerson || "",
        }));
      }

      // Experienced path: skip step 4 (unused), go straight to done
      if (path === "experienced") {
        setStep(5);
      } else {
        next();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
      setAnalyzeStatus("");
    }
  }, [pendingScripts, next]);

  // ── New creator step 4 (optional analysis before finish) ─────────────────────
  const handleNewStep4Continue = useCallback(async () => {
    if (pendingScripts.length > 0 && !styleProfile) {
      // Trigger analysis but don't block — just go to done
      setAnalyzeLoading(true);
      setError("");
      try {
        const res = await fetch("/api/analyze-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scripts: pendingScripts.map((s) => ({ name: s.name, text: s.text })),
            apiKey: "",
          }),
        });
        const data = await res.json();
        if (res.ok && data.analysis) {
          setStyleProfile({
            scripts: pendingScripts.map((s) => ({
              name: s.name,
              preview: s.text.slice(0, 120),
              sample: s.text.split(/\s+/).slice(0, 500).join(" "),
              wordCount: s.text.split(/\s+/).filter(Boolean).length,
            })),
            analysis: data.analysis,
            analyzedAt: Date.now(),
          });
        }
      } catch { /* silently skip */ } finally {
        setAnalyzeLoading(false);
      }
    }
    next();
  }, [pendingScripts, styleProfile, next]);

  // ── handleComplete ────────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    const credStack = path === "new"
      ? `Topic: ${form.topic}\nBackground: ${form.background}\nProof: ${form.proof}`
      : form.credibilityStack;

    const profile: CreatorProfile = {
      path: path as "experienced" | "new",
      name: form.name,
      channelUrl: form.channelUrl,
      credibilityStack: credStack,
      uniqueMethod: form.uniqueMethod,
      contraryBelief: form.contraryBelief,
      targetPerson: form.targetPerson,
      contentStyle: form.contentStyle,
      completedAt: Date.now(),
    };

    // Save to Supabase for the selected persona (custom setup defaults to thomas)
    const targetPersonaId = selectedPersona?.id ?? defaultPersonaId;
    if (userId) {
      const writingStyle = getWritingStyle(targetPersonaId);
      const supabase = createClient();
      await upsertPersonaProfile(supabase, userId, targetPersonaId, {
        whoAmI: {
          name: profile.name,
          channelUrl: profile.channelUrl,
          credibilityStack: credStack,
          uniqueMethod: profile.uniqueMethod,
          contraryBelief: profile.contraryBelief,
          targetPerson: profile.targetPerson,
          contentStyle: profile.contentStyle,
        },
        styleProfile,
        introGuide: writingStyle.introGuide,
        scriptGuide: writingStyle.scriptGuide,
      });
    }

    onComplete(profile, styleProfile, targetPersonaId);
  }, [path, form, styleProfile, onComplete, userId, selectedPersona, defaultPersonaId]);

  // ── Step renderers ───────────────────────────────────────────────────────────

  const renderPathSelect = () => (
    <div className="flex flex-col gap-7">

      {/* Hero */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: "var(--accent-glow)", border: "1px solid rgba(124,92,252,0.3)" }}>▶</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Welcome to ScriptForge</h1>
        <p className="text-sm leading-6 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
          Pick a writing style and start generating scripts immediately. Or set up a custom profile to make every script sound unmistakably like you.
        </p>
      </div>

      {/* Writing style picker */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Choose a Writing Style</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WRITING_STYLES.map((style) => {
            const isSelected = !isCustomSelected && selectedPersona?.id === style.id;
            return (
              <button
                key={style.id}
                disabled={!style.available}
                onClick={() => {
                  if (!style.available) return;
                  setSelectedPersona(style);
                  setIsCustomSelected(false);
                }}
                className="relative rounded-2xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isSelected ? "var(--accent-glow)" : "var(--surface-2)",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {!style.available && (
                  <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    Soon
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>✓</span>
                )}
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: isSelected ? style.color : style.color + "22", color: isSelected ? "#fff" : style.color }}
                  >
                    {style.avatar}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: style.color + "18", color: style.color }}>
                    {style.contentType}
                  </span>
                </div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: isSelected ? "var(--accent)" : "var(--foreground)" }}>{style.name}</p>
                <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>{style.tagline}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--border-light)" }}>or</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Custom setup option */}
      <button
        onClick={() => { setIsCustomSelected(true); setSelectedPersona(null); }}
        className="w-full rounded-2xl p-4 text-left transition-all"
        style={{
          background: isCustomSelected ? "var(--accent-glow)" : "var(--surface-2)",
          border: `1px solid ${isCustomSelected ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              ⚙️
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: isCustomSelected ? "var(--accent)" : "var(--foreground)" }}>Custom Setup</p>
              <p className="text-xs leading-4 mt-0.5" style={{ color: "var(--muted)" }}>Connect your channel, upload scripts, extract your voice and positioning</p>
            </div>
          </div>
          {isCustomSelected && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>✓</span>
          )}
        </div>
      </button>

      {/* Continue */}
      <button
        onClick={() => { void handleStep0Continue(); }}
        disabled={!selectedPersona && !isCustomSelected}
        className="w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "#fff", boxShadow: (!selectedPersona && !isCustomSelected) ? "none" : "0 0 24px var(--accent-glow)" }}
      >
        {isCustomSelected ? "Set Up My Profile →" : "Start Writing →"}
      </button>

    </div>
  );

  // ── EXPERIENCED PATH ─────────────────────────────────────────────────────────
  // Step 1: Name + Channel URL + API Key → scrape on Continue

  const renderExpA = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Let's set up your profile</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Enter your channel URL — we'll scrape your channel and pre-fill your identity profile automatically.
        </p>
      </div>

      <div>
        <Label>Your name or handle</Label>
        <StyledInput value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Branden Moio" />
      </div>

      <div>
        <Label>
          YouTube channel URL
          <span className="ml-1.5" style={{ fontSize: 11, fontWeight: 400, color: "var(--border-light)" }}>(recommended — we'll scrape it)</span>
        </Label>
        <StyledInput
          value={form.channelUrl}
          onChange={(v) => set("channelUrl", v)}
          placeholder="https://youtube.com/@yourhandle"
        />
        <Hint>We fetch your channel name, description, and recent video titles to pre-fill your positioning profile.</Hint>
      </div>

      {scrapeError && (
        <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
          {scrapeError} — your profile fields will be empty to fill manually.
        </div>
      )}
    </div>
  );

  // Step 3: Upload scripts + Analyze (auto-advances on success)
  // ── Transcript import ───────────────────────────────────────────────────────
  const handleImportTranscripts = useCallback(async () => {
    const channelUrlToUse = form.channelUrl.trim();
    if (!channelUrlToUse) {
      setTranscriptStatus("Enter your channel URL above first.");
      return;
    }
    setTranscriptLoading(true);
    setTranscriptStatus("Fetching your channel videos…");

    try {
      // If we don't have scraped videos yet, scrape the channel first
      let videosToUse = scrapedVideos;
      if (videosToUse.length === 0) {
        const scrapeRes = await fetch("/api/scrape-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelUrl: channelUrlToUse, apiKey: "" }),
        });
        const scrapeData = await scrapeRes.json();
        if (!scrapeRes.ok) throw new Error(scrapeData.error || "Could not reach channel.");
        videosToUse = scrapeData.videos ?? [];
        if (videosToUse.length > 0) setScrapedVideos(videosToUse);
      }

      if (videosToUse.length === 0) {
        setTranscriptStatus("No videos found — make sure your channel URL is correct (e.g. youtube.com/@yourhandle) and the channel is public.");
        setTranscriptLoading(false);
        return;
      }

      setTranscriptStatus(`Fetching transcripts for ${videosToUse.length} videos…`);

      const res = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: videosToUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcript fetch failed.");

      const imported: SampleScript[] = (data.transcripts ?? []).map(
        (t: { id: string; title: string; text: string }) => ({
          name: t.title,
          text: t.text,
        })
      );

      if (imported.length === 0) {
        setTranscriptStatus("No transcripts available — captions may be disabled on these videos.");
      } else {
        setPendingScripts((prev) => {
          const existingNames = new Set(prev.map((s) => s.name));
          const newOnes = imported.filter((s) => !existingNames.has(s.name));
          return [...prev, ...newOnes];
        });
        const failCount = (data.failed ?? []).length;
        setTranscriptStatus(
          `✓ Imported ${imported.length} transcript${imported.length !== 1 ? "s" : ""}${failCount > 0 ? ` · ${failCount} had no captions` : ""}`
        );
      }
    } catch (e: unknown) {
      setTranscriptStatus(e instanceof Error ? e.message : "Could not fetch transcripts.");
    } finally {
      setTranscriptLoading(false);
    }
  }, [scrapedVideos, form.channelUrl]);

  const renderExpC = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Build your Style DNA</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Give the AI your scripts to study — it extracts your <strong style={{ color: "var(--foreground)" }}>voice, vocabulary, sentence rhythm, and structural patterns</strong> so every generated script sounds exactly like you.
        </p>
      </div>

      {/* YouTube transcript import — always visible on experienced path */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,40,40,0.05)", border: "1px solid rgba(255,80,80,0.2)" }}>
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">▶</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#ff5555" }}>Import transcripts from YouTube</p>
            <p className="text-xs leading-5 mt-0.5" style={{ color: "var(--muted)" }}>
              {scrapedVideos.length > 0
                ? `${scrapedVideos.length} videos found. We'll import the top 5 transcripts automatically.`
                : "We'll fetch your channel videos and pull the top 5 transcripts automatically."}
            </p>
          </div>
        </div>

        {/* Show channel URL input if not yet scraped */}
        {scrapedVideos.length === 0 && (
          <input
            value={form.channelUrl}
            onChange={(e) => set("channelUrl", e.target.value)}
            placeholder="https://youtube.com/@yourhandle"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border-light)" }}
          />
        )}

        <button
          onClick={handleImportTranscripts}
          disabled={transcriptLoading || !form.channelUrl.trim()}
          className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,0,0,0.15)", color: "#ff5555", border: "1px solid rgba(255,80,80,0.3)" }}
        >
          {transcriptLoading
            ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />{transcriptStatus}</>
            : scrapedVideos.length > 0
              ? `Import top 5 transcripts (${scrapedVideos.length} videos found)`
              : "Fetch channel & import transcripts"}
        </button>

        {transcriptStatus && !transcriptLoading && (
          <p className="text-xs text-center" style={{ color: transcriptStatus.startsWith("✓") ? "var(--green)" : "var(--muted)" }}>
            {transcriptStatus}
          </p>
        )}
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-2 cursor-pointer transition-colors"
        style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-light)")}
      >
        {uploadLoading
          ? <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          : (
            <>
              <span className="text-3xl">📂</span>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Drop scripts here or click to browse</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>.docx or .txt · multiple files OK</p>
            </>
          )}
      </div>
      <input ref={fileInputRef} type="file" multiple accept=".docx,.txt,.md" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--muted)" }}>or</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>


      {pendingScripts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              {pendingScripts.length} script{pendingScripts.length !== 1 ? "s" : ""} ready to analyze
            </p>
            <p className="text-xs" style={{ color: "var(--border-light)" }}>click eye to preview</p>
          </div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {pendingScripts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <span className="text-xs" style={{ color: "var(--accent)" }}>◉</span>
                <p className="text-xs flex-1 truncate" style={{ color: "var(--foreground)" }}>{s.name}</p>
                <span className="text-xs" style={{ color: "var(--border-light)" }}>
                  {s.text.split(/\s+/).filter(Boolean).length.toLocaleString()}w
                  {" · "}~{Math.round(s.text.split(/\s+/).filter(Boolean).length / 145)}m
                </span>
                <button
                  onClick={() => setPreviewScript(s)}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ color: "var(--accent)", background: "rgba(99,102,241,0.1)" }}
                  title="Preview script"
                >
                  👁
                </button>
                <button
                  onClick={() => setPendingScripts((p) => p.filter((_, j) => j !== i))}
                  className="text-xs px-1 rounded hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleAnalyze}
        disabled={analyzeLoading || pendingScripts.length === 0}
        className="w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {analyzeLoading
          ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />Analyzing…</>
          : `✦ Analyze ${pendingScripts.length > 0 ? pendingScripts.length + " " : ""}Scripts`}
      </button>

      {analyzeLoading && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            {analyzeStatus || "Running deep forensic style analysis and extracting your positioning…"}
          </p>
          <p className="text-xs text-center" style={{ color: "var(--border-light)" }}>
            ~60–120 seconds · If rate-limited, retries automatically — don't close this tab
          </p>
        </div>
      )}
    </div>
  );

  // Step 2 (experienced): Review + edit pre-filled identity (from channel scrape)
  const renderExpD = () => (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {scrapedVideos.length > 0 ? (
            <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: "rgba(92,252,160,0.12)", color: "var(--green)", border: "1px solid rgba(92,252,160,0.25)" }}>
              ✓ Pre-filled from your channel · {scrapedVideos.length} videos found
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
              Fill in manually
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Your identity & positioning</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {scrapedVideos.length > 0
            ? "We extracted this from your channel. Review and edit anything — this is what makes every script uniquely yours."
            : "Fill in your positioning below — this shapes every script you generate."}
        </p>
      </div>

      {/* Show scraped videos as context */}
      {scrapedVideos.length > 0 && (
        <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Recent videos found on your channel:</p>
          <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
            {scrapedVideos.map((v, i) => (
              <p key={v.id} className="text-xs leading-5 truncate" style={{ color: "var(--foreground)" }}>
                <span style={{ color: "var(--border-light)" }}>#{i + 1}</span> {v.title}
              </p>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Credibility Stack <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea
          value={form.credibilityStack}
          onChange={(v) => set("credibilityStack", v)}
          rows={4}
          placeholder={"Specific results, proof points, and metrics.\n\ne.g. Grew Instagram 0→300K in 6 months. Built a 6-figure business from that audience. 8 years in affiliate marketing."}
        />
        <Hint>The actual numbers and results the AI draws on when establishing your authority in scripts.</Hint>
      </div>

      <div>
        <Label>Your Unique Method / Framework <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea
          value={form.uniqueMethod}
          onChange={(v) => set("uniqueMethod", v)}
          rows={3}
          placeholder={"How do YOU specifically approach your topic? What's your system?\n\ne.g. The Anti-Viral System — authority positioning and dollar-per-view, not raw reach."}
        />
        <Hint>How you do it differently from standard advice. Named framework if you have one.</Hint>
      </div>

      <div>
        <Label>Your Contrarian Belief <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea
          value={form.contraryBelief}
          onChange={(v) => set("contraryBelief", v)}
          rows={3}
          placeholder={"What do you believe that most people in your space get wrong?\n\ne.g. Going viral is actively bad for most creators. A 1K invested audience beats 1M passive followers."}
        />
        <Hint>Your contrarian angle — what makes your take different from everyone else's.</Hint>
      </div>

      <div>
        <Label>Who Specifically You're For <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledInput
          value={form.targetPerson}
          onChange={(v) => set("targetPerson", v)}
          placeholder={"e.g. Professionals with existing expertise who want a scalable business, not to become an influencer"}
        />
        <Hint>One specific person with one specific problem and one specific desired outcome.</Hint>
      </div>
    </div>
  );

  // ── NEW CREATOR PATH ─────────────────────────────────────────────────────────

  const renderNew1 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Your background</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>You don't need a massive audience to have real authority. Let's surface what you already have.</p>
      </div>
      <div>
        <Label>Your name or handle</Label>
        <StyledInput value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Alex Rivera" />
      </div>
      <div>
        <Label>What topic or niche are you building around? <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledInput value={form.topic} onChange={(v) => set("topic", v)} placeholder="e.g. Fitness for busy professionals, Personal finance for millennials" />
      </div>
      <div>
        <Label>Your expertise or background <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea value={form.background} onChange={(v) => set("background", v)} rows={3} placeholder={"What have you done, studied, or lived that makes you qualified?\n\ne.g. 10 years as a personal trainer, lost 60 pounds myself, certified nutritionist"} />
      </div>
      <div>
        <Label>Your proof — even if it feels small <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea value={form.proof} onChange={(v) => set("proof", v)} rows={3} placeholder={"Specific, real evidence. Small proof beats vague claims.\n\ne.g. Read 80 books on this topic. Helped 12 people lose 20+ lbs. Stack of 25 books on desk as visual proof."} />
        <Hint>Proof doesn't need to be massive — it needs to be real and specific.</Hint>
      </div>
    </div>
  );

  const renderNew2 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Your point of view</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>This separates you from every other creator on the same topic.</p>
      </div>
      <div>
        <Label>What do most people get wrong about your topic? <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea value={form.contraryBelief} onChange={(v) => set("contraryBelief", v)} rows={3} placeholder={"Your contrarian belief — what makes your perspective unique.\n\ne.g. Most fitness advice optimizes for looking fit. I optimize for being fit for life. The gym is the last place most people should start."} />
        <Hint>If you believe the same thing as everyone else, your scripts will sound like everyone else.</Hint>
      </div>
      <div>
        <Label>Who specifically are you creating for? <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledInput value={form.targetPerson} onChange={(v) => set("targetPerson", v)} placeholder={"e.g. Dads over 35 who are 30+ lbs overweight and think they're too old to change"} />
        <Hint>The more specific, the better. Generic audiences produce generic content.</Hint>
      </div>
      <div>
        <Label>Your method — how do YOU approach this differently? <span style={{ color: "var(--red)" }}>*</span></Label>
        <StyledTextarea value={form.uniqueMethod} onChange={(v) => set("uniqueMethod", v)} rows={3} placeholder={"Your specific sequence or framework.\n\ne.g. 3-phase protocol: fix the habit loop first, then environment design, then the actual workout. Most people skip steps 1 and 2."} />
      </div>
    </div>
  );

  const renderNew3 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Content style</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Pick the format that feels most natural. This shapes how every script is structured.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CONTENT_STYLES.map((cs) => {
          const active = form.contentStyle === cs.id;
          return (
            <button
              key={cs.id}
              onClick={() => set("contentStyle", cs.id)}
              className="rounded-xl p-4 text-left transition-all"
              style={{ background: active ? "var(--accent-glow)" : "var(--surface-2)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}
            >
              <div className="text-2xl mb-2">{cs.icon}</div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: active ? "var(--accent)" : "var(--foreground)" }}>{cs.label}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{cs.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderNew4 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Almost done</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Optionally upload reference scripts from creators you admire — the AI adopts their structural patterns while keeping your identity.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--muted)" }}>optional: reference scripts</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 cursor-pointer"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        {uploadLoading
          ? <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          : (<><span className="text-2xl">📂</span><p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Upload reference scripts (optional)</p></>)}
      </div>
      <input ref={fileInputRef} type="file" multiple accept=".docx,.txt,.md" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
      {pendingScripts.length > 0 && (
        <div className="flex flex-col gap-1">
          {pendingScripts.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <span className="text-xs" style={{ color: "var(--accent)" }}>◉</span>
              <p className="text-xs flex-1 truncate" style={{ color: "var(--foreground)" }}>{s.name}</p>
              <button onClick={() => setPendingScripts((p) => p.filter((_, j) => j !== i))} style={{ color: "var(--muted)" }}>×</button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
          {error}
        </p>
      )}
      {pendingScripts.length > 0 && (
        <button
          onClick={handleNewStep4Continue}
          disabled={analyzeLoading}
          className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border-light)" }}
        >
          {analyzeLoading ? <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />Analyzing…</> : `Analyze ${pendingScripts.length} Reference Scripts`}
        </button>
      )}
    </div>
  );

  // ── Done ────────────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "rgba(92,252,160,0.12)", border: "2px solid rgba(92,252,160,0.3)" }}>✓</div>
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          {form.name ? `You're all set, ${form.name.split(" ")[0]}.` : "You're all set."}
        </h2>
        <p className="text-sm leading-6 max-w-sm" style={{ color: "var(--muted)" }}>
          {styleProfile
            ? `Style DNA extracted from ${styleProfile.scripts.length} script${styleProfile.scripts.length !== 1 ? "s" : ""}. Identity and positioning locked in. Scripts will sound unmistakably like you.`
            : "Identity and positioning locked in. Every script will be written from your specific vantage point, with your proof, method, and worldview built in."}
        </p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-2.5 text-left">
        {[
          { label: "Identity & Positioning", done: !!form.name || !!form.credibilityStack },
          { label: "Style DNA from scripts", done: !!styleProfile },
        ].map(({ label, done }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="text-sm" style={{ color: done ? "var(--green)" : "var(--border-light)" }}>{done ? "✓" : "○"}</span>
            <span className="text-sm" style={{ color: done ? "var(--foreground)" : "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>
      <button onClick={() => { void handleComplete(); }} className="px-8 py-3.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 28px var(--accent-glow)" }}>
        Start Writing →
      </button>
    </div>
  );

  // ── Validation ───────────────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    if (path === "experienced") {
      // step 1: name required (channel URL and API key optional)
      if (step === 1) return !!form.name.trim();
      // step 2: review identity — always continuable
      if (step === 2) return true;
      // step 3: upload+analyze — analyze button handles advancement directly
      if (step === 3) return false;
    }
    if (path === "new") {
      if (step === 1) return !!form.topic.trim() && !!form.background.trim() && !!form.proof.trim();
      if (step === 2) return !!form.contraryBelief.trim() && !!form.targetPerson.trim() && !!form.uniqueMethod.trim();
      if (step === 3) return true;
      if (step === 4) return true;
    }
    return false;
  };

  // ── Step routing ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    if (step === 0) return renderPathSelect();
    if (step === 5) return renderDone();
    if (path === "experienced") {
      if (step === 1) return renderExpA(); // name + channel + api key
      if (step === 2) return renderExpD(); // review pre-filled identity (was step 4)
      if (step === 3) return renderExpC(); // upload + analyze
    }
    if (path === "new") {
      if (step === 1) return renderNew1();
      if (step === 2) return renderNew2();
      if (step === 3) return renderNew3();
      if (step === 4) return renderNew4();
    }
    return null;
  };

  // Custom (experienced) path step helpers
  const isExpStep1 = path === "experienced" && step === 1;
  const isAnalyzeStep = path === "experienced" && step === 3;
  const isNewOptionalAnalyze = path === "new" && step === 4;
  const showNavBar = step > 0 && step < 5;

  // Progress dots: 3 steps for custom/experienced path
  const totalDots = path === "new" ? 4 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(10,10,14,0.97)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden my-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Header */}
        {step > 0 && step < 5 && (
          <div className="px-8 pt-7 pb-0 flex items-center justify-between">
            <ProgressDots current={step - 1} total={totalDots} />
            <span className="text-xs" style={{ color: "var(--muted)" }}>Step {step} of {totalDots}</span>
          </div>
        )}

        {/* Content */}
        <div className={`px-8 ${step === 0 || step === 5 ? "py-10" : "pt-6 pb-4"}`}>
          {renderStep()}
        </div>

        {/* Nav */}
        {showNavBar && (
          <div className="px-8 py-5 flex items-center justify-between border-t" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={back}
              className="text-sm px-4 py-2 rounded-lg"
              style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              ← Back
            </button>

            {/* Analyze step: no Continue (button inside). All others show Continue. */}
            {!isAnalyzeStep && (
              <button
                onClick={
                  isExpStep1 ? handleScrapeAndAdvance
                  : isNewOptionalAnalyze ? handleNewStep4Continue
                  : next
                }
                disabled={!canAdvance() || scrapeLoading || analyzeLoading}
                className="text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {scrapeLoading ? (
                  <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Fetching channel…</>
                ) : isNewOptionalAnalyze && analyzeLoading ? (
                  <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing…</>
                ) : isExpStep1 && form.channelUrl.trim() ? (
                  "Fetch & Pre-fill →"
                ) : (
                  "Continue →"
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Script preview modal */}
      {previewScript && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreviewScript(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{previewScript.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {previewScript.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                  {" · "}~{Math.round(previewScript.text.split(/\s+/).filter(Boolean).length / 145)} min speak time
                </p>
              </div>
              <button
                onClick={() => setPreviewScript(null)}
                className="text-lg leading-none flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-80"
                style={{ color: "var(--muted)", background: "var(--surface-2)" }}
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 py-5" style={{ flex: 1 }}>
              <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                {previewScript.text}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => {
                  const idx = pendingScripts.findIndex((s) => s.name === previewScript.name);
                  if (idx !== -1) setPendingScripts((p) => p.filter((_, j) => j !== idx));
                  setPreviewScript(null);
                }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: "var(--red)", background: "rgba(252,92,124,0.08)", border: "1px solid rgba(252,92,124,0.2)" }}
              >
                Remove from queue
              </button>
              <button
                onClick={() => setPreviewScript(null)}
                className="text-xs px-4 py-1.5 rounded-lg font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
