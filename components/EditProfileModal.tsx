"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { type SampleScript } from "@/lib/scripts";
import type { CreatorProfile, StyleProfile } from "@/lib/types";
import { getWritingStyle } from "@/lib/personas";
import { createClient } from "@/lib/supabase/client";
import { upsertPersonaProfile } from "@/lib/supabase/profiles";

interface EditProfileModalProps {
  profile: CreatorProfile;
  styleProfile: StyleProfile | null;
  apiKey: string;
  anthropicApiKey?: string;
  introGuide?: string;
  scriptGuide?: string;
  personaId?: string;
  userId?: string;
  onSave: (profile: CreatorProfile, styleProfile: StyleProfile | null, apiKey: string, anthropicApiKey: string, introGuide: string, scriptGuide: string) => void;
  onClose: () => void;
}

type Tab = "identity" | "style" | "introguide" | "scriptguide" | "apikey";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mt-1.5 leading-4" style={{ color: "var(--muted)" }}>{children}</p>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0">
      <Label>{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

const INPUT_STYLE = {
  background: "var(--surface-2)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
} as const;

export default function EditProfileModal({
  profile,
  styleProfile: initialStyle,
  apiKey: initialKey,
  anthropicApiKey: initialAnthropicKey = "",
  introGuide: initialIntroGuide = "",
  scriptGuide: initialScriptGuide = "",
  personaId = "thomas",
  userId = "",
  onSave,
  onClose,
}: EditProfileModalProps) {
  const [tab, setTab] = useState<Tab>("identity");
  const safeTab: Tab = tab === "style" && personaId !== "thomas" ? "identity" : tab;

  // Identity fields
  const [name, setName] = useState(profile.name);
  const [channelUrl, setChannelUrl] = useState(profile.channelUrl);
  const [credibilityStack, setCredibilityStack] = useState(profile.credibilityStack);
  const [uniqueMethod, setUniqueMethod] = useState(profile.uniqueMethod);
  const [contraryBelief, setContraryBelief] = useState(profile.contraryBelief);
  const [targetPerson, setTargetPerson] = useState(profile.targetPerson);
  const [contentStyle, setContentStyle] = useState(profile.contentStyle);

  // Style profile
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(initialStyle);
  const [pendingScripts, setPendingScripts] = useState<SampleScript[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [styleError, setStyleError] = useState("");
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channel scrape
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");

  // Transcript import
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState("");

  // API key
  const [apiKey, setApiKey] = useState(initialKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [anthropicApiKey, setAnthropicApiKey] = useState(initialAnthropicKey);
  const [anthropicKeyVisible, setAnthropicKeyVisible] = useState(false);

  // Guide documents
  const [introGuide, setIntroGuide] = useState(initialIntroGuide);
  const [scriptGuide, setScriptGuide] = useState(initialScriptGuide);
  const [introGuideUploading, setIntroGuideUploading] = useState(false);
  const [scriptGuideUploading, setScriptGuideUploading] = useState(false);
  const introGuideFileRef = useRef<HTMLInputElement>(null);
  const scriptGuideFileRef = useRef<HTMLInputElement>(null);

  // AI feedback state (per guide + identity)
  const [introFeedback, setIntroFeedback] = useState("");
  const [scriptFeedback, setScriptFeedback] = useState("");
  const [identityFeedback, setIdentityFeedback] = useState("");
  const [introAiLoading, setIntroAiLoading] = useState(false);
  const [scriptAiLoading, setScriptAiLoading] = useState(false);
  const [identityAiLoading, setIdentityAiLoading] = useState(false);
  const [introAiError, setIntroAiError] = useState("");
  const [scriptAiError, setScriptAiError] = useState("");
  const [identityAiError, setIdentityAiError] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setStyleError("");
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
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
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleImportTranscripts = useCallback(async () => {
    if (!channelUrl.trim()) return;
    setTranscriptLoading(true);
    setTranscriptStatus("Fetching channel videos…");
    setStyleError("");
    try {
      // First, get video IDs from the channel
      const scrapeRes = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, apiKey }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "Could not scrape channel.");

      const videos: { id: string; title: string }[] = scrapeData.videos ?? [];
      if (videos.length === 0) {
        setTranscriptStatus("No videos found on this channel.");
        return;
      }

      setTranscriptStatus(`Fetching transcripts for ${videos.length} videos…`);

      const transcriptRes = await fetch("/api/fetch-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });
      const transcriptData = await transcriptRes.json();
      if (!transcriptRes.ok) throw new Error(transcriptData.error || "Transcript fetch failed.");

      const imported: SampleScript[] = (transcriptData.transcripts ?? []).map(
        (t: { title: string; text: string }) => ({ name: t.title, text: t.text })
      );

      if (imported.length === 0) {
        setTranscriptStatus("No transcripts available for these videos.");
      } else {
        setPendingScripts((prev) => {
          const existing = new Set(prev.map((s) => s.name));
          return [...prev, ...imported.filter((s) => !existing.has(s.name))];
        });
        const failCount = (transcriptData.failed ?? []).length;
        setTranscriptStatus(
          `Imported ${imported.length} transcript${imported.length !== 1 ? "s" : ""}${failCount > 0 ? ` · ${failCount} unavailable` : ""}`
        );
      }
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Transcript import failed.");
      setTranscriptStatus("");
    } finally {
      setTranscriptLoading(false);
    }
  }, [channelUrl, apiKey]);

  const handleAnalyze = useCallback(async () => {
    if (!apiKey.trim()) { setStyleError("Add your API key first (API Key tab)."); return; }
    if (pendingScripts.length === 0) { setStyleError("Add scripts before analyzing."); return; }
    setAnalyzeLoading(true);
    setStyleError("");
    setAnalyzeSuccess(false);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: pendingScripts.map((s) => ({ name: s.name, text: s.text })),
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      const newProfile: StyleProfile = {
        scripts: pendingScripts.map((s) => ({
          name: s.name,
          preview: s.text.slice(0, 120),
          sample: s.text.split(/\s+/).slice(0, 500).join(" "),
          wordCount: s.text.split(/\s+/).filter(Boolean).length,
        })),
        analysis: data.analysis,
        analyzedAt: Date.now(),
      };
      setStyleProfile(newProfile);
      setPendingScripts([]);
      setAnalyzeSuccess(true);
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
    }
  }, [apiKey, pendingScripts]);

  const loadIdentityFromPersona = useCallback(() => {
    const persona = getWritingStyle(personaId);
    const id = persona.identity;
    if (id.name)              setName(id.name);
    if (id.channelUrl)        setChannelUrl(id.channelUrl);
    if (id.credibilityStack)  setCredibilityStack(id.credibilityStack);
    if (id.uniqueMethod)      setUniqueMethod(id.uniqueMethod);
    if (id.contraryBelief)    setContraryBelief(id.contraryBelief);
    if (id.targetPerson)      setTargetPerson(id.targetPerson);
    if (id.contentStyle)      setContentStyle(id.contentStyle);
  }, [personaId]);

  const loadThomasIdentity = useCallback(() => {
    const thomas = getWritingStyle("thomas");
    const id = thomas.identity;
    if (id.name)              setName(id.name);
    if (id.channelUrl)        setChannelUrl(id.channelUrl);
    if (id.credibilityStack)  setCredibilityStack(id.credibilityStack);
    if (id.uniqueMethod)      setUniqueMethod(id.uniqueMethod);
    if (id.contraryBelief)    setContraryBelief(id.contraryBelief);
    if (id.targetPerson)      setTargetPerson(id.targetPerson);
    if (id.contentStyle)      setContentStyle(id.contentStyle);
  }, []);

  const handleScrapeChannel = useCallback(async () => {
    if (!channelUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeStatus("Fetching channel…");
    try {
      const res = await fetch("/api/scrape-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim(), apiKey: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeStatus(data.error || "Could not reach channel. Check the URL and try again.");
        return;
      }
      if (data.identityExtract) {
        const { credibilityStack: cs, uniqueMethod: um, contraryBelief: cb, targetPerson: tp } = data.identityExtract;
        if (cs) setCredibilityStack(cs);
        if (um) setUniqueMethod(um);
        if (cb) setContraryBelief(cb);
        if (tp) setTargetPerson(tp);
        setScrapeStatus(`✓ Pre-filled from channel${data.videos?.length ? ` · ${data.videos.length} videos found` : ""}`);
      } else {
        setScrapeStatus("Channel found but no identity data extracted. Fill in fields manually.");
      }
    } catch {
      setScrapeStatus("Network error — check your connection and try again.");
    } finally {
      setScrapeLoading(false);
    }
  }, [channelUrl]);

  const handleGuideFileUpload = useCallback(async (
    files: FileList | null,
    setter: (text: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/parse-doc", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      const texts: string[] = data.scripts.map((s: { text: string }) => s.text);
      setter(texts.join("\n\n---\n\n"));
    } catch (e: unknown) {
      setStyleError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAiUpdate = useCallback(async (
    guideType: "introGuide" | "scriptGuide" | "whoAmI",
    currentContent: unknown,
    feedback: string,
    setLoading: (v: boolean) => void,
    setError: (v: string) => void,
    onSuccess: (updated: unknown) => void,
    clearFeedback: () => void,
  ) => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/update-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideType, currentContent, feedback, personaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      onSuccess(data.updatedContent);
      clearFeedback();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI update failed.");
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  const handleSave = async () => {
    const updatedProfile: CreatorProfile = {
      ...profile,
      name,
      channelUrl,
      credibilityStack,
      uniqueMethod,
      contraryBelief,
      targetPerson,
      contentStyle,
      completedAt: profile.completedAt,
    };

    // Save to Supabase if userId is present
    if (userId) {
      const supabase = createClient();
      await upsertPersonaProfile(supabase, userId, personaId, {
        whoAmI: { name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle },
        styleProfile,
        introGuide,
        scriptGuide,
      });
    }

    onSave(updatedProfile, styleProfile, apiKey, anthropicApiKey, introGuide, scriptGuide);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "identity",    label: "Who Am I" },
    // "My Style" (script analysis) is only relevant for the Thomas persona —
    // pre-built styles (Best Of, Product Review) have their own built-in style guides.
    ...(personaId === "thomas" ? [{ id: "style" as Tab, label: "My Style" }] : []),
    { id: "introguide",  label: "Intro Guide" },
    { id: "scriptguide", label: "Script Guide" },
    { id: "apikey",      label: "API Keys" },
  ];

  const contentStyles = [
    { id: "talking-head", label: "Talking Head", icon: "🎙️" },
    { id: "educational-breakdown", label: "Educational", icon: "📋" },
    { id: "story-driven", label: "Story-Driven", icon: "📖" },
    { id: "fast-lists", label: "Fast Lists", icon: "⚡" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,10,14,0.95)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Edit Profile</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {profile.name || "Your creator profile"} · {profile.path === "experienced" ? "Experienced creator" : "New creator"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
            style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-medium transition-colors"
              style={{
                color: safeTab === t.id ? "var(--foreground)" : "var(--muted)",
                background: safeTab === t.id ? "var(--surface)" : "var(--surface-2)",
                borderBottom: safeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {safeTab === "identity" && (
            <div className="flex flex-col gap-5">
              {/* Load Thomas Graham's identity — only shown for the Thomas persona */}
              {personaId === "thomas" && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                      Load Thomas Graham&apos;s identity
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      Pre-fill all fields from the Thomas Graham writing style document
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadThomasIdentity}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                  >
                    Load →
                  </button>
                </div>
              )}

              <Field label="Name or handle">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Branden Moio"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Channel URL" hint="Paste your YouTube channel URL and click Fetch to auto-fill your identity fields.">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={channelUrl}
                    onChange={(e) => { setChannelUrl(e.target.value); setScrapeStatus(""); }}
                    placeholder="https://youtube.com/@yourhandle"
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none min-w-0"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    onKeyDown={(e) => e.key === "Enter" && handleScrapeChannel()}
                  />
                  <button
                    type="button"
                    onClick={handleScrapeChannel}
                    disabled={scrapeLoading || !channelUrl.trim()}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)", whiteSpace: "nowrap" }}
                  >
                    {scrapeLoading
                      ? <><span className="w-3 h-3 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />Fetching…</>
                      : "Fetch & Pre-fill →"}
                  </button>
                </div>
                {scrapeStatus && (
                  <p className="text-xs mt-1.5" style={{ color: scrapeStatus.startsWith("✓") ? "var(--green)" : "var(--muted)" }}>
                    {scrapeStatus}
                  </p>
                )}
              </Field>
              <Field label="Credibility Stack" hint="Specific results, numbers, proof points the AI draws on to establish your authority.">
                <textarea
                  value={credibilityStack}
                  onChange={(e) => setCredibilityStack(e.target.value)}
                  rows={4}
                  placeholder={"Specific results, numbers, proof points the AI draws on to establish your authority.\n\ne.g. 10 years in the industry. Grew revenue from $0 to $2M. Trained 400+ clients."}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Unique Method / Framework" hint="How you specifically approach your topic — your named system or distinctive sequence.">
                <textarea
                  value={uniqueMethod}
                  onChange={(e) => setUniqueMethod(e.target.value)}
                  rows={3}
                  placeholder={"How you specifically approach your topic — your named system or distinctive sequence.\n\ne.g. The 3-Phase Protocol: fix the habit loop first, then environment, then execution."}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Contrarian Belief" hint="What you believe that most people in your space get wrong — your edge and angle.">
                <textarea
                  value={contraryBelief}
                  onChange={(e) => setContraryBelief(e.target.value)}
                  rows={3}
                  placeholder={"What you believe that most people in your space get wrong — your edge and angle.\n\ne.g. Most people optimise for reach. The real lever is trust. A 500-person audience that trusts you beats 500K who don't."}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Who You're For" hint="One specific person with one specific problem — not a broad category.">
                <input
                  type="text"
                  value={targetPerson}
                  onChange={(e) => setTargetPerson(e.target.value)}
                  placeholder="The specific person this content is made for — their situation, problem, and goal."
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </Field>
              <Field label="Content Style">
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  {contentStyles.map((cs) => {
                    const active = contentStyle === cs.id;
                    return (
                      <button
                        key={cs.id}
                        onClick={() => setContentStyle(cs.id)}
                        className="rounded-xl px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 transition-all"
                        style={{
                          background: active ? "var(--accent-glow)" : "var(--surface-2)",
                          color: active ? "var(--accent)" : "var(--muted)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        <span>{cs.icon}</span>
                        {cs.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* AI feedback panel */}
              <div className="rounded-xl p-4 flex flex-col gap-3 mt-1" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                  Describe what to change and the AI will update your identity fields automatically.
                </p>
                <textarea
                  value={identityFeedback}
                  onChange={(e) => { setIdentityFeedback(e.target.value); setIdentityAiError(""); }}
                  placeholder={`e.g. "Update my credibility stack — I've now helped 600 clients and hit $3M revenue" or "Change my target person to solo founders aged 28–45"`}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                {identityAiError && (
                  <p className="text-xs" style={{ color: "var(--red)" }}>{identityAiError}</p>
                )}
                <button
                  type="button"
                  disabled={identityAiLoading || !identityFeedback.trim()}
                  onClick={() => handleAiUpdate(
                    "whoAmI",
                    { name, channelUrl, credibilityStack, uniqueMethod, contraryBelief, targetPerson, contentStyle },
                    identityFeedback,
                    setIdentityAiLoading,
                    setIdentityAiError,
                    (updated) => {
                      const u = updated as Record<string, string>;
                      if (u.name !== undefined) setName(u.name);
                      if (u.channelUrl !== undefined) setChannelUrl(u.channelUrl);
                      if (u.credibilityStack !== undefined) setCredibilityStack(u.credibilityStack);
                      if (u.uniqueMethod !== undefined) setUniqueMethod(u.uniqueMethod);
                      if (u.contraryBelief !== undefined) setContraryBelief(u.contraryBelief);
                      if (u.targetPerson !== undefined) setTargetPerson(u.targetPerson);
                      if (u.contentStyle !== undefined) setContentStyle(u.contentStyle);
                    },
                    () => setIdentityFeedback(""),
                  )}
                  className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {identityAiLoading
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</>
                    : "✦ Update with AI"}
                </button>
              </div>
            </div>
          )}

          {safeTab === "style" && (
            <div className="flex flex-col gap-5">
              {/* Current profile status */}
              {styleProfile && (
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                      Current Style Profile
                    </p>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {styleProfile.scripts.length} scripts · {timeAgo(styleProfile.analyzedAt)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {styleProfile.scripts.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--green)" }}>✓</span>
                        <span className="text-xs truncate flex-1" style={{ color: "var(--muted)" }}>{s.name}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--border-light)" }}>{s.wordCount.toLocaleString()}w</span>
                        <button
                          type="button"
                          title="Remove script"
                          onClick={() => {
                            const updated = styleProfile.scripts.filter((_, j) => j !== i);
                            if (updated.length === 0) {
                              setStyleProfile(null);
                            } else {
                              setStyleProfile({ ...styleProfile, scripts: updated });
                            }
                          }}
                          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(252,92,124,0.12)", color: "var(--red)" }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {styleProfile.scripts.length > 0 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Remove scripts then re-analyze to update your style DNA.
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
                  {styleProfile ? "Replace with new scripts" : "Upload your scripts"}
                </p>
                <p className="text-xs leading-5 mb-4" style={{ color: "var(--muted)" }}>
                  Upload your own scripts to build or update your style DNA. The AI will extract your vocabulary, sentence rhythm, hook formulas, transitions, and structural patterns.
                </p>

                {/* YouTube import button — shown if channel URL is set */}
                {channelUrl.trim() && (
                  <div className="mb-3">
                    <button
                      onClick={handleImportTranscripts}
                      disabled={transcriptLoading || analyzeLoading}
                      className="w-full rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "rgba(255,0,0,0.08)", color: "#ff4444", border: "1px solid rgba(255,80,80,0.25)" }}
                    >
                      {transcriptLoading
                        ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />{transcriptStatus}</>
                        : "▶ Import transcripts from YouTube channel"}
                    </button>
                    {transcriptStatus && !transcriptLoading && (
                      <p className="text-xs mt-1.5 text-center" style={{ color: "var(--muted)" }}>{transcriptStatus}</p>
                    )}
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                  className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 cursor-pointer mb-3"
                  style={{ borderColor: "var(--border-light)", background: "var(--surface-2)" }}
                >
                  {uploadLoading
                    ? <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    : (
                      <>
                        <span className="text-2xl">📂</span>
                        <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Drop files or click to browse</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>.docx or .txt</p>
                      </>
                    )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".docx,.txt,.md" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />


                {pendingScripts.length > 0 && (
                  <div className="flex flex-col gap-1 mb-4">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
                      {pendingScripts.length} scripts queued
                    </p>
                    {pendingScripts.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                        <span className="text-xs" style={{ color: "var(--accent)" }}>◉</span>
                        <p className="text-xs flex-1 truncate" style={{ color: "var(--foreground)" }}>{s.name}</p>
                        <button onClick={() => setPendingScripts((p) => p.filter((_, j) => j !== i))} className="text-xs" style={{ color: "var(--muted)" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {styleError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(252,92,124,0.08)", color: "var(--red)", border: "1px solid rgba(252,92,124,0.2)" }}>
                  {styleError}
                </p>
              )}

              {analyzeSuccess && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(92,252,160,0.08)", color: "var(--green)", border: "1px solid rgba(92,252,160,0.2)" }}>
                  ✓ Style profile updated from {styleProfile?.scripts.length} scripts
                </p>
              )}

              <button
                onClick={handleAnalyze}
                disabled={analyzeLoading || pendingScripts.length === 0}
                className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {analyzeLoading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing…</>
                  : `✦ Analyze ${pendingScripts.length > 0 ? pendingScripts.length + " " : ""}Scripts`}
              </button>
              {analyzeLoading && (
                <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                  Deep forensic analysis running… ~60 seconds
                </p>
              )}
            </div>
          )}

          {(safeTab === "introguide" || safeTab === "scriptguide") && (() => {
            const isIntro = safeTab === "introguide";
            const guideText = isIntro ? introGuide : scriptGuide;
            const setGuide = isIntro ? setIntroGuide : setScriptGuide;
            const uploading = isIntro ? introGuideUploading : scriptGuideUploading;
            const setUploading = isIntro ? setIntroGuideUploading : setScriptGuideUploading;
            const fileRef = isIntro ? introGuideFileRef : scriptGuideFileRef;
            const docName = isIntro ? "Thomas_Graham_How_To_Write_An_Introduction.docx" : "Thomas_Graham_How_To_Write_A_Script.docx";
            const placeholder = isIntro
              ? "Paste your intro writing guide here, or upload the .docx file.\n\nThis tells the AI exactly how to structure every introduction — beats, modes, USP stacking, and what to never write."
              : "Paste your script writing guide here, or upload the .docx file.\n\nThis tells the AI how to structure the body, place rehooks, handle story flow, write the outro, and embed CTAs.";
            const governs = isIntro ? "Intro beats, modes, USP" : "Body, rehooks, story flow, outro, CTAs";

            return (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {isIntro ? "How To Write An Introduction" : "How To Write A Script"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        Governs: {governs}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {guideText && (
                        <button
                          type="button"
                          onClick={() => setGuide("")}
                          className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                        style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                      >
                        {uploading ? "Uploading…" : "Upload .docx / .txt"}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".docx,.txt,.md"
                        multiple
                        className="hidden"
                        onChange={(e) => handleGuideFileUpload(e.target.files, setGuide, setUploading)}
                      />
                    </div>
                  </div>
                </div>

                <textarea
                  value={guideText}
                  onChange={(e) => setGuide(e.target.value)}
                  placeholder={placeholder}
                  rows={18}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y leading-6 font-mono"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: 300 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />

                {guideText ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                    {guideText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
                    <span style={{ color: "var(--border-light)" }}>·</span>
                    <span>AI will use this guide for every script</span>
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "rgba(124,92,252,0.06)", color: "var(--muted)", border: "1px solid rgba(124,92,252,0.15)" }}>
                    <strong style={{ color: "var(--accent)" }}>Using default framework.</strong> Upload <code style={{ background: "var(--surface)", padding: "0 3px", borderRadius: 3 }}>{docName}</code> to override with your custom guide.
                  </div>
                )}

                {/* AI feedback panel */}
                <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.2)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Refine with AI</p>
                  <p className="text-xs leading-4" style={{ color: "var(--muted)" }}>
                    Describe what to change and the AI will update the guide document automatically.
                  </p>
                  <textarea
                    value={isIntro ? introFeedback : scriptFeedback}
                    onChange={(e) => {
                      if (isIntro) { setIntroFeedback(e.target.value); setIntroAiError(""); }
                      else { setScriptFeedback(e.target.value); setScriptAiError(""); }
                    }}
                    placeholder={isIntro
                      ? `e.g. "Add a rule: never start the intro with a question" or "Remove section 3 and replace it with a 2-beat proof stack"`
                      : `e.g. "Add a rule about always using a bridge sentence before each section" or "Update the CTA instructions to mention a free guide first"`}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none leading-6"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  {(isIntro ? introAiError : scriptAiError) && (
                    <p className="text-xs" style={{ color: "var(--red)" }}>
                      {isIntro ? introAiError : scriptAiError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={(isIntro ? introAiLoading : scriptAiLoading) || !(isIntro ? introFeedback : scriptFeedback).trim()}
                    onClick={() => handleAiUpdate(
                      isIntro ? "introGuide" : "scriptGuide",
                      guideText,
                      isIntro ? introFeedback : scriptFeedback,
                      isIntro ? setIntroAiLoading : setScriptAiLoading,
                      isIntro ? setIntroAiError : setScriptAiError,
                      (updated) => setGuide(updated as string),
                      () => isIntro ? setIntroFeedback("") : setScriptFeedback(""),
                    )}
                    className="w-full rounded-lg py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {(isIntro ? introAiLoading : scriptAiLoading)
                      ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating guide…</>
                      : "✦ Update with AI"}
                  </button>
                </div>
              </div>
            );
          })()}

          {safeTab === "apikey" && (
            <div className="flex flex-col gap-6">
              {/* Anthropic key — used for script generation */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Anthropic API Key</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.25)" }}>Script generation</span>
                  </div>
                  <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
                    Powers script generation using Claude — Anthropic's best writing model. Get yours at <span style={{ color: "var(--accent)" }}>console.anthropic.com</span>.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type={anthropicKeyVisible ? "text" : "password"}
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full rounded-lg px-3 py-2.5 text-sm pr-12 outline-none font-mono"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  <button
                    type="button"
                    onClick={() => setAnthropicKeyVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {anthropicKeyVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="h-px" style={{ background: "var(--border)" }} />

              {/* OpenAI key — used for analysis */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>OpenAI API Key</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(92,252,160,0.08)", color: "var(--green)", border: "1px solid rgba(92,252,160,0.2)" }}>Style analysis</span>
                  </div>
                  <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
                    Used for channel scraping, transcript analysis, and style DNA extraction. Get yours at <span style={{ color: "var(--accent)" }}>platform.openai.com</span>.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-lg px-3 py-2.5 text-sm pr-12 outline-none font-mono"
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {apiKeyVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 text-xs leading-5" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                🔒 All keys are saved to <code style={{ background: "var(--surface)", padding: "0 3px", borderRadius: 3 }}>localStorage</code> on your device only — never transmitted to any server except their respective APIs.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { void handleSave(); }}
            className="text-sm font-semibold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
            style={{ background: saved ? "rgba(92,252,160,0.15)" : "var(--accent)", color: saved ? "var(--green)" : "#fff", border: saved ? "1px solid rgba(92,252,160,0.3)" : "none" }}
          >
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
